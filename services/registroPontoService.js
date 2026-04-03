const { v4: uuidv4 } = require('uuid');
const BiometricService = require('./biometricService');

class RegistroPontoService {
  constructor() {
    this.registros = []; // Armazenamento em memória (Mock)
  }

  async registrar(userId, { image_base64, latitude, longitude, device_time }) {
    // 1. Validação biométrica
    const biometricResult = await BiometricService.verifyFace(userId, image_base64);

    if (!biometricResult.match) {
      const error = new Error('Face não reconhecida');
      error.status = 403;
      throw error;
    }

    // 2. Validação de duplicidade recente (Opcional)
    const agora = new Date();
    const ultimoRegistro = this.registros
      .filter(r => r.user_id === userId)
      .sort((a, b) => b.server_time - a.server_time)[0];

    if (ultimoRegistro) {
      const diferencaMinutos = (agora - ultimoRegistro.server_time) / (1000 * 60);
      if (diferencaMinutos < 1) { // Bloqueia registros com menos de 1 minuto de intervalo
        const error = new Error('Já existe um registro recente para este usuário');
        error.status = 400;
        throw error;
      }
    }

    // 3. Persistência dos dados
    const novoRegistro = {
      id: uuidv4(),
      user_id: userId,
      latitude,
      longitude,
      device_time,
      server_time: agora,
      similarity_score: biometricResult.similarity_score || biometricResult.similarity
    };

    this.registros.push(novoRegistro);

    return novoRegistro;
  }
}

module.exports = new RegistroPontoService();
