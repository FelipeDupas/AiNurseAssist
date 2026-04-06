const RegistroPontoService = require('../services/registroPontoService');
const DashboardService = require('../services/dashboardService');

class RegistroPontoController {
  async store(req, res) {
    const { userId } = req; // Obtido pelo middleware JWT
    try {
      const { image_base64, latitude, longitude, device_time } = req.body;

      // Validação básica dos inputs
      if (!image_base64 || latitude === undefined || longitude === undefined || !device_time) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }

      const registro = await RegistroPontoService.registrar(userId, {
        image_base64,
        latitude,
        longitude,
        device_time
      });

      return res.status(201).json({
        message: 'Ponto registrado com sucesso',
        data: {
          user_id: registro.user_id,
          device_time: registro.device_time,
          server_time: registro.server_time,
          similarity_score: registro.similarity_score
        }
      });

    } catch (error) {
      console.error('ERRO NO REGISTRO DE PONTO:', error);

      // Atualiza status para erro no dashboard
      await DashboardService.atualizarStatus(userId, 'error', error.message);

      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Erro interno ao registrar ponto', message: error.message });
    }
  }
}

module.exports = new RegistroPontoController();
