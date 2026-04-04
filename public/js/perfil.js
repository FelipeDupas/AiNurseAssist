/* ============================================================
   PERFIL PAGE — Tabs, form, configurações
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  if (!await requireAuth()) return;
  initSidebar();
  initNotifications();

  const user = { ...MockData.user, ...getUser() };

  // Preenche os campos com dados do usuário
  document.getElementById('perfil-nome').textContent       = user.nome || 'Carlos Eduardo Silva';
  document.getElementById('perfil-matricula').textContent  = user.matricula || '12345-6';
  document.getElementById('perfil-cargo').textContent      = user.cargo;
  document.getElementById('perfil-lotacao').textContent    = user.lotacao;
  document.getElementById('perfil-email').value            = user.email;
  document.getElementById('perfil-telefone').value         = user.telefone;
  document.getElementById('perfil-admissao').value         = user.admissao;
  document.getElementById('perfil-regime').value           = user.regime;

  const initials = (user.nome || 'CS').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  document.getElementById('perfil-avatar-initials').textContent = initials;

  // === ABAS ===
  document.querySelectorAll('.perfil-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.perfil-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.perfil-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });


  /* ============================================================
     MODO DE EDIÇÃO DO PERFIL
     ============================================================ */

  const emailInput     = document.getElementById('perfil-email');
  const telefoneInput  = document.getElementById('perfil-telefone');
  const btnEditar      = document.getElementById('btn-editar');
  const btnSalvar      = document.getElementById('btn-salvar');
  const btnCancelar    = document.getElementById('btn-cancelar-perfil');

  // Valores originais para restaurar ao cancelar
  let originalEmail    = emailInput.value;
  let originalTelefone = telefoneInput.value;

  // Começa em modo leitura
  setReadonlyMode(true);

  btnEditar.addEventListener('click', () => {
    originalEmail    = emailInput.value;
    originalTelefone = telefoneInput.value;
    setReadonlyMode(false);
    emailInput.focus();
  });

  btnCancelar.addEventListener('click', () => {
    emailInput.value    = originalEmail;
    telefoneInput.value = originalTelefone;
    clearFieldError(emailInput);
    clearFieldError(telefoneInput);
    setReadonlyMode(true);
  });

  btnSalvar.addEventListener('click', () => {
    if (!validatePerfil()) return;

    btnSalvar.disabled = true;
    btnSalvar.innerHTML = `<span class="spinner"></span> Salvando...`;

    // Simula chamada à API
    setTimeout(() => {
      const updated = { ...user, email: emailInput.value, telefone: telefoneInput.value };
      localStorage.setItem('ponto_user', JSON.stringify(updated));
      showToast('Alterações salvas com sucesso!', 'success');
      setReadonlyMode(true);
      btnSalvar.disabled = false;
      btnSalvar.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        Salvar Alterações`;
    }, 800);
  });

  /** Alterna entre modo leitura (readonly) e modo edição. */
  function setReadonlyMode(readonly) {
    emailInput.readOnly    = readonly;
    telefoneInput.readOnly = readonly;

    btnEditar.style.display   = readonly ? 'inline-flex' : 'none';
    btnSalvar.style.display   = readonly ? 'none' : 'inline-flex';
    btnCancelar.style.display = readonly ? 'none' : 'inline-flex';
  }

  /** Valida email e telefone antes de salvar. */
  function validatePerfil() {
    let valid = true;

    const emailVal = emailInput.value.trim();
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      showFieldError(emailInput, 'Informe um e-mail válido.');
      valid = false;
    } else {
      clearFieldError(emailInput);
    }

    const telVal = telefoneInput.value.replace(/\D/g, '');
    if (telVal.length < 10) {
      showFieldError(telefoneInput, 'Informe um telefone válido com DDD.');
      valid = false;
    } else {
      clearFieldError(telefoneInput);
    }

    return valid;
  }

  function showFieldError(input, msg) {
    clearFieldError(input);
    input.style.borderColor = 'var(--error)';
    const hint = document.createElement('p');
    hint.className = 'form-hint field-error';
    hint.style.color = 'var(--error)';
    hint.textContent = msg;
    input.parentElement.appendChild(hint);
  }

  function clearFieldError(input) {
    input.style.borderColor = '';
    input.parentElement.querySelector('.field-error')?.remove();
  }

  // === MÁSCARA DE TELEFONE ===
  telefoneInput.addEventListener('input', () => {
    let v = telefoneInput.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    else if (v.length > 0) v = v.replace(/(\d{0,2})/, '($1');
    telefoneInput.value = v;
  });


  /* ============================================================
     THRESHOLD SLIDER (Admin)
     ============================================================ */
  const slider        = document.getElementById('bio-threshold');
  const thresholdVal  = document.getElementById('threshold-value');
  if (slider) {
    slider.addEventListener('input', () => {
      thresholdVal.textContent = parseFloat(slider.value).toFixed(2);
    });
  }


  /* ============================================================
     TOGGLE SWITCHES — com persistência no localStorage
     ============================================================ */

  // Carrega preferências salvas
  const savedPrefs = JSON.parse(localStorage.getItem('ponto_prefs') || '{}');
  if (savedPrefs.emailNotif !== undefined) {
    document.getElementById('pref-email-notif').checked = savedPrefs.emailNotif;
  }
  if (savedPrefs.lembrete !== undefined) {
    document.getElementById('pref-lembrete').checked = savedPrefs.lembrete;
  }

  document.querySelectorAll('input[type="checkbox"][id^="pref-"]').forEach(cb => {
    const toggleId = cb.id.replace('pref-', 'toggle-');
    const toggleEl = document.getElementById(toggleId);
    if (!toggleEl) return;

    const thumb = toggleEl.querySelector('span');
    function updateToggle() {
      toggleEl.style.background = cb.checked ? '#22c55e' : '#cbd5e1';
      if (thumb) thumb.style.transform = cb.checked ? 'translateX(18px)' : 'translateX(0)';
      toggleEl.setAttribute('aria-checked', String(cb.checked));
    }

    updateToggle();
    cb.addEventListener('change', updateToggle);
    toggleEl.addEventListener('click', () => { cb.checked = !cb.checked; updateToggle(); });

    // Acessibilidade: role e aria-checked
    toggleEl.setAttribute('role', 'switch');
    toggleEl.setAttribute('aria-checked', String(cb.checked));
    toggleEl.setAttribute('tabindex', '0');
    toggleEl.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        cb.checked = !cb.checked;
        updateToggle();
      }
    });
  });

  // Salvar Preferências
  document.getElementById('btn-salvar-prefs')?.addEventListener('click', () => {
    const prefs = {
      emailNotif: document.getElementById('pref-email-notif').checked,
      lembrete:   document.getElementById('pref-lembrete').checked,
    };
    localStorage.setItem('ponto_prefs', JSON.stringify(prefs));
    showToast('Preferências salvas!', 'success');
  });

  // Configurações Admin — lidas do backend (não do localStorage)
  const inputTolerancia = document.querySelector('input[type="number"][min="0"]');
  const inputRaio       = document.querySelector('input[type="number"][min="50"]');

  // Busca configuração atual do servidor
  Api.getAdminConfig().then(config => {
    if (inputTolerancia && config.toleranciaMinutos !== undefined)
      inputTolerancia.value = config.toleranciaMinutos;
    if (inputRaio && config.raioMetros !== undefined)
      inputRaio.value = config.raioMetros;
    if (slider && config.thresholdBiometria !== undefined) {
      slider.value = config.thresholdBiometria;
      if (thresholdVal) thresholdVal.textContent = parseFloat(config.thresholdBiometria).toFixed(2);
    }
  }).catch(() => {
    // Silencioso — campos ficam com valores padrão do HTML
  });

  document.getElementById('btn-salvar-admin')?.addEventListener('click', async () => {
    const btnAdmin = document.getElementById('btn-salvar-admin');
    btnAdmin.disabled = true;
    try {
      await Api.saveAdminConfig({
        toleranciaMinutos:  inputTolerancia ? parseInt(inputTolerancia.value) : undefined,
        raioMetros:         inputRaio       ? parseInt(inputRaio.value)       : undefined,
        thresholdBiometria: slider          ? parseFloat(slider.value)        : undefined,
      });
      showToast('Configurações atualizadas!', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao salvar configurações.', 'error');
    } finally {
      btnAdmin.disabled = false;
    }
  });
});
