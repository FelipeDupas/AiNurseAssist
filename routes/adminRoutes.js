const { Router }     = require('express');
const AdminController = require('../controllers/adminController');
const authMiddleware  = require('../middlewares/authMiddleware');
const requireAdmin    = require('../middlewares/requireAdmin');

const routes = new Router();

// Rotas protegidas por autenticação E papel admin
routes.get('/admin/config',  authMiddleware, requireAdmin, AdminController.getConfig);
routes.post('/admin/config', authMiddleware, requireAdmin, AdminController.updateConfig);

module.exports = routes;
