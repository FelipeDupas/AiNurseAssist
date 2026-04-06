/* ============================================================
   DASHBOARD PAGE
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  if (!await requireAuth()) return;
  initSidebar();
  initNotifications();

  const user = getUser();
  document.getElementById('greeting-name').textContent = `Olá, ${user.nome || 'Carlos'}!`;

  // Inicia relógio e atualiza data à meia-noite
  initRealtimeClock();

  // Aviso de fim de semana — desabilita batida de ponto
  if (isWeekend()) {
    renderAvisoFimDeSemana();
  }

  // Renderiza componentes do dashboard
  renderStatusTimeline();
  renderProximaBatida();
  renderPendencias();

  // Toggle semana / mês — sem dados reais por enquanto
  const btnSemana = document.getElementById('toggle-semana');
  const btnMes    = document.getElementById('toggle-mes');

  btnSemana.addEventListener('click', () => {
    btnSemana.classList.add('active');
    btnMes.classList.remove('active');
    aplicarResumo(null);
  });

  btnMes.addEventListener('click', () => {
    btnMes.classList.add('active');
    btnSemana.classList.remove('active');
    aplicarResumo(null);
  });

  // Navegação sem inline onclick
  document.getElementById('btn-ver-pendencias')?.addEventListener('click', () => {
    window.location.href = '/historico.html';
  });
  document.getElementById('btn-bater-ponto')?.addEventListener('click', () => {
    window.location.href = '/bater-ponto.html';
  });

  // Inicializa exibição sem dados (aguardando integração com backend)
  aplicarResumo(null);

  // Inicia verificação periódica de conexão com o backend
  initSyncPing();
});


/* ============================================================
   RELÓGIO EM TEMPO REAL
   ============================================================ */

function initRealtimeClock() {
  const headerDate = document.getElementById('header-date');
  const clockEl    = document.getElementById('realtime-clock');

  function tick() {
    const now = new Date();

    // Atualiza o relógio HH:MM:SS
    if (clockEl) {
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      const ss = now.getSeconds().toString().padStart(2, '0');
      clockEl.textContent = `${hh}:${mm}:${ss}`;
    }

    // Atualiza a data no header (relevante após meia-noite)
    if (headerDate) {
      headerDate.textContent = formatDate(now);
    }
  }

  tick();
  setInterval(tick, 1000);
}


/* ============================================================
   FIM DE SEMANA — Aviso e bloqueio do botão de ponto
   ============================================================ */

function renderAvisoFimDeSemana() {
  const card = document.querySelector('.proxima-batida-card');
  if (!card) return;

  const aviso = document.createElement('div');
  aviso.style.cssText = 'background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:#92400e;display:flex;align-items:center;gap:8px';
  aviso.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/><path d="M12 17h.01"/>
    </svg>
    <span>Hoje é dia não útil. O registro de ponto está desabilitado.</span>`;

  card.insertBefore(aviso, card.firstChild);

  // Desabilita o botão de bater ponto
  const btn = document.getElementById('btn-bater-ponto');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.style.cursor  = 'not-allowed';
    btn.onclick = null;
    btn.removeAttribute('onclick');
  }
}


/* ============================================================
   PRÓXIMA BATIDA — Dinâmica baseada nas batidas do dia
   ============================================================ */

function renderProximaBatida() {
  const msgEl = document.getElementById('proxima-batida-msg');
  if (!msgEl) return;

  const tipo = getProximaBatidaTipo();
  const mensagens = {
    entrada:   'Registre sua entrada agora.',
    intervalo: 'Registre sua saída/retorno do almoço.',
    saida:     'Registre sua saída do turno.',
    concluido: 'Todas as batidas registradas hoje!',
  };

  msgEl.textContent = mensagens[tipo] || mensagens.entrada;

  // Desabilita o botão se o dia estiver completo
  const btn = document.getElementById('btn-bater-ponto');
  if (tipo === 'concluido' && btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    btn.onclick = null;
  }
}


/* ============================================================
   PENDÊNCIAS — Renderização dinâmica
   ============================================================ */

function renderPendencias() {
  const list  = document.getElementById('pendencias-list');
  const count = document.getElementById('pendencias-count');
  if (!list) return;

  if (count) count.textContent = '0 Ações';

  list.innerHTML = `
    <div class="pendencia-item">
      <div class="pendencia-icon success">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div class="pendencia-text">
        <strong style="color:#4ade80">Nenhuma pendência no momento</strong>
      </div>
    </div>`;
}


/* ============================================================
   STATUS TIMELINE
   ============================================================ */

function renderStatusTimeline() {
  const container = document.getElementById('status-timeline');
  if (!container) return;

  const batidas = getTodayBatidas();
  const steps = [
    { label: 'Entrada',      icon: 'check', status: batidas.length >= 1 ? 'done' : 'pending', time: batidas.length >= 1 ? 'Registrado' : 'Pendente' },
    { label: 'Saída Almoço', icon: 'pause', status: batidas.length >= 2 ? 'done' : 'pending', time: batidas.length >= 2 ? 'Registrado' : 'Pendente' },
    { label: 'Retorno',      icon: 'arrow', status: batidas.length >= 3 ? 'done' : 'pending', time: batidas.length >= 3 ? 'Registrado' : 'Pendente' },
    { label: 'Saída',        icon: 'home',  status: batidas.length >= 4 ? 'done' : 'pending', time: batidas.length >= 4 ? 'Registrado' : 'Pendente' },
  ];

  const stepIcons = {
    check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    pause: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    arrow: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    home:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  };

  container.innerHTML = steps.map(step => `
    <div class="status-step ${step.status}">
      <div class="status-icon ${step.status}">${stepIcons[step.icon]}</div>
      <p class="status-label">${step.label}</p>
      <p class="status-time">${step.time}</p>
    </div>
  `).join('');
}


/* ============================================================
   RESUMO DE HORAS — Semana / Mês
   ============================================================ */

/**
 * Aplica os dados de resumo (semana ou mês) aos elementos da UI.
 * @param {object|null} resumo - objeto com dados de resumo ou null para estado vazio
 */
function aplicarResumo(resumo) {
  const periodoEl = document.getElementById('resumo-periodo');
  if (periodoEl) periodoEl.textContent = resumo ? resumo.periodo : '—';

  const stats = document.querySelectorAll('.resumo-stat-value');
  if (stats[0]) stats[0].innerHTML = resumo
    ? `${resumo.trabalhadas} <span style="font-size:13px;font-weight:500;color:#64748b">/ ${resumo.meta}</span>`
    : '—';
  if (stats[1]) stats[1].textContent = resumo ? resumo.extras    : '—';
  if (stats[2]) stats[2].textContent = resumo ? resumo.bancohoras : '—';

  renderMiniChart(resumo ? resumo.semana : []);
}

function renderMiniChart(data) {
  const container = document.getElementById('mini-chart');
  if (!container) return;
  if (!data || !data.length) {
    container.innerHTML = '<p style="font-size:11px;color:#94a3b8;text-align:center;padding:8px 0">Sem dados</p>';
    return;
  }
  const max = Math.max(...data.map(d => d.max), 1);
  container.innerHTML = data.map(d => {
    const height = d.valor > 0 ? Math.max(8, (d.valor / max) * 32) : 4;
    return `
      <div class="mini-chart-bar">
        <div class="mini-chart-fill ${d.current ? 'current' : ''}" style="height:${height}px"></div>
        <span class="mini-chart-label">${d.dia}</span>
      </div>`;
  }).join('');
}

/* ============================================================
   SYNC PING — Verificação periódica de conexão
   ============================================================ */

function initSyncPing() {
  const badge = document.querySelector('.sync-badge');
  if (!badge) return;

  async function checkConnection() {
    try {
      const res = await fetch('/auth/check', {
        credentials: 'include',
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 401) {
        // Sessão expirada — limpa estado local e redireciona para login
        localStorage.removeItem('ponto_logged_in');
        localStorage.removeItem('ponto_user');
        window.location.href = '/login.html';
        return;
      }

      if (res.ok) {
        setBadgeOnline();
      } else {
        setBadgeOffline();
      }
    } catch {
      setBadgeOffline();
    }
  }

  function setBadgeOnline() {
    badge.classList.remove('offline');
    badge.innerHTML = `
      <span class="sync-dot"></span>
      SINCRONIZADO
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>`;
  }

  function setBadgeOffline() {
    badge.classList.add('offline');
    badge.innerHTML = `
      <span class="sync-dot"></span>
      SEM CONEXÃO
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <circle cx="12" cy="20" r="1"/>
      </svg>`;
  }

  checkConnection();
  setInterval(checkConnection, 30000);
}
