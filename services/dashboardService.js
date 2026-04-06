const fs = require('fs');
const path = require('path');

class DashboardService {
  constructor() {
    this.filePath = path.join(__dirname, '..', 'sync_status.json');
    this._inicializarArquivo();
  }

  _inicializarArquivo() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]));
    }
  }

  _lerStatus() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  _salvarStatus(statusList) {
    fs.writeFileSync(this.filePath, JSON.stringify(statusList, null, 2));
  }

  async atualizarStatus(userId, status, errorMessage = null) {
    const statusList = this._lerStatus();
    const index = statusList.findIndex(s => s.user_id === userId);
    const agora = new Date().toISOString();

    const novoStatus = {
      user_id: userId,
      status: status,
      last_attempt_at: agora,
      last_sync_at: status === 'online' ? agora : (index !== -1 ? statusList[index].last_sync_at : null),
      error_message: errorMessage
    };

    if (index !== -1) {
      statusList[index] = { ...statusList[index], ...novoStatus };
    } else {
      statusList.push(novoStatus);
    }

    this._salvarStatus(statusList);
  }

  getSyncStatusList() {
    const statusList = this._lerStatus();
    const agora = new Date();
    const MINUTOS_OFFLINE = 10;

    // Lógica para converter "online" em "offline" se passar de 10 minutos
    return statusList.map(item => {
      let statusCalculado = item.status;
      
      if (item.status === 'online' && item.last_sync_at) {
        const ultimaSync = new Date(item.last_sync_at);
        const diferencaMinutos = (agora - ultimaSync) / (1000 * 60);
        
        if (diferencaMinutos > MINUTOS_OFFLINE) {
          statusCalculado = 'offline';
        }
      }

      return {
        ...item,
        status: statusCalculado
      };
    });
  }
}

module.exports = new DashboardService();
