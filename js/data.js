/* ================================================================
   HandyScan  |  js/data.js  v1.2
   - Nessun dato reale nel codice sorgente
   - Schermata di benvenuto al primo avvio
   ================================================================ */
'use strict';

const STORAGE_KEY  = 'handyscan_records';
const WELCOME_KEY  = 'handyscan_welcomed';
const WARN_MM      = 3.0;
const CRIT_MM      = 1.6;

let records = [];

/* ── Utility ── */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function getMinMm(r) { return Math.min(r.ant_sx_mm, r.ant_dx_mm, r.post_sx_mm, r.post_dx_mm); }
function getStatus(mm) {
  if (mm <= CRIT_MM) return { cls:'crit', label:'CRITICO',    color:'#ef4444' };
  if (mm <= WARN_MM) return { cls:'warn', label:'ATTENZIONE', color:'#f97316' };
  return                    { cls:'ok',   label:'OK',         color:'#22c55e' };
}
function mmClass(mm) {
  if (mm <= CRIT_MM) return 'mm-crit';
  if (mm <= WARN_MM) return 'mm-warn';
  return 'mm-ok';
}
function parseDate(s) {
  if (!s) return new Date(0);
  const p = s.split('/');
  if (p.length === 3) return new Date(+p[2], +p[1]-1, +p[0]);
  return new Date(s);
}
function escHTML(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

/* ── Storage ── */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { records = JSON.parse(raw); return; }
  } catch {}
  records = [];
  saveData();
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/* ── Welcome screen ── */
function isFirstLaunch() {
  return !localStorage.getItem(WELCOME_KEY);
}
function markWelcomed() {
  localStorage.setItem(WELCOME_KEY, '1');
}

function showWelcomeScreen() {
  const overlay = document.createElement('div');
  overlay.id = 'welcome-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:var(--bg);z-index:999;
    display:flex;align-items:center;justify-content:center;
    padding:24px;overflow-y:auto;
  `;
  overlay.innerHTML = `
    <div class="welcome-box">
      <div class="welcome-logo">🔍</div>
      <div class="welcome-title">Handy<span style="color:var(--cyan)">Scan</span></div>
      <div class="welcome-sub">Gestione scansioni pneumatici · Cormach Srl</div>
      <div class="welcome-steps">
        <div class="welcome-step hl">
          <span class="welcome-step-ico">1️⃣</span>
          <div>
            <div class="welcome-step-title">Esporta dal portale Cormach</div>
            <div class="welcome-step-text">Vai su <strong>portal.cormachsrl.com/tireapp/tires-store</strong>, applica i filtri e clicca <strong>Scarica</strong> per ottenere il file Excel.</div>
          </div>
        </div>
        <div class="welcome-step hl">
          <span class="welcome-step-ico">2️⃣</span>
          <div>
            <div class="welcome-step-title">Converti in CSV</div>
            <div class="welcome-step-text">Apri il file <strong>.xls</strong> in Excel o LibreOffice e salvalo come <strong>CSV UTF-8</strong> (File → Salva con nome → CSV UTF-8).</div>
          </div>
        </div>
        <div class="welcome-step hl">
          <span class="welcome-step-ico">3️⃣</span>
          <div>
            <div class="welcome-step-title">Importa in HandyScan</div>
            <div class="welcome-step-text">Clicca <strong>⬆ Importa</strong> in alto a destra e seleziona il CSV. I dati vengono salvati localmente sul tuo dispositivo.</div>
          </div>
        </div>
        <div class="welcome-step ok">
          <span class="welcome-step-ico">🔒</span>
          <div>
            <div class="welcome-step-title">I tuoi dati sono privati</div>
            <div class="welcome-step-text">Tutto è salvato <strong>solo su questo dispositivo</strong>. Nessun altro utente vede le tue scansioni, anche condividendo lo stesso link.</div>
          </div>
        </div>
      </div>
      <div class="welcome-cta">
        <label class="btn btn-primary" style="cursor:pointer;font-size:14px;padding:12px 24px">
          ⬆ Importa il mio CSV
          <input type="file" accept=".csv" style="display:none" onchange="welcomeImport(this)">
        </label>
        <button class="btn btn-ghost" style="font-size:14px;padding:12px 24px" onclick="closeWelcome()">
          Esplora l'app →
        </button>
      </div>
      <div class="welcome-hint">Puoi importare i dati in qualsiasi momento da <strong>⬆ Importa</strong> nell'header</div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function closeWelcome() {
  markWelcomed();
  const el = document.getElementById('welcome-overlay');
  if (el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }
}

function welcomeImport(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const n = importCSV(ev.target.result);
    closeWelcome();
    if (window.toast) toast(n > 0 ? `✅ ${n} record importati` : '❌ Nessun record trovato', n > 0 ? 't-ok' : 't-err');
    if (window.showView) showView('dashboard');
  };
  reader.readAsText(file, 'UTF-8');
}

window.closeWelcome  = closeWelcome;
window.welcomeImport = welcomeImport;

/* ── Import CSV ── */
function importCSV(csvText) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return 0;
  const header    = lines[0].toLowerCase();
  const isPortale = header.includes('targa veicolo') || header.includes('anteriore sinistro');
  let imported    = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g,''));
    let rec;

    if (isPortale) {
      const targa = cols[0]?.toUpperCase();
      if (!targa || targa.startsWith('LISTA') || targa.startsWith('LIMITE') || targa === 'TARGA VEICOLO') continue;
      rec = {
        id: uid(), targa,
        data:         cols[1]  || '',
        operatore:    cols[2]  || '',
        cliente:      cols[3]?.trim() || '',
        ant_sx_tipo:  cols[6]  || '/R',  ant_sx_mm:  parseFloat(cols[7])  || 0,
        ant_dx_tipo:  cols[8]  || '/R',  ant_dx_mm:  parseFloat(cols[9])  || 0,
        post_sx_tipo: cols[10] || '/R',  post_sx_mm: parseFloat(cols[11]) || 0,
        post_dx_tipo: cols[12] || '/R',  post_dx_mm: parseFloat(cols[13]) || 0,
        deposito:     (cols[14]||'').toLowerCase().includes('s'),
        posizione:    cols[15] || '',
      };
    } else {
      if (!cols[0]) continue;
      rec = {
        id: uid(), targa: cols[0].toUpperCase(),
        data: cols[1]||'', operatore: cols[2]||'', cliente: cols[3]||'',
        ant_sx_tipo: cols[4]||'/R',  ant_sx_mm:  parseFloat(cols[5])  || 0,
        ant_dx_tipo: cols[6]||'/R',  ant_dx_mm:  parseFloat(cols[7])  || 0,
        post_sx_tipo:cols[8]||'/R',  post_sx_mm: parseFloat(cols[9])  || 0,
        post_dx_tipo:cols[10]||'/R', post_dx_mm: parseFloat(cols[11]) || 0,
        deposito: (cols[12]||'').toLowerCase().includes('s'),
        posizione: cols[13]||'',
      };
    }

    if (!rec?.targa) continue;
    const idx = records.findIndex(r => r.targa === rec.targa);
    if (idx >= 0) records[idx] = { ...rec, id: records[idx].id };
    else records.push(rec);
    imported++;
  }
  saveData();
  return imported;
}

/* ── Export CSV ── */
function exportCSV() {
  const header = 'Targa,Data,Operatore,Cliente,ANT SX Tipo,ANT SX mm,ANT DX Tipo,ANT DX mm,POST SX Tipo,POST SX mm,POST DX Tipo,POST DX mm,Deposito,Posizione';
  const rows   = records.map(r =>
    [r.targa, r.data, r.operatore, r.cliente,
     r.ant_sx_tipo, r.ant_sx_mm, r.ant_dx_tipo, r.ant_dx_mm,
     r.post_sx_tipo, r.post_sx_mm, r.post_dx_tipo, r.post_dx_mm,
     r.deposito ? 'Sì' : 'No', r.posizione].join(',')
  );
  const blob = new Blob([header+'\n'+rows.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `handyscan_${todayStr().replace(/\//g,'-')}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ── Expose ── */
window.HS = window.HS || {};
Object.assign(window.HS, {
  records, loadData, saveData, importCSV, exportCSV,
  isFirstLaunch, showWelcomeScreen,
  uid, getMinMm, getStatus, mmClass, parseDate, escHTML, todayStr,
  WARN_MM, CRIT_MM,
  getRecords: () => records,
  setRecords: (r) => { records = r; saveData(); },
});
