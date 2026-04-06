const fs   = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'data', 'admin-config.json');

const DEFAULT_CONFIG = {
  toleranciaMinutos:  5,
  raioMetros:         500,
  thresholdBiometria: 0.6,
};

/**
 * Carrega a configuração do arquivo JSON em disco.
 * Retorna os valores padrão se o arquivo ainda não existir.
 */
function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Persiste a configuração no arquivo JSON em disco.
 * @param {object} config
 */
function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Controller de configurações administrativas.
 * Protegido por authMiddleware + requireAdmin.
 * Persiste as configurações em data/admin-config.json.
 */
class AdminController {
  /** Retorna a configuração atual do servidor. */
  getConfig(req, res) {
    return res.json(loadConfig());
  }

  /** Atualiza a configuração do servidor com os valores enviados. */
  updateConfig(req, res) {
    const { toleranciaMinutos, raioMetros, thresholdBiometria } = req.body;
    const config = loadConfig();

    // Valida e aplica somente campos presentes e dentro dos limites
    if (toleranciaMinutos !== undefined) {
      const v = parseInt(toleranciaMinutos);
      if (isNaN(v) || v < 0 || v > 60) {
        return res.status(400).json({ error: 'toleranciaMinutos deve estar entre 0 e 60' });
      }
      config.toleranciaMinutos = v;
    }

    if (raioMetros !== undefined) {
      const v = parseInt(raioMetros);
      if (isNaN(v) || v < 50 || v > 5000) {
        return res.status(400).json({ error: 'raioMetros deve estar entre 50 e 5000' });
      }
      config.raioMetros = v;
    }

    if (thresholdBiometria !== undefined) {
      const v = parseFloat(thresholdBiometria);
      if (isNaN(v) || v < 0.3 || v > 0.9) {
        return res.status(400).json({ error: 'thresholdBiometria deve estar entre 0.3 e 0.9' });
      }
      config.thresholdBiometria = v;
    }

    saveConfig(config);
    return res.json({ message: 'Configurações atualizadas', config });
  }
}

module.exports = new AdminController();
