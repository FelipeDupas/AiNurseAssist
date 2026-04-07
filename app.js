require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const helmet     = require('helmet');
const cookieParser = require('cookie-parser');

const authRoutes        = require('./routes/authRoutes');
const dashboardRoutes   = require('./routes/dashboardRoutes');
const biometricRoutes   = require('./routes/biometricRoutes');
const registroPontoRoutes = require('./routes/registroPontoRoutes');
const adminRoutes       = require('./routes/adminRoutes');

class App {
  constructor() {
    this.server = express();
    this.middlewares();
    this.routes();
  }

  middlewares() {
    // Security headers via helmet
    this.server.use(helmet({
      contentSecurityPolicy: false, // desabilitado para compatibilidade com face-api WASM em ambiente de dev
      crossOriginEmbedderPolicy: false,
    }));

    // CORS: Configuração flexível para desenvolvimento e integração mobile
    this.server.use(cors({
      origin: true,
      credentials: true,
    }));

    // Parsing de cookies (necessário para ler o JWT do cookie HttpOnly)
    this.server.use(cookieParser());

    // Limite de 50mb para suportar imagens biométricas em Base64
    this.server.use(express.json({ limit: '50mb' }));

    // Serve os arquivos estáticos do frontend (incluindo o dashboard.html)
    this.server.use(express.static(path.join(__dirname, 'public')));
  }

  routes() {
    this.server.use(authRoutes);
    this.server.use(dashboardRoutes);
    this.server.use(biometricRoutes);
    this.server.use(registroPontoRoutes);
    this.server.use(adminRoutes);
  }
}

module.exports = new App().server;
