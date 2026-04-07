const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const BiometricService = require('./biometricService');
const DashboardService = require('./dashboardService');

class RegistroPontoService {
  constructor() {
    // Mantemos o pontos.json na raiz conforme o uso atual
    this.filePath = path.join(__dirname, '..', 'pontos.json');
    this._inicializarArquivo();
  }

  _inicializarArquivo() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]));
    }
  }

  _lerRegistros() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  _salvarRegistros(registros) {
    fs.writeFileSync(this.filePath, JSON.stringify(registros, null, 2));
  }

  async listarPorUsuario(userId) {
    const registros = this._lerRegistros();
    return registros.filter(r => r.user_id === userId);
  }

  /**
   * Registra uma batida de ponto após validar biometria e duplicidade.
   */
  async registrar(userId, { image_base64, latitude, longitude, device_time }) {
    console.log(`[RegistroPontoService] Processando ponto para o usuário ${userId} às ${device_time}`);
    const registros = this._lerRegistros();

    // 1. Evitar duplicatas exatas (mesmo device_time)
    const jaExiste = registros.find(r => r.user_id === userId && r.device_time === device_time);
    if (jaExiste) {
      console.log(`[RegistroPontoService] Registro duplicado detectado para ${userId}.`);
      await DashboardService.atualizarStatus(userId, 'online');
      return jaExiste;
    }

    // 2. Valida a identidade do usuário por reconhecimento facial
    const biometricResult = await BiometricService.verifyFace(userId, image_base64);

    if (!biometricResult.match) {
      console.log(`[RegistroPontoService] Falha na biometria para o usuário ${userId}.`);
      const error = new Error('Face não reconhecida');
      error.status = 403;
      throw error;
    }

    // 3. Previne registros duplicados em menos de 1 minuto
    const agoraServer = new Date();
    const ultimoRegistro = registros
      .filter(r => r.user_id === userId)
      .sort((a, b) => new Date(b.device_time) - new Date(a.device_time))[0];

    if (ultimoRegistro) {
      const ultimaBatida = new Date(ultimoRegistro.server_time || ultimoRegistro.device_time);
      const diferencaMinutos = Math.abs(agoraServer - ultimaBatida) / (1000 * 60);
      
      if (diferencaMinutos < 1) {
        console.log(`[RegistroPontoService] Ponto muito recente para ${userId} (${diferencaMinutos.toFixed(2)} min)`);
        const error = new Error('Já existe um registro recente para este usuário (intervalo < 1min)');
        error.status = 400;
        throw error;
      }
    }

    // 4. Persiste o novo registro de ponto
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
    console.log(`[RegistroPontoService] ✅ Ponto salvo com sucesso para o usuário ${userId}!`);

    // Atualiza status para o dashboard de monitoramento em tempo real
    await DashboardService.atualizarStatus(userId, 'online');

    return novoRegistro;
  }
}

module.exports = new RegistroPontoService();
