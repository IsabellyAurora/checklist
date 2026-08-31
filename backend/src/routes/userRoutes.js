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
 *           example: admin
 *         description: Setor do usuário logado para validação de permissão.
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
 *             example:
 *               nome: "joao.silva"
 *               email: "joao@empresa.com"
 *               senha: "senhaSegura123"
 *               setor: "Manutenção"
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso.
 *       400:
 *         description: Campos obrigatórios ausentes.
 *       403:
 *         description: Acesso negado. Requer privilégios de admin.
 *       409:
 *         description: Nome de usuário já cadastrado.
 */
router.post('/usuarios', checkAdmin, userController.cadastrarUsuario);

/**
 * @swagger
 * /dados:
 *   get:
 *     summary: Lista todos os usuários cadastrados
 *     tags: [Usuários]
 *     responses:
 *       200:
 *         description: Retorna um array de usuários.
 */
router.get('/dados', userController.getDados);

module.exports = router;