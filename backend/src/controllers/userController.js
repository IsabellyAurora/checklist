const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const asyncHandler = require('../middlewares/asyncHandler');

// POST /api/usuarios
const cadastrarUsuario = asyncHandler(async (req, res) => {
  const { nome, email, senha, setor } = req.body;

  if (!nome || !email || !senha || !setor) {
    return res.status(400).json({
      success: false,
      error: 'Os campos nome, email, senha e setor são obrigatórios.',
    });
  }

  // Verifica se o nome já está em uso
  const usuarioExistente = await userModel.findByNome(nome);
  if (usuarioExistente) {
    return res.status(409).json({
      success: false,
      error: 'Este nome de usuário já está cadastrado.',
    });
  }

  // Criptografa a senha antes de salvar
  const saltRounds = 10;
  const senhaHash = await bcrypt.hash(senha, saltRounds);

  const novoUsuario = await userModel.criarUsuario(nome, email, senhaHash, setor);

  return res.status(201).json({
    success: true,
    data: {
      mensagem: 'Usuário cadastrado com sucesso!',
      usuario: novoUsuario,
    },
  });
});

// GET /api/dados (já existente)
const getDados = asyncHandler(async (req, res) => {
  const usuarios = await userModel.findAll();
  return res.status(200).json({
    success: true,
    data: usuarios,
  });
});

module.exports = {
  cadastrarUsuario,
  getDados,
};