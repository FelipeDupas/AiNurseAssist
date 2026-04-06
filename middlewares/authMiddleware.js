const jwt        = require('jsonwebtoken');
const authConfig = require('../config/auth');

/**
 * Middleware de autenticação via cookie HttpOnly.
 * Verifica o token JWT e injeta userId, tenantId e userRole no req.
 */
module.exports = (req, res, next) => {
  // Tenta obter o token do Cookie (Dashboard) ou do Header Authorization (App Mobile)
  let token = req.cookies?.ponto_token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    const decoded    = jwt.verify(token, authConfig.secret);
    req.userId       = decoded.user_id;
    req.tenantId     = decoded.tenant_id;
    req.userRole     = decoded.role || 'user'; // papel do usuário para RBAC
    return next();
  } catch {
    res.clearCookie('ponto_token', { httpOnly: true, sameSite: 'strict' });
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }
};
