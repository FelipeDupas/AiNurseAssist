const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authConfig = require('../config/auth');

class AuthController {
  async login(req, res) {
    const { email, password } = req.body;

    const user = {
      id: 'user_123',
      tenant_id: 'tenant_abc',
      email: 'admin@example.com',
      passwordHash: '$2a$10$K7v7GvA.LqXqVp8p6p6p6uVwXyZ01234567890abcdefghijk'
    };

    if (email !== user.email) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const token = jwt.sign(
      { user_id: user.id, tenant_id: user.tenant_id },
      authConfig.secret,
      { expiresIn: authConfig.expiresIn }
    );

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id
      },
      token
    });
  }
}

module.exports = new AuthController();
