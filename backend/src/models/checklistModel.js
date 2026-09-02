const pool = require('../config/db');

const criarChecklistComItens = async (titulo, setor, itens) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Agora insere o título e o setor
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

// Atualize a função listarChecklistsAtivos para aceitar filtro
const listarChecklists = async (setorFiltro, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  let query = 'SELECT id_checklist, titulo, setor, ativo, data_criacao FROM checklist WHERE ativo = true';
  const values = [];
  
  if (setorFiltro) {
    values.push(setorFiltro);
    query += ` AND setor = $${values.length}`;
  }

  // Conta o total para o frontend montar os botões de página (1, 2, 3...)
  const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) as total`, values);
  const totalItems = parseInt(countResult.rows[0].count, 10);

  // Adiciona a paginação na query principal
  values.push(limit, offset);
  query += ` ORDER BY id_checklist DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;
  
  const { rows } = await pool.query(query, values);
  
  return { totalItems, totalPages: Math.ceil(totalItems / limit), currentPage: page, data: rows };
};

const buscarChecklistPorId = async (idChecklist) => {
  // Busca os dados principais do checklist
  const resChecklist = await pool.query(
    'SELECT * FROM checklist WHERE id_checklist = $1',
    [idChecklist]
  );
  
  if (resChecklist.rows.length === 0) return null;

  // Busca os itens vinculados
  const resItens = await pool.query(
    'SELECT * FROM item WHERE id_checklist = $1 ORDER BY ordem ASC',
    [idChecklist]
  );

  // Mapeia o array para criar a propriedade 'imagem_url' que o front pediu
  const itensFormatados = resItens.rows.map(item => {
    // Separa a propriedade imagem_referencia das demais
    const { imagem_referencia, ...restoDoItem } = item;
    
    return {
      ...restoDoItem,
      // Cria a nova chave 'imagem_url'
      imagem_url: imagem_referencia ? imagem_referencia : null 
    };
  });

  return {
    ...resChecklist.rows[0],
    itens: itensFormatados,
  };
};

const atualizarTituloChecklist = async (idChecklist, titulo) => {
  const { rows } = await pool.query(
    'UPDATE checklist SET titulo = $1 WHERE id_checklist = $2 RETURNING *',
    [titulo, idChecklist]
  );
  return rows[0];
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
  listarChecklists, // Nome atualizado (antes era listarChecklistsAtivos)
  buscarChecklistPorId,
  atualizarTituloChecklist,
  inativarChecklist,
  anexarReferenciaNoItem,
};