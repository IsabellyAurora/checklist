const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler'); // Importado de middlewares

// Restante do código permanece igual...

// POST /api/login
const login = asyncHandler(async (req, res) => {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({
      success: false,
      error: 'Nome e senha são obrigatórios.',
    });
  }

  const { rows } = await pool.query('SELECT * FROM usuario WHERE nome = $1', [nome]);

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Usuário não encontrado.',
    });
  }

  const usuario = rows[0];
  const senhaValida = await bcrypt.compare(senha, usuario.senha);

  if (!senhaValida) {
    return res.status(401).json({
      success: false,
      error: 'Senha incorreta.',
    });
  }

  const { senha: _, ...usuarioSemSenha } = usuario;

  return res.status(200).json({
    success: true,
    data: {
      mensagem: 'Login realizado com sucesso!',
      usuario: usuarioSemSenha,
    },
  });
});

// PUT /api/trocar-senha
const trocarSenha = asyncHandler(async (req, res) => {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({
      success: false,
      error: 'Nome e a nova senha são obrigatórios.',
    });
  }

  const checkUser = await pool.query('SELECT id FROM usuario WHERE nome = $1', [nome]);

  if (checkUser.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Usuário não encontrado.',
    });
  }

  const saltRounds = 10;
  const senhaHash = await bcrypt.hash(senha, saltRounds);

  await pool.query('UPDATE usuario SET senha = $1 WHERE nome = $2', [senhaHash, nome]);

  return res.status(200).json({
    success: true,
    data: {
      mensagem: 'Senha alterada com sucesso!',
    },
  });
});

module.exports = {
  login,
  trocarSenha,
};