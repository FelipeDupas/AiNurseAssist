const path = require('path');

// Configurações do serviço de reconhecimento facial
module.exports = {
  // Distância euclidiana máxima para considerar dois rostos como correspondentes
  // Valores menores = maior exigência de similaridade
  threshold: 0.6,
  // Caminho para os modelos treinados da face-api
  modelsPath: path.join(__dirname, '../models'),
};
