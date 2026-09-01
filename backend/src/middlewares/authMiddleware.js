const jwt = require('jsonwebtoken');

const verificarToken = (rolesPermitidas = []) => {
  return (req, res, next) => {
    // Busca o token no cabeçalho Authorization: Bearer <token>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Acesso negado. Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.usuario = decoded; // Fica disponível como req.usuario.id_usuario e req.usuario.setor

      // Bloqueia se a rota exigir setor específico e o usuário não for autorizado
      if (rolesPermitidas.length > 0 && !rolesPermitidas.includes(req.usuario.setor)) {
        return res.status(403).json({ success: false, error: 'Acesso negado para este setor.' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Token inválido ou expirado.' });
    }
  };
};

module.exports = verificarToken;