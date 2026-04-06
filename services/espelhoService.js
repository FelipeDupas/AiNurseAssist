const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class EspelhoService {
  constructor() {
    this.filePath = path.join(__dirname, '..', 'pontos.json');
  }

  _lerRegistros() {
    if (!fs.existsSync(this.filePath)) return [];
    const data = fs.readFileSync(this.filePath, 'utf-8');
    return JSON.parse(data);
  }

  async gerarPDF(userId, dataInicio, dataFim) {
    const todosRegistros = this._lerRegistros();
    
    // Filtrar por usuário e período (opcional)
    let registros = todosRegistros.filter(r => r.user_id === userId);

    if (dataInicio) {
      registros = registros.filter(r => new Date(r.device_time) >= new Date(dataInicio));
    }
    if (dataFim) {
      registros = registros.filter(r => new Date(r.device_time) <= new Date(dataFim));
    }

    // Ordenar por data/hora
    registros.sort((a, b) => new Date(a.device_time) - new Date(b.device_time));

    const htmlContent = this._gerarHTML(userId, registros, dataInicio, dataFim);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser.close();
    return pdfBuffer;
  }

  _gerarHTML(userId, registros, dataInicio, dataFim) {
    const dataGeracao = new Date().toLocaleString('pt-BR');
    const periodoStr = (dataInicio && dataFim) 
      ? `${new Date(dataInicio).toLocaleDateString('pt-BR')} até ${new Date(dataFim).toLocaleDateString('pt-BR')}`
      : 'Período Completo';

    const linhasTabela = registros.map(r => {
      const dt = new Date(r.device_time);
      return `
        <tr>
          <td>${dt.toLocaleDateString('pt-BR')}</td>
          <td>${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
          <td>${r.tipo || 'Registro de Ponto'}</td>
          <td>${r.latitude ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}` : '---'}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
              .header { border-bottom: 2px solid #1a73e8; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
              .logo { font-size: 24px; font-weight: bold; color: #1a73e8; }
              .doc-title { text-align: right; }
              h1 { font-size: 18px; margin: 0; }
              .info-section { margin-bottom: 30px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
              th { background-color: #f8f9fa; color: #555; }
              .footer { margin-top: 50px; }
              .signature-area { margin-top: 80px; display: flex; justify-content: space-around; }
              .signature-box { border-top: 1px solid #333; width: 250px; text-align: center; padding-top: 5px; font-size: 12px; }
              .generation-date { font-size: 10px; color: #999; margin-top: 20px; text-align: center; }
          </style>
      </head>
      <body>
          <div class="header">
              <div class="logo">SISTEMA PONTO</div>
              <div class="doc-title">
                  <h1>Espelho de Ponto Oficial</h1>
                  <p style="margin: 0; font-size: 12px; color: #666;">Relatório de Frequência</p>
              </div>
          </div>

          <div class="info-section">
              <div class="info-grid">
                  <div><strong>Funcionário:</strong> ${userId}</div>
                  <div><strong>ID do Usuário:</strong> ${userId}</div>
                  <div><strong>Período:</strong> ${periodoStr}</div>
              </div>
          </div>

          <table>
              <thead>
                  <tr>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Tipo</th>
                      <th>Localização (Lat, Long)</th>
                  </tr>
              </thead>
              <tbody>
                  ${linhasTabela || '<tr><td colspan="4" style="text-align: center;">Nenhum registro encontrado no período.</td></tr>'}
              </tbody>
          </table>

          <div class="footer">
              <div class="signature-area">
                  <div class="signature-box">
                      Assinatura do Colaborador
                  </div>
                  <div class="signature-box">
                      Assinatura do Gestor / RH
                  </div>
              </div>
              <div class="generation-date">
                  Documento gerado em: ${dataGeracao}
              </div>
          </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EspelhoService();
