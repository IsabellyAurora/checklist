const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const asyncHandler = require('../middlewares/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({
      success: false,
      error: 'Nome e senha são obrigatórios.',
    });
  }

  const usuario = await userModel.findByNome(nome);

  if (!usuario) {
    return res.status(404).json({
      success: false,
      error: 'Usuário não encontrado.',
    });
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha);

  if (!senhaValida) {
    return res.status(401).json({
      success: false,
      error: 'Senha incorreta.',
    });
  }

  // Remove a senha do payload de resposta
  const { senha: _, ...usuarioSemSenha } = usuario;

  return res.status(200).json({
    success: true,
    data: {
      mensagem: 'Login realizado com sucesso!',
      usuario: usuarioSemSenha, // Contém: id_usuario, nome, email, setor, data_cadastro
    },
  });
});

const trocarSenha = asyncHandler(async (req, res) => {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({
      success: false,
      error: 'Nome e a nova senha são obrigatórios.',
    });
  }

  // Utiliza a model em vez do pool.query direto
  const checkUser = await userModel.findByNome(nome);

  if (!checkUser) {
    return res.status(404).json({
      success: false,
      error: 'Usuário não encontrado.',
    });
  }

  const saltRounds = 10;
  const senhaHash = await bcrypt.hash(senha, saltRounds);

  // Utiliza a model para atualizar a senha
  await userModel.updateSenha(nome, senhaHash);

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