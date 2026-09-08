const express = require('express');
const router = express.Router();
const setorController = require('../controllers/setorController');
const verificarToken = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /setores:
 *   get:
 *     summary: Lista todos os setores (e subsetores)
 *     tags: [Setores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de setores recuperada com sucesso.
 */
router.get('/setores', verificarToken(), setorController.listarSetores);

/**
 * @swagger
 * /setores:
 *   post:
 *     summary: Cria um novo setor (Apenas Admin)
 *     tags: [Setores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               id_setor_pai:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Setor criado com sucesso.
 */
router.post('/setores', verificarToken(['admin']), setorController.criarSetor);

/**
 * @swagger
 * /setores/{id}:
 *   put:
 *     summary: Atualiza os dados de um setor (Apenas Admin)
 *     tags: [Setores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               nome:
 *                 type: string
 *               id_setor_pai:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Setor atualizado com sucesso.
 */
router.put('/setores/:id', verificarToken(['admin']), setorController.atualizarSetor);

module.exports = router;