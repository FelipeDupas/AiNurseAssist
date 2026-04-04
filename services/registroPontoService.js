const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const BiometricService = require('./biometricService');

const REGISTROS_FILE = path.join(__dirname, '..', 'data', 'registros.json');

/**
 * Carrega os registros persistidos do arquivo JSON.
 * Converte os campos server_time de volta para Date.
 * @returns {object[]}
 */
function loadRegistros() {
  try {
    const raw = fs.readFileSync(REGISTROS_FILE, 'utf8');
    return JSON.parse(raw).map(r => ({ ...r, server_time: new Date(r.server_time) }));
  } catch {
    return [];
  }
}

/**
 * Persiste a lista de registros no arquivo JSON em disco.
 * @param {object[]} registros
 */
function saveRegistros(registros) {
  fs.writeFileSync(REGISTROS_FILE, JSON.stringify(registros, null, 2), 'utf8');
}

class RegistroPontoService {
  /**
   * Registra uma batida de ponto após validar biometria e duplicidade.
   * @param {string} userId - ID do usuário autenticado
   * @param {object} dados
   * @param {string} dados.image_base64 - Imagem do rosto em base64
   * @param {number} dados.latitude - Latitude do dispositivo
   * @param {number} dados.longitude - Longitude do dispositivo
   * @param {string} dados.device_time - Horário ISO reportado pelo dispositivo
   * @returns {Promise<object>} Registro criado
   */
  async registrar(userId, { image_base64, latitude, longitude, device_time }) {
    // 1. Valida a identidade do usuário por reconhecimento facial
    const biometricResult = await BiometricService.verifyFace(userId, image_base64);

    if (!biometricResult.match) {
      const error = new Error('Face não reconhecida');
      error.status = 403;
      throw error;
    }

    // 2. Previne registros duplicados em menos de 1 minuto para o mesmo usuário
    const agora = new Date();
    const registros = loadRegistros();
    const ultimoRegistro = registros
      .filter(r => r.user_id === userId)
      .sort((a, b) => b.server_time - a.server_time)[0];

    if (ultimoRegistro) {
      const diferencaMinutos = (agora - ultimoRegistro.server_time) / (1000 * 60);
      if (diferencaMinutos < 1) {
        const error = new Error('Já existe um registro recente para este usuário');
        error.status = 400;
        throw error;
      }
    }

    // 3. Persiste o novo registro de ponto
    const novoRegistro = {
      id:               uuidv4(),
      user_id:          userId,
      latitude,
      longitude,
      device_time,
      server_time:      agora,
      similarity_score: biometricResult.similarity_score,
    };

    registros.push(novoRegistro);
    saveRegistros(registros);

    return novoRegistro;
  }
}

module.exports = new RegistroPontoService();
