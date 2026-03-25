/* ================================================================
   HandyScan  |  js/recall.js  — Modulo Richiami Clienti v1.0
   Tipi: critico, periodico (X mesi), stagionale, anniversario
   Open Source — github.com/cormachsrl/handyscan-pwa
   ================================================================ */
'use strict';

const RC_CFG_KEY   = 'handyscan_rc_config';
const RC_SENT_KEY  = 'handyscan_rc_sent';
const RC_EMAIL_KEY = 'handyscan_rc_emails';

const STAGIONALE = { primavera:[3,4], autunno:[10,11] };

let rcCfg = {
  mesiPeriodico:    6,
  anniAnniversario: 1,
  sogliaCritica:    3.0,
  officina:         '',
  firma:            '',
};
let rcSent   = {};   // targa_tipo_AAAA-MM → { inviatoIl }
let rcEmails = {};   // targa → { email, telefono, note }

/* ── Storage ── */
function rcLoadAll() {
  try { rcCfg   = { ...rcCfg, ...JSON.parse(localStorage.getItem(RC_CFG_KEY)||'{}') }; } catch {}
  try { rcSent  = JSON.parse(localStorage.getItem(RC_SENT_KEY)||'{}'); } catch {}
  try { rcEmails= JSON.parse(localStorage.getItem(RC_EMAIL_KEY)||'{}'); } catch {}
}
function rcSaveAll() {
  localStorage.setItem(RC_CFG_KEY,   JSON.stringify(rcCfg));
  localStorage.setItem(RC_SENT_KEY,  JSON.stringify(rcSent));
  localStorage.setItem(RC_EMAIL_KEY, JSON.stringify(rcEmails));
}

/* ── Math utils ── */
function monthsDiff(d1,d2){ return Math.floor((d2-d1)/(1000*60*60*24*30.44)); }
function yearsDiff(d1,d2) { return Math.floor((d2-d1)/(1000*60*60*24*365.25)); }
function daysDiff(d1,d2)  { return Math.floor((d2-d1)/(1000*60*60*24)); }
function fmtYM(d)         { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

/* ── Calcolo richiami ── */
function computeRecalls(records) {
  const oggi  = new Date();
  const mese  = oggi.getMonth()+1;
  const out   = [];
  const seen  = new Set();

  records.forEach(r => {
    const dataScan = HS.parseDate(r.data);
    if (!dataScan || dataScan.getFullYear() < 2000) return;
    const minMm = HS.getMinMm(r);
    const email    = rcEmails[r.targa]?.email    || '';
    const telefono = rcEmails[r.targa]?.telefono || '';
    const base = { targa:r.targa, cliente:r.cliente, data:r.data, minMm, email, telefono, r, dataScan };

    /* 1 — Critico */
    if (minMm <= rcCfg.sogliaCritica) {
      const k = `${r.targa}_critico`;
      if (!seen.has(k)) { seen.add(k);
        out.push({ ...base, tipo:'critico', prio:1, urgenza:'URGENTE',
          titolo:'Pneumatici sotto soglia critica',
          motivo:`Spessore min: ${minMm.toFixed(1)} mm (soglia: ${rcCfg.sogliaCritica} mm)` });
      }
    }

    /* 2 — Periodico */
    const mesiPassati = monthsDiff(dataScan, oggi);
    if (mesiPassati >= rcCfg.mesiPeriodico) {
      const ck = `${r.targa}_periodico_${fmtYM(oggi)}`;
      const k  = `${r.targa}_periodico`;
      if (!seen.has(k) && !rcSent[ck]) { seen.add(k);
        out.push({ ...base, tipo:'periodico', prio:2,
          urgenza: mesiPassati > rcCfg.mesiPeriodico*1.5 ? 'ALTA' : 'NORMALE',
          titolo:`Richiamo periodico (${mesiPassati} mesi)`,
          motivo:`Ultima scan: ${r.data} — ${mesiPassati} mesi fa` });
      }
    }

    /* 3 — Stagionale */
    const inPrimavera = STAGIONALE.primavera.includes(mese);
    const inAutunno   = STAGIONALE.autunno.includes(mese);
    if (inPrimavera || inAutunno) {
      const stagione = inPrimavera ? 'primavera' : 'autunno';
      const ck = `${r.targa}_stagionale_${stagione}_${oggi.getFullYear()}`;
      const k  = `${r.targa}_stagionale`;
      if (!seen.has(k) && !rcSent[ck]) { seen.add(k);
        out.push({ ...base, tipo:'stagionale', prio:3, urgenza:'NORMALE',
          titolo:`Cambio gomme ${stagione === 'primavera' ? '🌱 Primavera' : '🍂 Autunno'}`,
          motivo:`Periodo stagionale di cambio pneumatici` });
      }
    }

    /* 4 — Anniversario */
    const anni = yearsDiff(dataScan, oggi);
    if (anni > 0 && anni % rcCfg.anniAnniversario === 0) {
      const ck = `${r.targa}_anniversario_${oggi.getFullYear()}`;
      const k  = `${r.targa}_anniversario`;
      const giorniDaAnni = daysDiff(dataScan, oggi) % 365;
      if (!seen.has(k) && !rcSent[ck] && giorniDaAnni < 30) { seen.add(k);
        out.push({ ...base, tipo:'anniversario', prio:4, urgenza:'BASSA',
          titolo:`Anniversario — ${anni} ${anni===1?'anno':'anni'}`,
          motivo:`Cliente fidelizzato da ${anni} ${anni===1?'anno':'anni'} · Prima scan: ${r.data}` });
      }
    }
  });

  return out.sort((a,b) => a.prio - b.prio);
}

/* ── Corpo email ── */
function buildEmail(rc) {
  const officina = rcCfg.officina || 'la nostra officina';
  const firma    = rcCfg.firma || `${officina}\nTel: [numero]\nEmail: [email]`;
  const saluto   = rc.cliente ? `Gentile ${rc.cliente},` : 'Gentile Cliente,';
  const r        = rc.r;

  const testi = {
    critico:`${saluto}

Le scriviamo con un avviso importante riguardo al veicolo targa ${r.targa}.

Nell'ultima scansione del ${r.data} abbiamo rilevato pneumatici sotto soglia di sicurezza:

  Anteriore SX:  ${r.ant_sx_mm.toFixed(1)} mm
  Anteriore DX:  ${r.ant_dx_mm.toFixed(1)} mm
  Posteriore SX: ${r.post_sx_mm.toFixed(1)} mm
  Posteriore DX: ${r.post_dx_mm.toFixed(1)} mm

Il limite legale in Italia è 1.6 mm. Le consigliamo di fissare un appuntamento al più presto per la sostituzione.

Cordiali saluti,
${firma}`,

    periodico:`${saluto}

Sono passati ${monthsDiff(rc.dataScan, new Date())} mesi dall'ultima verifica dei pneumatici del suo veicolo (targa ${r.targa}, scansione del ${r.data}).

È il momento ideale per un nuovo controllo con il nostro strumento Handy Scan. In pochi minuti verifichiamo lo stato di usura di tutti e quattro i pneumatici.

Contatti la nostra officina per fissare un appuntamento.

Cordiali saluti,
${firma}`,

    stagionale:`${saluto}

Con l'arrivo della nuova stagione è il momento di pensare al cambio gomme del veicolo targa ${r.targa}.
${r.deposito && r.posizione ? `\nI suoi pneumatici sono in deposito (posizione: ${r.posizione}) e pronti per il montaggio.` : ''}
Ne approfittiamo anche per una scansione Handy Scan dello spessore residuo.

Contatti la nostra officina per l'appuntamento — nei periodi di punta consigliamo di prenotare in anticipo!

Cordiali saluti,
${firma}`,

    anniversario:`${saluto}

Sono già ${yearsDiff(rc.dataScan, new Date())} ${yearsDiff(rc.dataScan, new Date())===1?'anno':'anni'} che si affida a ${officina} per i pneumatici del veicolo targa ${r.targa}.

La ringraziamo per la fiducia! La invitiamo a passare per un controllo con il nostro profilatore Handy Scan.

La aspettiamo!

Cordiali saluti,
${firma}`,
  };
  return testi[rc.tipo] || testi.periodico;
}

/* ── Azioni ── */
function openMail(rc) {
  const soggetti = {
    critico:      `⚠️ Avviso urgente pneumatici — Targa ${rc.targa}`,
    periodico:    `Controllo pneumatici — Targa ${rc.targa}`,
    stagionale:   `Cambio gomme stagionale — Targa ${rc.targa}`,
    anniversario: `Grazie per la sua fedeltà — Targa ${rc.targa}`,
  };
  const url = `mailto:${encodeURIComponent(rc.email||'')}?subject=${encodeURIComponent(soggetti[rc.tipo]||'Richiamo — Targa '+rc.targa)}&body=${encodeURIComponent(buildEmail(rc))}`;
  window.location.href = url;
  markSent(rc);
}

function copyEmail(rc) {
  navigator.clipboard.writeText(buildEmail(rc))
    .then(()  => toast('📋 Testo copiato negli appunti','t-ok'))
    .catch(()  => toast('Copia non riuscita','t-err'));
}

function markSent(rc) {
  const k = sentKey(rc);
  rcSent[k] = { inviatoIl: new Date().toISOString() };
  rcSaveAll();
}
function markIgnored(rc) {
  const k = sentKey(rc);
  rcSent[k] = { ignoratoIl: new Date().toISOString() };
  rcSaveAll();
}
function sentKey(rc) { return `${rc.targa}_${rc.tipo}_${fmtYM(new Date())}`; }
function isSent(rc)  { return !!rcSent[sentKey(rc)]; }

/* ── Import email CSV ── */
function importEmailsCSV(text) {
  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
  let n = 0;
  lines.slice(1).forEach(line => {
    const c = line.split(',').map(c=>c.trim().replace(/^"|"$/g,''));
    const t = c[0]?.toUpperCase();
    const e = c[1];
    if (!t || !e || !e.includes('@')) return;
    rcEmails[t] = { email:e, telefono:c[2]||'', note:c[3]||'' };
    n++;
  });
  rcSaveAll();
  return n;
}

function exportEmailsCSV(records) {
  const h = 'Targa,Email,Telefono,Note';
  const rows = records.map(r => {
    const i = rcEmails[r.targa]||{};
    return [r.targa, i.email||'', i.telefono||'', i.note||''].join(',');
  });
  const blob = new Blob([h+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='handyscan_emails.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* ── Rendering ── */
function renderRecallView(records) {
  const el = document.getElementById('recall-container');
  if (!el) return;

  const all     = computeRecalls(records);
  const pending = all.filter(rc => !isSent(rc));
  const done    = all.filter(rc =>  isSent(rc));

  // badge nav
  const badge = document.getElementById('recall-badge');
  if (badge) { badge.textContent = pending.length; badge.style.display = pending.length ? 'inline-flex' : 'none'; }

  if (!all.length) {
    el.innerHTML = `<div class="rc-empty"><div class="ei">📬</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:6px">Nessun richiamo attivo</div>
      <div style="font-size:13px;color:var(--muted)">Aggiorna le email dei clienti o configura le soglie per attivare i richiami.</div></div>`;
    return;
  }

  const uCol = { URGENTE:'var(--crit)', ALTA:'var(--warn)', NORMALE:'var(--ok)', BASSA:'var(--info)' };
  const tIco = { critico:'🔴', periodico:'🔁', stagionale:'🍂', anniversario:'🎂' };

  const card = (rc) => {
    const sent     = isSent(rc);
    const hasEmail = !!rc.email;
    const uc       = uCol[rc.urgenza]||'var(--muted)';
    const ei       = rcEmails[rc.targa]||{};
    return `
    <div class="rc-card${sent?' rc-done':''}">
      <div class="rc-card-head">
        <div class="rc-card-left">
          <span class="rc-tipo-icon">${tIco[rc.tipo]||'📋'}</span>
          <div>
            <div class="rc-card-title">${HS.escHTML(rc.titolo)}</div>
            <div class="rc-card-sub">${HS.escHTML(rc.motivo)}</div>
          </div>
        </div>
        <span class="rc-urgenza" style="background:${uc}22;color:${uc};border:1px solid ${uc}44">${rc.urgenza}</span>
      </div>
      <div class="rc-card-body">
        <div class="rc-info-row"><span class="rc-info-label">Targa</span><span class="targa-chip" style="font-size:12px">${HS.escHTML(rc.targa)}</span></div>
        <div class="rc-info-row"><span class="rc-info-label">Cliente</span><span>${HS.escHTML(rc.cliente)||'—'}</span></div>
        <div class="rc-info-row"><span class="rc-info-label">Email</span>
          ${hasEmail
            ? `<a class="rc-email-link" href="mailto:${HS.escHTML(rc.email)}">${HS.escHTML(rc.email)}</a>`
            : `<button class="btn btn-ghost btn-xs" onclick="rcEditEmail('${HS.escHTML(rc.targa)}')">+ Aggiungi</button>`}
        </div>
        <div class="rc-info-row"><span class="rc-info-label">Telefono</span><span>${HS.escHTML(ei.telefono||'—')}</span></div>
      </div>
      <div class="rc-card-actions">
        ${hasEmail
          ? `<button class="btn btn-primary btn-sm" onclick="rcDoOpenMail('${HS.escHTML(rc.targa)}','${rc.tipo}')">📧 Apri in Mail</button>`
          : `<button class="btn btn-ghost btn-sm" onclick="rcEditEmail('${HS.escHTML(rc.targa)}')">📧 Aggiungi email</button>`}
        <button class="btn btn-ghost btn-sm" onclick="rcDoPreview('${HS.escHTML(rc.targa)}','${rc.tipo}')">👁 Anteprima</button>
        <button class="btn btn-ghost btn-sm" onclick="rcDoCopy('${HS.escHTML(rc.targa)}','${rc.tipo}')">📋 Copia testo</button>
        ${!sent
          ? `<button class="btn btn-ghost btn-sm" onclick="rcDoMarkSent('${HS.escHTML(rc.targa)}','${rc.tipo}')">✅ Segna inviato</button>
             <button class="btn btn-ghost btn-sm" onclick="rcDoIgnore('${HS.escHTML(rc.targa)}','${rc.tipo}')">🚫 Ignora</button>`
          : `<span style="font-size:11px;color:var(--muted)">✓ Gestito</span>`}
      </div>
    </div>`;
  };

  el.innerHTML = `
    <div class="rc-section-head"><h3 class="rc-section-title">Da inviare <span class="rc-count">${pending.length}</span></h3></div>
    ${pending.length ? pending.map(card).join('') : '<div class="rc-empty-small">Nessun richiamo pendente 🎉</div>'}
    ${done.length ? `
      <div class="rc-section-head" style="margin-top:22px"><h3 class="rc-section-title">Gestiti <span class="rc-count rc-count-done">${done.length}</span></h3></div>
      ${done.map(card).join('')}` : ''}`;
}

function renderEmailManager(records) {
  const el = document.getElementById('email-manager');
  if (!el) return;
  el.innerHTML = `
    <div class="rc-toolbar">
      <input id="rc-em-search" class="form-input" style="flex:1;min-width:160px" type="search" placeholder="🔍 Cerca targa o cliente..." oninput="rcFilterEmails()">
      <label class="btn btn-ghost btn-sm" style="cursor:pointer">⬆ Importa CSV<input type="file" accept=".csv" style="display:none" onchange="rcImportFile(this)"></label>
      <button class="btn btn-ghost btn-sm" onclick="rcExportEmails()">⬇ Esporta CSV</button>
    </div>
    <div class="rc-email-hint">Formato CSV: <code>Targa,Email,Telefono,Note</code></div>
    <div class="table-wrap"><div class="table-scroll">
      <table>
        <thead><tr><th>Targa</th><th>Cliente</th><th>Email</th><th>Telefono</th><th>Stato</th><th></th></tr></thead>
        <tbody id="rc-em-body">
          ${records.map(r => {
            const i = rcEmails[r.targa]||{};
            const ok = !!i.email;
            return `<tr data-q="${HS.escHTML((r.targa+' '+r.cliente).toLowerCase())}">
              <td><span class="targa-chip">${HS.escHTML(r.targa)}</span></td>
              <td>${HS.escHTML(r.cliente)}</td>
              <td>${ok?`<a href="mailto:${HS.escHTML(i.email)}" style="color:var(--cyan)">${HS.escHTML(i.email)}</a>`:'<span style="color:var(--muted)">—</span>'}</td>
              <td>${HS.escHTML(i.telefono||'—')}</td>
              <td><span class="${ok?'mm-ok':'mm-warn'}" style="font-size:12px;font-weight:600">${ok?'✓ OK':'⚠ Mancante'}</span></td>
              <td><button class="btn btn-ghost btn-xs" onclick="rcEditEmail('${HS.escHTML(r.targa)}')">✎</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div></div>`;
}

function renderRecallSettings() {
  const el = document.getElementById('recall-settings');
  if (!el) return;
  el.innerHTML = `
    <div class="rc-settings-grid">
      <div class="form-group">
        <label class="form-label">Richiamo dopo (mesi)</label>
        <input id="rc-cfg-mesi" class="form-input" type="number" min="1" max="36" value="${rcCfg.mesiPeriodico}">
        <div style="font-size:11px;color:var(--muted);margin-top:3px">Richiama se scansione più vecchia di X mesi</div>
      </div>
      <div class="form-group">
        <label class="form-label">Anniversario ogni (anni)</label>
        <input id="rc-cfg-anni" class="form-input" type="number" min="1" max="5" value="${rcCfg.anniAnniversario}">
      </div>
      <div class="form-group">
        <label class="form-label">Soglia richiamo critico (mm)</label>
        <input id="rc-cfg-soglia" class="form-input" type="number" min="1" max="5" step="0.1" value="${rcCfg.sogliaCritica}">
      </div>
      <div class="form-group">
        <label class="form-label">Nome officina</label>
        <input id="rc-cfg-officina" class="form-input" type="text" value="${HS.escHTML(rcCfg.officina)}" placeholder="es. Pezzali Gomme">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Firma email</label>
        <textarea id="rc-cfg-firma" class="form-input" rows="3" placeholder="Nome Officina&#10;Tel: +39 ...&#10;Email: info@...">${HS.escHTML(rcCfg.firma)}</textarea>
      </div>
    </div>
    <div class="form-actions"><button class="btn btn-primary" onclick="rcSaveConfig()">💾 Salva impostazioni</button></div>`;
}

/* ── Modali ── */
function showPreview(rc) {
  const body = buildEmail(rc);
  const sogg = { critico:`⚠️ Avviso urgente — Targa ${rc.targa}`, periodico:`Controllo pneumatici — Targa ${rc.targa}`, stagionale:`Cambio gomme stagionale — Targa ${rc.targa}`, anniversario:`Grazie per la fedeltà — Targa ${rc.targa}` };
  const m = document.createElement('div');
  m.className = 'rc-modal-overlay';
  m.innerHTML = `<div class="rc-modal">
    <div class="rc-modal-head"><h3>Anteprima — ${HS.escHTML(rc.targa)}</h3><button class="btn btn-ghost btn-sm" onclick="this.closest('.rc-modal-overlay').remove()">✕</button></div>
    <div class="rc-modal-subject"><span class="rc-info-label">Oggetto</span><span>${HS.escHTML(sogg[rc.tipo]||'')}</span></div>
    <pre class="rc-email-preview">${HS.escHTML(body)}</pre>
    <div class="rc-modal-actions">
      ${rc.email ? `<button class="btn btn-primary" onclick="document.querySelector('.rc-modal-overlay').remove();rcDoOpenMail('${HS.escHTML(rc.targa)}','${rc.tipo}')">📧 Apri in Mail</button>` : ''}
      <button class="btn btn-ghost" onclick="navigator.clipboard.writeText(${JSON.stringify(body)}).then(()=>toast('📋 Copiato','t-ok'))">📋 Copia</button>
      <button class="btn btn-ghost" onclick="this.closest('.rc-modal-overlay').remove()">Chiudi</button>
    </div>
  </div>`;
  document.body.appendChild(m);
}

function showEmailEditor(targa) {
  const i = rcEmails[targa]||{};
  const m = document.createElement('div');
  m.className = 'rc-modal-overlay';
  m.innerHTML = `<div class="rc-modal">
    <div class="rc-modal-head"><h3>Contatti — <span class="targa-chip" style="font-size:12px">${HS.escHTML(targa)}</span></h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.rc-modal-overlay').remove()">✕</button></div>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">
      <div class="form-group"><label class="form-label">Email</label><input id="rce-email" class="form-input" type="email" value="${HS.escHTML(i.email||'')}" placeholder="nome@esempio.it"></div>
      <div class="form-group"><label class="form-label">Telefono</label><input id="rce-tel" class="form-input" type="tel" value="${HS.escHTML(i.telefono||'')}" placeholder="+39 ..."></div>
      <div class="form-group"><label class="form-label">Note</label><input id="rce-note" class="form-input" type="text" value="${HS.escHTML(i.note||'')}" placeholder="Note libere"></div>
    </div>
    <div class="rc-modal-actions">
      <button class="btn btn-primary" onclick="rcSaveEmail('${HS.escHTML(targa)}')">💾 Salva</button>
      <button class="btn btn-ghost" onclick="this.closest('.rc-modal-overlay').remove()">Annulla</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  setTimeout(()=>document.getElementById('rce-email')?.focus(),80);
}

/* ── Helpers per trovare recall da targa+tipo ── */
function findRc(targa, tipo) {
  return computeRecalls(HS.getRecords()).find(rc => rc.targa===targa && rc.tipo===tipo);
}

/* ── Globals per onclick HTML ── */
function initRecallGlobals() {
  window.rcDoOpenMail  = (t,tp) => { const rc=findRc(t,tp); if(rc) openMail(rc); };
  window.rcDoPreview   = (t,tp) => { const rc=findRc(t,tp); if(rc) showPreview(rc); };
  window.rcDoCopy      = (t,tp) => { const rc=findRc(t,tp); if(rc) copyEmail(rc); };
  window.rcDoMarkSent  = (t,tp) => { const rc=findRc(t,tp)||{targa:t,tipo:tp}; markSent(rc); refreshRecall(); toast('✅ Segnato come inviato','t-ok'); };
  window.rcDoIgnore    = (t,tp) => { const rc=findRc(t,tp)||{targa:t,tipo:tp}; markIgnored(rc); refreshRecall(); toast('🚫 Ignorato',''); };
  window.rcEditEmail   = (t)    => showEmailEditor(t);
  window.rcSaveEmail   = (t)    => {
    rcEmails[t] = { email:document.getElementById('rce-email')?.value.trim()||'', telefono:document.getElementById('rce-tel')?.value.trim()||'', note:document.getElementById('rce-note')?.value.trim()||'' };
    rcSaveAll(); document.querySelector('.rc-modal-overlay')?.remove();
    refreshRecall(); toast('✅ Contatti salvati','t-ok');
  };
  window.rcSaveConfig  = () => {
    rcCfg.mesiPeriodico    = parseInt(document.getElementById('rc-cfg-mesi')?.value)||6;
    rcCfg.anniAnniversario = parseInt(document.getElementById('rc-cfg-anni')?.value)||1;
    rcCfg.sogliaCritica    = parseFloat(document.getElementById('rc-cfg-soglia')?.value)||3.0;
    rcCfg.officina         = document.getElementById('rc-cfg-officina')?.value.trim()||'';
    rcCfg.firma            = document.getElementById('rc-cfg-firma')?.value.trim()||'';
    rcSaveAll(); refreshRecall(); toast('✅ Impostazioni salvate','t-ok');
  };
  window.rcImportFile  = (input) => {
    const f=input.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{ const n=importEmailsCSV(ev.target.result); refreshRecall(); toast(`✅ ${n} email importate`,'t-ok'); };
    r.readAsText(f,'UTF-8'); input.value='';
  };
  window.rcExportEmails = () => exportEmailsCSV(HS.getRecords());
  window.rcFilterEmails = () => {
    const q=document.getElementById('rc-em-search')?.value.toLowerCase()||'';
    document.querySelectorAll('#rc-em-body tr').forEach(tr => { tr.style.display=!q||tr.dataset.q?.includes(q)?'':'none'; });
  };
  window.rcSwitchTab = (tab) => {
    ['pending','emails','settings'].forEach(t => {
      const p=document.getElementById(`rc-panel-${t}`);
      const b=document.getElementById(`rctab-${t}`);
      if(p) p.style.display = t===tab?'':'none';
      if(b) { b.classList.toggle('active', t===tab); }
    });
    if(tab==='emails')   renderEmailManager(HS.getRecords());
    if(tab==='settings') renderRecallSettings();
  };
}

function refreshRecall() {
  renderRecallView(HS.getRecords());
  if (document.getElementById('rc-em-body')) renderEmailManager(HS.getRecords());
}

/* ── Init ── */
function initRecall() {
  rcLoadAll();
  initRecallGlobals();
}

window.RC = { init:initRecall, renderView:renderRecallView, renderEmailManager, renderSettings:renderRecallSettings, getEmails:()=>rcEmails };
