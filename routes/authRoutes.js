const { Router }     = require('express');
const AuthController  = require('../controllers/authController');
const authMiddleware  = require('../middlewares/authMiddleware');

const routes = new Router();

// Rotas públicas
routes.post('/login',  AuthController.login);
routes.post('/logout', AuthController.logout);

// Rota de verificação de sessão — usada pelo frontend para checar se o cookie ainda é válido
routes.get('/auth/check', authMiddleware, AuthController.check);

module.exports = routes;
