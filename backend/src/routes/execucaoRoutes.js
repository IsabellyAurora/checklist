const express = require('express');
const router = express.Router();
const execucaoController = require('../controllers/execucaoController');
const verificarToken = require('../middlewares/authMiddleware');
const { uploadMemoria, otimizarImagem } = require('../middlewares/uploadMiddleware');

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
 * /execucoes/iniciar:
 *   post:
 *     summary: Inicia a execução de um checklist e trava para outros usuários
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
 *     responses:
 *       201:
 *         description: Execução iniciada com sucesso (Retorna ID da execução).
 *       409:
 *         description: Conflito - O checklist já está sendo executado por outra pessoa.
 */
router.post('/execucoes/iniciar', verificarToken(), execucaoController.iniciarExecucaoChecklist);

/**
 * @swagger
 * /execucoes/historico/pessoal:
 *   get:
 *     summary: Lista o histórico de execuções concluídas ou em andamento do usuário logado
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Histórico pessoal retornado com sucesso.
 */
router.get('/execucoes/historico/pessoal', verificarToken(), execucaoController.listarHistoricoPessoal);

/**
 * @swagger
 * /execucoes/pendencias/ncs:
 *   get:
 *     summary: Lista todas as execuções de checklists com Não Conformidades (NC) pendentes
 *     description: Retorna uma lista de formulários preenchidos que possuem itens marcados negativamente e aguardam resolução do administrador.
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pendências retornada com sucesso.
 *       401:
 *         description: Não autorizado. Token ausente ou inválido.
 *       403:
 *         description: Acesso negado. Requer privilégios de administrador.
 */
router.get('/execucoes/pendencias/ncs', verificarToken(['admin']), execucaoController.listarPendencias);

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
 * /execucoes/{id_execucao}/finalizar:
 *   put:
 *     summary: Salva as respostas finais e conclui a execução do checklist
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_execucao
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *       200:
 *         description: Checklist finalizado com sucesso.
 */
router.put('/execucoes/:id_execucao/finalizar', verificarToken(), execucaoController.finalizarExecucaoChecklist);

/**
 * @swagger
 * /execucoes/{id_execucao}/cancelar:
 *   delete:
 *     summary: Cancela uma execução em andamento (Exclusão física)
 *     description: Permite que o próprio usuário descarte um checklist iniciado por engano, liberando a tarefa para a equipe.
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_execucao
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Checklist descartado e liberado com sucesso.
 *       404:
 *         description: Execução não encontrada ou pertencente a outro usuário.
 */
router.delete('/execucoes/:id_execucao/cancelar', verificarToken(), execucaoController.descartarExecucao);

/**
 * @swagger
 * /execucoes/{id}/resolver-nc:
 *   put:
 *     summary: Resolve a Não Conformidade de uma execução
 *     description: Permite que um administrador dê baixa em uma NC pendente, adicionando uma observação sobre a tratativa realizada.
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da Execução.
 *         schema:
 *           type: integer
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
 *                 example: "Válvula de pressão substituída conforme OS #1405"
 *     responses:
 *       200:
 *         description: Não Conformidade resolvida com sucesso.
 */
router.put('/execucoes/:id/resolver-nc', verificarToken(['admin']), execucaoController.resolverPendenciaNC);

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

module.exports = router;