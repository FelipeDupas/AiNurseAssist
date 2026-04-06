const RegistroPontoService = require('../services/registroPontoService');
const DashboardService = require('../services/dashboardService');

class RegistroPontoController {
  /**
   * Registra uma batida de ponto para o usuário autenticado.
   * Valida biometria facial e localização antes de persistir.
   */
  async store(req, res) {
    const { userId } = req; // Obtido pelo middleware JWT
    try {
      const { image_base64, latitude, longitude, device_time } = req.body;

      // Todos os campos são obrigatórios para garantir a integridade do registro
      if (!image_base64 || latitude === undefined || longitude === undefined || !device_time) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }

      const registro = await RegistroPontoService.registrar(userId, {
        image_base64,
        latitude,
        longitude,
        device_time,
      });

      return res.status(201).json({
        message: 'Ponto registrado com sucesso',
        data: {
          user_id: registro.user_id,
          device_time: registro.device_time,
          server_time: registro.server_time,
          similarity_score: registro.similarity_score,
        },
      });

    } catch (error) {
      console.error('Erro no registro de ponto:', error);

      // Atualiza status para erro no dashboard de monitoramento
      await DashboardService.atualizarStatus(userId, 'error', error.message);

      // Erros de negócio (ex: face não reconhecida, duplicidade) têm status definido
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Erro interno ao registrar ponto', message: error.message });
    }
  }
}

module.exports = new RegistroPontoController();
