/**
 * SDR — OLT HTML Templates · Fase 26
 * _sdrHtml_olts — HTML da página OLTs (dark tab UI)
 */

window._sdrHtml_olts = window._sdrHtml_olts || function() {
  return '<div id="olts-page" style="height:100%;display:flex;flex-direction:column;background:#060d1c;overflow:hidden">'
    // Tab bar row: scrollable tabs on left, Nova OLT button pinned on right
    +'<div style="display:flex;align-items:stretch;background:#0a1628;border-bottom:1px solid #1e3a5f;flex-shrink:0">'
    +'<div id="olts-tab-bar" style="flex:1;display:flex;align-items:flex-end;min-height:42px;overflow-x:auto;padding:0 4px"></div>'
    +'<div style="display:flex;align-items:center;padding:0 10px;flex-shrink:0;border-left:1px solid #1e3a5f">'
    +'<button onclick="sdrOltAddModal()" style="padding:5px 12px;font-size:.78rem;background:#1d4ed8;color:#fff;border:none;border-radius:6px;cursor:pointer;white-space:nowrap"><i class="fas fa-plus"></i> Nova OLT</button>'
    +'</div>'
    +'</div>'
    +'<div id="olt-panel-content" style="flex:1;min-height:0;overflow:hidden;position:relative;background:#060d1c;display:flex;flex-direction:column"></div>'
    +'</div>';
};
