const pool = require('../config/db');

const findByNome = async (nome) => {
  const { rows } = await pool.query(
    'SELECT id_usuario, nome, email, senha, setor, data_cadastro, forcar_troca_senha, ativo FROM usuario WHERE nome = $1',
    [nome]
  );
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

  const { rows } = await pool.query(
    'SELECT id_usuario, nome, email, setor, data_cadastro, forcar_troca_senha, ativo FROM usuario ORDER BY id_usuario ASC LIMIT $1 OFFSET $2',
    [limit, offset]
  );

  return {
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
    currentPage: page,
    data: rows
  };
};

const criarUsuario = async (nome, email, senhaHash, setor) => {
  const { rows } = await pool.query(
    'INSERT INTO usuario (nome, email, senha, setor, data_cadastro) VALUES ($1, $2, $3, $4, NOW()) RETURNING id_usuario, nome, email, setor, forcar_troca_senha, ativo, data_cadastro',
    [nome, email, senhaHash, setor]
  );
  return rows[0];
};

const findById = async (idUsuario) => {
  const { rows } = await pool.query(
    'SELECT id_usuario, nome, senha, forcar_troca_senha, ativo FROM usuario WHERE id_usuario = $1',
    [idUsuario]
  );
  return rows[0];
};

const updateSenhaById = async (idUsuario, senhaHash) => {
  const { rowCount } = await pool.query(
    'UPDATE usuario SET senha = $1, forcar_troca_senha = false WHERE id_usuario = $2',
    [senhaHash, idUsuario]
  );
  return rowCount > 0;
};

// Nova função para ativar/inativar o usuário (Soft Delete)
const mudarStatus = async (idUsuario, statusAtivo) => {
  const { rowCount } = await pool.query(
    'UPDATE usuario SET ativo = $1 WHERE id_usuario = $2',
    [statusAtivo, idUsuario]
  );
  return rowCount > 0;
};

module.exports = {
  findByNome,
  updateSenha,
  resetarSenhaAdmin,
  findAll,
  criarUsuario,
  findById,
  updateSenhaById,
  mudarStatus, // Exportando a nova função
};