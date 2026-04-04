/* ============================================================
   LOGIN PAGE — Lógica de autenticação
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  requireGuest();

  const form        = document.getElementById('login-form');
  const cpfInput    = document.getElementById('cpf');
  const btnLogin    = document.getElementById('btn-login');
  const errorBox    = document.getElementById('login-error');
  const errorMsg    = document.getElementById('login-error-msg');
  const toggleSenha = document.getElementById('toggle-senha');
  const senhaInput  = document.getElementById('senha');
  const btnBiometric = document.getElementById('btn-biometric');

  // Máscara de CPF
  cpfInput.addEventListener('input', () => {
    let v = cpfInput.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9)      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, '$1.$2');
    cpfInput.value = v;
  });

  // Toggle visibilidade da senha
  toggleSenha.addEventListener('click', () => {
    const isPass = senhaInput.type === 'password';
    senhaInput.type = isPass ? 'text' : 'password';
    toggleSenha.innerHTML = isPass
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  });

  function showError(msg) {
    // Usa textContent para evitar XSS com mensagens de erro do backend
    errorMsg.textContent = msg;
    errorBox.classList.remove('hidden');
    errorBox.style.display = 'flex';
  }
  function hideError() {
    errorBox.classList.add('hidden');
    errorBox.style.display = 'none';
  }

  function setLoading(loading) {
    btnLogin.disabled = loading;
    if (loading) {
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      const text = document.createTextNode(' Verificando...');
      btnLogin.innerHTML = '';
      btnLogin.append(spinner, text);
    } else {
      btnLogin.textContent = 'Entrar no Sistema';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const cpf   = cpfInput.value.trim();
    const senha = senhaInput.value;

    if (!cpf)   { showError('Informe seu CPF.'); cpfInput.focus(); return; }
    if (!senha) { showError('Informe sua senha.'); senhaInput.focus(); return; }

    setLoading(true);
    try {
      const data = await Api.login(cpf, senha);

      // Armazena APENAS nome e matrícula para exibição — token fica no cookie HttpOnly
      saveSession({
        nome:      data.user?.nome      || '',
        matricula: data.user?.matricula || '',
      });

      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message || 'Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  });

  // Login biométrico — requer sessão ativa prévia
  btnBiometric.addEventListener('click', () => {
    if (!localStorage.getItem('ponto_logged_in')) {
      showToast('Faça login com CPF/Senha primeiro para vincular sua biometria.', 'warning');
      return;
    }
    window.location.href = '/bater-ponto.html';
  });
});
