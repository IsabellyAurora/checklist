const checkAdmin = (req, res, next) => {
  // O frontend precisará enviar este header nas requisições protegidas
  const setorRequisitante = req.headers['x-setor-usuario'];

  if (!setorRequisitante || setorRequisitante.toLowerCase() !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado. Apenas administradores podem realizar esta ação.',
    });
  }

  next();
};

module.exports = checkAdmin;