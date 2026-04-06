const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rota da API (agora aberta para facilitar o monitoramento em ambiente de teste)
router.get('/sync-status', DashboardController.getSyncStatus);

module.exports = router;
