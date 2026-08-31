const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express'); // Novo import
const swaggerSpec = require('./config/swagger'); // Novo import

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const checklistRoutes = require('./routes/checklistRoutes');
const execucaoRoutes = require('./routes/execucaoRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Rota da Documentação Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rotas da aplicação
app.use('/api', authRoutes);
app.use('/api', userRoutes);

// Middleware de erros (sempre por último)
app.use(errorHandler);


app.use('/api', checklistRoutes);
app.use('/api', execucaoRoutes);

module.exports = app;