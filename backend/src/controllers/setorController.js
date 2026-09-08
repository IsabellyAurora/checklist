const setorModel = require('../models/setorModel');
const asyncHandler = require('../middlewares/asyncHandler');

const listarSetores = asyncHandler(async (req, res) => {
  const setores = await setorModel.findAll();
  return res.status(200).json({ success: true, data: setores });
});

const criarSetor = asyncHandler(async (req, res) => {
  const { nome, id_setor_pai } = req.body;

  if (!nome) {
    return res.status(400).json({ success: false, error: 'O nome do setor é obrigatório.' });
  }

  const novoSetor = await setorModel.create(nome, id_setor_pai);

  return res.status(201).json({
    success: true,
    data: { mensagem: 'Setor criado com sucesso!', setor: novoSetor }
  });
});

const atualizarSetor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nome, id_setor_pai } = req.body;

  if (!nome) {
    return res.status(400).json({ success: false, error: 'O nome do setor é obrigatório.' });
  }

  const setorAtualizado = await setorModel.update(id, nome, id_setor_pai);

  if (!setorAtualizado) {
    return res.status(404).json({ success: false, error: 'Setor não encontrado.' });
  }

  return res.status(200).json({
    success: true,
    data: { mensagem: 'Setor atualizado com sucesso!', setor: setorAtualizado }
  });
});

module.exports = {
  listarSetores,
  criarSetor,
  atualizarSetor
};