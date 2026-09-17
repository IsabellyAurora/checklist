const execucaoModel = require('../models/execucaoModel');
const asyncHandler = require('../middlewares/asyncHandler');

// NOVO: Disparado quando o usuário clica em "Iniciar" no tablet
const iniciarExecucaoChecklist = asyncHandler(async (req, res) => {
  const { id_checklist } = req.body;
  const id_usuario = req.usuario.id_usuario;

  if (!id_checklist) {
    return res.status(400).json({ success: false, error: 'ID do checklist é obrigatório.' });
  }

  try {
    const id_execucao = await execucaoModel.iniciarExecucao(id_checklist, id_usuario);
    return res.status(201).json({
      success: true,
      data: { 
        id_execucao, 
        mensagem: 'Execução iniciada. Checklist bloqueado para outros usuários.' 
      }
    });
  } catch (error) {
    if (error.message.includes("já está sendo executado")) {
      return res.status(409).json({ success: false, error: error.message });
    }
    throw error;
  }
});

// NOVO: Disparado no final do Wizard, salva as respostas e conclui
const finalizarExecucaoChecklist = asyncHandler(async (req, res) => {
  const { id_execucao } = req.params;
  const { respostas, ordem_servico } = req.body;

  if (!respostas || !Array.isArray(respostas) || respostas.length === 0) {
    return res.status(400).json({ success: false, error: 'As respostas são obrigatórias para finalizar.' });
  }

  // Verifica se alguma resposta booleana indica Não Conformidade
  const temNC = respostas.some(r => 
    r.tipo === 'booleano' && (r.valor_resposta === 'false' || r.valor_resposta === 'Não' || r.valor_resposta === '0')
  );
  
  const statusNC = temNC ? 'PENDENTE' : 'SEM_NC';

  await execucaoModel.finalizarExecucao(id_execucao, respostas, statusNC, ordem_servico);
  
  return res.status(200).json({
    success: true,
    data: { 
      id_execucao, 
      possui_nc: temNC,
      status_nc: statusNC, 
      mensagem: 'Checklist finalizado com sucesso!' 
    }
  });
});

// NOVO: Histórico pessoal do mantenedor logado
const listarHistoricoPessoal = asyncHandler(async (req, res) => {
  const id_usuario = req.usuario.id_usuario;
  const { limit = 20 } = req.query;

  const historico = await execucaoModel.listarHistoricoUsuario(id_usuario, parseInt(limit, 10));

  return res.status(200).json({
    success: true,
    data: historico
  });
});

const listar = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, os, data_inicio, data_fim } = req.query;
  
  const isAdmin = req.usuario?.setores?.some(s => String(s).toLowerCase() === 'admin');

  const filtros = {
    ordem_servico: os,
    data_inicio: data_inicio,
    data_fim: data_fim,
    setoresUsuario: isAdmin ? null : (req.usuario?.setores_ids || [])
  };
  
  const execucoesPaginadas = await execucaoModel.listarExecucoes(
    parseInt(page, 10), 
    parseInt(limit, 10),
    filtros
  );
  
  return res.status(200).json({ success: true, ...execucoesPaginadas });
});

const buscarPorId = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const execucao = await execucaoModel.buscarExecucaoPorId(id);

  if (!execucao) {
    return res.status(404).json({ success: false, error: 'Execução não encontrada.' });
  }

  return res.status(200).json({ success: true, data: execucao });
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
    data: { mensagem: 'Imagem anexada com sucesso!', imagem_evidencia: caminhoRelativo }
  });
});

const listarPendencias = asyncHandler(async (req, res) => {
  const { status } = req.query; 
  
  const isAdmin = req.usuario?.setores?.some(s => String(s).toLowerCase() === 'admin');
  const setoresUsuario = isAdmin ? null : (req.usuario?.setores_ids || []); 

  const ncs = await execucaoModel.listarNCs(status, setoresUsuario);
  
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

const descartarExecucao = asyncHandler(async (req, res) => {
  const { id_execucao } = req.params;
  const id_usuario = req.usuario.id_usuario;

  const cancelado = await execucaoModel.cancelarExecucao(id_execucao, id_usuario);
  
  if (!cancelado) {
    return res.status(404).json({ success: false, error: 'Execução não encontrada ou você não tem permissão para cancelá-la.' });
  }

  return res.status(200).json({ 
    success: true, 
    data: { mensagem: 'Checklist descartado e liberado para a equipe.' } 
  });
});

module.exports = {
  iniciarExecucaoChecklist,
  finalizarExecucaoChecklist,
  listarHistoricoPessoal,
  listar,
  buscarPorId,
  uploadEvidenciaResposta,
  listarPendencias,
  resolverPendenciaNC,
  descartarExecucao
};