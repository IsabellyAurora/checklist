const express = require('express');
const router = express.Router();
const execucaoController = require('../controllers/execucaoController');
const verificarToken = require('../middlewares/authMiddleware');
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

module.exports = router;