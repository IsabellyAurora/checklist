const pool = require('../config/db');

const findAll = async () => {
  // Retorna todos os setores, prontos para o frontend montar selects ou árvores
  const { rows } = await pool.query('SELECT id_setor, nome, id_setor_pai FROM setor ORDER BY nome ASC');
  return rows;
};

const create = async (nome, idSetorPai = null) => {
  const { rows } = await pool.query(
    'INSERT INTO setor (nome, id_setor_pai) VALUES ($1, $2) RETURNING id_setor, nome, id_setor_pai',
    [nome, idSetorPai]
  );
  return rows[0];
};

const update = async (idSetor, nome, idSetorPai = null) => {
  const { rows } = await pool.query(
    'UPDATE setor SET nome = $1, id_setor_pai = $2 WHERE id_setor = $3 RETURNING id_setor, nome, id_setor_pai',
    [nome, idSetorPai, idSetor]
  );
  return rows[0];
};

module.exports = {
  findAll,
  create,
  update
};