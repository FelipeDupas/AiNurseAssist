const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-backend-wasm');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const config = require('../config/biometric');

class BiometricService {
  constructor() {
    // Flag para evitar recarregar os modelos a cada requisição
    this.modelsLoaded = false;
  }

  /**
   * Inicializa o backend WASM e carrega os modelos de reconhecimento facial.
   * Executado apenas uma vez (lazy loading).
   */
  async loadModels() {
    if (!this.modelsLoaded) {
      console.log('Configurando backend WASM...');
      await tf.setBackend('wasm');
      await tf.ready();

      console.log('Carregando modelos de biometria...');
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(config.modelsPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(config.modelsPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(config.modelsPath);
      console.log('Modelos carregados com sucesso.');

      this.modelsLoaded = true;
    }
  }

  /**
   * Converte uma string Base64 em um tensor 3D (altura x largura x RGB)
   * no formato esperado pela face-api.
   * @param {string} base64String - Imagem em base64 (com ou sem prefixo data:image/...)
   * @returns {Promise<tf.Tensor3D>}
   */
  async base64ToTensor(base64String) {
    try {
      // Remove o prefixo "data:image/...;base64," se presente
      const base64Data = base64String.includes('base64,')
        ? base64String.split('base64,')[1]
        : base64String;

      const buffer = Buffer.from(base64Data, 'base64');
      const image = await Jimp.read(buffer);

      const { width, height } = image.bitmap;
      const values = new Int32Array(width * height * 3);

      // Converte os pixels RGBA do Jimp para RGB (descarta o canal alpha)
      for (let i = 0; i < width * height; i++) {
        values[i * 3 + 0] = image.bitmap.data[i * 4 + 0]; // R
        values[i * 3 + 1] = image.bitmap.data[i * 4 + 1]; // G
        values[i * 3 + 2] = image.bitmap.data[i * 4 + 2]; // B
      }

      return tf.tensor3d(values, [height, width, 3], 'int32');
    } catch (error) {
      console.error('Erro ao converter imagem para tensor:', error);
      throw new Error(`Erro ao converter imagem para Tensor: ${error.message}`);
    }
  }

  /**
   * Verifica se o rosto na imagem enviada corresponde ao rosto de perfil do usuário.
   * Usa distância euclidiana entre os descritores faciais para medir similaridade.
   * @param {string} userId - ID do usuário autenticado
   * @param {string} imageBase64 - Imagem capturada em base64
   * @returns {Promise<{similarity_score: number, match: boolean}>}
   */
  async verifyFace(userId, imageBase64) {
    await this.loadModels();

    // Carrega a foto de perfil do disco para comparação (mock — substituir por banco de dados)
    const profilePath = path.join(__dirname, '..', 'sample.png');
    let userProfilePhotoBase64;

    if (fs.existsSync(profilePath)) {
      userProfilePhotoBase64 = fs.readFileSync(profilePath, 'base64');
    } else {
      // Fallback: pixel transparente 1x1 caso a foto de perfil não exista
      userProfilePhotoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    }

    let t1, t2;
    try {
      // Converte ambas as imagens para tensores
      t1 = await this.base64ToTensor(userProfilePhotoBase64);
      t2 = await this.base64ToTensor(imageBase64);

      // Detecta rosto e extrai descritor facial de cada imagem
      const d1 = await faceapi.detectSingleFace(t1).withFaceLandmarks().withFaceDescriptor();
      const d2 = await faceapi.detectSingleFace(t2).withFaceLandmarks().withFaceDescriptor();

      if (!d1) throw new Error('Rosto não detectado na foto de perfil');
      if (!d2) throw new Error('Nenhum rosto detectado na imagem enviada');

      // Calcula a distância entre os descritores (0 = idênticos, >1 = muito diferentes)
      const distance = faceapi.euclideanDistance(d1.descriptor, d2.descriptor);
      const similarityScore = Math.max(0, 1 - distance).toFixed(2);

      return {
        similarity_score: parseFloat(similarityScore),
        match: distance < config.threshold,
      };
    } finally {
      // Libera memória dos tensores ao finalizar, independente de erro
      if (t1) t1.dispose();
      if (t2) t2.dispose();
    }
  }
}

module.exports = new BiometricService();
