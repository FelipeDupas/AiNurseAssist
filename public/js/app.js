/* ============================================================
   APP.JS — Utilitários globais do Sistema de Ponto Eletrônico
   ============================================================ */


/* ============================================================
   SEGURANÇA — Escape de HTML para prevenir XSS
   ============================================================ */

/**
 * Escapa caracteres especiais HTML para uso seguro em textContent/atributos.
 * Nunca inserir dados externos com innerHTML sem passar por esta função.
 * @param {string} str
 * @returns {string}
 */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/* ============================================================
   AUTH — Guardas de rota e sessão
   ============================================================ */

/**
 * Redireciona para login se o usuário não estiver autenticado.
 * Primeiro verifica o flag local para evitar chamadas desnecessárias;
 * depois confirma com o backend se o cookie HttpOnly ainda é válido
 * (detecta sessões expiradas sem que o flag local tenha sido limpo).
 * @returns {Promise<boolean>}
 */
async function requireAuth() {
  if (!localStorage.getItem('ponto_logged_in')) {
    window.location.href = '/login.html';
    return false;
  }
  try {
    const res = await fetch('/auth/check', { credentials: 'include' });
    if (res.status === 401) {
      localStorage.removeItem('ponto_logged_in');
      localStorage.removeItem('ponto_user');
      window.location.href = '/login.html';
      return false;
    }
  } catch {
    // Falha de rede — mantém a sessão local; o backend rejeitará chamadas protegidas
  }
  return true;
}

function requireGuest() {
  if (localStorage.getItem('ponto_logged_in')) {
    window.location.href = '/dashboard.html';
    return false;
  }
  return true;
}

/**
 * Encerra a sessão: chama o backend para limpar o cookie HttpOnly,
 * depois limpa o estado local.
 */
async function logout() {
  if (!confirm('Tem certeza que deseja sair do sistema?')) return;
  try {
    await Api.logout();
  } catch {
    // Mesmo com erro no backend, limpa o estado local
  }
  localStorage.removeItem('ponto_logged_in');
  localStorage.removeItem('ponto_user');
  window.location.href = '/login.html';
}

/**
 * Retorna apenas nome e matrícula (dados mínimos de exibição).
 * Dados sensíveis (CPF, e-mail, telefone) são buscados do backend sob demanda.
 * @returns {{ nome?: string, matricula?: string }}
 */
function getUser() {
  try { return JSON.parse(localStorage.getItem('ponto_user') || '{}'); }
  catch { return {}; }
}

/**
 * Persiste apenas dados mínimos de exibição no localStorage.
 * NÃO armazena token, CPF, e-mail, telefone ou cargo.
 * @param {{ nome: string, matricula: string }} user
 */
function saveSession(user) {
  localStorage.setItem('ponto_logged_in', '1');
  localStorage.setItem('ponto_user', JSON.stringify({
    nome:      user.nome      || '',
    matricula: user.matricula || '',
  }));
}


/* ============================================================
   BATIDAS DO DIA — Persistência em localStorage
   ============================================================ */

function getTodayBatidas() {
  const key = 'ponto_batidas_' + new Date().toISOString().slice(0, 10);
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}

function addTodayBatida(tipo) {
  const key = 'ponto_batidas_' + new Date().toISOString().slice(0, 10);
  const batidas = getTodayBatidas();
  batidas.push(tipo);
  localStorage.setItem(key, JSON.stringify(batidas));
}

function getProximaBatidaTipo() {
  const count = getTodayBatidas().length;
  if (count === 0) return 'entrada';
  if (count === 1 || count === 2) return 'intervalo';
  if (count === 3) return 'saida';
  return 'concluido';
}

/**
 * Retorna true se hoje for sábado ou domingo.
 */
function isWeekend() {
  const dow = new Date().getDay();
  return dow === 0 || dow === 6;
}


/* ============================================================
   MOCK DATA — Dados dinâmicos baseados na data atual
   ============================================================ */

function _fmt(d) {
  return d.getDate().toString().padStart(2, '0') + '/' +
         (d.getMonth() + 1).toString().padStart(2, '0');
}

function _fmtFull(d) {
  return d.getDate().toString().padStart(2, '0') + '/' +
         (d.getMonth() + 1).toString().padStart(2, '0') + '/' +
         d.getFullYear();
}

function _mesNome(m) {
  return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
          'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m];
}

function _diaSemana(d) {
  return ['Domingo','Segunda-feira','Terça-feira','Quarta-feira',
          'Quinta-feira','Sexta-feira','Sábado'][d.getDay()];
}

function _buildSemana(today) {
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  return ['S','T','Q','Q','S'].map((dia, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { dia, valor: d > today ? 0 : 8, max: 8, current: d.toDateString() === today.toDateString() };
  });
}

function _lastWorkdays(from, n) {
  const days = [];
  const d = new Date(from);
  while (days.length < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return days;
}

function buildMockData() {
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const pendenciaDate = _lastWorkdays(today, 12)[11];
  const batidasHoje = getTodayBatidas();

  const statusDia = [
    { label: 'Entrada',      icon: 'check', time: batidasHoje[0] ? '08:00' : 'Pendente', status: batidasHoje[0] ? 'done' : 'pending' },
    { label: 'Saída Almoço', icon: 'pause', time: batidasHoje[1] ? '12:00' : 'Pendente', status: batidasHoje[1] ? 'done' : 'pending' },
    { label: 'Retorno',      icon: 'arrow', time: batidasHoje[2] ? '13:30' : 'Pendente', status: batidasHoje[2] ? 'done' : 'pending' },
    { label: 'Saída',        icon: 'home',  time: batidasHoje[3] ? '17:30' : 'Pendente', status: batidasHoje[3] ? 'done' : 'pending' },
  ];

  const resumoSemana = {
    periodo: _fmt(monday) + ' – ' + _fmt(friday),
    trabalhadas: '32h', meta: '40h',
    extras: '+2h 15m', bancohoras: '14h 30m',
    semana: _buildSemana(today),
  };

  const resumoMes = {
    periodo: _mesNome(today.getMonth()) + ' ' + today.getFullYear(),
    trabalhadas: '112h', meta: '176h',
    extras: '+4h 30m', bancohoras: '14h 30m',
    semana: [
      { dia: 'S1', valor: 40, max: 44, current: false },
      { dia: 'S2', valor: 40, max: 44, current: false },
      { dia: 'S3', valor: 32, max: 44, current: true  },
      { dia: 'S4', valor: 0,  max: 44, current: false },
    ],
  };

  const statusOptions = ['aprovado','aprovado','aprovado','ajustado','atraso'];
  const historico = _lastWorkdays(today, 22).map((d, i) => {
    const status = statusOptions[i % statusOptions.length];
    const ocorrencia = status === 'atraso' ? 'pendente' : null;
    const e1 = status === 'atraso' ? '08:' + (10 + (i % 30)).toString().padStart(2,'0') : '08:00';
    const total = status === 'atraso' ? '07:' + (50 - (i % 20)).toString().padStart(2,'0') : '08:00';
    return {
      data: d.getDate().toString().padStart(2,'0') + ' ' + _mesNome(d.getMonth()).slice(0,3) + ' ' + d.getFullYear(),
      diaSemana: _diaSemana(d),
      e1, s1: '12:00', e2: i === 5 ? '13:30*' : '13:30', s2: '17:30',
      total, status, ocorrencia,
      lat: '-18.3942', lng: '-52.6681',
    };
  });

  return {
    user: {
      nome: 'Carlos Silva', matricula: '12345',
      email: 'carlos.silva@chapadaodoceu.go.gov.br',
      cargo: 'Analista de Sistemas Pleno',
      lotacao: 'Secretaria de Administração (SECAD)',
      regime: '40h Semanais (08:00 - 12:00 / 14:00 - 18:00)',
      admissao: '15/03/2018', telefone: '(64) 99999-8888',
    },
    statusDia, resumoSemana, resumoMes,
    pendencias: [{
      tipo: 'warning',
      titulo: 'Ajuste Solicitado',
      descricao: 'Justificativa pendente para o dia ' + _fmtFull(pendenciaDate) + ' (Falta de marcação na saída).',
    }],
    historico,
  };
}

const MockData = buildMockData();


/* ============================================================
   SIDEBAR
   ============================================================ */

const NAV_ITEMS = [
  {
    page: 'dashboard',
    href: '/dashboard.html',
    label: 'Batida de Ponto',
    // Ícone de relógio — representa ponto/horário
    icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  },
  {
    page: 'historico',
    href: '/historico.html',
    label: 'Histórico / Espelho',
    icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  },
  {
    page: 'perfil',
    href: '/perfil.html',
    label: 'Perfil e Config.',
    icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  },
];

function getActivePage() {
  const path = window.location.pathname.split('/').pop().replace('.html', '') || 'dashboard';
  if (path === 'bater-ponto' || path === 'confirmacao') return 'dashboard';
  return path;
}

function renderSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const activePage = getActivePage();
  const user       = getUser();
  // Usa escHtml para prevenir XSS com dados do usuário
  const nome     = escHtml(user.nome      || 'Servidor');
  const matricula = escHtml(user.matricula || '00000');
  const initial  = (user.nome || 'S').charAt(0).toUpperCase();

  const navHTML = NAV_ITEMS.map(item => `
    <a class="nav-item${activePage === item.page ? ' active' : ''}" href="${item.href}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${item.icon}</svg>
      <span>${escHtml(item.label)}</span>
    </a>`).join('');

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <div class="sidebar-logo-text">
        <h2>Chapadão do Céu</h2>
        <span>Ponto Eletrônico</span>
      </div>
    </div>
    <nav class="sidebar-nav">
      ${navHTML}
      <button class="nav-item" id="logout-btn" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span>Sair</span>
      </button>
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-footer-avatar">${escHtml(initial)}</div>
      <div class="sidebar-footer-info">
        <strong id="sidebar-user-name">${nome}</strong>
        <span id="sidebar-user-matricula">Matrícula: ${matricula}</span>
      </div>
    </div>`;

  document.getElementById('logout-btn')?.addEventListener('click', logout);
}

function initMobileNav() {
  const hamburger = document.getElementById('hamburger-btn');
  if (!hamburger) return;

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  hamburger.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('sidebar-open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  overlay.addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
    hamburger.setAttribute('aria-expanded', 'false');
  });

  document.querySelector('.sidebar-nav')?.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item')) {
      document.body.classList.remove('sidebar-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

function initSidebar() {
  renderSidebar();
  initMobileNav();
}


/* ============================================================
   NOTIFICAÇÕES
   ============================================================ */

function initNotifications() {
  const btn = document.getElementById('notification-btn');
  if (!btn) return;

  // Constrói itens usando textContent para evitar XSS
  const panel = document.createElement('div');
  panel.className = 'notif-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Notificações');

  const header = document.createElement('div');
  header.className = 'notif-header';
  const headerTitle = document.createElement('strong');
  headerTitle.textContent = 'Notificações';
  const headerCount = document.createElement('span');
  headerCount.className = 'notif-count';
  headerCount.textContent = MockData.pendencias.length;
  header.append(headerTitle, headerCount);

  const body = document.createElement('div');
  body.className = 'notif-body';

  if (MockData.pendencias.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'notif-empty';
    empty.textContent = 'Nenhuma notificação nova.';
    body.appendChild(empty);
  } else {
    MockData.pendencias.forEach(p => {
      const item = document.createElement('div');
      item.className = 'notif-item';

      const iconDiv = document.createElement('div');
      iconDiv.className = 'notif-item-icon warning';
      iconDiv.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;

      const textDiv = document.createElement('div');
      textDiv.className = 'notif-item-text';
      const strong = document.createElement('strong');
      strong.textContent = p.titulo;        // textContent: sem risco XSS
      const span = document.createElement('span');
      span.textContent = p.descricao;       // textContent: sem risco XSS
      textDiv.append(strong, span);

      item.append(iconDiv, textDiv);
      body.appendChild(item);
    });
  }

  const footer = document.createElement('div');
  footer.className = 'notif-footer';
  const link = document.createElement('a');
  link.href = '/historico.html';
  link.className = 'link text-sm';
  link.textContent = 'Ver todas as pendências';
  footer.appendChild(link);

  panel.append(header, body, footer);

  // Badge numérico
  const dot = btn.querySelector('.notification-dot');
  if (dot) {
    if (MockData.pendencias.length > 0) {
      dot.textContent = MockData.pendencias.length;
      dot.classList.add('has-count');
    } else {
      dot.style.display = 'none';
    }
  }

  btn.style.position = 'relative';
  btn.insertAdjacentElement('afterend', panel);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
    if (isOpen && dot) dot.style.display = 'none';
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}


/* ============================================================
   MODAL — Diálogos customizados (DOM API para prevenir XSS)
   ============================================================ */

/**
 * Abre um modal genérico.
 * @param {string} title        - Texto do título (escapado)
 * @param {string} bodyHtml     - HTML do corpo (conteúdo confiável/estático)
 * @param {string} [footerHtml] - HTML do rodapé (conteúdo confiável/estático)
 *
 * ATENÇÃO: bodyHtml e footerHtml devem conter APENAS HTML estático ou
 * valores previamente escapados com escHtml(). Nunca inserir dados
 * externos (nomes, mensagens de erro) sem escapar primeiro.
 */
function openModal(title, bodyHtml, footerHtml = '') {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  // Cabeçalho — título via textContent
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';
  const modalTitle = document.createElement('strong');
  modalTitle.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', 'Fechar');
  closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  modalHeader.append(modalTitle, closeBtn);

  // Corpo e rodapé aceitam HTML estático do próprio código
  const modalBody = document.createElement('div');
  modalBody.className = 'modal-body';
  modalBody.innerHTML = bodyHtml;

  modal.append(modalHeader, modalBody);

  if (footerHtml) {
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    modalFooter.innerHTML = footerHtml;
    modal.appendChild(modalFooter);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', _escCloseModal);
}

function _escCloseModal(e) {
  if (e.key === 'Escape') closeModal();
}

function closeModal() {
  document.getElementById('modal-overlay')?.remove();
  document.removeEventListener('keydown', _escCloseModal);
}


/* ============================================================
   TOAST — Notificações (sem innerHTML com dados externos)
   ============================================================ */

function showToast(message, type = 'success', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // Ícone via innerHTML (SVG estático) + mensagem via textContent para evitar XSS
  const iconWrapper = document.createElement('span');
  iconWrapper.innerHTML = icons[type] || '';

  const msgSpan = document.createElement('span');
  msgSpan.textContent = message; // textContent — nunca innerHTML com dado externo

  toast.append(iconWrapper, msgSpan);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}


/* ============================================================
   DATA/HORA — Utilitários
   ============================================================ */

function formatDate(date = new Date()) {
  const str = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('pt-BR')} às ${formatTime(d)}`;
}

function formatDateFull(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}


/* ============================================================
   GEOLOCALIZAÇÃO
   ============================================================ */

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada neste dispositivo.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy:  pos.coords.accuracy,
      }),
      () => reject(new Error('Permissão de localização negada. Autorize o acesso para registrar o ponto.')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
