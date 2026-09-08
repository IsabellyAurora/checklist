const pool = require('../config/db');

// Atualizado para receber idSetor
const criarChecklistComItens = async (titulo, idSetor, itens) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Substituindo setor por id_setor
    const resChecklist = await client.query(
      'INSERT INTO checklist (titulo, id_setor) VALUES ($1, $2) RETURNING id_checklist, titulo, id_setor, ativo, data_criacao',
      [titulo, idSetor]
    );
    const novoChecklist = resChecklist.rows[0];

    const itensCriados = [];

    for (const item of itens) {
      const resItem = await client.query(
        'INSERT INTO item (id_checklist, ordem, descricao, tipo, obrigatorio) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [novoChecklist.id_checklist, item.ordem, item.descricao, item.tipo, item.obrigatorio !== undefined ? item.obrigatorio : true]
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
    SELECT c.id_checklist, c.titulo, c.id_setor, s.nome AS nome_setor, c.ativo, c.data_criacao 
    FROM checklist c
    LEFT JOIN setor s ON c.id_setor = s.id_setor
    WHERE c.ativo = true
  `;
  const values = [];
  
  // Se o frontend pediu um setor específico no select
  if (idSetorFiltro) {
    values.push(idSetorFiltro);
    query += ` AND c.id_setor = $${values.length}`;
  } 
  // Senão, lista todos que o usuário tem acesso hierárquico
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
const editarChecklistComVersionamento = async (idChecklist, titulo, idSetor, itens, idUsuario) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); 

    // Verifica se já existe execução vinculada a este checklist[cite: 1]
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

      // Usando id_setor no INSERT
      const resNovo = await client.query(
        'INSERT INTO checklist (titulo, id_setor, versao, id_checklist_origem) VALUES ($1, $2, $3, $4) RETURNING *',
        [titulo, idSetor, novaVersao, origem]
      );
      
      const dadosNovos = resNovo.rows[0];
      idFinal = dadosNovos.id_checklist;

      await client.query(
        `INSERT INTO log_auditoria (id_usuario, acao, tabela_afetada, id_registro, dados_antigos, dados_novos) 
         VALUES ($1, 'VERSIONAMENTO', 'checklist', $2, $3, $4)`,
        [idUsuario, idFinal, JSON.stringify(dadosAntigos), JSON.stringify(dadosNovos)]
      );
    } else {
      // Usando id_setor no UPDATE
      await client.query('UPDATE checklist SET titulo = $1, id_setor = $2 WHERE id_checklist = $3', [titulo, idSetor, idChecklist]);
      await client.query('DELETE FROM item WHERE id_checklist = $1', [idChecklist]);
    }

    const novosItensCriados = [];

    for (const item of itens) {
      const imagemUrl = item.imagem_url || item.imagem_referencia || null;

      const resItem = await client.query(
        'INSERT INTO item (id_checklist, ordem, descricao, tipo, obrigatorio, imagem_referencia) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [idFinal, item.ordem, item.descricao, item.tipo, item.obrigatorio !== undefined ? item.obrigatorio : true, imagemUrl]
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

module.exports = {
  criarChecklistComItens,
  listarChecklists,
  buscarChecklistPorId,
  editarChecklistComVersionamento, 
  inativarChecklist,
  anexarReferenciaNoItem,
  buscarHistoricoVersoes,
};