// src/routes/eventosRoutes.js
const express = require('express');
const router = express.Router();
const eventosController = require('../controllers/eventosController');

/**
 * @swagger
 * /eventos/stream:
 *   get:
 *     summary: Conexão Server-Sent Events (SSE) para notificações em tempo real
 *     tags: [Eventos]
 *     description: Mantenha esta rota aberta no frontend usando `new EventSource('/api/eventos/stream')`.
 */
router.get('/stream', eventosController.iniciarStream);

module.exports = router;