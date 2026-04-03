const { Router } = require('express');
const BiometricController = require('../controllers/biometricController');
const authMiddleware = require('../middlewares/authMiddleware');

const routes = new Router();
routes.post('/biometric/verify', authMiddleware, BiometricController.verify);

module.exports = routes;
