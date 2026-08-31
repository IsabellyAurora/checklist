const pool = require('../config/db');

const findByNome = async (nome) => {
  const { rows } = await pool.query(
    'SELECT id_usuario, nome, email, senha, setor, data_cadastro FROM usuario WHERE nome = $1',
    [nome]
  );
  return rows[0];
};

const updateSenha = async (nome, senhaHash) => {
  const { rowCount } = await pool.query(
    'UPDATE usuario SET senha = $1 WHERE nome = $2',
    [senhaHash, nome]
  );
  return rowCount > 0;
};

const findAll = async () => {
  const { rows } = await pool.query(
    'SELECT id_usuario, nome, email, setor, data_cadastro FROM usuario ORDER BY id_usuario ASC'
  );
  return rows;
};

const criarUsuario = async (nome, email, senhaHash, setor) => {
  const { rows } = await pool.query(
    'INSERT INTO usuario (nome, email, senha, setor, data_cadastro) VALUES ($1, $2, $3, $4, NOW()) RETURNING id_usuario, nome, email, setor, data_cadastro',
    [nome, email, senhaHash, setor]
  );
  return rows[0];
};

module.exports = {
  findByNome,
  updateSenha,
  findAll,
  criarUsuario,
};