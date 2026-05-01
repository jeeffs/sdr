// src/admin/seguranca.js
// verificarBloqueioSeguranca — verifica bloqueios, documentos e EPI
// Extraído de admin.html Fase A

window.verificarBloqueioSeguranca = async function(uid) {
  try {
    const snapBlq = await window.db.ref(`seguranca/${uid}/bloqueio`).once('value');
    if (snapBlq.val()) return { bloqueado: true, motivo: snapBlq.val().motivo || 'Bloqueio de segurança ativo. Procure o fiscal.' };
  } catch(_){}

  let dispensas = {};
  try {
    const snapDisp = await window.db.ref(`seguranca/${uid}/dispensas`).once('value');
    dispensas = snapDisp.val() || {};
  } catch(_){}

  try {
    const snapDocs = await window.db.ref(`seguranca/${uid}/documentos`).once('value');
    const docs = snapDocs.val() || {};
    const vencidos = [];
    Object.entries(docs).forEach(([tipo, d]) => {
      if (dispensas[tipo]) return;
      if (d.validade) {
        const st = window._segStatusDoc(d.validade);
        if (st.status === 'vencido') vencidos.push(window.SEG_DOC_TIPOS[tipo]?.nome || tipo);
      }
    });
    if (vencidos.length > 0) return { bloqueado: true, motivo: `Documento(s) vencido(s): ${vencidos.join(', ')}. Envie documentos atualizados.` };
  } catch(_){}

  const hoje = new Date();
  if (hoje.getDate() > 2) {
    const mesAnt    = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const mesAntKey = `${mesAnt.getFullYear()}-${String(mesAnt.getMonth() + 1).padStart(2,'0')}`;
    try {
      const snapInv   = await window.db.ref(`seguranca/${uid}/inventarios/${mesAntKey}/pendencias`).once('value');
      const pends     = snapInv.val() || {};
      const naoResolvidas = Object.entries(pends).filter(([, p]) => !p.resolvido);
      if (naoResolvidas.length > 0) return {
        bloqueado: true,
        motivo: `Pendência(s) de inventário ${mesAntKey.replace('-','/')} não resolvida(s): ${naoResolvidas.map(([item]) => item).join(', ')}. Procure o fiscal.`,
      };
    } catch(_){}
  }

  if (hoje.getDate() > 2) {
    try {
      const snapTemplate  = await window.db.ref('seguranca/fichaEpiTemplate/itens').once('value');
      const templateItems = snapTemplate.val() || {};
      if (Object.keys(templateItems).length > 0) {
        const snapFicha = await window.db.ref(`seguranca/${uid}/fichaEpi`).once('value');
        const fichaEpi  = snapFicha.val() || {};
        const itensFaltantes  = [];
        const itensRejeitados = [];
        Object.entries(templateItems).forEach(([itemId, item]) => {
          if (dispensas[itemId]) return;
          const epiData = fichaEpi[itemId];
          if (!epiData || epiData.status === 'nao_preenchido' || epiData.status === 'rejeitado') {
            itensFaltantes.push(item.descricao);
            if (epiData?.status === 'rejeitado') itensRejeitados.push(item.descricao);
          }
        });
        if (itensFaltantes.length > 0) {
          const motivo = itensRejeitados.length > 0
            ? `Ficha de EPI: ${itensRejeitados.join(', ')} rejeitado(s) pela Gestão. Corrija e reenvie.`
            : `Ficha de EPI incompleta: ${itensFaltantes.join(', ')}. Preencha os itens obrigatórios.`;
          return { bloqueado: true, motivo };
        }
      }
    } catch(_){}
  }

  if (hoje.getDate() >= 2) {
    try {
      const snapVeiculo = await window.db.ref(`seguranca/${uid}/veiculo`).once('value');
      const veiculo = snapVeiculo.val();
      if (veiculo && veiculo.mesLicenciamento) {
        const mesAtual = hoje.getMonth() + 1;
        if (mesAtual === veiculo.mesLicenciamento && veiculo.status === 'com_debitos') {
          return {
            bloqueado: true,
            motivo: `Veículo ${veiculo.placa} possui débitos no mês de licenciamento. Resolva os débitos com o DETRAN.`,
          };
        }
      }
    } catch(_){}
  }

  return { bloqueado: false };
};
