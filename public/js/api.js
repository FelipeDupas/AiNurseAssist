/* ============================================================
   API.JS — Cliente HTTP centralizado do Sistema de Ponto
   ─────────────────────────────────────────────────────────────
   O token JWT trafega via cookie HttpOnly (definido pelo backend).
   O frontend NÃO gerencia o token diretamente — o browser envia
   o cookie automaticamente em cada requisição com credentials:'include'.
   ============================================================ */

const API_BASE = window.location.origin;

const Api = {

  /**
   * Executa uma requisição HTTP autenticada.
   * Lança Error com .status em caso de resposta não-ok.
   * Redireciona para login se receber 401 (sessão expirada).
   * @param {'GET'|'POST'|'PUT'|'DELETE'} method
   * @param {string} path
   * @param {object|null} [body=null]
   * @returns {Promise<object>}
   */
  async _request(method, path, body = null) {
    const opts = {
      method,
      credentials: 'include', // envia cookie HttpOnly automaticamente
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);

    const res  = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      // Sessão expirada — limpa flag local e redireciona para login
      localStorage.removeItem('ponto_logged_in');
      localStorage.removeItem('ponto_user');
      window.location.href = '/login.html';
      return;
    }

    if (!res.ok) {
      const err    = new Error(data.error || data.message || `Erro ${res.status}`);
      err.status   = res.status;
      err.data     = data;
      throw err;
    }

    return data;
  },

  /* ── AUTH ──────────────────────────────────────────────── */

  /**
   * Autentica com CPF e senha. O token é persistido no cookie HttpOnly.
   * @param {string} cpf
   * @param {string} senha
   * @returns {Promise<{user: {nome, matricula}}>}
   */
  async login(cpf, senha) {
    return this._request('POST', '/login', { cpf, password: senha });
  },

  /**
   * Encerra a sessão chamando o endpoint de logout no backend,
   * que limpa o cookie HttpOnly.
   */
  async logout() {
    return this._request('POST', '/logout');
  },

  /* ── DASHBOARD ─────────────────────────────────────────── */

  async getDashboard() {
    return this._request('GET', '/dashboard');
  },

  /* ── BIOMETRIA ─────────────────────────────────────────── */

  /**
   * @param {string} imageBase64 - Imagem JPEG em base64
   * @returns {Promise<{match: boolean, similarity_score: number}>}
   */
  async verifyBiometric(imageBase64) {
    return this._request('POST', '/biometric/verify', { image_base64: imageBase64 });
  },

  /* ── REGISTRO DE PONTO ─────────────────────────────────── */

  /**
   * @param {object} params
   * @param {string} params.imageBase64
   * @param {number} params.latitude
   * @param {number} params.longitude
   * @param {string} params.deviceTime
   * @param {string} params.tipo
   * @returns {Promise<{data: object}>}
   */
  async registrarPonto({ imageBase64, latitude, longitude, deviceTime, tipo }) {
    return this._request('POST', '/registro-ponto', {
      image_base64: imageBase64,
      latitude,
      longitude,
      device_time: deviceTime,
      tipo: tipo || 'entrada',
    });
  },

  /* ── ADMIN CONFIG ──────────────────────────────────────── */

  async getAdminConfig() {
    return this._request('GET', '/admin/config');
  },

  async saveAdminConfig(config) {
    return this._request('POST', '/admin/config', config);
  },
};
