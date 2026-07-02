/* ================================================================
   TireScan-Pro  |  js/app.js  — Logica principale v1.1
   Open Source — github.com/cormachsrl/handyscan-pwa
   ================================================================ */
'use strict';

/* ── Versione app (aggiornare qui a ogni release) ── */
const APP_VERSION = '2.9.2';
/* Indirizzo per segnalazioni bug/proposte (mostrato nel pannello ℹ️) */
const FEEDBACK_EMAIL = 'a.pezzali@cormachsrl.com';

/* ── State ── */
let currentView  = 'dashboard';
let sortCol      = 'data';
let sortDir      = 'desc';
let editingId    = null;
let deferredInstall = null;
let chartInstances  = {};

const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ── Toast ── */
function toast(msg, cls='') {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'show ' + cls;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className=''; }, 3000);
}
window.toast = toast;

/* ── Navigation ── */
function showView(name) {
  currentView = name;
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-item').forEach(b => b.classList.remove('active'));
  const v = $('view-'+name);
  if (v) v.classList.add('active');
  const b = $('nav-'+name);
  if (b) b.classList.add('active');

  if (name === 'dashboard') renderDashboard();
  if (name === 'list')      renderList();
  if (name === 'alerts')    renderAlerts();
  if (name === 'stats')     renderStats();
  if (name === 'customers'  && window.CUST) CUST.renderView();
  if (name === 'appointments' && window.APPT) APPT.renderView();
  if (name === 'recalls' && window.RC) {
    RC.renderView(HS.getRecords());
    document.querySelectorAll('.rc-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('rctab-pending')?.classList.add('active');
    ['emails','settings'].forEach(t => { const p=$(`rc-panel-${t}`); if(p) p.style.display='none'; });
    const pp=$('rc-panel-pending'); if(pp) pp.style.display='';
  }
}
window.showView = showView;

/* ── Dashboard ── */
function renderDashboard() {
  const recs = HS.getRecords();
  const critici    = recs.filter(r => HS.getMinMm(r) <= HS.CRIT_MM);
  const attenzione = recs.filter(r => { const m=HS.getMinMm(r); return m>HS.CRIT_MM && m<=HS.WARN_MM; });
  const deposito   = recs.filter(r => r.deposito);

  $('s-total').textContent  = recs.length;
  $('s-ok').textContent     = recs.length - critici.length - attenzione.length;
  $('s-warn').textContent   = attenzione.length;
  $('s-crit').textContent   = critici.length;
  $('s-dep').textContent    = deposito.length;

  // aggiorna badge alerts
  const ab = $('alert-badge');
  const ac = critici.length + attenzione.length;
  if (ab) { ab.textContent = ac; ab.style.display = ac?'inline-flex':'none'; }

  // 5 più recenti
  const recent = [...recs].sort((a,b) => HS.parseDate(b.data)-HS.parseDate(a.data)).slice(0,5);
  $('recent-tbody').innerHTML = recent.map(r => {
    const min=HS.getMinMm(r); const st=HS.getStatus(min);
    return `<tr onclick="openDetail('${HS.escHTML(r.id)}')">
      <td><span class="targa-chip">${HS.escHTML(r.targa)}</span></td>
      <td>${HS.escHTML(r.cliente)}</td>
      <td style="color:var(--muted)">${HS.escHTML(r.data)}</td>
      <td><span class="badge badge-${st.cls}">${st.label}</span></td>
      <td class="mm-val ${HS.mmClass(min)}">${min.toFixed(1)}</td>
    </tr>`;
  }).join('');
}

/* ── List ── */
function getFiltered() {
  const q   = ($('search-input')?.value||'').toLowerCase().trim();
  const fD  = $('filter-dep')?.value  || 'all';
  const fS  = $('filter-stato')?.value|| 'all';
  const recs = HS.getRecords();

  return recs
    .filter(r => !q || r.targa.toLowerCase().includes(q) || r.cliente.toLowerCase().includes(q))
    .filter(r => fD==='all' ? true : fD==='si' ? r.deposito : !r.deposito)
    .filter(r => {
      if (fS==='all') return true;
      const m=HS.getMinMm(r);
      if (fS==='crit') return m<=HS.CRIT_MM;
      if (fS==='warn') return m>HS.CRIT_MM && m<=HS.WARN_MM;
      return m>HS.WARN_MM;
    })
    .sort((a,b) => {
      let va,vb;
      if (sortCol==='data')  { va=HS.parseDate(a.data); vb=HS.parseDate(b.data); }
      else if (sortCol==='min') { va=HS.getMinMm(a); vb=HS.getMinMm(b); }
      else { va=(a[sortCol]||'').toLowerCase(); vb=(b[sortCol]||'').toLowerCase(); }
      return (va<vb?-1:va>vb?1:0) * (sortDir==='asc'?1:-1);
    });
}

function renderList() {
  const data = getFiltered();
  const cnt  = $('result-count');
  if (cnt) cnt.textContent = data.length + ' risultati';
  const tbody = $('list-tbody');
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="ei">🔍</div><p>Nessun risultato trovato</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(r => {
    const min=HS.getMinMm(r); const st=HS.getStatus(min);
    return `<tr onclick="openDetail('${HS.escHTML(r.id)}')">
      <td><span class="targa-chip">${HS.escHTML(r.targa)}</span></td>
      <td style="color:var(--muted);white-space:nowrap">${HS.escHTML(r.data)}</td>
      <td>${HS.escHTML(r.cliente)}</td>
      <td class="mm-val ${HS.mmClass(r.ant_sx_mm)}">${r.ant_sx_mm.toFixed(1)}</td>
      <td class="mm-val ${HS.mmClass(r.ant_dx_mm)}">${r.ant_dx_mm.toFixed(1)}</td>
      <td class="mm-val ${HS.mmClass(r.post_sx_mm)}">${r.post_sx_mm.toFixed(1)}</td>
      <td class="mm-val ${HS.mmClass(r.post_dx_mm)}">${r.post_dx_mm.toFixed(1)}</td>
      <td><span class="mm-val ${HS.mmClass(min)}" style="font-size:14px">${min.toFixed(1)}</span></td>
      <td><span style="font-size:15px">${r.deposito?'✅':'—'}</span></td>
      <td onclick="event.stopPropagation();openEdit('${HS.escHTML(r.id)}')">
        <button class="btn btn-ghost btn-xs">✎</button>
      </td>
    </tr>`;
  }).join('');
}

function setSort(col) {
  if (sortCol===col) sortDir = sortDir==='asc'?'desc':'asc';
  else { sortCol=col; sortDir='asc'; }
  renderList();
}
window.setSort = setSort;

/* ── Detail ── */
function openDetail(id) {
  const recs = HS.getRecords();
  const r = recs.find(x=>x.id===id);
  if (!r) return;
  showView('detail');
  const st  = HS.getStatus(HS.getMinMm(r));
  $('view-detail').innerHTML = `
    <button class="btn btn-ghost btn-sm" style="align-self:flex-start" onclick="showView('list')">← Torna alla lista</button>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
      <div>
        <div class="detail-targa">${HS.escHTML(r.targa)}</div>
        <div class="detail-name">${HS.escHTML(r.cliente)}</div>
        <div class="detail-meta">${HS.escHTML(r.data)} &nbsp;·&nbsp; Operatore: ${HS.escHTML(r.operatore)}${r.stagione ? ` &nbsp;·&nbsp; ${HS.seasonLabel(r.stagione)}` : ''}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="openEdit('${HS.escHTML(r.id)}')">✎ Modifica</button>
        <button class="btn btn-ghost" onclick="apptNew('${HS.escHTML(HS.escJS(r.targa))}','${HS.escHTML(HS.escJS(r.cliente))}')">📅 Appuntamento</button>
        <button class="btn btn-primary" onclick="openTireReport('${HS.escHTML(r.id)}')">📄 Report pneumatici</button>
        <button class="btn btn-danger" onclick="deleteRecord('${HS.escHTML(r.id)}')">✕ Elimina</button>
      </div>
    </div>
    <div class="detail-grid">
      <div class="card">
        <div class="card-title">Schema Veicolo</div>
        ${carDiagram(r)}
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="card">
          <div class="card-title">Spessori Rilevati</div>
          ${treadBars(r)}
        </div>
        <div class="card">
          <div class="card-title">Deposito</div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:28px">${r.deposito?'✅':'❌'}</span>
            <div>
              <div style="font-weight:600;color:${r.deposito?'var(--ok)':'var(--crit)'}">
                ${r.deposito?'In deposito':'Non in deposito'}
              </div>
              ${r.posizione?`<div style="font-size:12px;color:var(--muted);margin-top:3px">📍 ${HS.escHTML(r.posizione)}</div>`:''}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Stato Generale</div>
          <span class="badge badge-${st.cls}" style="font-size:13px;padding:5px 14px">${st.label}</span>
          <div style="font-size:12px;color:var(--muted);margin-top:10px">Min rilevato: <strong style="color:var(--text)">${HS.getMinMm(r).toFixed(1)} mm</strong></div>
          <div style="font-size:11px;color:var(--dim);margin-top:4px">Limite legale: 1.6 mm &nbsp;|&nbsp; Soglia attenzione: 3.0 mm</div>
        </div>
      </div>
    </div>`;
}
window.openDetail = openDetail;

function carDiagram(r) {
  const w = (lbl,tipo,mm,area) => {
    const c = HS.getStatus(mm).color;
    return `<div class="wheel-slot" style="grid-area:${area}">
      <div class="wheel-ring" style="border-color:${c}">
        <div class="wheel-hub"></div>
        <span class="wheel-mm" style="color:${c};border-color:${c}">${mm.toFixed(1)}</span>
      </div>
      <div class="wheel-lbl">${lbl}</div>
      <div class="wheel-tipo">${HS.escHTML(tipo!='/R'?tipo:'Usura')}</div>
    </div>`;
  };
  return `<div class="car-diagram">
    ${w('ANT SX',r.ant_sx_tipo,r.ant_sx_mm,'a1')}
    <div style="grid-area:car;display:flex;align-items:center;justify-content:center">
      <svg width="52" height="108" viewBox="0 0 52 108">
        <rect x="6" y="4" width="40" height="100" rx="9" fill="#1a2438" stroke="#2d4a6e" stroke-width="1.5"/>
        <rect x="10" y="12" width="32" height="34" rx="4" fill="#0ea5e9" opacity=".15"/>
        <rect x="10" y="54" width="32" height="34" rx="4" fill="#0ea5e9" opacity=".07"/>
        <line x1="26" y1="48" x2="26" y2="54" stroke="#2d4a6e" stroke-width="1.5"/>
        <circle cx="26" cy="80" r="5" fill="#2d4a6e"/>
      </svg>
    </div>
    ${w('ANT DX',r.ant_dx_tipo,r.ant_dx_mm,'a2')}
    ${w('POST SX',r.post_sx_tipo,r.post_sx_mm,'p1')}
    ${w('POST DX',r.post_dx_tipo,r.post_dx_mm,'p2')}
  </div>`;
}

function treadBars(r) {
  return [
    ['Anteriore SX',r.ant_sx_mm,r.ant_sx_tipo],
    ['Anteriore DX',r.ant_dx_mm,r.ant_dx_tipo],
    ['Posteriore SX',r.post_sx_mm,r.post_sx_tipo],
    ['Posteriore DX',r.post_dx_mm,r.post_dx_tipo],
  ].map(([label,mm,tipo]) => {
    const pct=Math.min(100,(mm/10)*100);
    const c=HS.getStatus(mm).color;
    return `<div class="tread-row">
      <div class="tread-info">
        <span>${label}</span>
        <span style="color:${c};font-weight:700">${mm.toFixed(1)} mm${tipo!='/R'?' · '+HS.escHTML(tipo):''}</span>
      </div>
      <div class="tread-bar"><div class="tread-fill" style="width:${pct}%;background:${c}"></div></div>
    </div>`;
  }).join('');
}

/* ── Alerts ── */
function renderAlerts() {
  const recs = HS.getRecords();
  const critici    = recs.filter(r => HS.getMinMm(r) <= HS.CRIT_MM);
  const attenzione = recs.filter(r => { const m=HS.getMinMm(r); return m>HS.CRIT_MM && m<=HS.WARN_MM; });
  const el = $('alerts-container');
  if (!el) return;
  if (!critici.length && !attenzione.length) {
    el.innerHTML = `<div class="empty-state"><div class="ei">✅</div><p>Nessun allarme attivo. Tutti i pneumatici sono OK.</p></div>`;
    return;
  }
  const grp = (list, tipo, title) => {
    if (!list.length) return '';
    const c = tipo==='crit'?'var(--crit)':'var(--warn)';
    return `<div style="margin-bottom:22px">
      <h3 style="font-size:13px;font-weight:700;color:${c};margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">${title} (${list.length})</h3>
      ${list.map(r => {
        const min=HS.getMinMm(r);
        const ww=[['ANT SX',r.ant_sx_mm],['ANT DX',r.ant_dx_mm],['POST SX',r.post_sx_mm],['POST DX',r.post_dx_mm]]
          .filter(([,m])=>tipo==='crit'?m<=HS.CRIT_MM:(m>HS.CRIT_MM&&m<=HS.WARN_MM));
        return `<div style="background:var(--bg3);border:1px solid var(--bdr);border-left:4px solid ${c};border-radius:var(--r);padding:14px 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;cursor:pointer" onclick="openDetail('${HS.escHTML(r.id)}')">
          <div>
            <div style="font-weight:700;font-size:14px"><span class="targa-chip" style="font-size:12px">${HS.escHTML(r.targa)}</span> &nbsp; ${HS.escHTML(r.cliente)}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px">Min: <strong>${min.toFixed(1)} mm</strong> · ${ww.map(([l,m])=>`${l}=${m.toFixed(1)}`).join(', ')}${r.deposito&&r.posizione?' · 📍'+r.posizione:''}</div>
          </div>
          <button class="btn btn-ghost btn-sm">Vedi →</button>
        </div>`;
      }).join('')}
    </div>`;
  };
  el.innerHTML = grp(critici,'crit','🔴 Critici — Sostituzione immediata') + grp(attenzione,'warn','🟡 Attenzione — Da monitorare');
}

/* ── Stats ── */
function statMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

function renderStats() {
  Object.values(chartInstances).forEach(c=>c&&c.destroy&&c.destroy());
  chartInstances={};
  const recs = HS.getRecords();

  /* — KPI — */
  const mins = recs.map(r=>HS.getMinMm(r));
  const critici    = mins.filter(m=>m<=HS.CRIT_MM).length;
  const attenzione = mins.filter(m=>m>HS.CRIT_MM && m<=HS.WARN_MM).length;
  const ok         = recs.length - critici - attenzione;
  const media      = mins.length ? (mins.reduce((s,m)=>s+m,0)/mins.length) : 0;
  const daRichiamo = critici + attenzione;
  const deposito   = recs.filter(r=>r.deposito).length;
  const kpi = $('stats-kpi');
  if (kpi) kpi.innerHTML = `
    <div class="stat-card c-cyan"><div class="stat-icon">📏</div><div><div class="stat-val">${media.toFixed(1)}<span style="font-size:13px;color:var(--muted)"> mm</span></div><div class="stat-label">Media minimi flotta</div></div></div>
    <div class="stat-card c-crit"><div class="stat-icon">🔴</div><div><div class="stat-val">${critici}</div><div class="stat-label">Critici (≤ ${HS.CRIT_MM.toFixed(1)})</div></div></div>
    <div class="stat-card c-warn"><div class="stat-icon">⚠️</div><div><div class="stat-val">${attenzione}</div><div class="stat-label">In attenzione</div></div></div>
    <div class="stat-card c-info"><div class="stat-icon">📬</div><div><div class="stat-val">${daRichiamo}</div><div class="stat-label">Da richiamare</div></div></div>
    <div class="stat-card c-ok"><div class="stat-icon">🏪</div><div><div class="stat-val">${deposito}</div><div class="stat-label">In deposito</div></div></div>`;

  if (!recs.length) return;
  const axis = { ticks:{color:'#94a3b8'}, grid:{color:'#1a2d4a'} };
  const axisNo = { ticks:{color:'#94a3b8'}, grid:{display:false} };

  /* 1 — Distribuzione stato */
  chartInstances.stato = new Chart($('ch-stato'),{
    type:'doughnut', data:{
      labels:[`OK (${ok})`,`Attenzione (${attenzione})`,`Critico (${critici})`],
      datasets:[{data:[ok,attenzione,critici],backgroundColor:['#22c55e','#f59e0b','#ef4444'],borderWidth:0,hoverOffset:4}]
    }, options:{responsive:true,maintainAspectRatio:false,cutout:'68%',
      plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{size:11}}}}}
  });

  /* 2 — Istogramma per fascia di profondità: dove si concentra la flotta */
  const bins = [
    { label:`≤ ${HS.CRIT_MM.toFixed(1)}`, test:m=>m<=HS.CRIT_MM,            color:'#ef4444' },
    { label:`${HS.CRIT_MM.toFixed(1)}–${HS.WARN_MM.toFixed(1)}`, test:m=>m>HS.CRIT_MM&&m<=HS.WARN_MM, color:'#f59e0b' },
    { label:`${HS.WARN_MM.toFixed(1)}–4.5`, test:m=>m>HS.WARN_MM&&m<=4.5,   color:'#a3e635' },
    { label:'4.5–6',  test:m=>m>4.5&&m<=6,  color:'#22c55e' },
    { label:'> 6',    test:m=>m>6,          color:'#16a34a' },
  ];
  chartInstances.fasce = new Chart($('ch-fasce'),{
    type:'bar', data:{ labels:bins.map(b=>b.label),
      datasets:[{data:bins.map(b=>mins.filter(b.test).length),backgroundColor:bins.map(b=>b.color),borderRadius:6,borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:axisNo, y:{...axis, beginAtZero:true, ticks:{...axis.ticks, stepSize:1}}}}
  });

  /* 3 — Priorità richiamo: lista OPERATIVA dei 10 veicoli con meno
     battistrada — barra profondità, cliente, contatti e azioni rapide */
  const topEl = $('top-critici');
  if (topEl) {
    const top = recs.map(r=>({r, m:HS.getMinMm(r)})).sort((a,b)=>a.m-b.m).slice(0,10);
    topEl.innerHTML = top.map(({r, m}) => {
      const st = HS.getStatus(m);
      const ct = (window.RC && RC.resolveContact) ? RC.resolveContact(r) : { email:'', telefono:'' };
      const wa = (ct.telefono && window.RC && RC.waNumber) ? RC.waNumber(ct.telefono) : '';
      const telHref = (ct.telefono||'').replace(/\s/g,'');
      const waMsg = encodeURIComponent(`Gentile ${r.cliente||'cliente'}, dal controllo pneumatici del ${r.data||''} il veicolo ${r.targa} risulta con battistrada minimo ${m.toFixed(1)} mm. La contattiamo per fissare un controllo/sostituzione.`);
      const mailSub = encodeURIComponent(`Controllo pneumatici — targa ${r.targa}`);
      return `<div class="tc-row">
        <div class="tc-bar-wrap" title="${m.toFixed(1)} mm su 8">
          <div class="tc-bar" style="width:${Math.min(100, m/8*100)}%;background:${st.color}"></div>
        </div>
        <span class="targa-chip" style="cursor:pointer" onclick="openDetail('${HS.escHTML(r.id)}')">${HS.escHTML(r.targa)}</span>
        <span class="tc-cliente">${HS.escHTML(r.cliente || '—')}</span>
        <span class="tc-mm" style="color:${st.color}">${m.toFixed(1)} mm</span>
        <span class="badge badge-${st.cls}">${st.label}</span>
        <span class="tc-actions">
          ${ct.email ? `<a class="btn btn-ghost btn-xs" href="mailto:${HS.escHTML(ct.email)}?subject=${mailSub}" title="Email a ${HS.escHTML(ct.email)}">📧</a>` : ''}
          ${wa ? `<a class="btn btn-ghost btn-xs" href="https://wa.me/${wa}?text=${waMsg}" target="_blank" rel="noopener" title="WhatsApp">💬</a>` : ''}
          ${telHref ? `<a class="btn btn-ghost btn-xs" href="tel:${HS.escHTML(telHref)}" title="Chiama ${HS.escHTML(ct.telefono)}">📞</a>` : ''}
          ${!ct.email && !telHref && window.rcEditEmail ? `<button class="btn btn-ghost btn-xs" onclick="rcEditEmail('${HS.escHTML(HS.escJS(r.targa))}')" title="Aggiungi contatto">＋☎</button>` : ''}
          <button class="btn btn-ghost btn-xs" onclick="apptNew('${HS.escHTML(HS.escJS(r.targa))}','${HS.escHTML(HS.escJS(r.cliente))}')" title="Fissa appuntamento">📅</button>
          <button class="btn btn-ghost btn-xs" onclick="openDetail('${HS.escHTML(r.id)}')" title="Apri dettaglio">→</button>
        </span>
      </div>`;
    }).join('') || '<div class="empty-state"><p>Nessun veicolo in archivio.</p></div>';
  }

  /* 4 — Scansioni per mese (ultimi 12): stagionalità del lavoro */
  const now = new Date(); const labels=[]; const keys=[];
  for (let i=11;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    keys.push(statMonthKey(d)); labels.push(d.toLocaleDateString('it-IT',{month:'short',year:'2-digit'})); }
  const perMese = Object.fromEntries(keys.map(k=>[k,0]));
  recs.forEach(r=>{ const d=HS.parseDate(r.data); if(d&&d.getFullYear()>2000){ const k=statMonthKey(d); if(k in perMese) perMese[k]++; }});
  chartInstances.mesi = new Chart($('ch-mesi'),{
    type:'bar', data:{ labels, datasets:[{data:keys.map(k=>perMese[k]),backgroundColor:'#00d4ff',borderRadius:5,borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{...axisNo, ticks:{...axisNo.ticks, maxRotation:45, font:{size:9}}}, y:{...axis, beginAtZero:true, ticks:{...axis.ticks, stepSize:1}}}}
  });

  /* 5 — Stagione montata: base per la campagna cambio gomme */
  const st = { estivo:0, invernale:0, '4stagioni':0, nd:0 };
  recs.forEach(r=>{ st[r.stagione && st[r.stagione]!==undefined ? r.stagione : 'nd']++; });
  chartInstances.stagione = new Chart($('ch-stagione'),{
    type:'doughnut', data:{
      labels:[`☀️ Estivo (${st.estivo})`,`❄️ Invernale (${st.invernale})`,`🍂 4 Stagioni (${st['4stagioni']})`,`n.d. (${st.nd})`],
      datasets:[{data:[st.estivo,st.invernale,st['4stagioni'],st.nd],
        backgroundColor:['#fbbf24','#60a5fa','#a78bfa','#334155'],borderWidth:0,hoverOffset:4}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'68%',
      plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{size:11}}}}}
  });

  /* 6 — Operatori */
  const ops={};
  recs.forEach(r=>{ops[r.operatore||'—']=(ops[r.operatore||'—']||0)+1;});
  const opK=Object.keys(ops).sort((a,b)=>ops[b]-ops[a]).slice(0,8);
  chartInstances.op = new Chart($('ch-op'),{
    type:'bar', data:{labels:opK, datasets:[{data:opK.map(k=>ops[k]),backgroundColor:'#2563eb',borderRadius:6,borderWidth:0}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{...axis, ticks:{...axis.ticks, stepSize:1}}, y:axisNo}}
  });
}

/* ── Form ── */
function openAdd() {
  editingId=null;
  showView('form');
  $('form-title').textContent='Nuova Scansione';
  $('scan-form').reset();
  $('f-data').value=HS.todayStr();
  $('f-operatore').value='CORMACH';
}
function openEdit(id) {
  editingId=id;
  const r=HS.getRecords().find(x=>x.id===id);
  if (!r) return;
  showView('form');
  $('form-title').textContent=`Modifica: ${r.targa}`;
  ['targa','data','operatore','cliente','ant_sx_tipo','ant_sx_mm','ant_dx_tipo','ant_dx_mm',
   'post_sx_tipo','post_sx_mm','post_dx_tipo','post_dx_mm','posizione','stagione']
    .forEach(f=>{ const el=$('f-'+f); if(el) el.value=r[f]??''; });
  $('f-deposito').checked=!!r.deposito;
}
window.openAdd=openAdd; window.openEdit=openEdit;

function saveForm() {
  const g = id => ($('f-'+id)?.value||'').trim();
  const targa = g('targa').toUpperCase();
  if (!targa) { toast('❌ Targa obbligatoria','t-err'); return; }
  const rec = {
    id: editingId || HS.uid(), targa,
    data:g('data'), operatore:g('operatore'), cliente:g('cliente'),
    ant_sx_tipo: g('ant_sx_tipo')||'/R', ant_sx_mm: parseFloat(g('ant_sx_mm'))||0,
    ant_dx_tipo: g('ant_dx_tipo')||'/R', ant_dx_mm: parseFloat(g('ant_dx_mm'))||0,
    post_sx_tipo:g('post_sx_tipo')||'/R',post_sx_mm:parseFloat(g('post_sx_mm'))||0,
    post_dx_tipo:g('post_dx_tipo')||'/R',post_dx_mm:parseFloat(g('post_dx_mm'))||0,
    deposito:$('f-deposito').checked, posizione:g('posizione'),
    stagione:g('stagione'),
  };
  const recs = HS.getRecords();
  const idx  = recs.findIndex(r=>r.id===editingId);
  if (idx>=0) recs[idx]=rec; else recs.unshift(rec);
  HS.setRecords(recs);
  toast('✅ Salvato','t-ok');
  showView('list');
}
window.saveForm=saveForm;

function deleteRecord(id) {
  if (!confirm('Eliminare questo record?')) return;
  HS.setRecords(HS.getRecords().filter(r=>r.id!==id));
  toast('🗑 Eliminato');
  showView('list');
}
window.deleteRecord=deleteRecord;

/* ── Import/Export ──
   Entrambi i pulsanti usano il riconoscimento automatico del tipo di
   file: se l'utente seleziona il file "sbagliato" per quel pulsante,
   l'import va comunque a buon fine e un avviso spiega cosa è successo. */
function doImport(file, expected) {
  HS.fileToRows(file).then(rows => {
    const isCust = HS.rowsAreCustomers(rows);
    const kind = isCust ? 'clienti' : 'scansioni';
    const n = isCust
      ? (window.CUST ? CUST.importRows(rows) : 0)
      : HS.importReportRows(rows);
    if (window.CUST) CUST.load();
    if (n > 0) {
      toast(expected && expected !== kind
        ? `ℹ️ Il file era quello ${kind === 'clienti' ? "delle Anagrafiche" : "del Magazzino"}: importat${isCust ? 'i' : 'e'} ${n} ${kind}`
        : `✅ ${n} ${kind} importat${isCust ? 'i' : 'e'}`, 't-ok');
      if (window.CUST) CUST.renderView();
      if (window.RC) RC.renderView(HS.getRecords());
      showView(isCust ? 'customers' : 'dashboard');
    } else {
      toast('❌ Nessun dato riconosciuto nel file', 't-err');
    }
  }).catch(err => {
    console.warn('Import:', err);
    toast('❌ Errore lettura file (formato non valido?)', 't-err');
  });
}
window.doImport = doImport;
function handleImport(e) {
  const file = e.target.files[0]; if (!file) return;
  doImport(file, 'scansioni');
  e.target.value = '';
}
function handleImportClienti(e) {
  const file = e.target.files[0]; if (!file) return;
  doImport(file, 'clienti');
  e.target.value = '';
}

/* ── Theme ── */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('handyscan_theme', t);
  const btn = $('theme-toggle');
  if (btn) btn.textContent = t === 'light' ? '🌙' : '☀️';
}
function toggleTheme() {
  const cur = localStorage.getItem('handyscan_theme') || 'dark';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}
window.toggleTheme = toggleTheme;

/* ── Info & Disclaimer ──
   showAppInfo(gate):
   - gate=false → consultazione dal pulsante ℹ️ (chiudibile)
   - gate=true  → CANCELLO D'INGRESSO: si apre all'avvio, copre l'app e
     richiede l'accettazione esplicita; senza "Accetto" non si accede.  */
function showAppInfo(gate = false, onAccept = null) {
  document.getElementById('app-info-overlay')?.remove();
  const m = document.createElement('div');
  m.className = 'rc-modal-overlay';
  m.id = 'app-info-overlay';
  if (gate) m.style.zIndex = '1001';
  m.innerHTML = `<div class="rc-modal" style="max-width:660px">
    <div class="rc-modal-head"><h3>${gate ? '⚠️ Prima di iniziare' : 'ℹ️ TireScan-Pro — Informazioni'}</h3>
      ${gate ? '' : '<button class="btn btn-ghost btn-sm" onclick="this.closest(\'.rc-modal-overlay\').remove()">✕</button>'}</div>
    <div style="font-size:13px;line-height:1.65;display:flex;flex-direction:column;gap:12px;max-height:55vh;overflow-y:auto">
      <div><strong>Versione:</strong> ${APP_VERSION} · <strong>Licenza:</strong> MIT · App indipendente e gratuita</div>

      <div><strong>Da dove arrivano i dati.</strong> L'app si alimenta con i due file Excel che scarichi
        da <strong>HandyScan Manager sul portale TireApp</strong> (portal.cormachsrl.com):
        l'Excel delle scansioni dalla sezione <strong>Magazzino</strong> (Lista per targa)
        e l'<strong>elenco clienti</strong> dalla sezione <strong>Anagrafiche</strong>. Li importi da ⬆ Importa e l'app riconosce da sola il tipo di file.
        Puoi anche inserire o correggere scansioni a mano.</div>

      <div><strong>Il valore aggiunto: agenda e richiami.</strong> Sui dati importati l'app costruisce
        un'<strong>agenda appuntamenti</strong> con calendario mensile condivisibile (.ics, Google
        Calendar, Outlook) e i <strong>richiami clienti</strong> su quattro logiche (critico, controllo
        periodico, cambio stagionale, anniversario) con email, telefonata o WhatsApp a messaggio pronto.
        Intorno: dashboard con allarmi, archivio veicoli, scheda pneumatici stampabile e statistiche
        con priorità di richiamo.</div>

      <div><strong>Cosa NON fa.</strong> Non si collega al portale (i dati si aggiornano reimportando
        l'Excel) e non conosce misure per singola scanalatura, foto, ispezione veicolo o etichette:
        per tutto questo il riferimento resta <strong>HandyScan Manager su TireApp</strong>,
        a cui questa app non intende in alcun modo sostituirsi.</div>

      <div><strong>Privacy.</strong> Tutti i dati restano esclusivamente su questo dispositivo:
        nessun server, nessuna registrazione, nessun tracciamento. Fai backup periodici con ⬇ Esporta.</div>

      <div><strong>Hai trovato un errore o hai un'idea?</strong> Ogni segnalazione aiuta a migliorare
        l'app per tutti.
        <div style="margin-top:8px">
          <a class="btn btn-primary btn-sm" href="mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('TireScan-Pro v' + APP_VERSION + ' — segnalazione')}&body=${encodeURIComponent('Descrivi qui il problema o la proposta:\n\n\nCosa stavi facendo quando è successo:\n\n')}">
            📧 Scrivi una segnalazione</a>
          <span style="font-size:11px;color:var(--muted);margin-left:8px">${FEEDBACK_EMAIL}</span>
        </div></div>

      <div style="background:var(--bg3);border:1px solid #f59e0b;border-radius:8px;padding:10px 12px;font-size:12px">
        <strong>⚠️ Limitazione di responsabilità.</strong> Software fornito "così com'è", senza garanzie.
        I valori mostrati derivano dai dati importati o inseriti dall'utente e hanno finalità informative
        e organizzative: non costituiscono certificazione tecnica né perizia. Ogni decisione sulla
        sicurezza dei pneumatici (sostituzione, idoneità alla circolazione, limite legale di 1,6 mm)
        deve basarsi su verifica diretta di personale qualificato con gli strumenti ufficiali.
        L'autore declina ogni responsabilità per danni derivanti dall'uso dell'app o da decisioni
        assunte sulla base dei dati visualizzati. "Handy Scan", "TireApp" e "Cormach" appartengono
        ai rispettivi proprietari.</div>
    </div>
    <div class="rc-modal-actions" style="margin-top:14px">
      ${gate
        ? `<button class="btn btn-ghost" onclick="toast('Per usare TireScan-Pro è necessario accettare le condizioni','t-err')">Non accetto</button>
           <button class="btn btn-primary" id="app-info-accept">✓ Accetto e continuo</button>`
        : `<button class="btn btn-primary" onclick="this.closest('.rc-modal-overlay').remove()">Chiudi</button>`}
    </div>
  </div>`;
  document.body.appendChild(m);
  if (gate) {
    const btn = document.getElementById('app-info-accept');
    if (btn) btn.addEventListener('click', () => {
      try { localStorage.setItem('handyscan_disclaimer_ok', '1'); } catch {}
      m.remove();
      if (typeof onAccept === 'function') onAccept();
    });
  }
}
window.showAppInfo = showAppInfo;

/* ── PWA Install ── */
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault(); deferredInstall=e;
  $('install-banner')?.classList.add('visible');
});
function installPWA() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  deferredInstall.userChoice.then(()=>{ deferredInstall=null; $('install-banner')?.classList.remove('visible'); });
}
window.installPWA=installPWA;

/* ── SW ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('SW:',e));
  });
}

/* ── Init ── */
window.addEventListener('DOMContentLoaded', ()=>{
  // Applica tema salvato
  const savedTheme = localStorage.getItem('handyscan_theme') || 'dark';
  applyTheme(savedTheme);

  // versione visibile nell'header
  const vEl = document.getElementById('app-version');
  if (vEl) vEl.textContent = 'v' + APP_VERSION;

  HS.loadData();
  if (window.CUST) CUST.init();
  if (window.APPT) APPT.init();
  if (window.RC) RC.init();
  showView('dashboard');

  $('search-input')?.addEventListener('input', renderList);
  $('filter-dep')?.addEventListener('change', renderList);
  $('filter-stato')?.addEventListener('change', renderList);
  $('import-file')?.addEventListener('change', handleImport);
  $('import-file-clienti')?.addEventListener('change', handleImportClienti);

  // Cancello disclaimer: obbligatorio alla prima apertura, poi mai più.
  // Dopo l'accettazione, al primo avvio assoluto compare il benvenuto.
  const showWelcomeIfFirst = () => { if (HS.isFirstLaunch()) setTimeout(() => HS.showWelcomeScreen(), 200); };
  if (!localStorage.getItem('handyscan_disclaimer_ok')) {
    setTimeout(() => showAppInfo(true, showWelcomeIfFirst), 300);
  } else {
    showWelcomeIfFirst();
  }
});
