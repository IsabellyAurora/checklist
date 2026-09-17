const pool = require('../config/db');

const iniciarExecucao = async (idChecklist, idUsuario) => {
  // Busca se há execução em andamento nas últimas 4 horas (evita travar por execuções zumbis antigas)
  const emAndamento = await pool.query(
    `SELECT id_execucao, id_usuario FROM execucao 
     WHERE id_checklist = $1 
     AND status = 'EM_ANDAMENTO'
     AND data_inicio >= NOW() - INTERVAL '4 hours'`, 
    [idChecklist]
  );

  if (emAndamento.rows.length > 0) {
    const execAtual = emAndamento.rows[0];
    
    // Se o próprio usuário logado já tinha iniciado esse checklist, devolve o ID para ele continuar
    if (execAtual.id_usuario === idUsuario) {
      return execAtual.id_execucao;
    }
    
    // Se foi outro usuário, bloqueia o acesso
    throw new Error("Este checklist já está sendo executado por outro manutentor.");
  }

  // Se estiver livre, cria uma nova execução
  const novaExecucao = await pool.query(
    `INSERT INTO execucao (id_checklist, id_usuario, data_inicio, status) 
     VALUES ($1, $2, CURRENT_TIMESTAMP, 'EM_ANDAMENTO') RETURNING id_execucao`,
    [idChecklist, idUsuario]
  );
  
  return novaExecucao.rows[0].id_execucao;
};

const finalizarExecucao = async (idExecucao, respostas, status_nc = 'SEM_NC', ordemServico) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE execucao 
       SET status = 'CONCLUIDO', status_nc = $1, data_conclusao = CURRENT_TIMESTAMP, ordem_servico = $2 
       WHERE id_execucao = $3`,
      [status_nc, ordemServico || null, idExecucao]
    );

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

// NOVO: Deleta a execução inacabada para limpar o banco e liberar a tarefa
const cancelarExecucao = async (idExecucao, idUsuario) => {
  const { rowCount } = await pool.query(
    `DELETE FROM execucao WHERE id_execucao = $1 AND id_usuario = $2 AND status = 'EM_ANDAMENTO'`,
    [idExecucao, idUsuario]
  );
  return rowCount > 0;
};

const listarHistoricoUsuario = async (idUsuario, limit = 20) => {
  const query = `
    SELECT 
        e.id_execucao,
        c.titulo,
        e.data_inicio,
        e.data_conclusao,
        e.status,
        e.status_nc
    FROM 
        execucao e
    JOIN 
        checklist c ON e.id_checklist = c.id_checklist
    WHERE 
        e.id_usuario = $1
    ORDER BY 
        e.data_inicio DESC
    LIMIT $2;
  `;
  
  const { rows } = await pool.query(query, [idUsuario, limit]);
  return rows;
};

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

  if (filtros.setoresUsuario && filtros.setoresUsuario.length > 0) {
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

const listarNCs = async (statusFiltro, setoresUsuario = []) => {
  let query = `
    SELECT 
      e.id_execucao,
      e.ordem_servico,
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
  iniciarExecucao,
  finalizarExecucao,
  cancelarExecucao,
  listarHistoricoUsuario,
  listarExecucoes,
  buscarExecucaoPorId,
  anexarEvidenciaNaResposta,
  listarNCs,
  resolverNC
};