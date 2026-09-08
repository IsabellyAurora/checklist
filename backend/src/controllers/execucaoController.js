const execucaoModel = require('../models/execucaoModel');
const asyncHandler = require('../middlewares/asyncHandler');

const registrarExecucao = asyncHandler(async (req, res) => {
  // 1. Pega as datas e a ordem de serviço do req.body
  const { id_checklist, respostas, data_inicio, data_conclusao, ordem_servico } = req.body;
  const id_usuario = req.usuario.id_usuario;

  const temNC = respostas.some(r => 
    r.tipo === 'booleano' && (r.valor_resposta === 'false' || r.valor_resposta === 'Não' || r.valor_resposta === '0')
  );
  
  const statusNC = temNC ? 'PENDENTE' : 'SEM_NC';

  // 2. Repassa os novos parâmetros para o Model
  const id_execucao = await execucaoModel.salvarExecucao(
    id_checklist, 
    id_usuario, 
    respostas, 
    statusNC, 
    data_inicio, 
    data_conclusao, 
    ordem_servico
  );
  
  return res.status(201).json({
    success: true,
    data: { 
      id_execucao, 
      possui_nc: temNC,
      status_nc: statusNC, 
      mensagem: 'Execução salva com sucesso!' 
    }
  });
});

const listar = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, os, data_inicio, data_fim } = req.query;
  
  const filtros = {
    ordem_servico: os,
    data_inicio: data_inicio,
    data_fim: data_fim
  };
  
  const execucoesPaginadas = await execucaoModel.listarExecucoes(
    parseInt(page, 10), 
    parseInt(limit, 10),
    filtros
  );
  
  return res.status(200).json({
    success: true,
    ...execucoesPaginadas
  });
});

const buscarPorId = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const execucao = await execucaoModel.buscarExecucaoPorId(id);

  if (!execucao) {
    return res.status(404).json({
      success: false,
      error: 'Execução não encontrada.',
    });
  }

  return res.status(200).json({
    success: true,
    data: execucao,
  });
});

const uploadEvidenciaResposta = asyncHandler(async (req, res) => {
  const { id_resposta } = req.params;

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Nenhuma imagem enviada.' });
  }

  const caminhoRelativo = `/uploads/evidencias/${req.file.filename}`;
  const atualizado = await execucaoModel.anexarEvidenciaNaResposta(id_resposta, caminhoRelativo);

  if (!atualizado) {
    return res.status(404).json({ success: false, error: 'Resposta não encontrada.' });
  }

  return res.status(200).json({
    success: true,
    data: {
      mensagem: 'Imagem de evidência anexada com sucesso!',
      imagem_evidencia: caminhoRelativo
    }
  });
});

const listarPendencias = asyncHandler(async (req, res) => {
  // Pega o status da URL (se existir)
  const { status } = req.query; 
  
  // Passa o status para o Model
  const ncs = await execucaoModel.listarNCs(status);
  
  return res.status(200).json({ success: true, data: ncs });
});

const resolverPendenciaNC = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { observacao } = req.body;
  const idAdmin = req.usuario.id_usuario; 

  if (!observacao) {
    return res.status(400).json({ success: false, error: 'A observação de resolução é obrigatória.' });
  }

  const resolvido = await execucaoModel.resolverNC(id, idAdmin, observacao);
  
  if (!resolvido) {
    return res.status(404).json({ success: false, error: 'Execução não encontrada ou já resolvida.' });
  }

  return res.status(200).json({ success: true, data: { mensagem: 'Não Conformidade resolvida com sucesso.' } });
});

module.exports = {
  registrarExecucao,
  listar,
  buscarPorId,
  uploadEvidenciaResposta,
  listarPendencias,
  resolverPendenciaNC,
};