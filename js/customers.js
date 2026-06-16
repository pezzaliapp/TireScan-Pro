/* ================================================================
   HandyScan  |  js/customers.js  — Anagrafica Clienti v1.0
   Import Excel/CSV anagrafica (ExportCustomers) + matching per nome
   con i record di scansione, così ogni targa eredita email/telefono.
   Open Source — github.com/pezzaliapp/TireScan-Pro
   ================================================================ */
'use strict';

const CUST_KEY = 'handyscan_customers';

let customers = [];          // array di oggetti cliente
let custIndex = new Map();   // nomeNormalizzato → cliente (per match veloce)

/* ── Storage ── */
function custLoad() {
  try {
    const raw = localStorage.getItem(CUST_KEY);
    customers = raw ? JSON.parse(raw) : [];
  } catch { customers = []; }
  rebuildIndex();
}
function custSave() {
  localStorage.setItem(CUST_KEY, JSON.stringify(customers));
  rebuildIndex();
}

/* ── Normalizzazione nome per matching ──
   Maiuscolo, niente accenti, niente punteggiatura, niente forme
   societarie (SRL, SPA, LTD…), spazi compattati.                  */
const LEGAL_SUFFIX = /\b(s\.?r\.?l\.?s?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|s\.?s\.?|ltd|inc|llc|gmbh|ab|as|aps|bv|plc|co|srls|sas|snc|spa|srl)\b/gi;
function normName(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // togli accenti
    .toUpperCase()
    .replace(/[._,;:/\\()'"-]/g, ' ')
    .replace(LEGAL_SUFFIX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rebuildIndex() {
  custIndex = new Map();
  customers.forEach(c => {
    const keys = new Set();
    if (c.name)    keys.add(normName(c.name));
    if (c.company) keys.add(normName(c.company));
    if (c.firstName || c.lastName) keys.add(normName(`${c.firstName} ${c.lastName}`));
    keys.forEach(k => { if (k && !custIndex.has(k)) custIndex.set(k, c); });
  });
}

/* ── Lookup: dato un nome cliente (dal report) trova l'anagrafica ── */
function findCustomerByName(name) {
  if (!name) return null;
  const k = normName(name);
  if (!k) return null;
  if (custIndex.has(k)) return custIndex.get(k);
  // fallback: contiene / è contenuto (match parziale prudente, min 4 char)
  if (k.length >= 4) {
    for (const [ck, c] of custIndex) {
      if (ck.length >= 4 && (ck.includes(k) || k.includes(ck))) return c;
    }
  }
  return null;
}

/* ── Chiave stabile per onclick ── */
function custKey(c) { return c.code || normName(c.name); }
function findCustomerByKey(key) { return customers.find(c => custKey(c) === key) || null; }

/* ── Raggruppa le scansioni per cliente (gestione multi-targa) ── */
function recordsByCustomer() {
  const recs = (window.HS && HS.getRecords) ? HS.getRecords() : [];
  const map = new Map();   // customer(obj) → records[]
  recs.forEach(r => {
    const c = findCustomerByName(r.cliente);
    if (!c) return;
    if (!map.has(c)) map.set(c, []);
    map.get(c).push(r);
  });
  return map;
}
function platesForCustomer(c) {
  const m = recordsByCustomer().get(c) || [];
  // targhe uniche, una per veicolo
  return [...new Set(m.map(r => r.targa))];
}

/* ── Contatti normalizzati di un cliente ── */
function custEmail(c)    { return c ? (c.email1 || c.email2 || '') : ''; }
function custPhone(c)    { return c ? (c.mobile1 || c.mobile2 || c.phone1 || c.phone2 || '') : ''; }
function custFullAddr(c) {
  if (!c) return '';
  return [c.address, c.zip, c.locality, c.prov, c.country].filter(Boolean).join(' ');
}

/* ── Mapping di una riga anagrafica → oggetto cliente ──
   Ordine colonne ExportCustomers:
   0 customer_code 1 company_name 2 first_name 3 last_name 4 Indirizzo
   5 locality 6 Prov. 7 zip_code 8 region 9 zone 10 Paese
   11 fiscal_code 12 vat_code 13 phone_1 14 phone_2 15 mobile_1
   16 mobile_2 17 fax 18 email_1 19 email_2                         */
function rowToCustomer(c) {
  const g = i => String(c[i] ?? '').trim();
  const company   = g(1);
  const firstName = g(2);
  const lastName  = g(3);
  const name = company || `${firstName} ${lastName}`.trim();
  if (!name) return null;
  return {
    code:      g(0),
    company, firstName, lastName, name,
    address:   g(4),  locality: g(5), prov: g(6), zip: g(7),
    region:    g(8),  zone:     g(9), country: g(10),
    fiscalCode:g(11), vatCode:  g(12),
    phone1:    g(13), phone2:   g(14),
    mobile1:   g(15), mobile2:  g(16),
    fax:       g(17),
    email1:    g(18), email2:   g(19),
  };
}

/* ── Import da array-di-array (Excel) ── */
function importCustomerRows(rows) {
  if (!rows || !rows.length) return 0;
  // trova la riga di header (contiene customer_code)
  let h = rows.findIndex(r => r.some(v => String(v).toLowerCase().trim() === 'customer_code'));
  if (h < 0) h = 0;
  let n = 0;
  for (let i = h + 1; i < rows.length; i++) {
    const cust = rowToCustomer(rows[i]);
    if (!cust) continue;
    const key = (cust.code || normName(cust.name));
    const idx = customers.findIndex(x => (x.code || normName(x.name)) === key);
    if (idx >= 0) customers[idx] = { ...customers[idx], ...cust };
    else customers.push(cust);
    n++;
  }
  custSave();
  return n;
}

/* ── Import CSV anagrafica ── */
function importCustomersCSV(text) {
  const rows = parseCSVRows(text);
  return importCustomerRows(rows);
}

/* Parser CSV minimale che gestisce virgolette e separatore , o ; */
function parseCSVRows(text) {
  const sep = (text.split('\n')[0].match(/;/g) || []).length >
              (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch === '\r') { /* skip */ }
      else cell += ch;
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

/* ── Statistiche di collegamento con i record di scansione ── */
function linkStats() {
  const recs = (window.HS && HS.getRecords) ? HS.getRecords() : [];
  let matched = 0, withContact = 0;
  recs.forEach(r => {
    const c = findCustomerByName(r.cliente);
    if (c) { matched++; if (custEmail(c) || custPhone(c)) withContact++; }
  });
  return { records: recs.length, customers: customers.length, matched, withContact };
}

/* ── Esporta anagrafica CSV ── */
function exportCustomersCSV() {
  const h = 'customer_code,company_name,first_name,last_name,Indirizzo,locality,Prov.,zip_code,region,zone,Paese,fiscal_code,vat_code,phone_1,phone_2,mobile_1,mobile_2,fax,email_1,email_2';
  const esc = v => { v = String(v ?? ''); return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const rows = customers.map(c => [
    c.code, c.company, c.firstName, c.lastName, c.address, c.locality, c.prov, c.zip,
    c.region, c.zone, c.country, c.fiscalCode, c.vatCode, c.phone1, c.phone2,
    c.mobile1, c.mobile2, c.fax, c.email1, c.email2
  ].map(esc).join(','));
  const blob = new Blob([h + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `handyscan_clienti_${HS.todayStr().replace(/\//g, '-')}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ── Rendering vista Clienti ── */
function renderCustomersView() {
  const el = document.getElementById('customers-container');
  if (!el) return;
  const st = linkStats();

  if (!customers.length) {
    el.innerHTML = `
      <div class="cust-toolbar">
        <label class="btn btn-primary btn-sm" style="cursor:pointer">⬆ Importa anagrafica (Excel/CSV)
          <input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="custImportFile(this)"></label>
        ${window.loadDemoData ? `<button class="btn btn-ghost btn-sm" onclick="loadDemoData()">🎬 Carica dati demo</button>` : ''}
      </div>
      <div class="empty-state"><div class="ei">👥</div>
        <p>Nessun cliente in anagrafica.<br>Importa il file <strong>ExportCustomers</strong> (Excel o CSV) dal gestionale<br>oppure prova lo strumento con i <strong>dati demo</strong>.</p></div>`;
    return;
  }

  const byCust = recordsByCustomer();

  const rows = customers
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => {
      const email = custEmail(c), tel = custPhone(c);
      const telHref = (tel || '').replace(/\s/g, '');
      const recs = byCust.get(c) || [];
      const plates = [...new Set(recs.map(r => r.targa))];
      const key = HS.escHTML(custKey(c));

      // chip targa colorate per stato; click → appuntamento per quella targa
      const chips = plates.length
        ? plates.map(t => {
            const r = recs.find(x => x.targa === t);
            const col = r ? HS.getStatus(HS.getMinMm(r)).color : 'var(--muted)';
            return `<button class="plate-chip" style="border-color:${col};color:${col}"
                      title="Fissa appuntamento per ${HS.escHTML(t)}"
                      onclick="custApptPlate('${HS.escHTML(t)}','${HS.escHTML(c.name).replace(/'/g,'')}')">${HS.escHTML(t)}</button>`;
          }).join('')
        : '<span style="color:var(--muted);font-size:12px">nessuna scansione</span>';

      return `
      <tr data-q="${HS.escHTML((c.name + ' ' + (c.code||'') + ' ' + (c.locality||'') + ' ' + plates.join(' ')).toLowerCase())}">
        <td>
          <div style="font-weight:600">${HS.escHTML(c.name)}</div>
          ${c.code ? `<div style="font-size:11px;color:var(--muted)">${HS.escHTML(c.code)}</div>` : ''}
          ${custFullAddr(c) ? `<div style="font-size:11px;color:var(--dim);margin-top:2px">${HS.escHTML(custFullAddr(c))}</div>` : ''}
        </td>
        <td>${email ? `<a href="mailto:${HS.escHTML(email)}" style="color:var(--cyan)">${HS.escHTML(email)}</a>` : '<span style="color:var(--muted)">—</span>'}</td>
        <td>${tel
            ? `<a href="tel:${HS.escHTML(telHref)}" style="color:var(--cyan)">${HS.escHTML(tel)}</a>
               <a href="https://wa.me/${waNum(tel)}" target="_blank" rel="noopener" title="WhatsApp" style="margin-left:6px">💬</a>`
            : '<span style="color:var(--muted)">—</span>'}</td>
        <td><div class="plate-chips">${chips}</div></td>
        <td style="white-space:nowrap">
          <button class="btn btn-primary btn-xs" onclick="custAppt('${key}')" title="Fissa appuntamento">📅 Appunt.</button>
        </td>
      </tr>`;
    }).join('');

  el.innerHTML = `
    <div class="cust-toolbar">
      <input id="cust-search" class="form-input" style="flex:1;min-width:160px" type="search" placeholder="🔍 Cerca cliente, codice, città, targa…" oninput="custFilter()">
      <label class="btn btn-ghost btn-sm" style="cursor:pointer">⬆ Importa<input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="custImportFile(this)"></label>
      <button class="btn btn-ghost btn-sm" onclick="CUST.exportCSV()">⬇ Esporta</button>
      ${window.loadDemoData ? `<button class="btn btn-ghost btn-sm" onclick="loadDemoData()">🎬 Demo</button>` : ''}
      <button class="btn btn-ghost btn-sm" onclick="resetAllData()" title="Azzera tutti i dati locali">🗑 Azzera</button>
    </div>
    <div class="cust-stats">
      <span>👥 <strong>${st.customers}</strong> clienti</span>
      <span>🚗 <strong>${st.matched}</strong>/${st.records} scansioni collegate</span>
      <span>📇 <strong>${st.withContact}</strong> con contatto utilizzabile</span>
    </div>
    <div class="table-wrap"><div class="table-scroll">
      <table>
        <thead><tr><th>Cliente</th><th>Email</th><th>Telefono / WhatsApp</th><th>Targhe</th><th></th></tr></thead>
        <tbody id="cust-body">${rows}</tbody>
      </table>
    </div></div>`;
}

/* Numero per link WhatsApp (formato internazionale senza +) */
function waNum(tel) {
  let n = String(tel || '').replace(/[^\d+]/g, '').replace(/^00/, '').replace(/^\+/, '');
  if (/^3\d{8,9}$/.test(n)) n = '39' + n;
  return n;
}

/* ── Globals onclick ── */
function initCustomerGlobals() {
  window.custImportFile = (input) => {
    const f = input.files[0]; if (!f) return;
    HS.parseAnyFile(f, 'customers').then(res => {
      const n = res || 0;
      renderCustomersView();
      if (window.RC) RC.renderView(HS.getRecords());
      toast(n > 0 ? `✅ ${n} clienti importati` : '❌ Nessun cliente trovato', n > 0 ? 't-ok' : 't-err');
    }).catch(() => toast('❌ Errore lettura file', 't-err'));
    input.value = '';
  };
  window.custFilter = () => {
    const q = (document.getElementById('cust-search')?.value || '').toLowerCase();
    document.querySelectorAll('#cust-body tr').forEach(tr => {
      tr.style.display = !q || (tr.dataset.q || '').includes(q) ? '' : 'none';
    });
  };
  // Appuntamento dal cliente: se ha più targhe apre la select, altrimenti precompila
  window.custAppt = (key) => {
    const c = findCustomerByKey(key); if (!c) return;
    const plates = platesForCustomer(c);
    if (window.APPT) APPT.open(plates[0] || '', c.name, plates);
  };
  // Appuntamento per una targa specifica (chip)
  window.custApptPlate = (targa, cliente) => {
    if (window.APPT) APPT.open(targa, cliente, [targa]);
  };
}

function initCustomers() {
  custLoad();
  initCustomerGlobals();
}

/* ── Expose ── */
window.CUST = {
  init: initCustomers,
  load: custLoad,
  importRows: importCustomerRows,
  importCSV: importCustomersCSV,
  findByName: findCustomerByName,
  findByKey: findCustomerByKey,
  key: custKey,
  recordsByCustomer, platesForCustomer,
  email: custEmail, phone: custPhone, fullAddr: custFullAddr,
  getAll: () => customers,
  renderView: renderCustomersView,
  exportCSV: exportCustomersCSV,
  linkStats,
  normName,
  parseCSVRows,
};
