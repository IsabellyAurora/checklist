require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express'); // Novo import
const swaggerSpec = require('./config/swagger'); // Novo import
const cookieParser = require('cookie-parser'); // Adicione esta linha
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const checklistRoutes = require('./routes/checklistRoutes');
const execucaoRoutes = require('./routes/execucaoRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors({ 
  origin: ['http://localhost:5173', 'http://192.168.0.209:5173'], // Trave para a URL exata do seu front no React
  credentials: true // Essencial para permitir o tráfego de cookies entre front e back
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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