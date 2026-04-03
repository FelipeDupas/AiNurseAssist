const { Router } = require('express');
const AuthController = require('../controllers/authController');

const routes = new Router();
routes.post('/login', AuthController.login);

module.exports = routes;
