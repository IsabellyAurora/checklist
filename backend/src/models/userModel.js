const pool = require('../config/db');

const findByNome = async (nome) => {
  const query = `
    WITH RECURSIVE hierarquia_setores AS (
      -- Ponto de partida: Os setores diretamente vinculados ao usuário
      SELECT us.id_usuario, s.id_setor, s.nome
      FROM usuario_setor us
      JOIN setor s ON us.id_setor = s.id_setor
      WHERE us.id_usuario = (SELECT id_usuario FROM usuario WHERE nome = $1 LIMIT 1)
      
      UNION
      
      -- Recursividade: Busca todos os subsetores dos setores encontrados acima
      SELECT hs.id_usuario, s.id_setor, s.nome
      FROM setor s
      INNER JOIN hierarquia_setores hs ON s.id_setor_pai = hs.id_setor
    )
    SELECT u.id_usuario, u.nome, u.email, u.senha, u.data_cadastro, u.forcar_troca_senha, u.ativo,
           COALESCE((SELECT array_agg(DISTINCT id_setor) FROM hierarquia_setores), '{}') AS setores_ids,
           COALESCE((SELECT array_agg(DISTINCT nome) FROM hierarquia_setores), '{}') AS setores
    FROM usuario u
    WHERE u.nome = $1
  `;
  const { rows } = await pool.query(query, [nome]);
  return rows[0];
};
const updateSenha = async (nome, senhaHash) => {
  const { rowCount } = await pool.query(
    'UPDATE usuario SET senha = $1, forcar_troca_senha = false WHERE nome = $2',
    [senhaHash, nome]
  );
  return rowCount > 0;
};

const resetarSenhaAdmin = async (idUsuario, senhaHash) => {
  const { rows } = await pool.query(
    'UPDATE usuario SET senha = $1, forcar_troca_senha = true WHERE id_usuario = $2 RETURNING id_usuario, nome',
    [senhaHash, idUsuario]
  );
  return rows[0];
};

const findAll = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const countResult = await pool.query('SELECT COUNT(*) FROM usuario');
  const totalItems = parseInt(countResult.rows[0].count, 10);

  const query = `
    SELECT u.id_usuario, u.nome, u.email, u.data_cadastro, u.forcar_troca_senha, u.ativo,
           COALESCE(array_agg(s.nome) FILTER (WHERE s.nome IS NOT NULL), '{}') AS setores
    FROM usuario u
    LEFT JOIN usuario_setor us ON u.id_usuario = us.id_usuario
    LEFT JOIN setor s ON us.id_setor = s.id_setor
    GROUP BY u.id_usuario
    ORDER BY u.id_usuario ASC
    LIMIT $1 OFFSET $2
  `;
  
  const { rows } = await pool.query(query, [limit, offset]);

  return {
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
    currentPage: page,
    data: rows
  };
};

const criarUsuario = async (nome, email, senhaHash, setoresIds) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const resUser = await client.query(
      'INSERT INTO usuario (nome, email, senha, data_cadastro) VALUES ($1, $2, $3, NOW()) RETURNING id_usuario, nome, email, forcar_troca_senha, ativo, data_cadastro',
      [nome, email, senhaHash]
    );
    const novoUser = resUser.rows[0];

    // Insere os vínculos de setor
    if (setoresIds && setoresIds.length > 0) {
      for (const idSetor of setoresIds) {
        await client.query(
          'INSERT INTO usuario_setor (id_usuario, id_setor) VALUES ($1, $2)',
          [novoUser.id_usuario, idSetor]
        );
      }
    }

    await client.query('COMMIT');
    return novoUser;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const findById = async (idUsuario) => {
  const query = `
    WITH RECURSIVE hierarquia_setores AS (
      SELECT us.id_usuario, s.id_setor, s.nome
      FROM usuario_setor us
      JOIN setor s ON us.id_setor = s.id_setor
      WHERE us.id_usuario = $1
      
      UNION
      
      SELECT hs.id_usuario, s.id_setor, s.nome
      FROM setor s
      INNER JOIN hierarquia_setores hs ON s.id_setor_pai = hs.id_setor
    )
    SELECT u.id_usuario, u.nome, u.senha, u.forcar_troca_senha, u.ativo,
           COALESCE((SELECT array_agg(DISTINCT id_setor) FROM hierarquia_setores), '{}') AS setores_ids,
           COALESCE((SELECT array_agg(DISTINCT nome) FROM hierarquia_setores), '{}') AS setores
    FROM usuario u
    WHERE u.id_usuario = $1
  `;
  const { rows } = await pool.query(query, [idUsuario]);
  return rows[0];
};

const updateSenhaById = async (idUsuario, senhaHash) => {
  const { rowCount } = await pool.query(
    'UPDATE usuario SET senha = $1, forcar_troca_senha = false WHERE id_usuario = $2',
    [senhaHash, idUsuario]
  );
  return rowCount > 0;
};

const mudarStatus = async (idUsuario, statusAtivo) => {
  const { rowCount } = await pool.query(
    'UPDATE usuario SET ativo = $1 WHERE id_usuario = $2',
    [statusAtivo, idUsuario]
  );
  return rowCount > 0;
};

const atualizarSetores = async (idUsuario, setoresIds) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Remove todos os vínculos atuais do usuário
    await client.query('DELETE FROM usuario_setor WHERE id_usuario = $1', [idUsuario]);

    // 2. Insere os novos vínculos
    if (setoresIds && setoresIds.length > 0) {
      for (const idSetor of setoresIds) {
        await client.query(
          'INSERT INTO usuario_setor (id_usuario, id_setor) VALUES ($1, $2)',
          [idUsuario, idSetor]
        );
      }
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  findByNome, updateSenha, resetarSenhaAdmin, findAll, 
  criarUsuario, findById, updateSenhaById, mudarStatus, atualizarSetores,
};