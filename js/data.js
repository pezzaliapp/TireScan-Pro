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
            <div class="welcome-step-title">Importa direttamente l'Excel</div>
            <div class="welcome-step-text">Non serve convertire nulla: HandyScan legge i file <strong>.xlsx</strong> del portale (report scansioni) e dell'anagrafica clienti (<strong>ExportCustomers</strong>). Sono accettati anche i CSV.</div>
          </div>
        </div>
        <div class="welcome-step hl">
          <span class="welcome-step-ico">3️⃣</span>
          <div>
            <div class="welcome-step-title">Contatti e appuntamenti</div>
            <div class="welcome-step-text">Importando l'anagrafica, ogni targa eredita <strong>email e cellulare</strong> del cliente: potrai richiamare per mail, telefono o WhatsApp e <strong>fissare appuntamenti</strong> in agenda.</div>
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
          ⬆ Importa il mio file (Excel/CSV)
          <input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="welcomeImport(this)">
        </label>
        <button class="btn btn-ghost" style="font-size:14px;padding:12px 24px" onclick="if(window.loadDemoData)loadDemoData()">
          🎬 Prova con dati demo
        </button>
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
  parseAnyFile(file, 'auto').then(n => {
    closeWelcome();
    if (window.CUST) CUST.load();
    if (window.toast) toast(n > 0 ? `✅ ${n} record importati` : '❌ Nessun record trovato', n > 0 ? 't-ok' : 't-err');
    if (window.showView) showView('dashboard');
  }).catch(() => { closeWelcome(); if (window.toast) toast('❌ Errore lettura file', 't-err'); });
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

/* ================================================================
   IMPORT UNIFICATO Excel (.xlsx/.xls) + CSV
   - parseAnyFile(file, type) → Promise<numero record importati>
   - type: 'auto' (rileva report vs anagrafica), 'report', 'customers'
   ================================================================ */

/* Converte una cella in stringa; le date Excel diventano GG/MM/AAAA */
function cellStr(v) {
  if (v == null) return '';
  if (v instanceof Date && !isNaN(v))
    return `${String(v.getDate()).padStart(2,'0')}/${String(v.getMonth()+1).padStart(2,'0')}/${v.getFullYear()}`;
  return String(v).trim();
}

/* Legge un file e restituisce una matrice (array di righe).
   .xlsx/.xls via SheetJS; .csv via parser CSV.                  */
function fileToRows(file) {
  return new Promise((resolve, reject) => {
    const name = (file.name || '').toLowerCase();
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm');
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    if (isExcel) {
      reader.onload = ev => {
        try {
          if (typeof XLSX === 'undefined') { reject(new Error('XLSX non caricato')); return; }
          const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array', cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false });
          resolve(aoa);
        } catch (e) { reject(e); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = ev => {
        try { resolve(window.CUST ? CUST.parseCSVRows(ev.target.result) : csvFallbackRows(ev.target.result)); }
        catch (e) { reject(e); }
      };
      reader.readAsText(file, 'UTF-8');
    }
  });
}

/* fallback CSV se customers.js non è ancora caricato */
function csvFallbackRows(text) {
  return text.split('\n').map(l => l.replace(/\r$/, '').split(',')).filter(r => r.some(c => c.trim() !== ''));
}

/* Riconosce se una matrice è un'anagrafica clienti */
function rowsAreCustomers(rows) {
  return rows.some(r => r.some(v => String(v).toLowerCase().trim() === 'customer_code'));
}

/* Import record di scansione da matrice (Excel o CSV) */
function importReportRows(rows) {
  if (!rows || !rows.length) return 0;
  // riga header del portale Cormach
  let hIdx = rows.findIndex(r => {
    const j = r.map(c => String(c).toLowerCase()).join('|');
    return j.includes('targa veicolo') || j.includes('anteriore sinistro');
  });
  const isPortale = hIdx >= 0;
  if (!isPortale) {
    // formato nativo: header alla prima riga se contiene "targa"
    const first = (rows[0] || []).map(c => String(c).toLowerCase()).join('|');
    hIdx = first.includes('targa') ? 0 : -1;
  }
  let imported = 0;
  for (let i = hIdx + 1; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue;
    const g = idx => cellStr(r[idx]);
    let rec;
    if (isPortale) {
      const targa = g(0).toUpperCase();
      if (!targa || targa.startsWith('LISTA') || targa.startsWith('LIMITE') || targa === 'TARGA VEICOLO') continue;
      rec = {
        id: uid(), targa,
        data:        g(1),  operatore: g(2), cliente: g(3),
        ant_sx_tipo: g(6)  || '/R', ant_sx_mm:  parseFloat(g(7))  || 0,
        ant_dx_tipo: g(8)  || '/R', ant_dx_mm:  parseFloat(g(9))  || 0,
        post_sx_tipo:g(10) || '/R', post_sx_mm: parseFloat(g(11)) || 0,
        post_dx_tipo:g(12) || '/R', post_dx_mm: parseFloat(g(13)) || 0,
        deposito:    g(14).toLowerCase().includes('s'),
        posizione:   g(15),
      };
    } else {
      const targa = g(0).toUpperCase();
      if (!targa) continue;
      rec = {
        id: uid(), targa,
        data: g(1), operatore: g(2), cliente: g(3),
        ant_sx_tipo: g(4)  || '/R', ant_sx_mm:  parseFloat(g(5))  || 0,
        ant_dx_tipo: g(6)  || '/R', ant_dx_mm:  parseFloat(g(7))  || 0,
        post_sx_tipo:g(8)  || '/R', post_sx_mm: parseFloat(g(9))  || 0,
        post_dx_tipo:g(10) || '/R', post_dx_mm: parseFloat(g(11)) || 0,
        deposito:    g(12).toLowerCase().includes('s'),
        posizione:   g(13),
      };
    }
    if (!rec.targa) continue;
    const idx = records.findIndex(x => x.targa === rec.targa);
    if (idx >= 0) records[idx] = { ...rec, id: records[idx].id };
    else records.push(rec);
    imported++;
  }
  saveData();
  return imported;
}

/* Entry point unico usato da tutti i pulsanti Importa */
function parseAnyFile(file, type = 'auto') {
  return fileToRows(file).then(rows => {
    if (type === 'customers') return window.CUST ? CUST.importRows(rows) : 0;
    if (type === 'report')    return importReportRows(rows);
    // auto-detect
    if (rowsAreCustomers(rows)) return window.CUST ? CUST.importRows(rows) : 0;
    return importReportRows(rows);
  });
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

/* ── Reset / azzeramento dati ──
   Cancella scansioni, anagrafica clienti, appuntamenti e contatti.
   Mantiene le impostazioni officina (firma, soglie) e il tema.        */
function resetAll() {
  ['handyscan_records', 'handyscan_customers', 'handyscan_appointments',
   'handyscan_rc_emails', 'handyscan_rc_sent'].forEach(k => { try { localStorage.removeItem(k); } catch {} });
  loadData();
  if (window.CUST && CUST.load) CUST.load();
  if (window.APPT && APPT.init) APPT.init();
  if (window.RC   && RC.init)   RC.init();
}
window.resetAllData = function () {
  if (!confirm("Azzerare TUTTI i dati locali (scansioni, clienti, appuntamenti, contatti)? Le impostazioni officina restano. Azione non reversibile.")) return;
  resetAll();
  if (window.toast) toast('🗑 Dati azzerati', '');
  if (window.CUST && CUST.renderView) CUST.renderView();
  if (window.showView) showView('dashboard');
};

/* ── Expose ── */
window.HS = window.HS || {};
Object.assign(window.HS, {
  records, loadData, saveData, importCSV, exportCSV,
  parseAnyFile, fileToRows, importReportRows, cellStr,
  resetAll,
  isFirstLaunch, showWelcomeScreen,
  uid, getMinMm, getStatus, mmClass, parseDate, escHTML, todayStr,
  WARN_MM, CRIT_MM,
  getRecords: () => records,
  setRecords: (r) => { records = r; saveData(); },
});
