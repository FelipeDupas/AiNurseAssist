const axios = require('axios');

async function executarTeste() {
  const baseURL = 'http://localhost:3000';
  
  console.log('--- [PASSO 1] REALIZANDO LOGIN ---');
  try {
    const loginResponse = await axios.post(`${baseURL}/login`, {
      email: 'admin@example.com',
      password: '123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login realizado! Token obtido.');

    console.log('\n--- [PASSO 2] ACESSANDO DASHBOARD PROTEGIDO ---');
    const dashResponse = await axios.get(`${baseURL}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Dashboard acessado:', dashResponse.data.message);

    console.log('\n--- [PASSO 3] TESTANDO BIOMETRIA ---');
    // Imagem branca 10x10 válida em JPEG
    const base64Exemplo = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfFAD/9k=";

    try {
      const bioResponse = await axios.post(`${baseURL}/biometric/verify`, 
        { image_base64: base64Exemplo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Resultado da Biometria:', bioResponse.data);
    } catch (err) {
      if (err.response && err.response.status === 422) {
        console.log('ℹ️ Resposta esperada: A imagem foi recebida, mas não continha um rosto real para comparar.');
      } else {
        throw err;
      }
    }

    console.log('\n--- TESTE CONCLUÍDO COM SUCESSO ---');

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.response ? error.response.data : error.message);
  }
}

executarTeste();
