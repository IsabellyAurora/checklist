const execucaoModel = require('../models/execucaoModel');
const asyncHandler = require('../middlewares/asyncHandler');

const registrarExecucao = asyncHandler(async (req, res) => {
  const { id_checklist, id_usuario, respostas, data_inicio, data_conclusao, ordem_servico } = req.body;

  if (!id_checklist || !id_usuario || !respostas || !Array.isArray(respostas) || respostas.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Os campos id_checklist, id_usuario e um array de respostas são obrigatórios.',
    });
  }

  if (!data_inicio || !data_conclusao) {
    return res.status(400).json({
      success: false,
      error: 'As datas de início (data_inicio) e conclusão (data_conclusao) são obrigatórias.',
    });
  }

  for (const resp of respostas) {
    if (!resp.id_item || resp.valor_resposta === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Cada resposta deve conter id_item e valor_resposta.',
      });
    }
  }

  const resultado = await execucaoModel.salvarExecucaoCompleta(
    id_checklist, 
    id_usuario, 
    respostas, 
    data_inicio, 
    data_conclusao,
    ordem_servico || null
  );

  return res.status(201).json({
    success: true,
    data: {
      mensagem: 'Checklist respondido e salvo com sucesso!',
      execucao: resultado,
    },
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

module.exports = {
  registrarExecucao,
  listar,
  buscarPorId,
  uploadEvidenciaResposta // Exportando a função com o nome correto
};