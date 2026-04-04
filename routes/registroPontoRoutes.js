const { Router } = require('express');
const RegistroPontoController = require('../controllers/registroPontoController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = new Router();

// Rota protegida — requer token JWT válido
routes.post('/registro-ponto', authMiddleware, RegistroPontoController.store);

module.exports = routes;
