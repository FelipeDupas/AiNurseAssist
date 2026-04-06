require('dotenv').config();

// Variáveis obrigatórias para o sistema funcionar em qualquer ambiente
const REQUIRED_ENV = ['JWT_SECRET', 'MOCK_USER_CPF', 'MOCK_USER_PASSWORD'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('[FATAL] Variáveis de ambiente ausentes:', missing.join(', '));
  console.error('        Configure o arquivo .env antes de iniciar.');
  process.exit(1);
}

const app  = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
