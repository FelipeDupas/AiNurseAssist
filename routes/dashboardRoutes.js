const { Router } = require('express');
const DashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = new Router();
routes.use(authMiddleware);
routes.get('/dashboard', DashboardController.index);

module.exports = routes;
