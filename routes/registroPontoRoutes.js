const { Router } = require('express');
const RegistroPontoController = require('../controllers/registroPontoController');
const EspelhoController = require('../controllers/espelhoController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = new Router();

// Todas as rotas de registro de ponto exigem autenticação JWT
routes.post('/registro-ponto', authMiddleware, RegistroPontoController.store);

// Geração do espelho de ponto em PDF
routes.get('/registro-ponto/espelho', authMiddleware, EspelhoController.download);

module.exports = routes;
