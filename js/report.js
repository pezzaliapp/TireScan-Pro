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

/* ── Grafica battistrada SVG (v2) ──
   Battistrada realistico: 5 coste con lamelle, 4 scanalature, spalle
   in ombra. La tinta di usura compare SOLO sotto soglia (ambra per
   attenzione, rossa per critico) e la sua altezza cresce con l'usura;
   una gomma in buono stato resta pulita, come nel report ufficiale.
   NB: il portale esporta un solo valore per gomma (il minimo), quindi
   la tinta copre la fascia superiore dell'intero battistrada e non le
   singole scanalature come nel CarReport del profilometro.           */
function trTireSVG(mm) {
  const val  = Number.isFinite(Number(mm)) ? Number(mm) : 0;
  const crit = val <= HS.CRIT_MM, warn = !crit && val <= HS.WARN_MM;
  const tcol = crit ? '#d93025' : '#f0a020';
  const wear = Math.max(0, Math.min(1, 1 - val / 8));
  const overlayH = (crit || warn) ? Math.max(9, Math.round(46 * wear)) : 0;
  const vcol = crit ? '#d93025' : warn ? '#e07b00' : '#1a8f3c';
  const uid  = 'tr' + Math.random().toString(36).slice(2, 8);
  const body = 'M10,118 C10,78 18,50 46,40 C80,30 196,30 230,40 C258,50 266,78 266,118 Z';

  const grooves = [74, 116, 158, 200].map(g =>
    `<rect x="${g}" y="36" width="10" height="82" rx="3" fill="#151515"/>` +
    `<rect x="${g + 2}" y="36" width="3" height="82" fill="#0b0b0b"/>`).join('');

  let sipes = '';
  [[24, 74], [84, 116], [126, 158], [168, 200], [210, 252]].forEach(([x1, x2]) => {
    for (let y = 50; y < 112; y += 12)
      sipes += `<path d="M${x1 + 3},${y} Q${(x1 + x2) / 2},${y + 2.5} ${x2 - 3},${y}" stroke="#232323" stroke-width="1.5" fill="none" opacity=".85"/>`;
  });

  const overlay = overlayH
    ? `<rect x="10" y="30" width="256" height="${overlayH}" fill="${tcol}" opacity=".7"/>` : '';

  return `<svg viewBox="0 0 276 130" class="tr-tire" role="img" aria-label="${val.toFixed(1)} mm">
    <defs>
      <linearGradient id="g${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#808080"/><stop offset=".4" stop-color="#4e4e4e"/><stop offset="1" stop-color="#282828"/>
      </linearGradient>
      <clipPath id="c${uid}"><path d="${body}"/></clipPath>
    </defs>
    <text x="138" y="16" text-anchor="middle" font-size="15" font-weight="700" fill="${vcol}">${val.toFixed(1)}</text>
    <path d="${body}" fill="url(#g${uid})" stroke="#1a1a1a" stroke-width="2"/>
    <g clip-path="url(#c${uid})">
      <path d="M10,118 C10,78 18,50 46,40" stroke="#909090" stroke-width="8" fill="none" opacity=".45"/>
      <path d="M230,40 C258,50 266,78 266,118" stroke="#141414" stroke-width="10" fill="none" opacity=".5"/>
      ${grooves}${sipes}${overlay}
    </g>
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

    <div class="tr-note">La grafica evidenzia l'usura complessiva della gomma (valore minimo rilevato). Le misure delle singole scanalature sono disponibili nel report del portale Cormach.</div>

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
