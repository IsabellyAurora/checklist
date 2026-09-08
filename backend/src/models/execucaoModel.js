const pool = require('../config/db');

const salvarExecucao = async (idChecklist, idUsuario, respostas, status_nc = 'SEM_NC', dataInicio, dataConclusao, ordemServico) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resExecucao = await client.query(
      `INSERT INTO execucao (id_checklist, id_usuario, status_nc, data_inicio, data_conclusao, ordem_servico) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_execucao`,
      [
        idChecklist, 
        idUsuario, 
        status_nc, 
        dataInicio || null, 
        dataConclusao || null, 
        ordemServico || null
      ]
    );
    const idExecucao = resExecucao.rows[0].id_execucao;

    for (const resp of respostas) {
      await client.query(
        'INSERT INTO resposta (id_execucao, id_item, valor_resposta, observacao) VALUES ($1, $2, $3, $4)',
        [idExecucao, resp.id_item, resp.valor_resposta || null, resp.observacao || null]
      );
    }

    await client.query('COMMIT');
    return idExecucao;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Adicionado JOIN para buscar s.nome AS checklist_setor
const listarExecucoes = async (page = 1, limit = 10, filtros = {}) => {
  const offset = (page - 1) * limit;
  const values = [];
  const whereConditions = [];

  if (filtros.ordem_servico) {
    values.push(`%${filtros.ordem_servico}%`);
    whereConditions.push(`e.ordem_servico ILIKE $${values.length}`);
  }
  
  if (filtros.data_inicio && filtros.data_fim) {
    values.push(filtros.data_inicio, filtros.data_fim);
    whereConditions.push(`e.data_conclusao BETWEEN $${values.length - 1} AND $${values.length}`);
  }

// Filtragem dinâmica por array de setores do usuário
  if (filtros.setoresUsuario && filtros.setoresUsuario.length > 0) {
    // Tenta converter os valores para números inteiros, descartando o que for texto (como "admin")
    const setoresIds = filtros.setoresUsuario.map(s => parseInt(s, 10)).filter(id => !isNaN(id));
    
    if (setoresIds.length > 0) {
      values.push(setoresIds);
      whereConditions.push(`c.id_setor = ANY($${values.length}::int[])`);
    }
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) FROM execucao e 
    JOIN checklist c ON e.id_checklist = c.id_checklist 
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, values);
  const totalItems = parseInt(countResult.rows[0].count, 10);

  const query = `
    SELECT 
      e.id_execucao, e.status, e.data_inicio, e.data_conclusao, e.ordem_servico,
      EXTRACT(EPOCH FROM (e.data_conclusao - e.data_inicio))::INTEGER AS tempo_execucao_segundos,
      c.titulo AS checklist_titulo, s.nome AS checklist_setor,
      u.nome AS usuario_nome
    FROM execucao e
    JOIN checklist c ON e.id_checklist = c.id_checklist
    LEFT JOIN setor s ON c.id_setor = s.id_setor
    JOIN usuario u ON e.id_usuario = u.id_usuario
    ${whereClause}
    ORDER BY e.data_conclusao DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;
  
  const { rows } = await pool.query(query, [...values, limit, offset]);
  
  return { totalItems, totalPages: Math.ceil(totalItems / limit), currentPage: page, data: rows };
};

// Adicionado JOIN para buscar s.nome AS checklist_setor
const buscarExecucaoPorId = async (idExecucao) => {
  const resExecucao = await pool.query(`
    SELECT 
      e.*, 
      EXTRACT(EPOCH FROM (e.data_conclusao - e.data_inicio))::INTEGER AS tempo_execucao_segundos,
      c.titulo, s.nome AS checklist_setor, u.nome AS usuario_nome
    FROM execucao e
    JOIN checklist c ON e.id_checklist = c.id_checklist
    LEFT JOIN setor s ON c.id_setor = s.id_setor
    JOIN usuario u ON e.id_usuario = u.id_usuario
    WHERE e.id_execucao = $1
  `, [idExecucao]);

  if (resExecucao.rows.length === 0) return null;
  const execucao = resExecucao.rows[0];

  const resRespostas = await pool.query(`
    SELECT 
      r.id_resposta, r.valor_resposta, r.observacao, r.imagem_evidencia,
      i.id_item, i.ordem, i.descricao, i.tipo, i.imagem_referencia
    FROM resposta r
    JOIN item i ON r.id_item = i.id_item
    WHERE r.id_execucao = $1
    ORDER BY i.ordem ASC
  `, [idExecucao]);

  return { ...execucao, respostas: resRespostas.rows };
};

const anexarEvidenciaNaResposta = async (idResposta, caminhoImagem) => {
  const { rowCount } = await pool.query(
    `UPDATE resposta SET imagem_evidencia = $1 WHERE id_resposta = $2`,
    [caminhoImagem, idResposta]
  );
  return rowCount > 0;
};

// Adicionado JOIN de forma segura para buscar as pendências
const listarNCs = async (statusFiltro, setoresUsuario = []) => {
  let query = `
    SELECT 
      e.id_execucao, 
      e.data_inicio AS data_execucao, 
      c.titulo AS checklist_titulo, 
      s.nome AS checklist_setor,
      u.nome AS operador,
      e.status_nc, 
      e.data_resolucao,
      e.observacao_resolucao
    FROM execucao e
    JOIN checklist c ON e.id_checklist = c.id_checklist
    LEFT JOIN setor s ON c.id_setor = s.id_setor
    JOIN usuario u ON e.id_usuario = u.id_usuario
    WHERE e.status_nc != 'SEM_NC'
  `;
  
  const values = [];

  if (statusFiltro) {
    values.push(statusFiltro.toUpperCase());
    query += ` AND e.status_nc = $${values.length}`;
  }

  // Opcional: Filtra apenas pendências dos setores em que o Admin atua
  if (setoresUsuario && setoresUsuario.length > 0) {
    values.push(setoresUsuario);
    query += ` AND c.id_setor = ANY($${values.length}::int[])`;
  }

  query += ` ORDER BY e.data_inicio DESC`;
  
  const { rows } = await pool.query(query, values);
  return rows;
};

const resolverNC = async (idExecucao, idAdmin, observacao) => {
  const query = `
    UPDATE execucao 
    SET status_nc = 'RESOLVIDO', 
        id_admin_resolucao = $1, 
        data_resolucao = NOW(), 
        observacao_resolucao = $2
    WHERE id_execucao = $3 AND status_nc = 'PENDENTE'
    RETURNING id_execucao
  `;
  const { rowCount } = await pool.query(query, [idAdmin, observacao, idExecucao]);
  return rowCount > 0;
};

module.exports = {
  salvarExecucao,
  listarExecucoes,
  buscarExecucaoPorId,
  anexarEvidenciaNaResposta,
  resolverNC,
  listarNCs,
};