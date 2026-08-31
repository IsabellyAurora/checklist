const execucaoModel = require('../models/execucaoModel');
const asyncHandler = require('../middlewares/asyncHandler');

const registrarExecucao = asyncHandler(async (req, res) => {
  const { id_checklist, id_usuario, respostas } = req.body;

  if (!id_checklist || !id_usuario || !respostas || !Array.isArray(respostas) || respostas.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Os campos id_checklist, id_usuario e um array de respostas são obrigatórios.',
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

  const resultado = await execucaoModel.salvarExecucaoCompleta(id_checklist, id_usuario, respostas);

  return res.status(201).json({
    success: true,
    data: {
      mensagem: 'Checklist respondido e salvo com sucesso!',
      execucao: resultado,
    },
  });
});

const listar = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  const execucoesPaginadas = await execucaoModel.listarExecucoes(
    parseInt(page, 10), 
    parseInt(limit, 10)
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

module.exports = {
  registrarExecucao,
  listar,
  buscarPorId,
};