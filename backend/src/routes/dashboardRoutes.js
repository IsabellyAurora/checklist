const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Rotas para geração de gráficos e painéis analíticos
 */

/**
 * @swagger
 * /api/dashboard/ncs-por-checklist:
 *   get:
 *     summary: Lista os checklists com maior volume de Não Conformidades
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados agregados para o gráfico de barras ou pizza
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
 *                       name:
 *                         type: string
 *                         example: "Inspeção Diária - Empilhadeira"
 *                       total:
 *                         type: integer
 *                         example: 12
 */
router.get('/ncs-por-checklist', dashboardController.listarNcsPorChecklist);

/**
 * @swagger
 * /api/dashboard/tempo-resolucao:
 *   get:
 *     summary: Calcula o tempo médio de resolução (SLA) de NCs por checklist
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados de SLA em segundos para gráficos de barras
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
 *                       name:
 *                         type: string
 *                         example: "Manutenção Preventiva - Torno CNC"
 *                       tempo_medio_segundos:
 *                         type: number
 *                         example: 14400
 */
router.get('/tempo-resolucao', dashboardController.listarTempoMedioResolucao);

/**
 * @swagger
 * /api/dashboard/analise-item:
 *   get:
 *     summary: Retorna dados dinâmicos de uma pergunta específica para gráficos
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: idItem
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numérico da pergunta (item)
 *       - in: query
 *         name: tipo
 *         required: true
 *         schema:
 *           type: string
 *           enum: [NUMERICO, CATEGORICO]
 *         description: "NUMERICO retorna a evolução temporal; CATEGORICO retorna a distribuição de respostas"
 *     responses:
 *       200:
 *         description: Array formatado de acordo com o tipo solicitado
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
 *                       name:
 *                         type: string
 *                         description: "Usado apenas no tipo CATEGORICO (Ex: 'Conforme')"
 *                       total:
 *                         type: integer
 *                         description: "Usado apenas no tipo CATEGORICO (Ex: 25)"
 *                       data_medicao:
 *                         type: string
 *                         format: date-time
 *                         description: "Usado apenas no tipo NUMERICO"
 *                       valor:
 *                         type: number
 *                         description: "Usado apenas no tipo NUMERICO (Ex: 15.5)"
 *       400:
 *         description: Parâmetros obrigatórios ausentes
 */
router.get('/analise-item', dashboardController.analisarItem);

module.exports = router;