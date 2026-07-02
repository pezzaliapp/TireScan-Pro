/* ================================================================
   TireScan-Pro  |  js/report.js  — Scheda Report Pneumatici v2.0
   Design "rapporto tecnico": per ogni ruota una barra di profondità
   su scala 0–8 mm con zone critico/attenzione/OK, indicatore sul
   valore misurato, mini-schema del veicolo con la ruota evidenziata,
   sintesi con raccomandazione. Ottimizzata per stampa A4 / PDF.
   NOTA: non sostituisce il report ufficiale HandyScan Manager.
   Open Source — github.com/pezzaliapp/TireScan-Pro
   ================================================================ */
'use strict';

/* Config officina dalle impostazioni richiami (se presenti) */
function trOfficina() {
  try {
    const cfg = JSON.parse(localStorage.getItem('handyscan_rc_config') || '{}');
    return { nome: cfg.officina || 'La tua officina', firma: cfg.firma || '' };
  } catch { return { nome: 'La tua officina', firma: '' }; }
}

/* ── Palette stato (stampa su bianco) ──
   col = testo/icone (più scuro per leggibilità), fill = riempimenti  */
function trTone(mm) {
  if (mm <= HS.CRIT_MM) return { col: '#d32f2f', fill: '#d32f2f', bg: '#fdecea', label: 'CRITICO' };
  if (mm <= HS.WARN_MM) return { col: '#d97706', fill: '#f59e0b', bg: '#fef3e0', label: 'ATTENZIONE' };
  return                       { col: '#2e7d32', fill: '#2e7d32', bg: '#e8f5e9', label: 'OK' };
}

/* ── Barra di profondità 0–8 mm ──
   Lettura immediata: più barra colorata = più gomma. Binario grigio,
   riempimento nel colore dello stato, soglie tratteggiate etichettate
   (1.6 = limite legale in rosso, 3.0 = attenzione in ambra).          */
function trGauge(mm) {
  const W = 320, scale = W / 8;
  const x = v => Math.round(v * scale * 10) / 10;
  const val = Math.max(0, Math.min(8, Number(mm) || 0));
  const t = trTone(val);
  return `<svg viewBox="0 0 ${W} 56" class="tr-gauge" role="img" aria-label="${val.toFixed(1)} mm su scala 8 mm">
    <rect x="0" y="22" width="${W}" height="12" rx="6" fill="#eceff1"/>
    ${val > 0 ? `<rect x="0" y="22" width="${Math.max(x(val), 12)}" height="12" rx="6" fill="${t.fill}"/>` : ''}
    <line x1="${x(HS.CRIT_MM)}" y1="16" x2="${x(HS.CRIT_MM)}" y2="40" stroke="#d32f2f" stroke-width="2" stroke-dasharray="3,2"/>
    <line x1="${x(HS.WARN_MM)}" y1="16" x2="${x(HS.WARN_MM)}" y2="40" stroke="#f59e0b" stroke-width="2" stroke-dasharray="3,2"/>
    <g font-size="9" fill="#78909c">
      <text x="${x(HS.CRIT_MM)}" y="12" text-anchor="middle" fill="#d32f2f">${HS.CRIT_MM.toFixed(1)} limite</text>
      <text x="${x(HS.WARN_MM) + 12}" y="12" text-anchor="middle" fill="#c77700">${HS.WARN_MM.toFixed(1)}</text>
      <text x="0" y="52">0</text>
      <text x="${W}" y="52" text-anchor="end">8 mm</text>
    </g>
  </svg>`;
}

/* ── Mini-schema veicolo (vista dall'alto) con ruota evidenziata ──
   pos: 0=Ant SX  1=Ant DX  2=Post SX  3=Post DX                     */
function trMiniCar(pos, col) {
  const P = [[3, 6], [23, 6], [3, 30], [23, 30]];
  const wheels = P.map(([px, py], i) =>
    `<rect x="${px}" y="${py}" width="6" height="12" rx="2" fill="${i === pos ? col : '#cfd8dc'}"/>`).join('');
  return `<svg viewBox="0 0 32 48" class="tr-minicar" aria-hidden="true">
    <rect x="8" y="4" width="16" height="40" rx="7" fill="none" stroke="#90a4ae" stroke-width="1.6"/>
    <line x1="10" y1="18" x2="22" y2="18" stroke="#cfd8dc" stroke-width="1.2"/>
    ${wheels}
  </svg>`;
}

/* ── Card ruota ── */
function trWheel(title, tipo, mm, pos) {
  const val = Number.isFinite(Number(mm)) ? Number(mm) : 0;
  const t = trTone(val);
  return `<div class="tr-wheel">
    <div class="tr-wheel-row">
      ${trMiniCar(pos, t.col)}
      <div class="tr-wheel-main">
        <div class="tr-wheel-head">
          <span class="tr-pos">${HS.escHTML(title)}</span>
          <span class="tr-chip" style="color:${t.col};background:${t.bg}">${t.label}</span>
        </div>
        <div class="tr-val" style="color:${t.col}">${val.toFixed(1)}<span> mm</span></div>
        ${trGauge(val)}
        <div class="tr-dim">Dimensioni: ${HS.escHTML(tipo && tipo !== '/R' ? tipo : '—')}</div>
      </div>
    </div>
  </div>`;
}

/* ── Sintesi complessiva ── */
function trSummary(r) {
  const min = HS.getMinMm(r);
  const t = trTone(min);
  const msg = min <= HS.CRIT_MM
    ? 'Almeno un pneumatico è sotto il limite legale di ' + HS.CRIT_MM.toFixed(1) + ' mm: sostituzione immediata consigliata.'
    : min <= HS.WARN_MM
      ? 'Usura in zona di attenzione: pianificare il controllo o la sostituzione a breve.'
      : 'Pneumatici in buono stato alla data del controllo.';
  return `<div class="tr-summary" style="border-color:${t.col}">
    <div class="tr-summary-badge" style="background:${t.fill}">${t.label}</div>
    <div>
      <div class="tr-summary-min">Profondità minima rilevata: <b style="color:${t.col}">${min.toFixed(1)} mm</b></div>
      <div class="tr-summary-msg">${msg}</div>
    </div>
  </div>`;
}

/* ── Scheda completa ── */
function buildTireReport(r) {
  const off = trOfficina();
  const cust = (window.CUST && CUST.findByName) ? CUST.findByName(r.cliente) : null;
  const email = cust && CUST.email ? CUST.email(cust) : '';
  const tel   = cust && CUST.phone ? CUST.phone(cust) : '';
  const oggi  = new Date().toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });

  return `<div class="tr-sheet" id="tire-report">
    <div class="tr-head">
      <div>
        <div class="tr-brand">${HS.escHTML(off.nome)}</div>
        <div class="tr-brand-sub">Rapporto controllo pneumatici</div>
        ${off.firma ? `<div class="tr-brand-sub">${HS.escHTML(off.firma)}</div>` : ''}
      </div>
      <div class="tr-head-box">
        <div class="tr-head-targa">${HS.escHTML(r.targa)}</div>
        <div><em>Cliente:</em> ${HS.escHTML(r.cliente || '—')}</div>
        <div><em>Data controllo:</em> ${HS.escHTML(r.data || '—')} · <em>Operatore:</em> ${HS.escHTML(r.operatore || '—')}</div>
        ${r.stagione ? `<div><em>Pneumatici:</em> ${HS.seasonLabel(r.stagione)}</div>` : ''}
        ${email || tel ? `<div>${email ? HS.escHTML(email) : ''}${email && tel ? ' · ' : ''}${tel ? HS.escHTML(tel) : ''}</div>` : ''}
      </div>
    </div>

    ${trSummary(r)}

    <div class="tr-grid">
      ${trWheel('Anteriore sinistro',  r.ant_sx_tipo,  r.ant_sx_mm,  0)}
      ${trWheel('Anteriore destro',    r.ant_dx_tipo,  r.ant_dx_mm,  1)}
      ${trWheel('Posteriore sinistro', r.post_sx_tipo, r.post_sx_mm, 2)}
      ${trWheel('Posteriore destro',   r.post_dx_tipo, r.post_dx_mm, 3)}
    </div>

    <div class="tr-legend">
      <div><span class="tr-dot" style="background:#d32f2f"></span> Critico ≤ ${HS.CRIT_MM.toFixed(1)} mm (limite legale)</div>
      <div><span class="tr-dot" style="background:#f59e0b"></span> Attenzione ${HS.CRIT_MM.toFixed(1)}–${HS.WARN_MM.toFixed(1)} mm</div>
      <div><span class="tr-dot" style="background:#2e7d32"></span> OK &gt; ${HS.WARN_MM.toFixed(1)} mm</div>
    </div>

    <div class="tr-deposito">
      <span class="tr-check">${r.deposito ? '☑' : '☐'}</span> <em>Pneumatici in deposito</em>
      ${r.deposito && r.posizione ? ` — posizione: <b>${HS.escHTML(r.posizione)}</b>` : ''}
    </div>

    <div class="tr-footer">
      Stampato il ${HS.escHTML(oggi)} · Documento generato con TireScan-Pro (app indipendente, open source) a scopo informativo:
      riporta il valore minimo rilevato per gomma. Le misure per singola scanalatura e il report certificato
      sono disponibili in HandyScan Manager sul portale TireApp.
    </div>
  </div>`;
}

/* ── Apertura scheda a schermo (con pulsanti stampa/chiudi) ── */
function openTireReport(id) {
  const r = HS.getRecords().find(x => x.id === id);
  if (!r) return;
  closeTireReport();
  const ov = document.createElement('div');
  ov.id = 'tire-report-overlay';
  ov.innerHTML = `
    <div class="tr-toolbar tr-noprint">
      <button class="btn btn-primary btn-sm" onclick="window.print()">🖨 Stampa / Salva PDF</button>
      <button class="btn btn-ghost btn-sm" onclick="closeTireReport()">✕ Chiudi</button>
    </div>
    ${buildTireReport(r)}`;
  document.body.appendChild(ov);
  document.body.classList.add('tr-open');
}
function closeTireReport() {
  document.getElementById('tire-report-overlay')?.remove();
  document.body.classList.remove('tr-open');
}
window.openTireReport = openTireReport;
window.closeTireReport = closeTireReport;

window.TR = { open: openTireReport, close: closeTireReport, build: buildTireReport };
