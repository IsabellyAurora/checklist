const pool = require('../config/db');

const criarChecklistComItens = async (titulo, idSetor, tipoAgendamento, intervaloDias, dataEspecifica, itens) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const resChecklist = await client.query(
      `INSERT INTO checklist (titulo, id_setor, tipo_agendamento, intervalo_dias, data_especifica) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id_checklist, titulo, id_setor, ativo, data_criacao`,
      [titulo, idSetor, tipoAgendamento || 'INTERVALO_DIAS', intervaloDias || null, dataEspecifica || null]
    );
    const novoChecklist = resChecklist.rows[0];

    const itensCriados = [];

    // Adicionado os campos 'etapa' e 'ordem_etapa'
    for (const item of itens) {
      const resItem = await client.query(
        `INSERT INTO item (id_checklist, ordem, descricao, tipo, obrigatorio, etapa, ordem_etapa) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          novoChecklist.id_checklist, 
          item.ordem, 
          item.descricao, 
          item.tipo, 
          item.obrigatorio !== undefined ? item.obrigatorio : true,
          item.etapa || 'Inspeção Geral',
          item.ordem_etapa || 1
        ]
      );
      itensCriados.push(resItem.rows[0]);
    }

    await client.query('COMMIT');
    return { ...novoChecklist, itens: itensCriados };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
// Adicionado JOIN com a tabela setor para retornar o nome_setor
const listarChecklists = async (idSetorFiltro, page = 1, limit = 10, setoresUsuario = []) => {
  const offset = (page - 1) * limit;
  let query = `
    SELECT 
        c.id_checklist, c.titulo, c.id_setor, s.nome AS nome_setor, c.ativo, c.data_criacao,
        c.tipo_agendamento, c.intervalo_dias, c.data_especifica 
    FROM checklist c
    LEFT JOIN setor s ON c.id_setor = s.id_setor
    WHERE c.ativo = true
  `;
  const values = [];
  
  if (idSetorFiltro) {
    values.push(idSetorFiltro);
    query += ` AND c.id_setor = $${values.length}`;
  } 
  else if (setoresUsuario && setoresUsuario.length > 0) {
    values.push(setoresUsuario);
    query += ` AND c.id_setor = ANY($${values.length}::int[])`;
  }

  const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) as total`, values);
  const totalItems = parseInt(countResult.rows[0].count, 10);

  values.push(limit, offset);
  query += ` ORDER BY c.id_checklist DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;
  
  const { rows } = await pool.query(query, values);
  
  return { totalItems, totalPages: Math.ceil(totalItems / limit), currentPage: page, data: rows };
};

// Adicionado JOIN para resgatar os dados do setor junto ao checklist
const buscarChecklistPorId = async (idChecklist) => {
  const resChecklist = await pool.query(
    `SELECT c.*, s.nome AS nome_setor 
     FROM checklist c
     LEFT JOIN setor s ON c.id_setor = s.id_setor
     WHERE c.id_checklist = $1`,
    [idChecklist]
  );
  
  if (resChecklist.rows.length === 0) return null;

  const resItens = await pool.query(
    'SELECT * FROM item WHERE id_checklist = $1 ORDER BY ordem ASC',
    [idChecklist]
  );

  const itensFormatados = resItens.rows.map(item => {
    const { imagem_referencia, ...restoDoItem } = item;
    return {
      ...restoDoItem,
      imagem_url: imagem_referencia ? imagem_referencia : null 
    };
  });

  return {
    ...resChecklist.rows[0],
    itens: itensFormatados,
  };
};

// Atualizado para usar idSetor
const editarChecklistComVersionamento = async (idChecklist, titulo, idSetor, tipoAgendamento, intervaloDias, dataEspecifica, itens, idUsuario) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); 

    const resUso = await client.query('SELECT 1 FROM execucao WHERE id_checklist = $1 LIMIT 1', [idChecklist]);
    const emUso = resUso.rowCount > 0;

    let idFinal = idChecklist;

    if (emUso) {
      await client.query('UPDATE checklist SET ativo = false WHERE id_checklist = $1', [idChecklist]);

      const { rows: [dadosAntigos] } = await client.query(
        'SELECT * FROM checklist WHERE id_checklist = $1', 
        [idChecklist]
      );
      
      const origem = dadosAntigos.id_checklist_origem || idChecklist;
      const novaVersao = (dadosAntigos.versao || 1) + 1;

      const resNovo = await client.query(
        `INSERT INTO checklist (titulo, id_setor, versao, id_checklist_origem, tipo_agendamento, intervalo_dias, data_especifica) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [titulo, idSetor, novaVersao, origem, tipoAgendamento || 'INTERVALO_DIAS', intervaloDias || null, dataEspecifica || null]
      );
      
      const dadosNovos = resNovo.rows[0];
      idFinal = dadosNovos.id_checklist;

      await client.query(
        `INSERT INTO log_auditoria (id_usuario, acao, tabela_afetada, id_registro, dados_antigos, dados_novos) 
         VALUES ($1, 'VERSIONAMENTO', 'checklist', $2, $3, $4)`,
        [idUsuario, idFinal, JSON.stringify(dadosAntigos), JSON.stringify(dadosNovos)]
      );
    } else {
      await client.query(
        `UPDATE checklist SET titulo = $1, id_setor = $2, tipo_agendamento = $3, intervalo_dias = $4, data_especifica = $5 
         WHERE id_checklist = $6`, 
        [titulo, idSetor, tipoAgendamento, intervaloDias, dataEspecifica, idChecklist]
      );
      await client.query('DELETE FROM item WHERE id_checklist = $1', [idChecklist]);
    }

    const novosItensCriados = [];

    // Adicionado etapa e ordem_etapa no insert dos itens editados
    for (const item of itens) {
      const imagemUrl = item.imagem_url || item.imagem_referencia || null;

      const resItem = await client.query(
        `INSERT INTO item (id_checklist, ordem, descricao, tipo, obrigatorio, imagem_referencia, etapa, ordem_etapa) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          idFinal, item.ordem, item.descricao, item.tipo, 
          item.obrigatorio !== undefined ? item.obrigatorio : true, 
          imagemUrl, item.etapa || 'Inspeção Geral', item.ordem_etapa || 1
        ]
      );
      novosItensCriados.push(resItem.rows[0]);
    }

    await client.query('COMMIT'); 
    return { id_checklist: idFinal, itens: novosItensCriados };

  } catch (error) {
    await client.query('ROLLBACK'); 
    throw error;
  } finally {
    client.release();
  }
};

const inativarChecklist = async (idChecklist) => {
  const { rows } = await pool.query(
    'UPDATE checklist SET ativo = false WHERE id_checklist = $1 RETURNING *',
    [idChecklist]
  );
  return rows[0];
};

const anexarReferenciaNoItem = async (idItem, caminhoImagem) => {
  const { rowCount } = await pool.query(
    `UPDATE item SET imagem_referencia = $1 WHERE id_item = $2`,
    [caminhoImagem, idItem]
  );
  return rowCount > 0;
};

// Adicionado JOIN para recuperar os nomes dos setores no histórico
const buscarHistoricoVersoes = async (idChecklist) => {
  const { rows: [base] } = await pool.query(
    'SELECT id_checklist, id_checklist_origem FROM checklist WHERE id_checklist = $1',
    [idChecklist]
  );
  
  if (!base) return null;

  const idOrigem = base.id_checklist_origem || base.id_checklist;

  const resChecklists = await pool.query(
    `SELECT c.id_checklist, c.titulo, c.id_setor, s.nome AS nome_setor, c.ativo, c.data_criacao, c.versao, c.id_checklist_origem 
     FROM checklist c
     LEFT JOIN setor s ON c.id_setor = s.id_setor
     WHERE c.id_checklist = $1 OR c.id_checklist_origem = $1 
     ORDER BY c.id_checklist DESC`,
    [idOrigem]
  );

  const historicoCompleto = [];
  
  for (const chk of resChecklists.rows) {
    const resItens = await pool.query(
      'SELECT * FROM item WHERE id_checklist = $1 ORDER BY ordem ASC',
      [chk.id_checklist]
    );
    
    historicoCompleto.push({
      ...chk,
      itens: resItens.rows
    });
  }

  return historicoCompleto;
};

const listarChecklistsPendentes = async (setoresUsuario = []) => {
  let whereSetor = '';
  const values = [];

  if (setoresUsuario && setoresUsuario.length > 0) {
    values.push(setoresUsuario);
    whereSetor = `AND c.id_setor = ANY($1::int[])`;
  }

  const query = `
    SELECT 
        c.id_checklist, 
        c.titulo, 
        c.tipo_agendamento,
        c.intervalo_dias,
        MAX(e.data_inicio) AS data_ultima_execucao
    FROM 
        checklist c
    LEFT JOIN 
        execucao e ON c.id_checklist = e.id_checklist 
                   AND (
                       e.status = 'CONCLUIDO' 
                       OR 
                       (e.status = 'EM_ANDAMENTO' AND e.data_inicio >= NOW() - INTERVAL '4 hours')
                   )
    WHERE 
        c.ativo = true ${whereSetor}
    GROUP BY 
        c.id_checklist, c.titulo, c.tipo_agendamento, c.intervalo_dias, c.data_especifica
    HAVING 
        (
            -- Regra 1: Intervalo de Dias
            c.tipo_agendamento = 'INTERVALO_DIAS' AND (
                MAX(e.data_inicio) IS NULL 
                OR CURRENT_DATE >= (MAX(e.data_inicio)::DATE + c.intervalo_dias)
            )
        )
        OR
        (
            -- Regra 2: Data Específica
            c.tipo_agendamento = 'DATA_ESPECIFICA' AND (
                c.data_especifica <= CURRENT_DATE 
                AND MAX(e.data_inicio)::DATE IS DISTINCT FROM CURRENT_DATE
            )
        )
  `;

  const { rows } = await pool.query(query, values);
  return rows;
};

module.exports = {
  criarChecklistComItens,
  listarChecklists,
  buscarChecklistPorId,
  editarChecklistComVersionamento, 
  inativarChecklist,
  anexarReferenciaNoItem,
  buscarHistoricoVersoes,
  listarChecklistsPendentes
};