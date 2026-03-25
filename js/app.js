/* ================================================================
   HandyScan  |  js/app.js  — Logica principale v1.1
   Open Source — github.com/cormachsrl/handyscan-pwa
   ================================================================ */
'use strict';

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
  if (name === 'recalls') {
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
  const richiami   = window.RC ? RC.renderView : ()=>{};

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
        <div class="detail-meta">${HS.escHTML(r.data)} &nbsp;·&nbsp; Operatore: ${HS.escHTML(r.operatore)}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="openEdit('${HS.escHTML(r.id)}')">✎ Modifica</button>
        <button class="btn btn-primary" onclick="window.print()">🖨 Stampa</button>
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
function renderStats() {
  Object.values(chartInstances).forEach(c=>c&&c.destroy&&c.destroy());
  chartInstances={};
  const recs = HS.getRecords();
  const critici    = recs.filter(r=>HS.getMinMm(r)<=HS.CRIT_MM).length;
  const attenzione = recs.filter(r=>{const m=HS.getMinMm(r);return m>HS.CRIT_MM&&m<=HS.WARN_MM;}).length;
  const ok         = recs.length-critici-attenzione;

  chartInstances.stato = new Chart($('ch-stato'),{
    type:'doughnut', data:{
      labels:['OK','Attenzione','Critico'],
      datasets:[{data:[ok,attenzione,critici],backgroundColor:['#22c55e','#f97316','#ef4444'],borderWidth:0,hoverOffset:4}]
    }, options:{responsive:true,maintainAspectRatio:false,cutout:'68%',
      plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{size:11}}}}}
  });

  const dep = recs.filter(r=>r.deposito).length;
  chartInstances.dep = new Chart($('ch-dep'),{
    type:'bar', data:{
      labels:['In deposito','Non in deposito'],
      datasets:[{data:[dep,recs.length-dep],backgroundColor:['#00d4ff','#1a2d4a'],borderRadius:6,borderWidth:0}]
    }, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{ticks:{color:'#94a3b8'},grid:{display:false}},y:{ticks:{color:'#94a3b8',stepSize:1},grid:{color:'#1a2d4a'}}}}
  });

  const sorted = [...recs].sort((a,b)=>HS.parseDate(a.data)-HS.parseDate(b.data));
  chartInstances.trend = new Chart($('ch-trend'),{
    type:'line', data:{
      labels:sorted.map(r=>r.targa),
      datasets:[{label:'Min mm',data:sorted.map(r=>HS.getMinMm(r)),
        borderColor:'#00d4ff',backgroundColor:'rgba(0,212,255,.10)',fill:true,tension:.3,
        pointBackgroundColor:sorted.map(r=>HS.getStatus(HS.getMinMm(r)).color),pointRadius:5}]
    }, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{ticks:{color:'#94a3b8',maxRotation:45},grid:{display:false}},y:{ticks:{color:'#94a3b8'},grid:{color:'#1a2d4a'},min:0,max:11}}}
  });

  const ops={};
  recs.forEach(r=>{ops[r.operatore]=(ops[r.operatore]||0)+1;});
  const opK=Object.keys(ops).sort((a,b)=>ops[b]-ops[a]).slice(0,8);
  chartInstances.op = new Chart($('ch-op'),{
    type:'bar', data:{labels:opK, datasets:[{data:opK.map(k=>ops[k]),backgroundColor:'#2563eb',borderRadius:6,borderWidth:0}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{ticks:{color:'#94a3b8',stepSize:1},grid:{color:'#1a2d4a'}},y:{ticks:{color:'#94a3b8'},grid:{display:false}}}}
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
   'post_sx_tipo','post_sx_mm','post_dx_tipo','post_dx_mm','posizione']
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

/* ── Import/Export ── */
function handleImport(e) {
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const n=HS.importCSV(ev.target.result);
    toast(n>0?`✅ ${n} record importati`:'❌ Nessun record trovato', n>0?'t-ok':'t-err');
    showView('dashboard');
  };
  reader.readAsText(file,'UTF-8');
  e.target.value='';
}

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
  HS.loadData();
  RC.init();
  showView('dashboard');

  $('search-input')?.addEventListener('input', renderList);
  $('filter-dep')?.addEventListener('change', renderList);
  $('filter-stato')?.addEventListener('change', renderList);
  $('import-file')?.addEventListener('change', handleImport);
});
