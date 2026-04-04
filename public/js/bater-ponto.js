/* ============================================================
   BATER PONTO PAGE — Camera + Facial Capture + Geolocation
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  if (!await requireAuth()) return;
  initSidebar();

  let stream              = null;
  let capturedImageBase64 = null;
  let locationData        = null;
  let locationError       = null; // armazena erro de geolocalização, se houver

  const video       = document.getElementById('video-feed');
  const canvas      = document.getElementById('capture-canvas');
  const loading     = document.getElementById('camera-loading');
  const overlay     = document.getElementById('face-overlay');
  const pills       = document.getElementById('camera-pills');
  const instruction = document.getElementById('camera-instruction');
  const btnCapturar = document.getElementById('btn-capturar');
  const btnCancelar = document.getElementById('btn-cancelar');
  btnCancelar?.addEventListener('click', () => { window.location.href = '/dashboard.html'; });

  const stepCameraInd = document.getElementById('step-camera-ind');
  const stepFaceInd   = document.getElementById('step-face-ind');
  const stepBioInd    = document.getElementById('step-bio-ind');
  const stepFace      = document.getElementById('step-face');
  const stepBio       = document.getElementById('step-bio');

  function setStepDone(ind, row) {
    ind.className = 'step-indicator done';
    ind.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
    if (row) row.classList.remove('pending');
  }
  function setStepActive(ind, row) {
    ind.className = 'step-indicator active';
    ind.innerHTML = `<span class="spinner spinner-dark" style="width:12px;height:12px;border-width:2px"></span>`;
    if (row) row.classList.remove('pending');
  }
  function setStepError(ind) {
    ind.className = 'step-indicator';
    ind.style.background = '#fee2e2';
    ind.style.color = '#dc2626';
    ind.textContent = '!';
  }

  // === CÂMERA ===
  async function initCamera() {
    setStepActive(stepCameraInd, null);
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });

      video.srcObject = stream;
      await video.play();

      loading.style.display = 'none';
      video.style.display = 'block';
      overlay.style.display = 'flex';
      pills.style.display = 'flex';
      instruction.style.display = 'block';

      setStepDone(stepCameraInd, null);
      setStepActive(stepFaceInd, stepFace);

      // Obtém localização em paralelo (não usa fallback silencioso)
      getLocationData();

      setTimeout(() => {
        setStepDone(stepFaceInd, stepFace);
        btnCapturar.disabled = false;
        instruction.textContent = 'Rosto alinhado. Clique em Capturar.';
        instruction.style.background = 'rgba(22,163,74,0.7)';
      }, 2000);

    } catch {
      // Exibe erro de câmera usando DOM API (sem innerHTML com dado externo)
      loading.textContent = '';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '36'); svg.setAttribute('height', '36');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', '#ef4444'); svg.setAttribute('stroke-width', '1.5');
      svg.innerHTML = `<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><line x1="1" y1="1" x2="23" y2="23"/>`;

      const msg = document.createElement('span');
      msg.style.cssText = 'font-size:13px;color:#ef4444;text-align:center';
      msg.textContent = 'Câmera não disponível. Verifique as permissões.';

      const btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-outline';
      btn.style.marginTop = '4px';
      btn.textContent = 'Tentar novamente';
      btn.addEventListener('click', () => location.reload());

      loading.style.display = 'flex';
      loading.style.flexDirection = 'column';
      loading.style.alignItems = 'center';
      loading.style.gap = '8px';
      loading.append(svg, msg, btn);

      setStepError(stepCameraInd);
    }
  }

  // === GEOLOCALIZAÇÃO — falha bloqueia o registro ===
  async function getLocationData() {
    try {
      locationData  = await getLocation();
      locationError = null;
    } catch (err) {
      locationData  = null;
      locationError = err.message;
    }
  }

  // === CAPTURA ===
  btnCapturar.addEventListener('click', async () => {
    if (!stream) return;

    // Bloqueia se a localização falhou — não aceita coordenadas falsas
    if (locationError) {
      showToast('Localização indisponível: ' + locationError, 'error');
      return;
    }

    // Aguarda localização se ainda estiver carregando
    if (!locationData) {
      showToast('Aguardando localização GPS...', 'warning');
      try {
        locationData = await getLocation();
      } catch (err) {
        showToast('Não foi possível obter a localização: ' + err.message, 'error');
        return;
      }
    }

    setStepActive(stepBioInd, stepBio);
    btnCapturar.disabled = true;
    btnCapturar.innerHTML = `<span class="spinner"></span> Validando...`;

    try {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      capturedImageBase64 = canvas.toDataURL('image/jpeg', 0.85);

      video.style.display = 'none';
      canvas.style.display = 'block';
      instruction.textContent = 'Validando biometria...';
      instruction.style.background = 'rgba(37,99,235,0.7)';

      stream.getTracks().forEach(t => t.stop());

      const now  = new Date().toISOString();
      const tipo = getProximaBatidaTipo();

      const result = await Api.registrarPonto({
        imageBase64: capturedImageBase64,
        latitude:    locationData.latitude,
        longitude:   locationData.longitude,
        deviceTime:  now,
        tipo,
      });

      setStepDone(stepBioInd, stepBio);

      // Armazena APENAS metadados do registro — NUNCA a imagem biométrica
      localStorage.setItem('ponto_ultimo_registro', JSON.stringify({
        user_id:          result.data?.user_id,
        device_time:      result.data?.device_time || now,
        server_time:      result.data?.server_time,
        similarity_score: result.data?.similarity_score,
        latitude:         locationData.latitude,
        longitude:        locationData.longitude,
        accuracy:         locationData.accuracy,
        tipo,
      }));

      // Garante que a imagem não persiste em memória
      capturedImageBase64 = null;

      instruction.textContent = 'Identidade confirmada!';
      instruction.style.background = 'rgba(22,163,74,0.8)';

      setTimeout(() => { window.location.href = '/confirmacao.html'; }, 800);

    } catch (err) {
      setStepError(stepBioInd);
      instruction.textContent = err.message || 'Erro na validação';
      instruction.style.background = 'rgba(220,38,38,0.7)';
      showToast(err.message || 'Falha na validação biométrica', 'error');

      btnCapturar.disabled = false;
      btnCapturar.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        Tentar novamente`;
    }
  });

  window.addEventListener('beforeunload', () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
  });

  initCamera();
});
