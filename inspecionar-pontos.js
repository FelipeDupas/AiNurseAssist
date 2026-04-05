const RegistroPontoService = require('./services/registroPontoService');

function inspecionarRegistros() {
  console.log('--- INSPEÇÃO DE REGISTROS DE PONTO ---');
  const registros = RegistroPontoService.registros;
  
  if (registros.length === 0) {
    console.log('Nenhum registro encontrado na memória.');
  } else {
    console.log(`Total de registros: ${registros.length}`);
    registros.forEach((r, i) => {
      console.log(`\n[Registro #${i + 1}]`);
      console.log(`Usuário: ${r.user_id}`);
      console.log(`GPS: ${r.latitude}, ${r.longitude}`);
      console.log(`Score de Biometria: ${r.similarity_score}`);
      console.log(`Data Servidor: ${r.server_time}`);
    });
  }
}

inspecionarRegistros();
