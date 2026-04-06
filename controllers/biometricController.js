const BiometricService = require('../services/biometricService');

class BiometricController {
  /**
   * Verifica a identidade do usuário por reconhecimento facial.
   * Recebe uma imagem em base64 e retorna se o rosto corresponde ao perfil.
   */
  async verify(req, res) {
    try {
      const { image_base64 } = req.body;
      const { userId } = req;

      if (!image_base64) {
        return res.status(400).json({ error: 'image_base64 é obrigatório' });
      }

      const result = await BiometricService.verifyFace(userId, image_base64);
      return res.json(result);

    } catch (error) {
      console.error('Erro na verificacao biometrica:', error);

      if (error.message === 'Nenhum rosto detectado na imagem') {
        return res.status(422).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Erro ao processar biometria', message: error.message });
    }
  }
}

module.exports = new BiometricController();
