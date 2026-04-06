require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const registroPontoRoutes = require('./routes/registroPontoRoutes');

class App {
  constructor() {
    this.server = express();
    this.middlewares();
    this.routes();
  }

  middlewares() {
    this.server.use(cors());
    this.server.use(express.json({ limit: '50mb' })); // Aumentado para suportar Base64 grandes
    this.server.use(express.static('public')); // Permite acessar o dashboard.html
  }

  routes() {
    this.server.use(authRoutes);
    this.server.use(dashboardRoutes);
    this.server.use(biometricRoutes);
    this.server.use(registroPontoRoutes);
  }
}

module.exports = new App().server;
