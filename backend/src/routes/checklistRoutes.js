// checklistRoutes.js
const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklistController');
const { uploadMemoria, otimizarImagem } = require('../middlewares/uploadMiddleware');
const verificarToken = require('../middlewares/authMiddleware'); 

/**
 * @swagger
 * /checklists:
 *   get:
 *     summary: Lista os checklists ativos com paginação (e filtro opcional de setor)
 *     tags: [Checklists]
 *     parameters:
 *       - in: query
 *         name: id_setor
 *         schema:
 *           type: integer
 *         description: "Filtra os checklists pelo ID numérico de um setor específico"
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
 *   post:
 *     summary: Cria um novo checklist com controle de periodicidade e etapas
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               id_setor:
 *                 type: integer
 *               tipo_agendamento:
 *                 type: string
 *                 description: "INTERVALO_DIAS ou DATA_ESPECIFICA"
 *               intervalo_dias:
 *                 type: integer
 *               data_especifica:
 *                 type: string
 *                 format: date
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
 *                     etapa:
 *                       type: string
 *                     ordem_etapa:
 *                       type: integer
 *             example:
 *               titulo: "Inspeção Diária de Motores"
 *               id_setor: 1
 *               tipo_agendamento: "INTERVALO_DIAS"
 *               intervalo_dias: 15
 *               itens:
 *                 - ordem: 1
 *                   descricao: "Verificar ruído"
 *                   tipo: "booleano"
 *                   obrigatorio: true
 *                   etapa: "Passo 1: Motores"
 *                   ordem_etapa: 1
 *     responses:
 *       201:
 *         description: Checklist e itens criados com sucesso.
 *       400:
 *         description: Dados inválidos.
 */
router.get('/checklists', verificarToken(), checklistController.listarChecklists);
router.post('/checklists', verificarToken(['admin']), checklistController.criarChecklist);

/**
 * @swagger
 * /checklists/pendentes/hoje:
 *   get:
 *     summary: Lista os checklists que precisam ser preenchidos no dia atual
 *     description: Calcula pendências baseadas no intervalo de dias e na última execução concluída. Ignora checklists que já estão EM_ANDAMENTO.
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array de checklists pendentes.
 */
router.get('/checklists/pendentes/hoje', verificarToken(), checklistController.listarPendentesDia);

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
 *     summary: Atualiza os dados do checklist e itens (Cria nova versão se já houver execuções)
 *     tags: [Checklists]
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
 *               titulo:
 *                 type: string
 *               id_setor:
 *                 type: integer
 *               tipo_agendamento:
 *                 type: string
 *               intervalo_dias:
 *                 type: integer
 *               data_especifica:
 *                 type: string
 *                 format: date
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
 *                     etapa:
 *                       type: string
 *                     ordem_etapa:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Checklist atualizado com sucesso.
 */
router.put('/checklists/:id', verificarToken(['admin']), checklistController.atualizarChecklist);

/**
 * @swagger
 * /checklists/{id}:
 *   delete:
 *     summary: Inativa um checklist (Exclusão Lógica)
 *     tags: [Checklists]
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
 *         description: Checklist inativado com sucesso.
 */
router.delete('/checklists/:id', verificarToken(['admin']), checklistController.excluirChecklist);

/**
 * @swagger
 * /checklists/itens/{id_item}/referencia:
 *   post:
 *     summary: Anexa uma foto de referência (padrão visual) para uma pergunta do checklist
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_item
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
 *         description: Imagem de referência salva com sucesso.
 */
router.post(
  '/checklists/itens/:id_item/referencia', 
  verificarToken(), 
  uploadMemoria.single('imagem'), 
  otimizarImagem('referencias'), 
  checklistController.uploadReferenciaItem
);

/**
 * @swagger
 * /checklists/{id}/versoes:
 *   get:
 *     summary: Retorna o histórico completo de versões de um checklist
 *     tags: [Checklists]
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
 *         description: Histórico de versões retornado com sucesso.
 */
router.get('/checklists/:id/versoes', verificarToken(['admin']), checklistController.listarVersoesChecklist);

module.exports = router;