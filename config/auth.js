const crypto = require('crypto');

// Em produção, JWT_SECRET é obrigatório — falha imediatamente se ausente
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error(
    '[FATAL] JWT_SECRET não está definido. ' +
    'Configure a variável de ambiente antes de iniciar em produção.'
  );
}

// Em desenvolvimento sem JWT_SECRET: gera segredo aleatório por sessão.
// Tokens serão inválidos após reiniciar o servidor — use apenas para dev.
let secret = process.env.JWT_SECRET;
if (!secret) {
  secret = crypto.randomBytes(32).toString('hex');
  console.warn(
    '[AVISO] JWT_SECRET não definido. ' +
    'Usando segredo temporário — todos os tokens expirarão ao reiniciar. ' +
    'Defina JWT_SECRET em .env para evitar isso.'
  );
}

module.exports = {
  secret,
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
};
