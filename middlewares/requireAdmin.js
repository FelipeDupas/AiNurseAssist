/**
 * Middleware de autorização por papel (RBAC).
 * Deve ser usado APÓS authMiddleware, que já popula req.userRole.
 * Bloqueia requisições de usuários sem papel 'admin'.
 */
module.exports = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      error: 'Acesso negado. Esta operação exige permissão de administrador.',
    });
  }
  return next();
};
