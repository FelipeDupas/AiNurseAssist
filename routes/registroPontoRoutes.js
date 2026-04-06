const { Router } = require('express');
const RegistroPontoController = require('../controllers/registroPontoController');
const EspelhoController = require('../controllers/espelhoController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = new Router();

// Rotas protegidas por JWT
routes.post('/registro-ponto', authMiddleware, RegistroPontoController.store);
routes.get('/registro-ponto/espelho', authMiddleware, EspelhoController.download);

module.exports = routes;
