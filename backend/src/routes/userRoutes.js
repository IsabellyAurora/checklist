const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verificarToken = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cadastra um novo usuário (Apenas Admin)
 *     tags: [Usuários]
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
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *               setor:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso.
 */
router.post('/usuarios', verificarToken(['admin']), userController.cadastrarUsuario);

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Lista todos os usuários cadastrados (Apenas Admin)
 *     tags: [Usuários]
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
 *         description: Retorna a lista paginada de usuários.
 */
router.get('/usuarios', verificarToken(['admin']), userController.getUsuarios);

/**
 * @swagger
 * /usuarios/{id}/resetar-senha:
 *   put:
 *     summary: Reseta a senha de um usuário para um valor padrão (Apenas Admin)
 *     tags: [Usuários]
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
 *         description: Senha resetada e flag ativada com sucesso.
 */
router.put('/usuarios/:id/resetar-senha', verificarToken(['admin']), userController.resetarSenha);

/**
 * @swagger
 * /usuarios/{id}/senha:
 *   put:
 *     summary: Altera a senha do próprio usuário
 *     tags: [Usuários]
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
 *               senha_atual:
 *                 type: string
 *               nova_senha:
 *                 type: string
 *               confirmacao_senha:
 *                 type: string
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso.
 */
router.put('/usuarios/:id/senha', verificarToken(), userController.alterarMinhaSenha);

/**
 * @swagger
 * /usuarios/{id}/senha-obrigatoria:
 *   put:
 *     summary: Conclui a troca de senha obrigatória
 *     tags: [Usuários]
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
 *               nova_senha:
 *                 type: string
 *               confirmacao_senha:
 *                 type: string
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso.
 */
router.put('/usuarios/:id/senha-obrigatoria', verificarToken(), userController.trocarSenhaObrigatoria);

/**
 * @swagger
 * /usuarios/{id}/status:
 *   put:
 *     summary: Ativa ou inativa um usuário (Soft Delete) - Apenas Admin
 *     tags: [Usuários]
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
 *               ativo:
 *                 type: boolean
 *             example:
 *               ativo: false
 *     responses:
 *       200:
 *         description: Status do usuário alterado com sucesso.
 */
router.put('/usuarios/:id/status', verificarToken(['admin']), userController.alternarStatus);

module.exports = router;