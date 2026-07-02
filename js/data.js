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
function getMinMm(r) {
  const vals = [r.ant_sx_mm, r.ant_dx_mm, r.post_sx_mm, r.post_dx_mm]
    .map(Number).filter(Number.isFinite);
  return vals.length ? Math.min(...vals) : 0;
}
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
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
/* Escape per stringhe JS interpolate dentro attributi onclick.
   Da usare SEMPRE insieme a escHTML: escHTML(escJS(v)).            */
function escJS(s) {
  return String(s ?? '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,' ');
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

/* Import record di scansione da matrice (Excel o CSV) ──
   Mappatura ROBUSTA per NOME di intestazione (il tracciato del portale
   può cambiare: colonne email, modello, ecc. non sfalsano più i dati).
   Fallback su indici fissi solo se le intestazioni non vengono trovate. */
function findHeaderRow(rows) {
  return rows.findIndex(r => {
    const j = (r || []).map(c => String(c).toLowerCase()).join('|');
    return j.includes('targa veicolo') || j.includes('anteriore sinistro');
  });
}

/* Costruisce la mappa colonna→campo leggendo le intestazioni */
function mapPortalHeader(header) {
  const h = header.map(c => String(c ?? '').toLowerCase().trim());
  const idx = (pred) => h.findIndex(pred);
  const wheel = (label) => {
    const i = idx(c => c.includes(label));
    if (i < 0) return null;
    // il valore mm è la colonna "min" immediatamente successiva al tipo
    const mmIdx = (h[i + 1] || '').includes('min') ? i + 1
                : idx((c, k) => k > i && c.includes('min'));
    return { tipo: i, mm: mmIdx >= 0 ? mmIdx : i + 1 };
  };
  const m = {
    targa:     idx(c => c.includes('targa')),
    data:      idx(c => c === 'date' || c.includes('data')),
    operatore: idx(c => c.includes('operatore')),
    cliente:   idx(c => c.includes('cliente')),
    email:     idx(c => c.includes('email') || c.includes('e-mail')),
    stagione:  idx(c => c.includes('stagion') || c.includes('season')),
    asx: wheel('anteriore sinistro'),
    adx: wheel('anteriore destro'),
    psx: wheel('posteriore sinistro'),
    pdx: wheel('posteriore destro'),
    deposito:  idx(c => c.includes('deposito')),
    posizione: idx(c => c.includes('posizione')),
  };
  // valida: servono almeno targa e una ruota
  if (m.targa < 0 || !m.asx) return null;
  return m;
}

/* ── Stagione pneumatici ──
   Valori interni: '' | 'estivo' | 'invernale' | '4stagioni'.
   normSeason: interpreta valori espliciti (colonna "Stagione"/"Season"
   del portale, se presente). inferSeason: riconosce le marcature nella
   dicitura della gomma (M+S, 3PMSF, WINTER... → invernale; ALL SEASON,
   4S... → 4 stagioni).                                                */
function normSeason(v) {
  const t = String(v ?? '').toLowerCase();
  if (!t || t.includes('other')) return '';
  if (t.includes('winter') || t.includes('invern')) return 'invernale';
  if (t.includes('all') || t.includes('4') || t.includes('quattro')) return '4stagioni';
  if (t.includes('summer') || t.includes('estiv')) return 'estivo';
  return '';
}
function inferSeason(tipi) {
  const t = tipi.filter(Boolean).join(' ').toUpperCase();
  if (/3PMSF|M\+S|M&S|\bMS\b|WINTER|INVERN/.test(t)) return 'invernale';
  if (/ALL ?SEASON|4 ?STAGIONI|\b4S\b|QUATTRO/.test(t)) return '4stagioni';
  if (/SUMMER|ESTIV/.test(t)) return 'estivo';
  return '';
}
function seasonLabel(v) {
  return { estivo: 'Estivo', invernale: 'Invernale', '4stagioni': '4 Stagioni' }[v] || '';
}

/* Salva l'email trovata nel file nei contatti richiami della targa
   (solo se non già impostata manualmente).                          */
function storeImportedEmail(targa, email) {
  if (!targa || !email || !/\S+@\S+\.\S+/.test(email)) return;
  try {
    const key = 'handyscan_rc_emails';
    const all = JSON.parse(localStorage.getItem(key) || '{}');
    if (!all[targa] || !all[targa].email) {
      all[targa] = { ...(all[targa] || {}), email: email.trim() };
      localStorage.setItem(key, JSON.stringify(all));
    }
  } catch {}
}

function importReportRows(rows) {
  if (!rows || !rows.length) return 0;
  const hIdx = findHeaderRow(rows);
  const isPortale = hIdx >= 0;
  const map = isPortale ? mapPortalHeader(rows[hIdx]) : null;
  let start = hIdx + 1;

  if (!isPortale) {
    const first = (rows[0] || []).map(c => String(c).toLowerCase()).join('|');
    start = first.includes('targa') ? 1 : 0;
  }

  let imported = 0;
  for (let i = start; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue;
    const g = idx => (idx == null || idx < 0) ? '' : cellStr(r[idx]);
    let rec, email = '';

    if (isPortale && map) {
      const targa = g(map.targa).toUpperCase();
      if (!targa || targa.startsWith('LISTA') || targa.startsWith('LIMITE') ||
          targa.startsWith('SOLO') || targa === 'TARGA VEICOLO') continue;
      email = g(map.email);
      const wh = w => w ? { tipo: g(w.tipo) || '/R', mm: parseFloat(g(w.mm)) || 0 } : { tipo: '/R', mm: 0 };
      const asx = wh(map.asx), adx = wh(map.adx), psx = wh(map.psx), pdx = wh(map.pdx);
      rec = {
        id: uid(), targa,
        data: g(map.data), operatore: g(map.operatore), cliente: g(map.cliente),
        ant_sx_tipo:  asx.tipo, ant_sx_mm:  asx.mm,
        ant_dx_tipo:  adx.tipo, ant_dx_mm:  adx.mm,
        post_sx_tipo: psx.tipo, post_sx_mm: psx.mm,
        post_dx_tipo: pdx.tipo, post_dx_mm: pdx.mm,
        deposito:  g(map.deposito).toLowerCase().startsWith('s') || g(map.deposito).toLowerCase() === 'yes',
        posizione: g(map.posizione),
        stagione:  normSeason(g(map.stagione)) || inferSeason([asx.tipo, adx.tipo, psx.tipo, pdx.tipo]),
      };
    } else if (isPortale) {
      // header portale trovato ma mappatura fallita: indici storici
      const targa = g(0).toUpperCase();
      if (!targa || targa.startsWith('LISTA') || targa.startsWith('LIMITE') || targa === 'TARGA VEICOLO') continue;
      rec = {
        id: uid(), targa,
        data: g(1), operatore: g(2), cliente: g(3),
        ant_sx_tipo: g(6)  || '/R', ant_sx_mm:  parseFloat(g(7))  || 0,
        ant_dx_tipo: g(8)  || '/R', ant_dx_mm:  parseFloat(g(9))  || 0,
        post_sx_tipo:g(10) || '/R', post_sx_mm: parseFloat(g(11)) || 0,
        post_dx_tipo:g(12) || '/R', post_dx_mm: parseFloat(g(13)) || 0,
        deposito:    g(14).toLowerCase().includes('s'),
        posizione:   g(15),
      };
    } else {
      // formato nativo HandyScan (export dell'app stessa)
      const targa = g(0).toUpperCase();
      if (!targa || targa === 'TARGA') continue;
      rec = {
        id: uid(), targa,
        data: g(1), operatore: g(2), cliente: g(3),
        ant_sx_tipo: g(4)  || '/R', ant_sx_mm:  parseFloat(g(5))  || 0,
        ant_dx_tipo: g(6)  || '/R', ant_dx_mm:  parseFloat(g(7))  || 0,
        post_sx_tipo:g(8)  || '/R', post_sx_mm: parseFloat(g(9))  || 0,
        post_dx_tipo:g(10) || '/R', post_dx_mm: parseFloat(g(11)) || 0,
        deposito:    g(12).toLowerCase().startsWith('s'),
        posizione:   g(13),
        stagione:    normSeason(g(14)) || inferSeason([g(4), g(6), g(8), g(10)]),
      };
    }
    if (!rec.targa) continue;
    if (email) storeImportedEmail(rec.targa, email);
    const idx2 = records.findIndex(x => x.targa === rec.targa);
    if (idx2 >= 0) records[idx2] = { ...rec, id: records[idx2].id };
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
function csvCell(v) {
  let s = String(v ?? '');
  // formula injection guard (Excel/LibreOffice)
  if (/^[=+\-@\t]/.test(s)) s = "'" + s;
  if (/[",\n\r;]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function exportCSV() {
  const header = 'Targa,Data,Operatore,Cliente,ANT SX Tipo,ANT SX mm,ANT DX Tipo,ANT DX mm,POST SX Tipo,POST SX mm,POST DX Tipo,POST DX mm,Deposito,Posizione,Stagione';
  const rows   = records.map(r =>
    [r.targa, r.data, r.operatore, r.cliente,
     r.ant_sx_tipo, r.ant_sx_mm, r.ant_dx_tipo, r.ant_dx_mm,
     r.post_sx_tipo, r.post_sx_mm, r.post_dx_tipo, r.post_dx_mm,
     r.deposito ? 'Sì' : 'No', r.posizione, seasonLabel(r.stagione)].map(csvCell).join(',')
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
  uid, getMinMm, getStatus, mmClass, parseDate, escHTML, escJS, todayStr,
  normSeason, inferSeason, seasonLabel,
  WARN_MM, CRIT_MM,
  getRecords: () => records,
  setRecords: (r) => { records = r; saveData(); },
});
