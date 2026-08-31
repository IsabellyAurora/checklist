const express = require('express');
const router = express.Router();
const execucaoController = require('../controllers/execucaoController');

/**
 * @swagger
 * /execucoes:
 *   post:
 *     summary: Salva as respostas de um checklist preenchido por um usuário
 *     tags: [Execuções]
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
router.post('/execucoes', execucaoController.registrarExecucao);

/**
 * @swagger
 * /execucoes:
 *   get:
 *     summary: Lista o histórico de checklists respondidos (com paginação)
 *     tags: [Execuções]
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
router.get('/execucoes', execucaoController.listar);

/**
 * @swagger
 * /execucoes/{id}:
 *   get:
 *     summary: Detalha uma execução específica com todas as perguntas e respostas
 *     tags: [Execuções]
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
router.get('/execucoes/:id', execucaoController.buscarPorId);

module.exports = router; // Esta é a linha que costuma causar o erro TypeError no app.js se faltar