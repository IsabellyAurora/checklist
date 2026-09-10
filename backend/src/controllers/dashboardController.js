const dashboardModel = require('../models/dashboardModel');
const asyncHandler = require('../middlewares/asyncHandler');

const listarNcsPorChecklist = asyncHandler(async (req, res) => {
  const dados = await dashboardModel.getNcsPorChecklist();
  res.status(200).json({ success: true, data: dados });
});

const listarTempoMedioResolucao = asyncHandler(async (req, res) => {
  const dados = await dashboardModel.getTempoMedioResolucao();
  res.status(200).json({ success: true, data: dados });
});

const analisarItem = asyncHandler(async (req, res) => {
  const { idItem, tipo } = req.query; // tipo pode ser 'NUMERICO' ou 'CATEGORICO'

  if (!idItem || !tipo) {
    return res.status(400).json({ success: false, error: 'Parâmetros idItem e tipo são obrigatórios.' });
  }

  let dados;
  if (tipo === 'NUMERICO') {
    dados = await dashboardModel.getEvolucaoNumerica(idItem);
  } else {
    dados = await dashboardModel.getDistribuicaoCategorica(idItem);
  }

  res.status(200).json({ success: true, data: dados });
});

module.exports = {
  listarNcsPorChecklist,
  listarTempoMedioResolucao,
  analisarItem
};