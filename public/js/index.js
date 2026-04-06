/* Redirect da raiz — fora da CSP inline, compatível com script-src 'self' */
window.location.replace(
  localStorage.getItem('ponto_logged_in') ? '/dashboard.html' : '/login.html'
);
