const EspelhoService = require('../services/espelhoService');

class EspelhoController {
  async download(req, res) {
    try {
      // Prioriza o user_id da query, senão usa o do token (req.userId)
      const userId = req.query.user_id || req.userId;
      const { data_inicio, data_fim } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'User ID é obrigatório' });
      }

      console.log(`[EspelhoController] Gerando espelho de ponto para o usuário: ${userId}`);

      const pdfBuffer = await EspelhoService.gerarPDF(userId, data_inicio, data_fim);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=espelho-ponto-${userId}.pdf`);
      
      // Envia os bytes brutos usando res.end em vez de res.send para evitar JSON
      return res.end(Buffer.from(pdfBuffer));

    } catch (error) {
      console.error('ERRO AO GERAR PDF:', error);
      return res.status(500).json({ error: 'Erro interno ao gerar o espelho de ponto' });
    }
  }
}

module.exports = new EspelhoController();
