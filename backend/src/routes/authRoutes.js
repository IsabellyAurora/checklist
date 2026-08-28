const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.put('/trocar-senha', authController.trocarSenha);

module.exports = router;