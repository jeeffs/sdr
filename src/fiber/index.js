/**
 * SDR — Fase 23: Fiber Standards Modal
 * Migrado de sdr-module.js:
 *   sdrSetFiberStandard       (linhas 337-344)
 *   sdrShowFiberStandardModal (linhas 345-426)
 *
 * Deps runtime via window:
 *   window.sdrFiberStandard    (exposto no IIFE em L335)
 *   window.SDR_FIBER_STANDARDS (de src/utils/fiber-standards.js)
 */

window.sdrSetFiberStandard = window.sdrSetFiberStandard || function(std) {
  window.sdrFiberStandard = std;
  localStorage.setItem('sdr_fiber_standard', std);
  const el = document.getElementById('fiber-std-label');
  if (el) el.textContent = std === 'tia' ? 'TIA' : 'ABNT';
};

window.sdrShowFiberStandardModal = window.sdrShowFiberStandardModal || function() {
  const existing = document.getElementById('modal-fiber-std');
  if (existing) existing.remove();

  const fiberStd = window.sdrFiberStandard || 'abnt';
  const STDS     = window.SDR_FIBER_STANDARDS || {};

  function renderFiberGrid(s) {
    const fibers   = s.fibers || [];
    const maxTubes = 12;
    let html = '<div style="margin-bottom:14px">';
    html += '<div style="font-weight:700;font-size:.82rem;color:#1e293b;margin-bottom:8px"><i class="fas fa-circle" style="font-size:8px;color:#2563eb;margin-right:6px"></i>Fibras (' + fibers.length + ' cores)</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px">';
    fibers.forEach(function(f) {
      html += '<div style="text-align:center;padding:6px 2px;background:#f8fafc;border-radius:6px;border:1px solid #e5e7eb">'
        + '<div style="width:22px;height:22px;border-radius:50%;background:' + f.color + ';border:2px solid ' + (f.border||f.color) + ';margin:0 auto 3px"></div>'
        + '<div style="font-size:.65rem;font-weight:700;color:#1e293b">' + f.num + '</div>'
        + '<div style="font-size:.58rem;color:#64748b">' + f.name + '</div>'
        + '</div>';
    });
    html += '</div>';
    html += '<div style="font-weight:700;font-size:.82rem;color:#1e293b;margin:10px 0 8px"><i class="fas fa-grip-lines" style="font-size:8px;color:#16a34a;margin-right:6px"></i>Tubos (até ' + maxTubes + ')</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px">';
    for (var i = 1; i <= maxTubes; i++) {
      var tc = (typeof s.tubeColor === 'function') ? s.tubeColor(i) : { color: '#ccc', border: '#ccc', name: '' };
      html += '<div style="text-align:center;padding:6px 2px;background:#f8fafc;border-radius:6px;border:1px solid #e5e7eb">'
        + '<div style="width:28px;height:10px;border-radius:3px;background:' + tc.color + ';border:1.5px solid ' + (tc.border||tc.color) + ';margin:0 auto 3px"></div>'
        + '<div style="font-size:.65rem;font-weight:700;color:#1e293b">T' + i + '</div>'
        + '<div style="font-size:.55rem;color:#64748b">' + tc.name + '</div>'
        + '</div>';
    }
    html += '</div></div>';
    return html;
  }

  var abntSel   = fiberStd === 'abnt';
  var tiaSel    = fiberStd === 'tia';
  var abntBorder = abntSel ? '#2563eb' : '#e5e7eb';
  var tiaBorder  = tiaSel  ? '#2563eb' : '#e5e7eb';
  var abntBg     = abntSel ? 'background:#eff6ff' : 'background:#fff';
  var tiaBg      = tiaSel  ? 'background:#eff6ff' : 'background:#fff';
  var abntCheck  = abntSel ? '<i class="fas fa-check-circle" style="color:#2563eb;margin-left:auto"></i>' : '';
  var tiaCheck   = tiaSel  ? '<i class="fas fa-check-circle" style="color:#2563eb;margin-left:auto"></i>' : '';

  var modal     = document.createElement('div');
  modal.id        = 'modal-fiber-std';
  modal.className = 'modal-overlay open';
  modal.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:600px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3)">'
    + '<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">'
    + '<div><div style="font-weight:700;font-size:1rem;color:#1e293b"><i class="fas fa-palette" style="color:#8b5cf6;margin-right:8px"></i>Padrão de Cores de Fibra</div>'
    + '<div style="font-size:.78rem;color:#64748b;margin-top:2px">Selecione o padrão usado nos cabos da sua rede</div></div>'
    + '<button onclick="document.getElementById(\'modal-fiber-std\').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b">✕</button>'
    + '</div>'
    + '<div style="padding:16px 20px;overflow-y:auto;flex:1">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
    + '<div onclick="sdrSetFiberStandard(\'abnt\');document.getElementById(\'modal-fiber-std\').remove()" style="cursor:pointer;border:2px solid ' + abntBorder + ';border-radius:12px;padding:14px;transition:.2s;' + abntBg + '">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:1.2rem">🇧🇷</span><div><div style="font-weight:700;font-size:.88rem;color:#1e293b">ABNT NBR 14100</div><div style="font-size:.7rem;color:#64748b">Padrão Brasileiro</div></div>' + abntCheck + '</div>'
    + renderFiberGrid(STDS.abnt || {})
    + '</div>'
    + '<div onclick="sdrSetFiberStandard(\'tia\');document.getElementById(\'modal-fiber-std\').remove()" style="cursor:pointer;border:2px solid ' + tiaBorder + ';border-radius:12px;padding:14px;transition:.2s;' + tiaBg + '">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:1.2rem">🇺🇸</span><div><div style="font-weight:700;font-size:.88rem;color:#1e293b">TIA-598</div><div style="font-size:.7rem;color:#64748b">Padrão Americano/Internacional</div></div>' + tiaCheck + '</div>'
    + renderFiberGrid(STDS.tia || {})
    + '</div>'
    + '</div></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
};

console.log('[SDR Bundle] fiber/index.js — sdrSetFiberStandard + sdrShowFiberStandardModal OK');
