const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklistController');
const checkAdmin = require('../middlewares/checkAdmin');

/**
 * @swagger
 * /checklists:
 *   get:
 *     summary: Lista os checklists ativos com paginação (e filtro opcional de setor)
 *     tags: [Checklists]
 *     parameters:
 *       - in: query
 *         name: setor
 *         schema:
 *           type: string
 *         description: "Filtra os checklists por um setor específico (exemplo: admin, manutencao)"
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
 *         description: Objeto contendo os dados de paginação e o array de checklists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalItems:
 *                   type: integer
 *                   example: 25
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_checklist:
 *                         type: integer
 *                       titulo:
 *                         type: string
 *                       setor:
 *                         type: string
 *                       ativo:
 *                         type: boolean
 *                       data_criacao:
 *                         type: string
 *                         format: date-time
 *   post:
 *     summary: Cria um novo checklist vinculado a um setor com seus itens
 *     tags: [Checklists]
 *     parameters:
 *       - in: header
 *         name: x-setor-usuario
 *         required: true
 *         schema:
 *           type: string
 *           example: admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               setor:
 *                 type: string
 *               itens:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     ordem:
 *                       type: integer
 *                     descricao:
 *                       type: string
 *                     tipo:
 *                       type: string
 *                     obrigatorio:
 *                       type: boolean
 *             example:
 *               titulo: "Inspeção Diária de Empilhadeira"
 *               setor: "manutencao"
 *               itens:
 *                 - ordem: 1
 *                   descricao: "Verificar nível de óleo"
 *                   tipo: "TEXTO"
 *                   obrigatorio: true
 *                 - ordem: 2
 *                   descricao: "Condição dos pneus"
 *                   tipo: "TEXTO"
 *                   obrigatorio: true
 *     responses:
 *       201:
 *         description: Checklist e itens criados com sucesso.
 *       400:
 *         description: Dados inválidos.
 */
router.get('/checklists', checklistController.listarChecklists);
router.post('/checklists', checkAdmin, checklistController.criarChecklist);

/**
 * @swagger
 * /checklists/{id}:
 *   get:
 *     summary: Busca um checklist específico e seus itens
 *     tags: [Checklists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Retorna o checklist e seus itens.
 *       404:
 *         description: Checklist não encontrado.
 */
router.get('/checklists/:id', checklistController.buscarChecklist);

/**
 * @swagger
 * /checklists/{id}:
 *   put:
 *     summary: Atualiza o título de um checklist
 *     tags: [Checklists]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checklist atualizado com sucesso.
 */
router.put('/checklists/:id', checkAdmin, checklistController.atualizarChecklist);

/**
 * @swagger
 * /checklists/{id}:
 *   delete:
 *     summary: Inativa um checklist (Exclusão Lógica)
 *     tags: [Checklists]
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
 *     responses:
 *       200:
 *         description: Checklist inativado com sucesso.
 */
router.delete('/checklists/:id', checkAdmin, checklistController.excluirChecklist);

module.exports = router;