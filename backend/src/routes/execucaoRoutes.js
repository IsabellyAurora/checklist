const express = require('express');
const router = express.Router();
const execucaoController = require('../controllers/execucaoController');
// Importando corretamente os dois middlewares no topo
const { verificarToken, checkAdmin } = require('../middlewares/authMiddleware');
const { uploadMemoria, otimizarImagem } = require('../middlewares/uploadMiddleware');

/**
 * @swagger
 * /execucoes:
 *   post:
 *     summary: Salva as respostas de um checklist preenchido por um usuário
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_checklist:
 *                 type: integer
 *               id_usuario:
 *                 type: integer
 *               data_inicio:
 *                 type: string
 *                 format: date-time
 *               data_conclusao:
 *                 type: string
 *                 format: date-time
 *               ordem_servico:
 *                 type: string
 *               respostas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id_item:
 *                       type: integer
 *                     valor_resposta:
 *                       type: string
 *                     observacao:
 *                       type: string
 *     responses:
 *       201:
 *         description: Respostas salvas com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_execucao:
 *                       type: integer
 *                     possui_nc:
 *                       type: boolean
 *                       description: Flag booleana indicando se houve alguma Não Conformidade
 *                     status_nc:
 *                       type: string
 *                       description: Status interno da NC (PENDENTE, SEM_NC)
 *                     mensagem:
 *                       type: string
 */
router.post('/execucoes', verificarToken(), execucaoController.registrarExecucao);

/**
 * @swagger
 * /execucoes:
 *   get:
 *     summary: Lista o histórico de checklists respondidos (com paginação e filtros)
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: os
 *         schema:
 *           type: string
 *       - in: query
 *         name: data_inicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: data_fim
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Histórico de execuções retornado com sucesso.
 */
router.get('/execucoes', verificarToken(), execucaoController.listar);

/**
 * @swagger
 * /execucoes/{id}:
 *   get:
 *     summary: Detalha uma execução específica com todas as perguntas e respostas
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Retorna a execução.
 */
router.get('/execucoes/:id', verificarToken(), execucaoController.buscarPorId);

/**
 * @swagger
 * /respostas/{id_resposta}/imagem:
 *   post:
 *     summary: Anexa uma foto (evidência) a uma resposta específica
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_resposta
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imagem:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagem anexada com sucesso.
 */
router.post(
  '/respostas/:id_resposta/imagem', 
  verificarToken(), 
  uploadMemoria.single('imagem'), 
  otimizarImagem('evidencias'), 
  execucaoController.uploadEvidenciaResposta
);

/**
 * @swagger
 * /execucoes/pendencias/ncs:
 *   get:
 *     summary: Lista todas as execuções de checklists com Não Conformidades (NC) pendentes
 *     description: Retorna uma lista de formulários preenchidos que possuem itens marcados negativamente e aguardam resolução do administrador.
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-setor-usuario
 *         required: true
 *         schema:
 *           type: string
 *         description: Setor do usuário logado (deve ser admin)
 *     responses:
 *       200:
 *         description: Lista de pendências retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_execucao:
 *                         type: integer
 *                       data_execucao:
 *                         type: string
 *                         format: date-time
 *                       checklist_titulo:
 *                         type: string
 *                       operador:
 *                         type: string
 *       401:
 *         description: Não autorizado. Token ausente ou inválido.
 *       403:
 *         description: Acesso negado. Requer privilégios de administrador.
 */
router.get('/execucoes/pendencias/ncs', verificarToken(), checkAdmin, execucaoController.listarPendencias);

/**
 * @swagger
 * /execucoes/{id}/resolver-nc:
 *   put:
 *     summary: Resolve a Não Conformidade de uma execução
 *     description: Permite que um administrador dê baixa em uma Não Conformidade pendente, adicionando uma observação sobre a tratativa realizada.
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da Execução que possui a NC pendente.
 *         schema:
 *           type: integer
 *       - in: header
 *         name: x-setor-usuario
 *         required: true
 *         schema:
 *           type: string
 *         description: Setor do usuário logado (deve ser admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - observacao
 *             properties:
 *               observacao:
 *                 type: string
 *                 description: Descrição da tratativa realizada para resolver o problema.
 *                 example: "Válvula de pressão substituída conforme OS #1405"
 *     responses:
 *       200:
 *         description: Não Conformidade resolvida com sucesso.
 *       400:
 *         description: Requisição inválida (observação não fornecida).
 *       404:
 *         description: Execução não encontrada ou a Não Conformidade já foi resolvida.
 */
router.put('/execucoes/:id/resolver-nc', verificarToken(), checkAdmin, execucaoController.resolverPendenciaNC);

module.exports = router;