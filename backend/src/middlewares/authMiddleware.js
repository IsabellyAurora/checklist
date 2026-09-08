const jwt = require('jsonwebtoken');

const verificarToken = (rolesPermitidas = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Acesso negado. Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.usuario = decoded; // Fica disponível como req.usuario.id_usuario e req.usuario.setores

      if (rolesPermitidas.length > 0) {
        // Agora mapeia o array de setores do token (ou fallback vazio)
        const setoresUsuario = (req.usuario.setores || []).map(s => s.trim().toLowerCase());
        const roles = rolesPermitidas.map(role => role.trim().toLowerCase());

        // Verifica se o usuário possui pelo menos um dos setores permitidos
        const temPermissao = roles.some(role => setoresUsuario.includes(role));

        if (!temPermissao) {
          return res.status(403).json({ success: false, error: 'Acesso negado para este setor.' });
        }
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Token inválido ou expirado.' });
    }
  };
};

module.exports = verificarToken;