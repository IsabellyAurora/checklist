const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const asyncHandler = require('../middlewares/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({ success: false, error: 'Nome e senha são obrigatórios.' });
  }

  const usuario = await userModel.findByNome(nome);
  if (!usuario) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  if (!senhaValida) {
    return res.status(401).json({ success: false, error: 'Senha incorreta.' });
  }

  // 1. Gera o Access Token (curta duração, vai na memória do React)
  const accessToken = jwt.sign(
    { id_usuario: usuario.id_usuario, setor: usuario.setor },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  // 2. Gera o Refresh Token (longa duração, vai no Cookie HttpOnly)
  const refreshToken = jwt.sign(
    { id_usuario: usuario.id_usuario },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // 3. Envia o Refresh Token como Cookie de segurança
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use true se configurar HTTPS depois
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias em milissegundos
  });

  const { senha: _, ...usuarioSemSenha } = usuario;

  return res.status(200).json({
    success: true,
    data: {
      mensagem: 'Login realizado com sucesso!',
      usuario: usuarioSemSenha,
      accessToken // Retorna apenas o token de acesso no JSON
    },
  });
});

const renovarToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ success: false, error: 'Refresh Token não fornecido.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const usuario = await userModel.findById(decoded.id_usuario);

    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    }

    // Gera um novo Access Token
    const novoAccessToken = jwt.sign(
      { id_usuario: usuario.id_usuario, setor: usuario.setor },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    return res.status(200).json({
      success: true,
      accessToken: novoAccessToken
    });
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Refresh Token inválido ou expirado.' });
  }
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
  return res.status(200).json({ success: true, mensagem: 'Logout realizado.' });
});


const trocarSenha = asyncHandler(async (req, res) => {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({
      success: false,
      error: 'Nome e a nova senha são obrigatórios.',
    });
  }

  const checkUser = await userModel.findByNome(nome);

  if (!checkUser) {
    return res.status(404).json({
      success: false,
      error: 'Usuário não encontrado.',
    });
  }

  const saltRounds = 10;
  const senhaHash = await bcrypt.hash(senha, saltRounds);

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
  renovarToken,
  logout,
  trocarSenha,
};