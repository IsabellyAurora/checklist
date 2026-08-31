const pool = require('../config/db');

const salvarExecucaoCompleta = async (idChecklist, idUsuario, respostas) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Cria a execução marcando-a como concluída no momento do envio[cite: 1]
    const resExecucao = await client.query(
      `INSERT INTO execucao (id_checklist, id_usuario, status, data_conclusao) 
       VALUES ($1, $2, 'CONCLUIDO', CURRENT_TIMESTAMP) 
       RETURNING *`,
      [idChecklist, idUsuario]
    );
    const execucao = resExecucao.rows[0];

    const respostasSalvas = [];

    // Insere cada resposta vinculada ao id_execucao e ao id_item[cite: 1]
    for (const resp of respostas) {
      const resResposta = await client.query(
        `INSERT INTO resposta (id_execucao, id_item, valor_resposta, observacao) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [execucao.id_execucao, resp.id_item, resp.valor_resposta, resp.observacao || null]
      );
      respostasSalvas.push(resResposta.rows[0]);
    }

    await client.query('COMMIT');

    return {
      ...execucao,
      respostas: respostasSalvas,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const listarExecucoes = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  
  // Conta o total para a paginação
  const countResult = await pool.query('SELECT COUNT(*) FROM execucao');
  const totalItems = parseInt(countResult.rows[0].count, 10);

  // Busca os dados mesclando execução, checklist e usuário[cite: 1]
  const query = `
    SELECT 
      e.id_execucao, e.status, e.data_inicio, e.data_conclusao,
      c.titulo AS checklist_titulo, c.setor,
      u.nome AS usuario_nome
    FROM execucao e
    JOIN checklist c ON e.id_checklist = c.id_checklist
    JOIN usuario u ON e.id_usuario = u.id_usuario
    ORDER BY e.data_conclusao DESC
    LIMIT $1 OFFSET $2
  `;
  
  const { rows } = await pool.query(query, [limit, offset]);
  
  return { totalItems, totalPages: Math.ceil(totalItems / limit), currentPage: page, data: rows };
};

const buscarExecucaoPorId = async (idExecucao) => {
  // 1. Busca o cabeçalho da execução[cite: 1]
  const resExecucao = await pool.query(`
    SELECT e.*, c.titulo, c.setor, u.nome AS usuario_nome
    FROM execucao e
    JOIN checklist c ON e.id_checklist = c.id_checklist
    JOIN usuario u ON e.id_usuario = u.id_usuario
    WHERE e.id_execucao = $1
  `, [idExecucao]);

  if (resExecucao.rows.length === 0) return null;
  const execucao = resExecucao.rows[0];

  // 2. Busca as respostas vinculadas com as descrições dos itens[cite: 1]
  const resRespostas = await pool.query(`
    SELECT 
      r.id_resposta, r.valor_resposta, r.observacao,
      i.id_item, i.ordem, i.descricao, i.tipo
    FROM resposta r
    JOIN item i ON r.id_item = i.id_item
    WHERE r.id_execucao = $1
    ORDER BY i.ordem ASC
  `, [idExecucao]);

  return {
    ...execucao,
    respostas: resRespostas.rows
  };
};

module.exports = {
  salvarExecucaoCompleta,
  listarExecucoes,
  buscarExecucaoPorId,
};