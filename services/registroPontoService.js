const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const BiometricService = require('./biometricService');

class RegistroPontoService {
  constructor() {
    this.filePath = path.join(__dirname, '..', 'pontos.json');
    this._inicializarArquivo();
  }

  _inicializarArquivo() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]));
    }
  }

  _lerRegistros() {
    const data = fs.readFileSync(this.filePath, 'utf-8');
    return JSON.parse(data);
  }

  _salvarRegistros(registros) {
    fs.writeFileSync(this.filePath, JSON.stringify(registros, null, 2));
  }

  async registrar(userId, { image_base64, latitude, longitude, device_time }) {
    console.log(`[RegistroPontoService] Processando ponto para o usuário ${userId} às ${device_time} (horário dispositivo)`);
    const registros = this._lerRegistros();

    // 1. Evitar duplicatas exatas
    const jaExiste = registros.find(r => r.user_id === userId && r.device_time === device_time);
    if (jaExiste) {
      console.log(`[RegistroPontoService] Registro duplicado detectado para ${userId} em ${device_time}. Ignorando.`);
      return jaExiste;
    }

    const biometricResult = await BiometricService.verifyFace(userId, image_base64);

    if (!biometricResult.match) {
      console.log(`[RegistroPontoService] Falha na biometria para o usuário ${userId}.`);
      const error = new Error('Face não reconhecida');
      error.status = 403;
      throw error;
    }

    const agoraServer = new Date();
    const agoraDevice = new Date(device_time);
    
    // 2. Validar intervalo mínimo
    const ultimoRegistro = registros
      .filter(r => r.user_id === userId)
      .sort((a, b) => new Date(b.device_time) - new Date(a.device_time))[0];

    if (ultimoRegistro) {
      const diferencaMinutos = Math.abs(agoraDevice - new Date(ultimoRegistro.device_time)) / (1000 * 60);
      if (diferencaMinutos < 1) {
        console.log(`[RegistroPontoService] Ponto muito recente para ${userId} (diferença: ${diferencaMinutos.toFixed(2)} min)`);
        const error = new Error('Já existe um registro recente para este usuário (intervalo < 1min)');
        error.status = 400;
        throw error;
      }
    }

    const novoRegistro = {
      id: uuidv4(),
      user_id: userId,
      latitude,
      longitude,
      device_time,
      server_time: agoraServer.toISOString(),
      similarity_score: biometricResult.similarity_score || biometricResult.similarity
    };

    registros.push(novoRegistro);
    this._salvarRegistros(registros);
    console.log(`[RegistroPontoService] ✅ Ponto salvo com sucesso no arquivo JSON para o usuário ${userId}!`);

    return novoRegistro;
  }
}

module.exports = new RegistroPontoService();
