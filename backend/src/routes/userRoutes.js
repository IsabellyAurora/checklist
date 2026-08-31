const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const checkAdmin = require('../middlewares/checkAdmin');

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cadastra um novo usuário (Apenas Admin)
 *     tags: [Usuários]
 *     parameters:
 *       - in: header
 *         name: x-setor-usuario
 *         required: true
 *         schema:
 *           type: string
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
router.post('/usuarios', checkAdmin, userController.cadastrarUsuario);

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Lista todos os usuários cadastrados (com paginação)
 *     tags: [Usuários]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página que deseja visualizar
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Quantidade de registros por página
 *     responses:
 *       200:
 *         description: Retorna um objeto paginado com a lista de usuários.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 totalItems:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/usuarios', userController.getUsuarios);

/**
 * @swagger
 * /usuarios/{id}/resetar-senha:
 *   put:
 *     summary: Reseta a senha de um usuário para um valor padrão (Apenas Admin)
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: header
 *         name: x-setor-usuario
 *         required: true
 *         schema:
 *           type: string
 *           example: admin
 *     responses:
 *       200:
 *         description: Senha resetada e flag ativada com sucesso.
 *       404:
 *         description: Usuário não encontrado.
 */
router.put('/usuarios/:id/resetar-senha', checkAdmin, userController.resetarSenha);

/**
 * @swagger
 * /usuarios/{id}/senha-obrigatoria:
 *   put:
 *     summary: Conclui a troca de senha obrigatória após o reset do Admin
 *     tags: [Usuários]
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
 *             example:
 *               nova_senha: "NovaSenha@123"
 *               confirmacao_senha: "NovaSenha@123"
 *     responses:
 *       200:
 *         description: Senha alterada e flag removida com sucesso.
 *       400:
 *         description: Senhas não conferem, pendência não encontrada ou dados inválidos.
 *       404:
 *         description: Usuário não encontrado.
 */
router.put('/usuarios/:id/senha-obrigatoria', userController.trocarSenhaObrigatoria);

/**
 * @swagger
 * /usuarios/{id}/senha:
 *   put:
 *     summary: Altera a senha do próprio usuário de forma voluntária
 *     tags: [Usuários]
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
 *             example:
 *               senha_atual: "MinhaSenhaAntiga"
 *               nova_senha: "NovaSenha@123"
 *               confirmacao_senha: "NovaSenha@123"
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso.
 *       400:
 *         description: Senhas não conferem ou nova senha é igual à atual.
 *       401:
 *         description: A senha atual informada está incorreta.
 */
router.put('/usuarios/:id/senha', userController.alterarMinhaSenha);

module.exports = router;