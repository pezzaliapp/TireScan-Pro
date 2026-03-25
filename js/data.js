/* ================================================================
   HandyScan  |  js/data.js  — Dati, storage, import/export
   ================================================================ */
'use strict';

const STORAGE_KEY = 'handyscan_records';
const WARN_MM     = 3.0;
const CRIT_MM     = 1.6;

let records = [];

/* ── Utility ── */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function getMinMm(r) {
  return Math.min(r.ant_sx_mm, r.ant_dx_mm, r.post_sx_mm, r.post_dx_mm);
}

function getStatus(mm) {
  if (mm <= CRIT_MM) return { cls:'crit', label:'CRITICO', color:'#ef4444' };
  if (mm <= WARN_MM) return { cls:'warn', label:'ATTENZIONE', color:'#f97316' };
  return { cls:'ok', label:'OK', color:'#22c55e' };
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
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/* ── Storage ── */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { records = JSON.parse(raw); return; }
  } catch {}
  records = getSampleData();
  saveData();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/* ── Dati campione (dal tuo file Excel reale) ── */
function getSampleData() {
  return [
    { id:uid(), targa:'DW902KP', data:'21/11/2025', operatore:'CORMACH', cliente:'Pippo Ohoho',
      ant_sx_tipo:'/R', ant_sx_mm:3.3, ant_dx_tipo:'/R', ant_dx_mm:3.7,
      post_sx_tipo:'/R', post_sx_mm:3.0, post_dx_tipo:'/R', post_dx_mm:4.0, deposito:true,  posizione:'xyz' },
    { id:uid(), targa:'EH126GN', data:'17/11/2025', operatore:'CORMACH', cliente:'Alibaba Mustafa',
      ant_sx_tipo:'205/17R15', ant_sx_mm:2.8, ant_dx_tipo:'205/17R15', ant_dx_mm:3.2,
      post_sx_tipo:'205/17R15', post_sx_mm:4.6, post_dx_tipo:'205/17R15', post_dx_mm:3.8, deposito:true,  posizione:'iol8' },
    { id:uid(), targa:'FE204GL', data:'28/10/2025', operatore:'CORMACH', cliente:'Cliente Cognome',
      ant_sx_tipo:'195/55R15', ant_sx_mm:4.7, ant_dx_tipo:'195/55R15', ant_dx_mm:4.7,
      post_sx_tipo:'195/55R15', post_sx_mm:4.9, post_dx_tipo:'195/55R15', post_dx_mm:4.1, deposito:false, posizione:'Block 1 Shelf C3' },
    { id:uid(), targa:'FG024DR', data:'23/05/2025', operatore:'fhfdd',   cliente:'Customer TEST',
      ant_sx_tipo:'245/75R85', ant_sx_mm:3.7, ant_dx_tipo:'245/75R85', ant_dx_mm:0.0,
      post_sx_tipo:'245/75R85', post_sx_mm:0.0, post_dx_tipo:'245/75R85', post_dx_mm:3.3, deposito:true,  posizione:'pipipop' },
    { id:uid(), targa:'FH292RF', data:'30/09/2025', operatore:'Claudio', cliente:'Pipopopopo Uocuodu',
      ant_sx_tipo:'/R', ant_sx_mm:5.0, ant_dx_tipo:'/R', ant_dx_mm:3.7,
      post_sx_tipo:'/R', post_sx_mm:4.1, post_dx_tipo:'/R', post_dx_mm:6.2, deposito:true,  posizione:'òlkòkòk' },
    { id:uid(), targa:'FKTRUJ',  data:'31/10/2025', operatore:'CORMACH', cliente:'Lèdkgèsk',
      ant_sx_tipo:'/R', ant_sx_mm:6.9, ant_dx_tipo:'/R', ant_dx_mm:7.8,
      post_sx_tipo:'/R', post_sx_mm:8.6, post_dx_tipo:'/R', post_dx_mm:7.4, deposito:false, posizione:'' },
    { id:uid(), targa:'FZ025BW', data:'21/11/2025', operatore:'pippo',   cliente:'Hjhjfjf',
      ant_sx_tipo:'215/65R16', ant_sx_mm:0.6, ant_dx_tipo:'215/65R16', ant_dx_mm:0.6,
      post_sx_tipo:'215/65R16', post_sx_mm:6.4, post_dx_tipo:'215/65R16', post_dx_mm:4.8, deposito:true,  posizione:'h76' },
    { id:uid(), targa:'GB105YE', data:'03/02/2026', operatore:'Christian',cliente:'Pippo',
      ant_sx_tipo:'/R', ant_sx_mm:2.3, ant_dx_tipo:'/R', ant_dx_mm:4.3,
      post_sx_tipo:'/R', post_sx_mm:2.4, post_dx_tipo:'/R', post_dx_mm:4.1, deposito:true,  posizione:'khihkg' },
    { id:uid(), targa:'GT058PF', data:'31/10/2025', operatore:'CORMACH', cliente:'AL PEZ',
      ant_sx_tipo:'/R', ant_sx_mm:7.8, ant_dx_tipo:'/R', ant_dx_mm:7.7,
      post_sx_tipo:'/R', post_sx_mm:6.8, post_dx_tipo:'/R', post_dx_mm:6.8, deposito:true,  posizione:'P1-H2' },
    { id:uid(), targa:'RRR',     data:'23/05/2025', operatore:'CORMACH', cliente:'LB',
      ant_sx_tipo:'6',  ant_sx_mm:3.4, ant_dx_tipo:'6',  ant_dx_mm:3.1,
      post_sx_tipo:'6',  post_sx_mm:0.0, post_dx_tipo:'6',  post_dx_mm:3.6, deposito:true,  posizione:'RING AUT FILA 5' },
  ];
}

/* ── Import CSV (portale Cormach o formato nativo) ── */
function importCSV(csvText) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return 0;
  const header = lines[0].toLowerCase();
  let imported = 0;

  const isPortale = header.includes('targa veicolo') || header.includes('anteriore sinistro');

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g,''));
    let rec;

    if (isPortale) {
      // Formato export portale Cormach: Targa,Date,Operatore,Nome cliente,,,ANT SX tipo,ANT SX mm,ANT DX tipo,ANT DX mm,POST SX tipo,POST SX mm,POST DX tipo,POST DX mm,Deposito,Posizione,Report
      const targa = cols[0]?.toUpperCase();
      if (!targa || targa === 'TARGA VEICOLO' || targa.startsWith('LISTA') || targa.startsWith('LIMITE')) continue;
      rec = {
        id: uid(), targa,
        data:         cols[1] || '',
        operatore:    cols[2] || '',
        cliente:      cols[3]?.trim() || '',
        ant_sx_tipo:  cols[6] || '/R',
        ant_sx_mm:    parseFloat(cols[7]) || 0,
        ant_dx_tipo:  cols[8] || '/R',
        ant_dx_mm:    parseFloat(cols[9]) || 0,
        post_sx_tipo: cols[10] || '/R',
        post_sx_mm:   parseFloat(cols[11]) || 0,
        post_dx_tipo: cols[12] || '/R',
        post_dx_mm:   parseFloat(cols[13]) || 0,
        deposito:     (cols[14]||'').toLowerCase().includes('s'),
        posizione:    cols[15] || '',
      };
    } else {
      // Formato nativo HandyScan: Targa,Data,Operatore,Cliente,ANT SX Tipo,ANT SX mm,ANT DX Tipo,ANT DX mm,...
      if (!cols[0]) continue;
      rec = {
        id: uid(), targa: cols[0].toUpperCase(),
        data: cols[1]||'', operatore: cols[2]||'', cliente: cols[3]||'',
        ant_sx_tipo: cols[4]||'/R', ant_sx_mm: parseFloat(cols[5])||0,
        ant_dx_tipo: cols[6]||'/R', ant_dx_mm: parseFloat(cols[7])||0,
        post_sx_tipo: cols[8]||'/R', post_sx_mm: parseFloat(cols[9])||0,
        post_dx_tipo: cols[10]||'/R', post_dx_mm: parseFloat(cols[11])||0,
        deposito: (cols[12]||'').toLowerCase().includes('s'),
        posizione: cols[13]||'',
      };
    }

    if (!rec || !rec.targa) continue;
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
  const rows = records.map(r =>
    [r.targa,r.data,r.operatore,r.cliente,
     r.ant_sx_tipo,r.ant_sx_mm,r.ant_dx_tipo,r.ant_dx_mm,
     r.post_sx_tipo,r.post_sx_mm,r.post_dx_tipo,r.post_dx_mm,
     r.deposito?'Sì':'No', r.posizione].join(',')
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
  uid, getMinMm, getStatus, mmClass, parseDate, escHTML, todayStr,
  WARN_MM, CRIT_MM,
  getRecords: () => records,
  setRecords: (r) => { records = r; saveData(); },
});
