const express = require('express');
const router = express.Router();
const execucaoController = require('../controllers/execucaoController');
const verificarToken = require('../middlewares/authMiddleware');

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
 *                 description: Número da OS vinculada a esta execução (Opcional)
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
 *       400:
 *         description: Dados inválidos ou faltando informações obrigatórias.
 */
router.post('/execucoes', verificarToken(), execucaoController.registrarExecucao);

/**
 * @swagger
 * /execucoes:
 *   get:
 *     summary: Lista o histórico de checklists respondidos (com paginação)
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
 *         description: Retorna a execução, os dados do checklist e as respostas dadas.
 *       404:
 *         description: Execução não encontrada.
 */
router.get('/execucoes/:id', verificarToken(), execucaoController.buscarPorId);

module.exports = router;