/* ================================================================
   HandyScan  |  js/report.js  — Scheda Report Pneumatici v1.0
   Genera una scheda per veicolo ispirata al CarReport del portale
   Cormach: 4 quadranti gomma con grafica battistrada, fascia rossa
   di usura, valore medio evidenziato, legenda e riquadro deposito.
   Ottimizzata per la stampa (A4) e il salvataggio in PDF.
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

/* ── Grafica battistrada SVG ──
   La fascia rossa in alto cresce con l'usura: mm=8+ → nessuna fascia,
   mm=0 → fascia massima. Colori fissi (scheda stampabile su bianco). */
function trTireSVG(mm) {
  const val  = Number.isFinite(Number(mm)) ? Number(mm) : 0;
  const wear = Math.max(0, Math.min(1, 1 - val / 8));   // 0..1
  const treadTop = 16, treadH = 46;
  const redH = Math.max(wear > 0 ? 4 : 0, Math.round(treadH * wear));
  const uid = 'trclip' + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="0 0 230 130" class="tr-tire" role="img" aria-label="${val.toFixed(1)} mm">
    <defs><clipPath id="${uid}">
      <path d="M14,118 Q14,34 62,${treadTop} L168,${treadTop} Q216,34 216,118 Z"/>
    </clipPath></defs>
    <path d="M14,118 Q14,34 62,${treadTop} L168,${treadTop} Q216,34 216,118 Z"
          fill="#4a4a4a" stroke="#2b2b2b" stroke-width="2"/>
    <g clip-path="url(#${uid})">
      <rect x="70"  y="${treadTop}" width="9" height="52" fill="#242424"/>
      <rect x="110" y="${treadTop}" width="9" height="52" fill="#242424"/>
      <rect x="150" y="${treadTop}" width="9" height="52" fill="#242424"/>
      <rect x="14" y="${treadTop}" width="202" height="${redH}" fill="#d92b2b" opacity=".92"/>
    </g>
    <text x="115" y="11" text-anchor="middle" font-size="13" font-weight="700"
          fill="${val <= 1.6 ? '#d92b2b' : val <= 3.0 ? '#e07b00' : '#1a8f3c'}">${val.toFixed(1)} mm</text>
  </svg>`;
}

function trStatusIcon(mm) {
  if (mm <= HS.CRIT_MM) return '<span class="tr-ico tr-ico-crit">✕</span>';
  if (mm <= HS.WARN_MM) return '<span class="tr-ico tr-ico-warn">!</span>';
  return '<span class="tr-ico tr-ico-ok">✓</span>';
}

function trWheel(title, tipo, mm) {
  const val = Number.isFinite(Number(mm)) ? Number(mm) : 0;
  return `<div class="tr-wheel">
    <div class="tr-wheel-head">${HS.escHTML(title)}</div>
    <div class="tr-wheel-body">
      <div class="tr-wheel-info">
        <div><em>Marca:</em> <span>—</span></div>
        <div><em>Dimensioni:</em> <span>${HS.escHTML(tipo && tipo !== '/R' ? tipo : '/R')}</span></div>
        <div><em>Stagione:</em> <span>—</span></div>
      </div>
      <div class="tr-wheel-side">
        ${trStatusIcon(val)}
        <div class="tr-media">Media: <b>${val.toFixed(1)}</b></div>
      </div>
    </div>
    ${trTireSVG(val)}
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
      <div class="tr-logo">🛞</div>
      <div>
        <div class="tr-brand">${HS.escHTML(off.nome)}</div>
        <div class="tr-brand-sub">Servizio pneumatici · controllo battistrada</div>
        ${off.firma ? `<div class="tr-brand-sub">${HS.escHTML(off.firma)}</div>` : ''}
      </div>
      <div class="tr-head-right">
        <div><em>Cliente:</em> ${HS.escHTML(r.cliente || '—')}</div>
        ${email ? `<div><em>Email:</em> ${HS.escHTML(email)}</div>` : ''}
        ${tel ? `<div><em>Tel:</em> ${HS.escHTML(tel)}</div>` : ''}
      </div>
    </div>

    <div class="tr-section">Veicolo</div>
    <div class="tr-veicolo">
      <div><em>Data controllo:</em> ${HS.escHTML(r.data || '—')}</div>
      <div><em>Operatore:</em> ${HS.escHTML(r.operatore || '—')}</div>
      <div><em>Targa:</em> <b>${HS.escHTML(r.targa)}</b></div>
      <div><em>Stampato il:</em> ${HS.escHTML(oggi)}</div>
    </div>

    <div class="tr-grid">
      ${trWheel('Anteriore sinistro',  r.ant_sx_tipo,  r.ant_sx_mm)}
      ${trWheel('Anteriore destro',    r.ant_dx_tipo,  r.ant_dx_mm)}
      ${trWheel('Posteriore sinistro', r.post_sx_tipo, r.post_sx_mm)}
      ${trWheel('Posteriore destro',   r.post_dx_tipo, r.post_dx_mm)}
    </div>

    <div class="tr-legend">
      <div><span class="tr-ico tr-ico-crit">✕</span> Usura critica (≤ ${HS.CRIT_MM.toFixed(1)} mm — limite legale)</div>
      <div><span class="tr-ico tr-ico-warn">!</span> Usura di attenzione (≤ ${HS.WARN_MM.toFixed(1)} mm)</div>
      <div><span class="tr-ico tr-ico-ok">✓</span> Profondità normale</div>
    </div>

    <div class="tr-deposito">
      <span class="tr-check">${r.deposito ? '☑' : '☐'}</span> <em>Pneumatici in deposito</em>
      ${r.deposito && r.posizione ? ` — posizione: <b>${HS.escHTML(r.posizione)}</b>` : ''}
    </div>

    <div class="tr-footer">
      Documento generato con HandyScan PWA (open source) a scopo informativo per il cliente.
      Non sostituisce il report ufficiale del portale Cormach / HandyScan Manager.
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
