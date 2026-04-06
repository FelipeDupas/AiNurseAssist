/* ============================================================
   HISTÓRICO PAGE — Tabela, filtros, paginação
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  if (!await requireAuth()) return;
  initSidebar();
  initNotifications();

  // Atualiza o rótulo do período para o mês atual
  const today = new Date();
  const primeiroDia = new Date(today.getFullYear(), today.getMonth(), 1);
  const ultimoDia   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const pad = n => n.toString().padStart(2, '0');
  document.getElementById('date-range-label').textContent =
    `${pad(primeiroDia.getDate())}/${pad(primeiroDia.getMonth()+1)}/${primeiroDia.getFullYear()} – ` +
    `${pad(ultimoDia.getDate())}/${pad(ultimoDia.getMonth()+1)}/${ultimoDia.getFullYear()}`;

  // Atualiza "Atualizado em" nos cards de estatísticas
  const statUpdated = document.querySelector('.stat-updated');
  if (statUpdated) {
    statUpdated.innerHTML = `
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      Atualizado em ${pad(today.getDate())}/${pad(today.getMonth()+1)}/${today.getFullYear()}`;
  }

  // Limpa estatísticas estáticas do HTML (serão preenchidas pelo backend futuramente)
  const statValues = document.querySelectorAll('.historico-stat-card .stat-value');
  statValues.forEach(el => {
    // Preserva o elemento <span> interno (badge/unit) mas zera o texto principal
    const inner = el.querySelector('span');
    el.textContent = '—';
    if (inner) el.appendChild(inner);
  });
  const statSub = document.querySelector('.historico-stat-card .stat-sub');
  if (statSub) statSub.textContent = '—';
  const statTags = document.querySelector('.historico-stat-card .stat-tags');
  if (statTags) statTags.innerHTML = '';

  // --- Estado da paginação e filtros ---
  const ROWS_PER_PAGE = 10;
  let currentPage = 1;
  const allData    = [];   // fonte real — preenchida futuramente pelo backend
  let filteredData = [];

  // --- Filtros ---
  const filterStatus = document.getElementById('filter-status');
  const filterTipo   = document.getElementById('filter-tipo');

  function applyFilters() {
    const status = filterStatus.value;
    const tipo   = filterTipo.value;

    filteredData = allData.filter(row => {
      if (status && row.status !== status) return false;
      // Filtro de tipo: mapeia tipo para colunas do registro
      if (tipo) {
        if (tipo === 'entrada'   && !row.e1) return false;
        if (tipo === 'intervalo' && !row.s1) return false;
        if (tipo === 'saida'     && !row.s2) return false;
      }
      return true;
    });

    currentPage = 1;
    renderPage();
  }

  filterStatus.addEventListener('change', applyFilters);
  filterTipo.addEventListener('change', applyFilters);

  // --- Renderização ---
  function renderPage() {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end   = Math.min(start + ROWS_PER_PAGE, filteredData.length);
    const slice = filteredData.slice(start, end);

    renderTable(slice);
    renderPagination();

    document.getElementById('table-count').textContent =
      filteredData.length === 0
        ? 'Nenhum registro encontrado'
        : `Mostrando ${start + 1} a ${end} de ${filteredData.length} registros`;
  }

  function renderTable(data) {
    const tbody = document.getElementById('historico-tbody');
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:#94a3b8">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((row, i) => {
      const isHighlight = row.e2 && row.e2.includes('*');
      const isLate = row.total && row.total < '08:00' && row.status !== 'aprovado';
      const e2Display = (row.e2 || '—').replace('*', '') +
        (row.e2?.includes('*') ? '<sup style="color:#2563eb;font-size:9px">*</sup>' : '');
      return `
        <tr>
          <td class="td-data">
            <strong>${row.data}</strong>
            <span>${row.diaSemana}</span>
          </td>
          <td>${row.e1 || '—'}</td>
          <td>${row.s1 || '—'}</td>
          <td class="${isHighlight ? 'highlight' : ''}">${e2Display}</td>
          <td>${row.s2 || '—'}</td>
          <td class="td-total ${isLate ? 'late' : ''}">${row.total || '—'}</td>
          <td>${statusBadge(row.status, row.ocorrencia)}</td>
          <td>
            <button class="icon-btn btn-ver-detalhes" title="Ver detalhes" data-idx="${i}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </td>
        </tr>`;
    }).join('');

    // Botões de detalhes
    tbody.querySelectorAll('.btn-ver-detalhes').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx  = parseInt(btn.dataset.idx);
        const row  = data[idx];
        abrirModalDetalhes(row);
      });
    });

    // Botões de justificativa
    tbody.querySelectorAll('.btn-justificar').forEach(btn => {
      btn.addEventListener('click', () => abrirModalJustificativa());
    });
  }

  function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
    const pgPrev = document.getElementById('pg-prev');
    const pgNext = document.getElementById('pg-next');
    const paginationEl = document.getElementById('pagination');

    // Remove botões de página anteriores (mantém prev/next)
    paginationEl.querySelectorAll('.pg-num').forEach(b => b.remove());

    // Gera botões de página
    const prevBtn = document.getElementById('pg-prev');
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.className = 'pg-num' + (p === currentPage ? ' active' : '');
      btn.textContent = p;
      btn.addEventListener('click', () => {
        currentPage = p;
        renderPage();
      });
      // Insere antes do botão "next"
      pgNext.insertAdjacentElement('beforebegin', btn);
    }

    pgPrev.disabled = currentPage === 1;
    pgNext.disabled = currentPage === totalPages || totalPages === 0;

    pgPrev.onclick = () => { if (currentPage > 1) { currentPage--; renderPage(); } };
    pgNext.onclick = () => { if (currentPage < totalPages) { currentPage++; renderPage(); } };
  }

  // Renderiza a primeira página
  renderPage();

  // --- Modal de Detalhes ---
  function abrirModalDetalhes(row) {
    const body = `
      <div class="detail-grid">
        <div class="detail-field"><label>Data</label><span>${row.data} (${row.diaSemana})</span></div>
        <div class="detail-field"><label>Status</label><span>${statusBadge(row.status, row.ocorrencia)}</span></div>
        <div class="detail-field"><label>Entrada 1</label><span>${row.e1 || '—'}</span></div>
        <div class="detail-field"><label>Saída 1</label><span>${row.s1 || '—'}</span></div>
        <div class="detail-field"><label>Entrada 2</label><span>${(row.e2 || '—').replace('*','')}</span></div>
        <div class="detail-field"><label>Saída 2</label><span>${row.s2 || '—'}</span></div>
        <div class="detail-field"><label>Total Trabalhado</label><span>${row.total || '—'}</span></div>
        <div class="detail-field"><label>Localização</label><span>${row.lat || '-18.3942'}, ${row.lng || '-52.6681'}</span></div>
        <div class="detail-field"><label>Biometria</label><span class="badge badge-success">Validada</span></div>
        ${row.ocorrencia ? `<div class="detail-field" style="grid-column:1/-1"><label>Ocorrência</label><span style="color:var(--error)">Atraso — Justificativa pendente</span></div>` : ''}
        ${row.e2?.includes('*') ? `<div class="detail-field" style="grid-column:1/-1"><label>Observação</label><span>* Horário ajustado pelo gestor</span></div>` : ''}
      </div>`;
    openModal('Detalhes do Registro', body,
      `<button class="btn btn-outline btn-sm" id="btn-fechar-detalhes" type="button">Fechar</button>`);

    document.getElementById('btn-fechar-detalhes')?.addEventListener('click', closeModal);
  }

  // --- Modal de Justificativa ---
  function abrirModalJustificativa() {
    const body = `
      <div class="form-group">
        <label class="form-label">Justificativa</label>
        <textarea id="modal-justificativa" class="form-control" rows="4"
          placeholder="Descreva o motivo do atraso ou ausência de marcação..." style="resize:vertical"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Comprovante (opcional)</label>
        <input type="file" class="form-control" accept=".pdf,.jpg,.png" />
      </div>`;
    const footer = `
      <button class="btn btn-outline btn-sm" id="btn-cancelar-justif" type="button">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="btn-enviar-justif" type="button">Enviar Justificativa</button>`;
    openModal('Justificar Ocorrência', body, footer);

    document.getElementById('btn-cancelar-justif')?.addEventListener('click', closeModal);

    document.getElementById('btn-enviar-justif')?.addEventListener('click', () => {
      const motivo = document.getElementById('modal-justificativa').value.trim();
      if (!motivo) { showToast('Informe a justificativa antes de enviar.', 'warning'); return; }
      closeModal();
      showToast('Justificativa enviada para aprovação.', 'success');
    });
  }

  // --- Modal de Legenda ---
  document.querySelector('.link.text-sm')?.addEventListener('click', (e) => {
    e.preventDefault();
    const body = `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="badge badge-success">Aprovado</span>
          <span class="text-sm text-muted">Registro validado sem ocorrências.</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="badge badge-blue">Ajustado</span>
          <span class="text-sm text-muted">Horário corrigido pelo gestor ou RH.</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="badge badge-warning">Atraso</span>
          <span class="text-sm text-muted">Entrada após o horário previsto.</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="badge badge-error">Atraso (Pendente)</span>
          <span class="text-sm text-muted">Atraso aguardando justificativa do servidor.</span>
        </div>
        <div style="padding-top:10px;border-top:1px solid var(--border)">
          <span class="text-sm"><sup style="color:#2563eb;font-size:10px;font-weight:700">*</sup> Horário seguido de asterisco indica ajuste manual realizado pelo gestor.</span>
        </div>
      </div>`;
    openModal('Legenda dos Status',body,
      `<button class="btn btn-outline btn-sm" id="btn-fechar-legenda" type="button">Fechar</button>`);

    document.getElementById('btn-fechar-legenda')?.addEventListener('click', closeModal);
  });

  // --- Exportar PDF (via Blob URL — sem document.write e sem XSS) ---
  document.getElementById('btn-export').addEventListener('click', () => {
    const user   = getUser();
    const periodo = document.getElementById('date-range-label').textContent;

    // Escapa todos os dados externos antes de inserir no HTML
    const nomeSeguro    = escHtml(user.nome || 'Servidor');
    const periodoSeguro = escHtml(periodo);

    const rows = filteredData.map(r => `
      <tr>
        <td>${escHtml(r.data)}</td>
        <td>${escHtml(r.diaSemana)}</td>
        <td>${escHtml(r.e1  || '—')}</td>
        <td>${escHtml(r.s1  || '—')}</td>
        <td>${escHtml((r.e2 || '—').replace('*', ''))}</td>
        <td>${escHtml(r.s2  || '—')}</td>
        <td>${escHtml(r.total || '—')}</td>
        <td>${escHtml(r.status)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Espelho de Ponto</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;padding:20px}
    h2{margin-bottom:4px}p{color:#64748b;margin-bottom:16px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #e2e8f0;padding:7px 10px;text-align:left}
    th{background:#f8fafc;font-weight:600}
    @media print{.no-print{display:none}}
  </style>
</head>
<body>
  <h2>Espelho de Ponto &mdash; ${nomeSeguro}</h2>
  <p>Per&iacute;odo: ${periodoSeguro}</p>
  <table>
    <thead>
      <tr>
        <th>Data</th><th>Dia</th><th>E1</th><th>S1</th>
        <th>E2</th><th>S2</th><th>Total</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <br>
  <button class="no-print" id="btn-print" type="button" style="padding:8px 16px;cursor:pointer">
    Imprimir / Salvar PDF
  </button>
  <script>
    document.getElementById('btn-print')?.addEventListener('click', function () {
      window.print();
    });
  </script>
</body>
</html>`;

    // Cria Blob para evitar popup blocker e document.write
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    // Revoga a URL após a janela ter tempo de carregar
    if (win) setTimeout(() => URL.revokeObjectURL(url), 2000);
    else showToast('Popup bloqueado. Permita popups para exportar o PDF.', 'warning');
  });

  // --- Enviar por E-mail ---
  document.getElementById('btn-email').addEventListener('click', () => {
    const user = getUser();
    const body = `
      <p class="text-sm text-muted" style="margin-bottom:16px">
        O espelho de ponto será enviado para o endereço abaixo:
      </p>
      <div class="form-group">
        <label class="form-label">E-mail de destino</label>
        <input type="email" class="form-control" id="modal-email-dest"
          value="${escHtml(user.email || 'seu.email@chapadaodoceu.go.gov.br')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Período</label>
        <input type="text" class="form-control" value="${document.getElementById('date-range-label').textContent}" readonly />
      </div>`;
    const footer = `
      <button class="btn btn-outline btn-sm" id="btn-cancelar-email" type="button">Cancelar</button>
      <button class="btn btn-primary btn-sm" id="btn-confirmar-email" type="button">Enviar</button>`;
    openModal('Enviar Espelho por E-mail', body, footer);

    document.getElementById('btn-cancelar-email')?.addEventListener('click', closeModal);

    document.getElementById('btn-confirmar-email')?.addEventListener('click', () => {
      const dest = document.getElementById('modal-email-dest').value.trim();
      if (!dest) { showToast('Informe o e-mail de destino.', 'warning'); return; }
      closeModal();
      showToast(`Espelho enviado para ${dest}.`, 'success');
    });
  });
});


/* ============================================================
   BADGE DE STATUS
   ============================================================ */

function statusBadge(status, ocorrencia) {
  if (ocorrencia === 'pendente') {
    return `
      <span class="badge badge-error" style="margin-right:6px">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
        </svg>
        Atraso (Pendente)
      </span>
      <button class="btn-justificar btn btn-sm btn-danger-outline" style="padding:2px 8px;font-size:11px">Justificar</button>`;
  }
  switch (status) {
    case 'aprovado':
      return `<span class="badge badge-success"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Aprovado</span>`;
    case 'ajustado':
      return `<span class="badge badge-blue"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Ajustado</span>`;
    case 'atraso':
      return `<span class="badge badge-warning">Atraso</span>`;
    default:
      return `<span class="badge badge-gray">${status}</span>`;
  }
}
