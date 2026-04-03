class DashboardController {
  async index(req, res) {
    return res.json({
      message: 'Bem-vindo ao Dashboard!',
      auth_data: {
        user_id: req.userId,
        tenant_id: req.tenantId
      }
    });
  }
}

module.exports = new DashboardController();
