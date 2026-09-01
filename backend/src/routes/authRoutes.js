const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Autentica o usuário e gera os tokens de acesso (JWT)
 *     description: Retorna o Access Token no JSON e define o Refresh Token em um cookie HttpOnly.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               senha:
 *                 type: string
 *             example:
 *               nome: "admin"
 *               senha: "minhasenha"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso.
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
 *                     mensagem:
 *                       type: string
 *                     usuario:
 *                       type: object
 *                     accessToken:
 *                       type: string
 *       400:
 *         description: Nome e senha são obrigatórios.
 *       401:
 *         description: Senha incorreta.
 *       404:
 *         description: Usuário não encontrado.
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /refresh-token:
 *   post:
 *     summary: Gera um novo Access Token silenciosamente
 *     description: Lê o cookie HttpOnly 'refreshToken' enviado automaticamente pelo navegador e devolve um novo Access Token válido por mais 15 minutos.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Novo Access Token gerado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Refresh Token não fornecido (Cookie ausente).
 *       403:
 *         description: Refresh Token inválido, expirado ou revogado.
 */
router.post('/refresh-token', authController.renovarToken);

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Encerra a sessão do usuário
 *     description: Remove o cookie HttpOnly contendo o Refresh Token.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso.
 */
router.post('/logout', authController.logout);

module.exports = router;