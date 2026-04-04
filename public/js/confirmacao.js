/* ============================================================
   CONFIRMAÇÃO PAGE — Exibe resultado do registro de ponto
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  if (!await requireAuth()) return;
  initSidebar();

  document.getElementById('btn-voltar')?.addEventListener('click', () => {
    window.location.href = '/dashboard.html';
  });

  const registro = JSON.parse(localStorage.getItem('ponto_ultimo_registro') || 'null');

  // Redireciona se não houver registro pendente válido
  if (!registro || (!registro.user_id && !registro.server_time)) {
    showToast('Nenhum registro encontrado. Faça uma nova captura.', 'warning');
    setTimeout(() => { window.location.href = '/bater-ponto.html'; }, 1500);
    return;
  }

  const user = getUser();

  // Avatar: usa iniciais (imagem biométrica nunca é persistida no client)
  const avatarEl = document.getElementById('conf-avatar');
  if (avatarEl) {
    // Sem innerHTML com dados externos — usa textContent para as iniciais
    avatarEl.textContent = (user.nome || 'CS').substring(0, 2).toUpperCase();
  }

  // Subtítulo — textContent evita XSS
  const subtitleEl = document.getElementById('conf-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = `Identidade confirmada para ${user.nome || 'Carlos Silva'}`;
  }

  // === RELÓGIO EM TEMPO REAL até o usuário confirmar ===
  const confTimeEl = document.getElementById('conf-time');
  const confDateEl = document.getElementById('conf-date');
  let clockInterval = null;

  function tickConfirmacao() {
    const now = new Date();
    const hh  = now.getHours().toString().padStart(2, '0');
    const mm  = now.getMinutes().toString().padStart(2, '0');
    const ss  = now.getSeconds().toString().padStart(2, '0');

    if (confTimeEl) {
      // Usa DOM API para atualizar a hora com segurança
      confTimeEl.textContent = '';
      confTimeEl.append(
        document.createTextNode(`${hh}:${mm}`),
        Object.assign(document.createElement('sup'), { textContent: `.${ss}` })
      );
    }
    if (confDateEl) confDateEl.textContent = formatDateFull(now.toISOString());
  }

  tickConfirmacao();
  clockInterval = setInterval(tickConfirmacao, 1000);

  // Localização
  const lat = registro.latitude  || -18.3942;
  const lng = registro.longitude || -52.6681;
  const acc = registro.accuracy  || 15;

  document.getElementById('conf-accuracy').textContent = `Precisão: ${Math.round(acc)} metros`;
  document.getElementById('conf-coords').textContent   =
    `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;

  // Hash de validação
  const hash = registro.user_id
    ? (registro.user_id.replace(/[^a-f0-9]/gi, '').substring(0, 8) + '...' + registro.user_id.slice(-4))
    : 'a8f9c2e4...b7d1';
  document.getElementById('conf-hash').textContent = hash;

  document.getElementById('conf-device').textContent =
    navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Web';

  // === TIPO DE BATIDA — determinado automaticamente, seletor bloqueado ===
  const tipoAtual = registro.tipo || getProximaBatidaTipo();

  document.querySelectorAll('.tipo-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tipo === tipoAtual);
    btn.disabled = true; // bloqueado — tipo determinado antes da captura
  });

  if (tipoAtual === 'concluido') {
    showToast('Todas as batidas do dia já foram registradas.', 'warning');
  }

  // === CONFIRMAR ===
  const btnConfirmar = document.getElementById('btn-confirmar');
  btnConfirmar.addEventListener('click', () => {
    clearInterval(clockInterval);
    btnConfirmar.disabled = true;

    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    btnConfirmar.innerHTML = '';
    btnConfirmar.append(spinner, document.createTextNode(' Confirmando...'));

    addTodayBatida(tipoAtual);
    localStorage.removeItem('ponto_ultimo_registro'); // limpa após confirmar

    showToast('Ponto registrado com sucesso!', 'success');
    setTimeout(() => { window.location.href = '/dashboard.html'; }, 1500);
  });

  // === REPORTAR PROBLEMA ===
  document.getElementById('btn-problema').addEventListener('click', () => {
    openModal(
      'Reportar Problema',
      `<p class="text-sm text-muted" style="margin-bottom:12px">
        Descreva o problema com este registro. Você será redirecionado para tentar novamente.
      </p>
      <textarea id="modal-problema-texto" class="form-control" rows="3"
        placeholder="Ex: câmera não reconheceu meu rosto, localização incorreta..."></textarea>`,
      `<button class="btn btn-outline btn-sm" id="btn-cancelar-problema" type="button">Cancelar</button>
       <button class="btn btn-danger-outline btn-sm" id="btn-confirmar-problema" type="button">Confirmar e Tentar Novamente</button>`
    );

    document.getElementById('btn-cancelar-problema')?.addEventListener('click', closeModal);

    document.getElementById('btn-confirmar-problema')?.addEventListener('click', () => {
      clearInterval(clockInterval);
      localStorage.removeItem('ponto_ultimo_registro');
      closeModal();
      window.location.href = '/bater-ponto.html';
    });
  });
});
