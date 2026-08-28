const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/dados', userController.getDados);

module.exports = router;