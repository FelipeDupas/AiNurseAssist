const DashboardService = require('../services/dashboardService');

class DashboardController {
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
