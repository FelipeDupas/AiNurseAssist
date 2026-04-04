class DashboardController {
  /**
   * Retorna os dados básicos do dashboard para o usuário autenticado.
   * Os campos user_id e tenant_id são injetados pelo middleware JWT.
   */
  async index(req, res) {
    return res.json({
      message: 'Bem-vindo ao Dashboard!',
      auth_data: {
        user_id: req.userId,
        tenant_id: req.tenantId,
      },
    });
  }
}

module.exports = new DashboardController();
