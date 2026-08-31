const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Autentica um usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: admin
 *               senha:
 *                 type: string
 *                 example: ederadmin
 *     responses:
 *       200:
 *         description: Login realizado com sucesso. Retorna os dados e o setor do usuário.
 *       401:
 *         description: Senha incorreta.
 *       404:
 *         description: Usuário não encontrado.
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /trocar-senha:
 *   put:
 *     summary: Atualiza e criptografa a senha de um usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: admin
 *               senha:
 *                 type: string
 *                 example: novaSenha123
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso.
 */
router.put('/trocar-senha', authController.trocarSenha);

module.exports = router;