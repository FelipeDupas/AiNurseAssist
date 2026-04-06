const jwt        = require('jsonwebtoken');
const authConfig = require('../config/auth');

/**
 * Middleware de autenticação via cookie HttpOnly.
 * Verifica o token JWT e injeta userId, tenantId e userRole no req.
 */
module.exports = (req, res, next) => {
  const token = req.cookies?.ponto_token;

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
