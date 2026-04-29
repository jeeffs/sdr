/**
 * SDR — Audit Log
 * Registra toda operação de escrita no Firebase em /audit_log/
 *
 * Estrutura de cada registro:
 *   /audit_log/{pushId}
 *     acao:      'create_infra' | 'update_infra' | 'delete_infra' | string
 *     elemento:  { id, type, nome }
 *     usuario:   string — nome do usuário logado
 *     timestamp: ISO string
 *     before:    object | null — estado anterior
 *     after:     object | null — estado novo
 *
 * Dependencias runtime:
 *   window.db          — instância Firebase database (inicializada no admin.html)
 *   window.currentUser — usuário logado { id, name, role }
 */

/**
 * Registra uma operação no audit log. Fire-and-forget — não bloqueia a operação principal.
 *
 * @param {string} acao      - Tipo de ação: 'create_infra', 'update_infra', 'delete_infra'
 * @param {object} elemento  - Elemento afetado: { id, type, nome }
 * @param {object|null} before - Estado anterior (null para criações)
 * @param {object|null} after  - Estado novo (null para deleções)
 */
export function sdrAuditLog(acao, elemento, before, after) {
  // Garante que db está disponível (inicializado após login do Firebase)
  if (!window.db) {
    console.warn('[SDR Audit] db não disponível — log ignorado:', acao);
    return;
  }

  const usuario = _resolveUsuario();

  // Limpa dados sensíveis antes de gravar (fotos base64 inflam o log)
  const cleanBefore = before ? _cleanData(before) : null;
  const cleanAfter  = after  ? _cleanData(after)  : null;

  const registro = {
    acao,
    elemento: {
      id:   elemento.id   || null,
      type: elemento.type || null,
      nome: elemento.nome || elemento.name || null
    },
    usuario,
    timestamp: new Date().toISOString(),
    before: cleanBefore,
    after:  cleanAfter
  };

  // Fire-and-forget — falha silenciosa para não quebrar operação principal
  window.db.ref('audit_log').push(registro).catch(err => {
    console.warn('[SDR Audit] Falha ao gravar log:', err.message);
  });
}

// ── Helpers privados ──────────────────────────────────────────────────────────

function _resolveUsuario() {
  // Prioridade: currentUser do app > Firebase Auth > fallback
  if (window.currentUser && window.currentUser.name) return window.currentUser.name;
  try {
    const u = window.firebase && window.firebase.auth().currentUser;
    if (u) return u.displayName || u.email || u.uid;
  } catch(_) {}
  return 'sistema';
}

function _cleanData(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    // Remove campos com dados pesados (fotos base64, blobs)
    if (k === 'photo_url' && typeof v === 'string' && v.startsWith('data:')) {
      clean[k] = '[base64 omitido]';
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

// ── Expor global para uso no sdr-module.js ────────────────────────────────────
window.sdrAuditLog = sdrAuditLog;
