const DashboardService = require('../services/dashboardService');

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

  /**
   * Retorna a lista de status de sincronização de todos os usuários.
   * Utilizado pelo dashboard de monitoramento em tempo real.
   */
  async getSyncStatus(req, res) {
    try {
      const statusList = DashboardService.getSyncStatusList();
      return res.json(statusList);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao carregar status de sincronização' });
    }
  }
}

module.exports = new DashboardController();
