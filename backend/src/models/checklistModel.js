const pool = require('../config/db');

const criarChecklistComItens = async (titulo, setor, itens) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const resChecklist = await client.query(
      'INSERT INTO checklist (titulo, setor) VALUES ($1, $2) RETURNING id_checklist, titulo, setor, ativo, data_criacao',
      [titulo, setor]
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

const listarChecklists = async (setorFiltro, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  let query = 'SELECT id_checklist, titulo, setor, ativo, data_criacao FROM checklist WHERE ativo = true';
  const values = [];
  
  if (setorFiltro) {
    values.push(setorFiltro);
    query += ` AND setor = $${values.length}`;
  }

  const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) as total`, values);
  const totalItems = parseInt(countResult.rows[0].count, 10);

  values.push(limit, offset);
  query += ` ORDER BY id_checklist DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;
  
  const { rows } = await pool.query(query, values);
  
  return { totalItems, totalPages: Math.ceil(totalItems / limit), currentPage: page, data: rows };
};

const buscarChecklistPorId = async (idChecklist) => {
  const resChecklist = await pool.query(
    'SELECT * FROM checklist WHERE id_checklist = $1',
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

const editarChecklistComVersionamento = async (idChecklist, titulo, setor, itens, idUsuario) => {
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
        'INSERT INTO checklist (titulo, setor, versao, id_checklist_origem) VALUES ($1, $2, $3, $4) RETURNING *',
        [titulo, setor, novaVersao, origem]
      );
      
      const dadosNovos = resNovo.rows[0];
      idFinal = dadosNovos.id_checklist;

      await client.query(
        `INSERT INTO log_auditoria (id_usuario, acao, tabela_afetada, id_registro, dados_antigos, dados_novos) 
         VALUES ($1, 'VERSIONAMENTO', 'checklist', $2, $3, $4)`,
        [
          idUsuario, 
          idFinal, 
          JSON.stringify(dadosAntigos), 
          JSON.stringify(dadosNovos)
        ]
      );
    } else {
      await client.query('UPDATE checklist SET titulo = $1, setor = $2 WHERE id_checklist = $3', [titulo, setor, idChecklist]);
      await client.query('DELETE FROM item WHERE id_checklist = $1', [idChecklist]);
    }

    for (const item of itens) {
      await client.query(
        'INSERT INTO item (id_checklist, ordem, descricao, tipo, obrigatorio) VALUES ($1, $2, $3, $4, $5)',
        [idFinal, item.ordem, item.descricao, item.tipo, item.obrigatorio !== undefined ? item.obrigatorio : true]
      );
    }

    await client.query('COMMIT'); 
    return idFinal;

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

module.exports = {
  criarChecklistComItens,
  listarChecklists,
  buscarChecklistPorId,
  editarChecklistComVersionamento, 
  inativarChecklist,
  anexarReferenciaNoItem,
};