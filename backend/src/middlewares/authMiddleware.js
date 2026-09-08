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

      // ⚠️ CORREÇÃO: Transformamos tudo em minúsculo para comparar sem erros
      if (rolesPermitidas.length > 0) {
        // Pega o setor do usuário e converte para minúsculo
        const setorUsuario = (req.usuario.setor || '').trim().toLowerCase();
        
        // Converte as permissões exigidas pela rota para minúsculo também
        const roles = rolesPermitidas.map(role => role.trim().toLowerCase());

        if (!roles.includes(setorUsuario)) {
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