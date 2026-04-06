const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * Rotas de Dashboard
 */

// Rota base do Dashboard (exige autenticação)
router.get('/dashboard', authMiddleware, DashboardController.index);

// Rota de Status de Sincronização (Monitoramento em tempo real)
// Aberta em ambiente de teste para facilitar o acompanhamento
router.get('/sync-status', DashboardController.getSyncStatus);

module.exports = router;
