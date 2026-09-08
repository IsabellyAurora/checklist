const checklistModel = require('../models/checklistModel');
const asyncHandler = require('../middlewares/asyncHandler'); 

const criarChecklist = asyncHandler(async (req, res) => {
  // Alterado: Recebendo id_setor (número) ao invés de setor (texto)
  const { titulo, id_setor, itens } = req.body;

  if (!titulo || !id_setor || !itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'O título, o id_setor e uma lista de itens são obrigatórios.',
    });
  }

  for (const item of itens) {
    if (!item.ordem || !item.descricao || !item.tipo) {
      return res.status(400).json({ success: false, error: 'Todos os itens devem conter ordem, descricao e tipo.' });
    }
  }

  const checklistSalvo = await checklistModel.criarChecklistComItens(titulo, id_setor, itens);

  return res.status(201).json({
    success: true,
    data: { mensagem: 'Checklist criado com sucesso!', checklist: checklistSalvo },
  });
});

const listarChecklists = asyncHandler(async (req, res) => {
  const { id_setor, page = 1, limit = 10 } = req.query;
  
  // Verifica se o usuário é admin
  const isAdmin = req.usuario?.setores?.some(s => String(s).toLowerCase() === 'admin');
  
  // Se for admin, passa null. Se não for, passa a árvore de setores do token.
  const setoresUsuario = isAdmin ? null : (req.usuario?.setores_ids || []); 
  
  const checklistsPaginados = await checklistModel.listarChecklists(
    id_setor ? parseInt(id_setor, 10) : null, 
    parseInt(page, 10), 
    parseInt(limit, 10),
    setoresUsuario
  );
  
  return res.status(200).json({
    success: true,
    ...checklistsPaginados
  });
});
const buscarChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const checklist = await checklistModel.buscarChecklistPorId(id);

  if (!checklist) {
    return res.status(404).json({
      success: false,
      error: 'Checklist não encontrado.',
    });
  }

  return res.status(200).json({
    success: true,
    data: checklist,
  });
});

const atualizarChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { titulo, id_setor, itens } = req.body;
  
  const idUsuario = req.usuario ? req.usuario.id_usuario : 1; 

  if (!titulo || !id_setor || !itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'O título, id_setor e lista de itens são obrigatórios para atualização.',
    });
  }

  const resultadoEdicao = await checklistModel.editarChecklistComVersionamento(id, titulo, id_setor, itens, idUsuario);

  return res.status(200).json({
    success: true,
    data: {
      mensagem: 'Checklist atualizado com sucesso!',
      id_checklist: resultadoEdicao.id_checklist,
      itens: resultadoEdicao.itens 
    },
  });
});

const excluirChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const checklistInativado = await checklistModel.inativarChecklist(id);

  if (!checklistInativado) {
    return res.status(404).json({
      success: false,
      error: 'Checklist não encontrado.',
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      mensagem: 'Checklist inativado com sucesso!',
      checklist: checklistInativado,
    },
  });
});

const uploadReferenciaItem = asyncHandler(async (req, res) => {
  const { id_item } = req.params;

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Nenhuma imagem enviada.' });
  }

  const caminhoRelativo = `/uploads/referencias/${req.file.filename}`;
  
  const atualizado = await checklistModel.anexarReferenciaNoItem(id_item, caminhoRelativo);

  if (!atualizado) {
    return res.status(404).json({ success: false, error: 'Item/Pergunta não encontrado.' });
  }

  return res.status(200).json({
    success: true,
    data: {
      mensagem: 'Imagem de referência anexada com sucesso!',
      imagem_referencia: caminhoRelativo
    }
  });
});

const listarVersoesChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const historico = await checklistModel.buscarHistoricoVersoes(id);

  if (!historico) {
    return res.status(404).json({
      success: false,
      error: 'Checklist não encontrado.',
    });
  }

  return res.status(200).json({
    success: true,
    data: historico,
  });
});

module.exports = {
  criarChecklist,
  listarChecklists,
  buscarChecklist,
  atualizarChecklist,
  excluirChecklist,
  uploadReferenciaItem,
  listarVersoesChecklist,
};