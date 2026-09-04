const execucaoModel = require('../models/execucaoModel');
const asyncHandler = require('../middlewares/asyncHandler');

const registrarExecucao = asyncHandler(async (req, res) => {
  const { id_checklist, respostas } = req.body;
  const id_usuario = req.usuario.id_usuario;

  // Lógica inteligente: Verifica se alguma resposta booleana foi "false" ou "Não"
  const temNC = respostas.some(r => 
    r.tipo === 'booleano' && (r.valor_texto === 'false' || r.valor_texto === 'Não' || r.valor_texto === '0')
  );
  
  const statusNC = temNC ? 'PENDENTE' : 'SEM_NC';

  const id_execucao = await execucaoModel.salvarExecucao(id_checklist, id_usuario, respostas, statusNC);
  
  return res.status(201).json({
    success: true,
    data: { id_execucao, status_nc: statusNC, mensagem: 'Execução salva com sucesso!' }
  });
});

const listar = asyncHandler(async (req, res) => {
  // 1. Extraindo os novos filtros da URL (req.query)
  const { page = 1, limit = 10, os, data_inicio, data_fim } = req.query;
  
  // 2. Agrupando os filtros para enviar ao model
  const filtros = {
    ordem_servico: os,
    data_inicio: data_inicio,
    data_fim: data_fim
  };
  
  const execucoesPaginadas = await execucaoModel.listarExecucoes(
    parseInt(page, 10), 
    parseInt(limit, 10),
    filtros // Repassando os filtros aqui
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

// FUNÇÃO ATUALIZADA: Processar o upload da imagem e salvar diretamente na resposta
const uploadEvidenciaResposta = asyncHandler(async (req, res) => {
  const { id_resposta } = req.params;

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Nenhuma imagem enviada.' });
  }

  // O multer salva o arquivo fisicamente e disponibiliza os dados em req.file
  const caminhoRelativo = `/uploads/evidencias/${req.file.filename}`;

  // Chama o model para atualizar a linha da resposta com o caminho da imagem
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
  const pendencias = await execucaoModel.listarNCPendentes();
  return res.status(200).json({ success: true, data: pendencias });
});

const resolverPendenciaNC = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { observacao } = req.body;
  const idAdmin = req.usuario.id_usuario; // Extraído do token JWT

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
  resolverPendenciaNC, // Exportando a função com o nome correto
};