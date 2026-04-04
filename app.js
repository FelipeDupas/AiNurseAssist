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
      contentSecurityPolicy: {
        directives: {
          defaultSrc:  ["'self'"],
          scriptSrc:   ["'self'"],
          styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
          imgSrc:      ["'self'", 'data:', 'blob:'],
          mediaSrc:    ["'self'", 'blob:'],
          connectSrc:  ["'self'"],
          workerSrc:   ["'self'", 'blob:'],
          objectSrc:   ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // desabilitado para compatibilidade com face-api WASM
    }));

    // CORS: em produção exige ALLOWED_ORIGIN explícito; em dev aceita localhost
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGIN) {
      throw new Error('[FATAL] ALLOWED_ORIGIN não está definido. Configure a variável de ambiente antes de iniciar em produção.');
    }
    this.server.use(cors({
      origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
      credentials: true, // permite envio de cookies
    }));

    // Parsing de cookies (necessário para ler o JWT do cookie HttpOnly)
    this.server.use(cookieParser());

    // Limite de 50mb para suportar imagens biométricas em Base64
    this.server.use(express.json({ limit: '50mb' }));

    // Serve os arquivos estáticos do frontend
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
