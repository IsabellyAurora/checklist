const jwt = require('jsonwebtoken');

const verificarToken = (rolesPermitidas = []) => {
  return (req, res, next) => {
    let token;

    // 1. Tenta pegar o token do cabeçalho de Autorização (Padrão)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // 2. Se não veio no cabeçalho, tenta pegar pela query string da URL (Usado pelo SSE / EventSource)
    else if (req.query.token) {
      token = req.query.token;
    }

    // 3. Se não achou em nenhum dos dois, barra o acesso
    if (!token) {
      return res.status(401).json({ success: false, error: 'Acesso negado. Token não fornecido.' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.usuario = decoded; // Fica disponível como req.usuario.id_usuario e req.usuario.setores

      if (rolesPermitidas.length > 0) {
        // Mapeia o array de setores do token (ou fallback vazio)
        const setoresUsuario = (req.usuario.setores || []).map(s => String(s).trim().toLowerCase());
        const roles = rolesPermitidas.map(role => String(role).trim().toLowerCase());

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