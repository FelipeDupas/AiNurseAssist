const { Router } = require('express');
const DashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = new Router();

// Todas as rotas deste módulo exigem autenticação
routes.use(authMiddleware);
routes.get('/dashboard', DashboardController.index);

module.exports = routes;
