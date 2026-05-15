// src/admin/auth.js
// Autenticação e sessão

// ── Hash SHA-256 ──
window.sha256 = async function(msg) {
  const buf = new TextEncoder().encode(msg);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
};

window.gerarSalt = function(len = 16) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
};

window.hashComSalt = async function(senha, salt) {
  return await window.sha256(salt + ':' + senha);
};

window.verificarSenha = async function(senha, user) {
  if (user.salt) {
    const hash = await window.hashComSalt(senha, user.salt);
    return hash === user.passwordHash;
  }
  const hash = await window.sha256(senha);
  return hash === user.passwordHash;
};

// ── Rate Limiting ──
const _loginAttempts = {};
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

window._checkRateLimit = function(nome) {
  const entry = _loginAttempts[nome];
  if (!entry) return { allowed: true };
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    const restante = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    return { allowed: false, restante };
  }
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    delete _loginAttempts[nome];
    return { allowed: true };
  }
  return { allowed: true };
};

window._registrarFalha = function(nome) {
  if (!_loginAttempts[nome]) _loginAttempts[nome] = { count: 0 };
  _loginAttempts[nome].count++;
  if (_loginAttempts[nome].count >= MAX_LOGIN_ATTEMPTS) {
    _loginAttempts[nome].lockedUntil = Date.now() + LOCKOUT_SECONDS * 1000;
    return { locked: true, seconds: LOCKOUT_SECONDS };
  }
  return { locked: false, remaining: MAX_LOGIN_ATTEMPTS - _loginAttempts[nome].count };
};

window._limparFalhas = function(nome) {
  delete _loginAttempts[nome];
};

// ── Sessão com Timeout ──
const SESSION_TIMEOUT_MIN = 30;
// _sessionTimer fica em window para que logout() em admin.html possa acessar
window._sessionTimer = window._sessionTimer || null;

window._resetSessionTimer = function() {
  clearTimeout(window._sessionTimer);
  if (!window.currentUser) return;
  window._sessionTimer = setTimeout(() => {
    if (window.currentUser) {
      window.toast('Sessão expirada por inatividade. Faça login novamente.', 'error');
      window.logout();
    }
  }, SESSION_TIMEOUT_MIN * 60 * 1000);
};

// Instala listeners de atividade no carregamento do módulo
['click','keydown','touchstart','scroll'].forEach(evt => {
  document.addEventListener(evt, () => { if (window.currentUser) window._resetSessionTimer(); }, {passive: true});
});

window.togglePwdVis = function() {
  const inp = document.getElementById('pwd-input');
  const ico = document.getElementById('pwd-eye-icon');
  if (inp.type === 'password') { inp.type = 'text'; ico.classList.replace('fa-eye','fa-eye-slash'); }
  else { inp.type = 'password'; ico.classList.replace('fa-eye-slash','fa-eye'); }
};

window.entrar = async function() {
  try {
    const nomeDigitado = (document.getElementById('login-user-input').value || '').trim().toLowerCase();
    if (!nomeDigitado) { window.showLoginErr('Digite seu usuário.'); return; }
    const rl = window._checkRateLimit(nomeDigitado);
    if (!rl.allowed) { window.showLoginErr(`Muitas tentativas. Aguarde ${rl.restante}s antes de tentar novamente.`); return; }
    const uid = Object.keys(window.usersCache).find(k => (window.usersCache[k].name || '').toLowerCase() === nomeDigitado);
    if (!uid) { window._registrarFalha(nomeDigitado); window.showLoginErr('Usuário não encontrado. Verifique o nome digitado.'); return; }
    const u = window.usersCache[uid];
    if (u.ativo === false) { window.showLoginErr('Este usuário é somente para consulta histórica e não pode fazer login.'); return; }
    window.selectedUserId = uid;
    if (u.firstLogin) {
      window.pendingFirstLogin = uid;
      const titleEl = document.getElementById('first-login-title');
      if (titleEl) titleEl.textContent = `Bem-vindo, ${u.name}!`;
      window.screen('first-login');
      setTimeout(() => { const el = document.getElementById('new-pwd'); if (el) el.focus(); }, 200);
      return;
    }
    const pwd = document.getElementById('pwd-input').value;
    if (!pwd) { window.showLoginErr('Digite sua senha.'); const el = document.getElementById('pwd-input'); if (el) el.focus(); return; }
    const senhaOk = await window.verificarSenha(pwd, u);
    if (!senhaOk) {
      const falha = window._registrarFalha(nomeDigitado);
      if (falha.locked) { window.showLoginErr(`Conta bloqueada por ${falha.seconds}s. Muitas tentativas incorretas.`); }
      else { window.showLoginErr(`Senha incorreta. ${falha.remaining} tentativa${falha.remaining !== 1 ? 's' : ''} restante${falha.remaining !== 1 ? 's' : ''}.`); }
      const el = document.getElementById('pwd-input'); if (el) { el.value = ''; el.focus(); }
      return;
    }
    if (!u.salt) {
      const novoSalt = window.gerarSalt();
      const novoHash = await window.hashComSalt(pwd, novoSalt);
      await window.db.ref(`users/${uid}`).update({ salt: novoSalt, passwordHash: novoHash });
      window.usersCache[uid] = { ...u, salt: novoSalt, passwordHash: novoHash };
    }
    window._limparFalhas(nomeDigitado);
    window._resetSessionTimer();
    window.loginSuccess({ id: uid, name: u.name, role: u.role, nivel: u.nivel || 'V1' });
  } catch(e) {
    console.error('[entrar]', e);
    window.showLoginErr('Erro ao fazer login. Tente novamente.');
  }
};

window.criarSenha = async function() {
  try {
    const p1 = document.getElementById('new-pwd').value;
    const p2 = document.getElementById('new-pwd2').value;
    const err = document.getElementById('first-login-err');
    if (!err) return;
    err.style.display = 'none';
    if (p1.length < 4) { err.textContent = 'A senha deve ter pelo menos 4 caracteres.'; err.style.display = 'block'; return; }
    if (p1 !== p2) { err.textContent = 'As senhas não coincidem.'; err.style.display = 'block'; return; }
    const salt = window.gerarSalt();
    const hash = await window.hashComSalt(p1, salt);
    await window.db.ref(`users/${window.pendingFirstLogin}`).update({ passwordHash: hash, salt, firstLogin: false });
    window.usersCache[window.pendingFirstLogin] = {
      ...window.usersCache[window.pendingFirstLogin],
      passwordHash: hash, salt, firstLogin: false,
    };
    const u = window.usersCache[window.pendingFirstLogin];
    window.loginSuccess({ id: window.pendingFirstLogin, name: u.name, role: u.role, nivel: u.nivel || 'V1' });
    window.pendingFirstLogin = null;
  } catch(e) {
    console.error('[criarSenha]', e);
    const err = document.getElementById('first-login-err');
    if (err) { err.textContent = 'Erro ao criar senha. Tente novamente.'; err.style.display = 'block'; }
  }
};

window.showLoginErr = function(msg) {
  const el = document.getElementById('login-err');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
};

window.initLoginScreen = function() {
  const lastUser = localStorage.getItem('srua_lastUser');
  if (lastUser) {
    const inp = document.getElementById('login-user-input');
    if (inp) {
      inp.value = lastUser;
      setTimeout(() => { const el = document.getElementById('pwd-input'); if (el) el.focus(); }, 100);
    }
  }
};
