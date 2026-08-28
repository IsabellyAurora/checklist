const errorHandler = (err, req, res, next) => {
  console.error('Erro não tratado:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno no servidor.';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

module.exports = errorHandler;