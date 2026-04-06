const jwt        = require('jsonwebtoken');
const authConfig = require('../config/auth');

class AuthController {
  /**
   * Realiza o login com CPF e senha.
   * Credenciais vêm de variáveis de ambiente (mock de banco de dados).
   * Token JWT enviado via cookie HttpOnly — nunca exposto ao JS da página.
   */
  async login(req, res) {
    const { cpf, password } = req.body;

    // Credenciais carregadas do ambiente — substituir por consulta ao banco em produção
    const mockCpf      = process.env.MOCK_USER_CPF;
    const mockPassword = process.env.MOCK_USER_PASSWORD;

    if (!mockCpf || !mockPassword) {
      console.error('[authController] MOCK_USER_CPF ou MOCK_USER_PASSWORD não definidos no .env');
      return res.status(500).json({ error: 'Serviço de autenticação indisponível' });
    }

    const cpfNormalizado  = String(cpf || '').replace(/\D/g, '');
    const mockCpfNormalizado = String(mockCpf || '').replace(/\D/g, '');

    if (cpfNormalizado !== mockCpfNormalizado) {
      console.log(`[AuthController] Falha no login: CPF recebido (${cpfNormalizado}) não bate com o esperado (${mockCpfNormalizado})`);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (String(password || '') !== mockPassword) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Inclui role no payload para controle de acesso por papel
    const token = jwt.sign(
      {
        user_id:   'user_123',
        tenant_id: 'tenant_abc',
        role:      'admin', // em produção: ler do banco de dados
      },
      authConfig.secret,
      { expiresIn: authConfig.expiresIn }
    );

    res.cookie('ponto_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   3600 * 1000,
    });

    // Retorna dados para exibição E o token para compatibilidade com o App Mobile
    return res.json({
      token, // Adicionado para o App Mobile
      user: {
        nome:      process.env.MOCK_USER_NOME      || 'Servidor',
        matricula: process.env.MOCK_USER_MATRICULA || '00000',
      },
    });
  }

  /** Encerra a sessão limpando o cookie JWT. */
  logout(req, res) {
    res.clearCookie('ponto_token', { httpOnly: true, sameSite: 'strict' });
    return res.json({ message: 'Sessão encerrada' });
  }

  /** Verifica se a sessão atual é válida (usado pelo frontend para checar o cookie). */
  check(req, res) {
    // Se chegou aqui, o authMiddleware já validou o token
    return res.status(204).end();
  }
}

module.exports = new AuthController();
