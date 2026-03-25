/* ============================================================
   HandyScan – Tire Monitor  |  app.js  v1.0
   Open Source – github.com/cormach/handyscan-app
   ============================================================ */

'use strict';

/* ── Constants ── */
const STORAGE_KEY = 'handyscan_records';
const WARN_THRESHOLD = 3.0;   // mm – arancione
const CRIT_THRESHOLD = 1.6;   // mm – rosso legale

/* ── State ── */
let records = [];
let currentView = 'dashboard';
let editingId = null;
let deferredInstall = null;
let sortCol = 'data';
let sortDir = 'desc';
let chartInstances = {};

/* ── DOM refs ── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ── Helpers ── */
function getMin(r) {
  return Math.min(r.ant_sx_mm, r.ant_dx_mm, r.post_sx_mm, r.post_dx_mm);
}
function getStatus(mm) {
  if (mm <= CRIT_THRESHOLD) return { cls: 'crit', label: 'CRITICO', color: '#ef4444' };
  if (mm <= WARN_THRESHOLD) return { cls: 'warn', label: 'ATTENZIONE', color: '#f97316' };
  return { cls: 'ok', label: 'OK', color: '#22c55e' };
}
function mmClass(mm) {
  if (mm <= CRIT_THRESHOLD) return 'mm-crit';
  if (mm <= WARN_THRESHOLD) return 'mm-warn';
  return 'mm-ok';
}
function parseDate(s) {
  if (!s) return new Date(0);
  const parts = s.split('/');
  if (parts.length === 3) return new Date(+parts[2], +parts[1]-1, +parts[0]);
  return new Date(s);
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function escHTML(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Storage ── */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) records = JSON.parse(raw);
  } catch {}
  if (!records.length) records = getSampleData();
  saveData();
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/* ── Sample Data ── */
function getSampleData() {
  return [
    { id: uid(), targa:'DW902KP', data:'21/11/2025', operatore:'CORMACH', cliente:'Pippo Ohoho',          ant_sx_tipo:'/R', ant_sx_mm:3.3, ant_dx_tipo:'/R', ant_dx_mm:3.7, post_sx_tipo:'/R', post_sx_mm:3.0, post_dx_tipo:'/R', post_dx_mm:4.0, deposito:true,  posizione:'xyz' },
    { id: uid(), targa:'EH126GN', data:'17/11/2025', operatore:'CORMACH', cliente:'Alibaba Mustafa',      ant_sx_tipo:'205/17R15', ant_sx_mm:2.8, ant_dx_tipo:'205/17R15', ant_dx_mm:3.2, post_sx_tipo:'205/17R15', post_sx_mm:4.6, post_dx_tipo:'205/17R15', post_dx_mm:3.8, deposito:true,  posizione:'iol8' },
    { id: uid(), targa:'FE204GL', data:'28/10/2025', operatore:'CORMACH', cliente:'Cliente Cognome',      ant_sx_tipo:'195/55R15', ant_sx_mm:4.7, ant_dx_tipo:'195/55R15', ant_dx_mm:4.7, post_sx_tipo:'195/55R15', post_sx_mm:4.9, post_dx_tipo:'195/55R15', post_dx_mm:4.1, deposito:false, posizione:'Block 1 Shelf C3' },
    { id: uid(), targa:'FG024DR', data:'23/05/2025', operatore:'fhfdd',   cliente:'Customer TEST',        ant_sx_tipo:'245/75R85', ant_sx_mm:3.7, ant_dx_tipo:'245/75R85', ant_dx_mm:0.0, post_sx_tipo:'245/75R85', post_sx_mm:0.0, post_dx_tipo:'245/75R85', post_dx_mm:3.3, deposito:true,  posizione:'pipipop' },
    { id: uid(), targa:'FH292RF', data:'30/09/2025', operatore:'Claudio', cliente:'Pipopopopo Uocuodu',   ant_sx_tipo:'/R', ant_sx_mm:5.0, ant_dx_tipo:'/R', ant_dx_mm:3.7, post_sx_tipo:'/R', post_sx_mm:4.1, post_dx_tipo:'/R', post_dx_mm:6.2, deposito:true,  posizione:'òlkòkòk' },
    { id: uid(), targa:'FKTRUJ',  data:'31/10/2025', operatore:'CORMACH', cliente:'Lèdkgèsk',            ant_sx_tipo:'/R', ant_sx_mm:6.9, ant_dx_tipo:'/R', ant_dx_mm:7.8, post_sx_tipo:'/R', post_sx_mm:8.6, post_dx_tipo:'/R', post_dx_mm:7.4, deposito:false, posizione:'' },
    { id: uid(), targa:'FZ025BW', data:'21/11/2025', operatore:'pippo',   cliente:'Hjhjfjf',             ant_sx_tipo:'215/65R16', ant_sx_mm:0.6, ant_dx_tipo:'215/65R16', ant_dx_mm:0.6, post_sx_tipo:'215/65R16', post_sx_mm:6.4, post_dx_tipo:'215/65R16', post_dx_mm:4.8, deposito:true,  posizione:'h76' },
    { id: uid(), targa:'GB105YE', data:'03/02/2026', operatore:'Christian',cliente:'Pippo',              ant_sx_tipo:'/R', ant_sx_mm:2.3, ant_dx_tipo:'/R', ant_dx_mm:4.3, post_sx_tipo:'/R', post_sx_mm:2.4, post_dx_tipo:'/R', post_dx_mm:4.1, deposito:true,  posizione:'khihkg' },
    { id: uid(), targa:'GT058PF', data:'31/10/2025', operatore:'CORMACH', cliente:'AL PEZ',              ant_sx_tipo:'/R', ant_sx_mm:7.8, ant_dx_tipo:'/R', ant_dx_mm:7.7, post_sx_tipo:'/R', post_sx_mm:6.8, post_dx_tipo:'/R', post_dx_mm:6.8, deposito:true,  posizione:'P1-H2' },
    { id: uid(), targa:'RRR',     data:'23/05/2025', operatore:'CORMACH', cliente:'LB',                  ant_sx_tipo:'6',  ant_sx_mm:3.4, ant_dx_tipo:'6',  ant_dx_mm:3.1, post_sx_tipo:'6',  post_sx_mm:0.0, post_dx_tipo:'6',  post_dx_mm:3.6, deposito:true,  posizione:'RING AUT FILA 5' },
  ];
}

/* ── Toast ── */
function toast(msg, type = '') {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ''; }, 3000);
}

/* ── Navigation ── */
function showView(name) {
  currentView = name;
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  const v = $('view-' + name);
  if (v) v.classList.add('active');
  const b = $('nav-' + name);
  if (b) b.classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'list')      renderList();
  if (name === 'alerts')    renderAlerts();
  if (name === 'stats')     renderStats();
}

/* ── Dashboard ── */
function renderDashboard() {
  const critici   = records.filter(r => getMin(r) <= CRIT_THRESHOLD);
  const attenzione= records.filter(r => { const m=getMin(r); return m > CRIT_THRESHOLD && m <= WARN_THRESHOLD; });
  const deposito  = records.filter(r => r.deposito);

  $('stat-total').textContent    = records.length;
  $('stat-ok').textContent       = records.length - critici.length - attenzione.length;
  $('stat-warn').textContent     = attenzione.length;
  $('stat-crit').textContent     = critici.length;
  $('stat-deposito').textContent = deposito.length;

  // Alert badge on nav
  const badge = $('alert-badge');
  const alertCount = critici.length + attenzione.length;
  badge.textContent = alertCount;
  badge.style.display = alertCount ? 'inline' : 'none';

  // Recent scans
  const recent = [...records]
    .sort((a,b) => parseDate(b.data) - parseDate(a.data))
    .slice(0, 5);

  const tbl = $('recent-tbody');
  tbl.innerHTML = recent.map(r => {
    const min = getMin(r);
    const st  = getStatus(min);
    return `<tr onclick="openDetail('${escHTML(r.id)}')">
      <td><span class="targa-chip">${escHTML(r.targa)}</span></td>
      <td>${escHTML(r.cliente)}</td>
      <td>${escHTML(r.data)}</td>
      <td><span class="status-badge badge-${st.cls}">${st.label}</span></td>
      <td class="mm-val ${mmClass(min)}">${min.toFixed(1)}</td>
    </tr>`;
  }).join('');
}

/* ── List View ── */
function getFilteredRecords() {
  const q    = ($('search-input').value || '').toLowerCase().trim();
  const fDep = $('filter-deposito').value;
  const fSt  = $('filter-status').value;

  return records
    .filter(r => {
      if (!q) return true;
      return r.targa.toLowerCase().includes(q) || r.cliente.toLowerCase().includes(q);
    })
    .filter(r => {
      if (fDep === 'all') return true;
      return fDep === 'si' ? r.deposito : !r.deposito;
    })
    .filter(r => {
      if (fSt === 'all') return true;
      const m = getMin(r);
      if (fSt === 'crit') return m <= CRIT_THRESHOLD;
      if (fSt === 'warn') return m > CRIT_THRESHOLD && m <= WARN_THRESHOLD;
      if (fSt === 'ok')   return m > WARN_THRESHOLD;
      return true;
    })
    .sort((a,b) => {
      let va, vb;
      if (sortCol === 'data')    { va = parseDate(a.data); vb = parseDate(b.data); }
      else if (sortCol === 'min') { va = getMin(a); vb = getMin(b); }
      else { va = (a[sortCol]||'').toLowerCase(); vb = (b[sortCol]||'').toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
}

function renderList() {
  const data = getFilteredRecords();
  $('result-count').textContent = data.length + ' risultati';
  const tbody = $('list-tbody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">🔍</div><p>Nessun risultato trovato</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(r => {
    const min = getMin(r);
    const st  = getStatus(min);
    return `<tr onclick="openDetail('${escHTML(r.id)}')">
      <td><span class="targa-chip">${escHTML(r.targa)}</span></td>
      <td>${escHTML(r.data)}</td>
      <td>${escHTML(r.cliente)}</td>
      <td class="mm-val ${mmClass(r.ant_sx_mm)}">${r.ant_sx_mm.toFixed(1)}</td>
      <td class="mm-val ${mmClass(r.ant_dx_mm)}">${r.ant_dx_mm.toFixed(1)}</td>
      <td class="mm-val ${mmClass(r.post_sx_mm)}">${r.post_sx_mm.toFixed(1)}</td>
      <td class="mm-val ${mmClass(r.post_dx_mm)}">${r.post_dx_mm.toFixed(1)}</td>
      <td><span class="mm-val ${mmClass(min)}" style="font-size:14px">${min.toFixed(1)}</span></td>
      <td><span class="${r.deposito?'deposit-yes':'deposit-no'}">${r.deposito?'✅':'—'}</span></td>
      <td onclick="event.stopPropagation(); openEdit('${escHTML(r.id)}')">
        <button class="btn btn-ghost btn-sm">✎</button>
      </td>
    </tr>`;
  }).join('');
}

function setSort(col) {
  if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortCol = col; sortDir = 'asc'; }
  renderList();
}

/* ── Detail ── */
function openDetail(id) {
  const r = records.find(x => x.id === id);
  if (!r) return;
  showView('detail');
  const st  = getStatus(getMin(r));
  const el  = $('view-detail');
  el.innerHTML = `
    <button class="btn btn-ghost btn-sm" style="margin-bottom:20px" onclick="showView('list')">← Torna alla lista</button>
    <div class="detail-header">
      <div>
        <div class="detail-targa">${escHTML(r.targa)}</div>
        <div class="detail-cliente">${escHTML(r.cliente)}</div>
        <div class="detail-meta">${escHTML(r.data)} &nbsp;·&nbsp; Operatore: ${escHTML(r.operatore)}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="openEdit('${escHTML(r.id)}')">✎ Modifica</button>
        <button class="btn btn-primary" onclick="printDetail('${escHTML(r.id)}')">🖨 Stampa</button>
        <button class="btn btn-danger" onclick="deleteRecord('${escHTML(r.id)}')">✕ Elimina</button>
      </div>
    </div>
    <div class="detail-grid">
      <div class="card">
        <div class="card-title">🚗 Schema Veicolo</div>
        ${renderCarDiagram(r)}
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-title">📏 Spessori Rilevati</div>
          ${renderTreadBars(r)}
        </div>
        <div class="card">
          <div class="card-title">🏪 Deposito</div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:28px">${r.deposito?'✅':'❌'}</span>
            <div>
              <div style="font-weight:600;color:${r.deposito?'var(--ok)':'var(--crit)'}">
                ${r.deposito ? 'Pneumatici in deposito' : 'Non in deposito'}
              </div>
              ${r.posizione ? `<div style="font-size:12px;color:var(--muted);margin-top:3px">📍 ${escHTML(r.posizione)}</div>` : ''}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">⚡ Stato Generale</div>
          <span class="status-badge badge-${st.cls}" style="font-size:13px;padding:5px 14px">${st.label}</span>
          <div style="font-size:12px;color:var(--muted);margin-top:10px">
            Spessore minimo rilevato: <strong style="color:var(--text)">${getMin(r).toFixed(1)} mm</strong>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px">
            Limite legale: ${CRIT_THRESHOLD} mm &nbsp;|&nbsp; Soglia attenzione: ${WARN_THRESHOLD} mm
          </div>
        </div>
      </div>
    </div>`;
}

function renderCarDiagram(r) {
  const wheels = [
    { label:'ANT SX', tipo:r.ant_sx_tipo, mm:r.ant_sx_mm },
    { label:'ANT DX', tipo:r.ant_dx_tipo, mm:r.ant_dx_mm },
    { label:'POST SX', tipo:r.post_sx_tipo, mm:r.post_sx_mm },
    { label:'POST DX', tipo:r.post_dx_tipo, mm:r.post_dx_mm },
  ];
  const w = (wheel, pos) => {
    const c = getStatus(wheel.mm).color;
    return `<div class="wheel-slot" style="grid-area:${pos}">
      <div class="wheel-circle" style="border-color:${c}">
        <span class="wheel-mm" style="color:${c};border-color:${c}">${wheel.mm.toFixed(1)}</span>
      </div>
      <div class="wheel-label">${wheel.label}</div>
      <div class="wheel-tipo">${escHTML(wheel.tipo !== '/R' ? wheel.tipo : 'Usura')}</div>
    </div>`;
  };
  return `<div class="car-diagram" style="grid-template-areas:'a1 car a2' 'p1 car p2'">
    ${w(wheels[0],'a1')}
    <div class="car-body-svg" style="grid-area:car">
      <svg width="54" height="110" viewBox="0 0 54 110">
        <rect x="7" y="6" width="40" height="98" rx="9" fill="#1a2438" stroke="#2d4a6e" stroke-width="1.5"/>
        <rect x="11" y="14" width="32" height="36" rx="4" fill="#0ea5e9" opacity=".18"/>
        <rect x="11" y="56" width="32" height="36" rx="4" fill="#0ea5e9" opacity=".07"/>
        <line x1="27" y1="50" x2="27" y2="56" stroke="#2d4a6e" stroke-width="2"/>
        <circle cx="27" cy="82" r="5" fill="#2d4a6e"/>
      </svg>
    </div>
    ${w(wheels[1],'a2')}
    ${w(wheels[2],'p1')}
    ${w(wheels[3],'p2')}
  </div>`;
}

function renderTreadBars(r) {
  const items = [
    ['Anteriore Sinistro', r.ant_sx_mm, r.ant_sx_tipo],
    ['Anteriore Destro',   r.ant_dx_mm, r.ant_dx_tipo],
    ['Posteriore Sinistro',r.post_sx_mm,r.post_sx_tipo],
    ['Posteriore Destro',  r.post_dx_mm,r.post_dx_tipo],
  ];
  return items.map(([label, mm, tipo]) => {
    const pct = Math.min(100, (mm / 10) * 100);
    const c   = getStatus(mm).color;
    return `<div class="tread-row">
      <div class="tread-info">
        <span>${label}</span>
        <span style="color:${c};font-weight:700">${mm.toFixed(1)} mm ${tipo !== '/R' ? '· '+escHTML(tipo) : ''}</span>
      </div>
      <div class="tread-bar">
        <div class="tread-fill" style="width:${pct}%;background:${c}"></div>
      </div>
    </div>`;
  }).join('');
}

/* ── Alerts ── */
function renderAlerts() {
  const critici    = records.filter(r => getMin(r) <= CRIT_THRESHOLD);
  const attenzione = records.filter(r => { const m=getMin(r); return m > CRIT_THRESHOLD && m <= WARN_THRESHOLD; });
  const el = $('alerts-container');
  if (!critici.length && !attenzione.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">✅</div><p>Nessun allarme attivo. Tutti i pneumatici sono OK.</p></div>`;
    return;
  }
  const renderGroup = (list, type, title) => {
    if (!list.length) return '';
    return `<div style="margin-bottom:20px">
      <h3 style="font-size:13px;font-weight:700;color:${type==='crit'?'var(--crit)':'var(--warn)'};margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">${title} (${list.length})</h3>
      <div class="alert-list">
        ${list.map(r => {
          const min = getMin(r);
          const wheels = [
            ['ANT SX', r.ant_sx_mm], ['ANT DX', r.ant_dx_mm],
            ['POST SX', r.post_sx_mm], ['POST DX', r.post_dx_mm]
          ].filter(([,m]) => type === 'crit' ? m <= CRIT_THRESHOLD : (m > CRIT_THRESHOLD && m <= WARN_THRESHOLD));
          return `<div class="alert-item ${type==='warn'?'warn':''}" onclick="openDetail('${escHTML(r.id)}')">
            <div>
              <div class="alert-title"><span class="targa-chip" style="font-size:12px">${escHTML(r.targa)}</span> &nbsp; ${escHTML(r.cliente)}</div>
              <div class="alert-sub">
                Min: <strong>${min.toFixed(1)} mm</strong> &nbsp;·&nbsp;
                Ruote: ${wheels.map(([l,m]) => `${l} = ${m.toFixed(1)}`).join(', ')}
                ${r.deposito ? `&nbsp;·&nbsp; 📍 ${escHTML(r.posizione)}` : ''}
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openDetail('${escHTML(r.id)}')">Vedi →</button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  };
  el.innerHTML =
    renderGroup(critici,    'crit', '🔴 Critici – Sostituzione immediata') +
    renderGroup(attenzione, 'warn', '🟡 Attenzione – Monitorare');
}

/* ── Stats ── */
function renderStats() {
  // Distruggi chart precedenti
  Object.values(chartInstances).forEach(c => c && c.destroy && c.destroy());
  chartInstances = {};

  const critici    = records.filter(r => getMin(r) <= CRIT_THRESHOLD).length;
  const attenzione = records.filter(r => { const m=getMin(r); return m > CRIT_THRESHOLD && m <= WARN_THRESHOLD; }).length;
  const ok         = records.length - critici - attenzione;

  // Donut stato
  chartInstances.stato = new Chart($('chart-stato'), {
    type: 'doughnut',
    data: {
      labels: ['OK', 'Attenzione', 'Critico'],
      datasets: [{ data: [ok, attenzione, critici], backgroundColor: ['#22c55e','#f97316','#ef4444'], borderWidth: 0, hoverOffset: 4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } } } }
  });

  // Bar deposito
  const dep = records.filter(r => r.deposito).length;
  chartInstances.deposito = new Chart($('chart-deposito'), {
    type: 'bar',
    data: {
      labels: ['In deposito', 'Non in deposito'],
      datasets: [{ data: [dep, records.length - dep], backgroundColor: ['#0ea5e9', '#1e3a5f'], borderRadius: 6, borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { display: false } }, y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#1e3a5f' } } } }
  });

  // Line min mm per data
  const sorted = [...records].sort((a,b) => parseDate(a.data) - parseDate(b.data));
  chartInstances.trend = new Chart($('chart-trend'), {
    type: 'line',
    data: {
      labels: sorted.map(r => r.targa),
      datasets: [{
        label: 'Min mm',
        data: sorted.map(r => getMin(r)),
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14,165,233,.12)',
        fill: true,
        tension: .3,
        pointBackgroundColor: sorted.map(r => getStatus(getMin(r)).color),
        pointRadius: 5,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8', maxRotation: 45 }, grid: { display: false } }, y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e3a5f' }, min: 0, max: 11 } } }
  });

  // Bar operatori
  const ops = {};
  records.forEach(r => { ops[r.operatore] = (ops[r.operatore]||0) + 1; });
  const opKeys = Object.keys(ops).sort((a,b) => ops[b]-ops[a]).slice(0,8);
  chartInstances.op = new Chart($('chart-op'), {
    type: 'bar',
    data: {
      labels: opKeys,
      datasets: [{ data: opKeys.map(k => ops[k]), backgroundColor: '#3b82f6', borderRadius: 6, borderWidth: 0 }]
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#1e3a5f' } }, y: { ticks: { color: '#94a3b8' }, grid: { display: false } } } }
  });
}

/* ── Edit / Add Form ── */
function openEdit(id) {
  editingId = id;
  const r = records.find(x => x.id === id);
  showView('form');
  $('form-title').textContent = r ? `Modifica: ${r.targa}` : 'Nuova Scansione';
  const fields = ['targa','data','operatore','cliente','ant_sx_tipo','ant_sx_mm','ant_dx_tipo','ant_dx_mm','post_sx_tipo','post_sx_mm','post_dx_tipo','post_dx_mm','posizione'];
  fields.forEach(f => {
    const el = $('f-' + f);
    if (el) el.value = r ? r[f] : '';
  });
  $('f-deposito').checked = r ? r.deposito : false;
}

function openAdd() {
  editingId = null;
  showView('form');
  $('form-title').textContent = 'Nuova Scansione';
  $('scan-form').reset();
  // Set today's date as default
  const today = new Date();
  const dd = String(today.getDate()).padStart(2,'0');
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const yy = today.getFullYear();
  $('f-data').value = `${dd}/${mm}/${yy}`;
  $('f-operatore').value = 'CORMACH';
}

function saveForm() {
  const get = id => { const el = $(id); return el ? el.value.trim() : ''; };
  const targa = get('f-targa').toUpperCase();
  if (!targa) { toast('❌ Targa obbligatoria', 'err'); return; }

  const rec = {
    id: editingId || uid(),
    targa,
    data:          get('f-data'),
    operatore:     get('f-operatore'),
    cliente:       get('f-cliente'),
    ant_sx_tipo:   get('f-ant_sx_tipo') || '/R',
    ant_sx_mm:     parseFloat(get('f-ant_sx_mm')) || 0,
    ant_dx_tipo:   get('f-ant_dx_tipo') || '/R',
    ant_dx_mm:     parseFloat(get('f-ant_dx_mm')) || 0,
    post_sx_tipo:  get('f-post_sx_tipo') || '/R',
    post_sx_mm:    parseFloat(get('f-post_sx_mm')) || 0,
    post_dx_tipo:  get('f-post_dx_tipo') || '/R',
    post_dx_mm:    parseFloat(get('f-post_dx_mm')) || 0,
    deposito:      $('f-deposito').checked,
    posizione:     get('f-posizione'),
  };

  if (editingId) {
    const idx = records.findIndex(r => r.id === editingId);
    if (idx >= 0) records[idx] = rec;
  } else {
    records.unshift(rec);
  }
  saveData();
  toast('✅ Salvato correttamente', 'ok');
  showView('list');
}

function deleteRecord(id) {
  if (!confirm('Eliminare questo record?')) return;
  records = records.filter(r => r.id !== id);
  saveData();
  toast('🗑 Record eliminato');
  showView('list');
}

/* ── Import CSV ── */
function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const lines = ev.target.result.split('\n').map(l => l.trim()).filter(Boolean);
      // Detect if it's the Handy Scan export or our own CSV
      const header = lines[0].toLowerCase();
      let imported = 0;
      let startIdx = 1;

      if (header.includes('targa veicolo')) {
        // Formato Handy Scan dal portale Cormach
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length < 10) continue;
          const targa = cols[0]?.trim().toUpperCase();
          if (!targa || targa === 'TARGA VEICOLO') continue;
          const rec = {
            id: uid(),
            targa,
            data:         cols[1]?.trim() || '',
            operatore:    cols[2]?.trim() || '',
            cliente:      cols[3]?.trim() || '',
            ant_sx_tipo:  cols[6]?.trim() || '/R',
            ant_sx_mm:    parseFloat(cols[7]) || 0,
            ant_dx_tipo:  cols[8]?.trim() || '/R',
            ant_dx_mm:    parseFloat(cols[9]) || 0,
            post_sx_tipo: cols[10]?.trim() || '/R',
            post_sx_mm:   parseFloat(cols[11]) || 0,
            post_dx_tipo: cols[12]?.trim() || '/R',
            post_dx_mm:   parseFloat(cols[13]) || 0,
            deposito:     (cols[14]||'').toLowerCase().includes('sì') || (cols[14]||'').toLowerCase().includes('si'),
            posizione:    cols[15]?.trim() || '',
          };
          const existing = records.findIndex(r => r.targa === rec.targa);
          if (existing >= 0) records[existing] = { ...rec, id: records[existing].id };
          else records.push(rec);
          imported++;
        }
      } else {
        // Nostro formato CSV export
        for (let i = 1; i < lines.length; i++) {
          const p = lines[i].split(',');
          if (p.length < 13 || !p[0]) continue;
          const rec = {
            id: uid(), targa: p[0].trim().toUpperCase(), data: p[1], operatore: p[2], cliente: p[3],
            ant_sx_tipo: p[4]||'/R', ant_sx_mm: parseFloat(p[5])||0,
            ant_dx_tipo: p[6]||'/R', ant_dx_mm: parseFloat(p[7])||0,
            post_sx_tipo: p[8]||'/R', post_sx_mm: parseFloat(p[9])||0,
            post_dx_tipo: p[10]||'/R', post_dx_mm: parseFloat(p[11])||0,
            deposito: p[12]?.toLowerCase().includes('sì') || p[12]?.toLowerCase().includes('si'),
            posizione: p[13]||'',
          };
          const existing = records.findIndex(r => r.targa === rec.targa);
          if (existing >= 0) records[existing] = { ...rec, id: records[existing].id };
          else records.push(rec);
          imported++;
        }
      }
      saveData();
      toast(`✅ Importati ${imported} record`, 'ok');
      showView('dashboard');
    } catch(err) {
      toast('❌ Errore importazione: ' + err.message, 'err');
    }
  };
  reader.readAsText(file, 'UTF-8');
  e.target.value = '';
}

/* ── Export CSV ── */
function exportCSV() {
  const header = 'Targa,Data,Operatore,Cliente,ANT SX Tipo,ANT SX mm,ANT DX Tipo,ANT DX mm,POST SX Tipo,POST SX mm,POST DX Tipo,POST DX mm,Deposito,Posizione';
  const rows = records.map(r =>
    [r.targa, r.data, r.operatore, r.cliente,
     r.ant_sx_tipo, r.ant_sx_mm,
     r.ant_dx_tipo, r.ant_dx_mm,
     r.post_sx_tipo, r.post_sx_mm,
     r.post_dx_tipo, r.post_dx_mm,
     r.deposito ? 'Sì' : 'No',
     r.posizione].join(',')
  );
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `handyscan_export_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('⬇ CSV esportato', 'ok');
}

/* ── Print ── */
function printDetail(id) {
  openDetail(id);
  setTimeout(() => window.print(), 300);
}

/* ── PWA Install ── */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  const banner = $('install-banner');
  if (banner) banner.classList.add('visible');
});
function installPWA() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  deferredInstall.userChoice.then(() => {
    deferredInstall = null;
    const banner = $('install-banner');
    if (banner) banner.classList.remove('visible');
  });
}

/* ── Service Worker ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('HandyScan SW registered'))
      .catch(e => console.warn('SW error:', e));
  });
}

/* ── Init ── */
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  showView('dashboard');

  // Search & filter live
  $('search-input')?.addEventListener('input', renderList);
  $('filter-deposito')?.addEventListener('change', renderList);
  $('filter-status')?.addEventListener('change', renderList);

  // Import file
  $('import-file')?.addEventListener('change', importCSV);
});

/* ── Expose globals for inline handlers ── */
window.showView     = showView;
window.openDetail   = openDetail;
window.openEdit     = openEdit;
window.openAdd      = openAdd;
window.saveForm     = saveForm;
window.deleteRecord = deleteRecord;
window.exportCSV    = exportCSV;
window.installPWA   = installPWA;
window.setSort      = setSort;
window.printDetail  = printDetail;
