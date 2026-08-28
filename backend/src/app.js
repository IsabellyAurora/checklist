const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Rota Status API
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: { mensagem: 'API Backend rodando com sucesso!' },
  });
});

// Prefixar rotas
app.use('/api', authRoutes);
app.use('/api', userRoutes);

// Middleware de erros por último
app.use(errorHandler);

module.exports = app;