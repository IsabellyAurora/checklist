const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const asyncHandler = require('../middlewares/asyncHandler');

const cadastrarUsuario = asyncHandler(async (req, res) => {
  const { nome, email, senha, setor } = req.body;

  if (!nome || !email || !senha || !setor) {
    return res.status(400).json({
      success: false,
      error: 'Os campos nome, email, senha e setor são obrigatórios.',
    });
  }

  const usuarioExistente = await userModel.findByNome(nome);
  if (usuarioExistente) {
    return res.status(409).json({
      success: false,
      error: 'Este nome de usuário já está cadastrado.',
    });
  }

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

const getUsuarios = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const usuariosPaginados = await userModel.findAll(
    parseInt(page, 10),
    parseInt(limit, 10)
  );

  return res.status(200).json({
    success: true,
    ...usuariosPaginados
  });
});

// Admin redefine a senha
const resetarSenha = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Senha padrão temporária
  const senhaTemporaria = 'Mudar@123';
  const saltRounds = 10;
  const senhaHash = await bcrypt.hash(senhaTemporaria, saltRounds);

  const usuario = await userModel.resetarSenhaAdmin(id, senhaHash);

  if (!usuario) {
    return res.status(404).json({
      success: false,
      error: 'Usuário não encontrado.',
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      mensagem: 'Senha resetada com sucesso. O usuário deverá criar uma nova no próximo login.',
      senha_temporaria: senhaTemporaria
    },
  });
});

const trocarSenhaObrigatoria = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nova_senha, confirmacao_senha } = req.body;

  // 1. Verifica se os dois campos foram enviados
  if (!nova_senha || !confirmacao_senha) {
    return res.status(400).json({
      success: false,
      error: 'A nova senha e a confirmação são obrigatórias.',
    });
  }

  // 2. Valida se as senhas coincidem (Regra solicitada pelo front)
  if (nova_senha !== confirmacao_senha) {
    return res.status(400).json({
      success: false,
      error: 'As senhas informadas não conferem.',
    });
  }

  const usuario = await userModel.findById(id);

  if (!usuario) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
  }

  // 3. Garante que a rota só funciona para quem tem a flag ativada
  if (!usuario.forcar_troca_senha) {
    return res.status(400).json({ 
      success: false, 
      error: 'Este usuário não possui pendência de troca obrigatória de senha.' 
    });
  }

  // 4. Criptografa e salva
  const saltRounds = 10;
  const senhaHash = await bcrypt.hash(nova_senha, saltRounds);

  await userModel.updateSenhaById(id, senhaHash);

  return res.status(200).json({
    success: true,
    data: {
      mensagem: 'Senha atualizada com sucesso! Acesso liberado.',
    },
  });
});

const alterarMinhaSenha = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { senha_atual, nova_senha, confirmacao_senha } = req.body;

  // 1. Valida se todos os campos foram enviados
  if (!senha_atual || !nova_senha || !confirmacao_senha) {
    return res.status(400).json({
      success: false,
      error: 'A senha atual, a nova senha e a confirmação são obrigatórias.',
    });
  }

  // 2. Valida se a nova senha e a confirmação são iguais
  if (nova_senha !== confirmacao_senha) {
    return res.status(400).json({
      success: false,
      error: 'A nova senha e a confirmação não conferem.',
    });
  }

  const usuario = await userModel.findById(id);

  if (!usuario) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
  }

  // 3. Verifica se a senha atual digitada está correta
  const senhaValida = await bcrypt.compare(senha_atual, usuario.senha);
  if (!senhaValida) {
    return res.status(401).json({ success: false, error: 'A senha atual está incorreta.' });
  }

  // 4. Impede que o usuário troque pela mesma senha
  const mesmaSenha = await bcrypt.compare(nova_senha, usuario.senha);
  if (mesmaSenha) {
    return res.status(400).json({ 
      success: false, 
      error: 'A nova senha não pode ser igual à senha atual.' 
    });
  }

  // 5. Criptografa e salva
  const saltRounds = 10;
  const senhaHash = await bcrypt.hash(nova_senha, saltRounds);

  await userModel.updateSenhaById(id, senhaHash);

  return res.status(200).json({
    success: true,
    data: {
      mensagem: 'Senha alterada com sucesso!',
    },
  });
});

// Nova Função: Ativar/Inativar Usuário (Soft Delete)
const alternarStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;

  if (typeof ativo !== 'boolean') {
    return res.status(400).json({ success: false, error: 'O status ativo deve ser um valor booleano (true/false).' });
  }

  const sucesso = await userModel.mudarStatus(id, ativo);

  if (!sucesso) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
  }

  return res.status(200).json({
    success: true,
    data: {
      mensagem: ativo ? 'Usuário reativado com sucesso!' : 'Usuário inativado com sucesso.',
    },
  });
});

module.exports = {
  cadastrarUsuario,
  getUsuarios,
  resetarSenha,
  trocarSenhaObrigatoria,
  alterarMinhaSenha,
  alternarStatus, // Exportação adicionada
};