/* ================================================================
   HandyScan  |  js/appointments.js  — Agenda Appuntamenti v1.0
   Pianifica appuntamenti per targa/cliente e li aggiunge al
   calendario del dispositivo tramite file .ics (iOS/Android/PC).
   Open Source — github.com/pezzaliapp/TireScan-Pro
   ================================================================ */
'use strict';

const APPT_KEY = 'handyscan_appointments';
let appts = [];

/* ── Storage ── */
function apptLoad() {
  try { appts = JSON.parse(localStorage.getItem(APPT_KEY) || '[]'); } catch { appts = []; }
}
function apptSave() { localStorage.setItem(APPT_KEY, JSON.stringify(appts)); }

/* ── CRUD ── */
function apptAdd(a) {
  a.id = a.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  a.createdAt = new Date().toISOString();
  appts.push(a);
  apptSave();
  return a;
}
function apptRemove(id) { appts = appts.filter(a => a.id !== id); apptSave(); }
function apptUpcomingFirst() {
  return appts.slice().sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

/* ── Costruzione .ics ── */
function pad(n) { return String(n).padStart(2, '0'); }
function icsDateTime(dateStr, timeStr) {
  // dateStr=YYYY-MM-DD  timeStr=HH:MM  → AAAAMMDDTHHMMSS (ora locale "floating")
  const [Y, M, D] = dateStr.split('-').map(Number);
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  return `${Y}${pad(M)}${pad(D)}T${pad(h)}${pad(m)}00`;
}
function addMinutes(dateStr, timeStr, mins) {
  const [Y, M, D] = dateStr.split('-').map(Number);
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  const d = new Date(Y, M - 1, D, h, m + (mins || 30));
  return icsDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, `${pad(d.getHours())}:${pad(d.getMinutes())}`);
}
function icsEscape(s) { return String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }

function buildICS(a) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const summary = `Pneumatici ${a.targa}${a.cliente ? ' · ' + a.cliente : ''}`;
  const desc = [a.note, a.cliente ? 'Cliente: ' + a.cliente : '', a.targa ? 'Targa: ' + a.targa : '']
    .filter(Boolean).join('\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HandyScan//Cormach//IT', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${a.id}@handyscan`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsDateTime(a.date, a.time)}`,
    `DTEND:${addMinutes(a.date, a.time, a.dur)}`,
    `SUMMARY:${icsEscape(summary)}`,
    desc ? `DESCRIPTION:${icsEscape(desc)}` : '',
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(summary)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
}

function downloadICS(a) {
  const blob = new Blob([buildICS(a)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appuntamento_${a.targa}_${a.date}.ics`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ── Modale creazione ──
   plates: array opzionale di targhe del cliente. Se >1 mostra una select. */
function showApptModal(targa = '', cliente = '', plates = null) {
  // se non passati, prova a recuperarli dall'ultima scansione
  if (!cliente && targa && window.HS) {
    const r = HS.getRecords().find(x => x.targa === targa);
    if (r) cliente = r.cliente || '';
  }
  const list = Array.isArray(plates) ? plates.filter(Boolean) : [];
  if (!targa && list.length === 1) targa = list[0];
  const today = new Date();
  const def = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const targaField = list.length > 1
    ? `<select id="ap-targa" class="form-input">
         ${list.map(t => `<option value="${HS.escHTML(t)}"${t === targa ? ' selected' : ''}>${HS.escHTML(t)}</option>`).join('')}
       </select>`
    : `<input id="ap-targa" class="form-input" type="text" value="${HS.escHTML(targa)}" placeholder="es. AB123CD">`;

  const m = document.createElement('div');
  m.className = 'rc-modal-overlay';
  m.innerHTML = `<div class="rc-modal">
    <div class="rc-modal-head"><h3>📅 Nuovo appuntamento</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.rc-modal-overlay').remove()">✕</button></div>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">
      <div class="form-grid">
        <div class="form-group"><label class="form-label">Targa${list.length > 1 ? ' (scegli)' : ''}</label>${targaField}</div>
        <div class="form-group"><label class="form-label">Cliente</label><input id="ap-cliente" class="form-input" type="text" value="${HS.escHTML(cliente)}"></div>
        <div class="form-group"><label class="form-label">Data</label><input id="ap-date" class="form-input" type="date" value="${def}"></div>
        <div class="form-group"><label class="form-label">Ora</label><input id="ap-time" class="form-input" type="time" value="09:00"></div>
        <div class="form-group"><label class="form-label">Durata (min)</label><input id="ap-dur" class="form-input" type="number" min="15" step="15" value="30"></div>
      </div>
      <div class="form-group"><label class="form-label">Note</label><input id="ap-note" class="form-input" type="text" placeholder="es. cambio gomme stagionale, deposito 521…"></div>
    </div>
    <div class="rc-modal-actions">
      <button class="btn btn-primary" onclick="apptSaveFromModal(true)">💾 Salva e aggiungi al calendario</button>
      <button class="btn btn-ghost" onclick="apptSaveFromModal(false)">Salva soltanto</button>
      <button class="btn btn-ghost" onclick="this.closest('.rc-modal-overlay').remove()">Annulla</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  setTimeout(() => document.getElementById('ap-cliente')?.focus(), 80);
}

/* ── Rendering vista Agenda ── */
function renderAppointmentsView() {
  const el = document.getElementById('appts-container');
  if (!el) return;
  const list = apptUpcomingFirst();
  const todayISO = new Date().toISOString().slice(0, 10);

  const head = `<div class="appt-toolbar">
      <button class="btn btn-primary btn-sm" onclick="apptNew()">＋ Nuovo appuntamento</button>
    </div>`;

  if (!list.length) {
    el.innerHTML = head + `<div class="empty-state"><div class="ei">📅</div>
      <p>Nessun appuntamento in agenda.<br>Creane uno dai <strong>Richiami</strong>, dall'<strong>anagrafica</strong> o col pulsante qui sopra.</p></div>`;
    return;
  }

  const rows = list.map(a => {
    const past = `${a.date}T${a.time || '00:00'}` < `${todayISO}T00:00`;
    const d = a.date.split('-'); const dLabel = `${d[2]}/${d[1]}/${d[0]}`;
    return `<div class="appt-card${past ? ' appt-past' : ''}">
      <div class="appt-when">
        <div class="appt-date">${dLabel}</div>
        <div class="appt-time">${HS.escHTML(a.time || '')}</div>
      </div>
      <div class="appt-body">
        <div class="appt-title"><span class="targa-chip" style="font-size:12px">${HS.escHTML(a.targa || '—')}</span> ${HS.escHTML(a.cliente || '')}</div>
        ${a.note ? `<div class="appt-note">${HS.escHTML(a.note)}</div>` : ''}
        <div class="appt-meta">${a.dur || 30} min${past ? ' · passato' : ''}</div>
      </div>
      <div class="appt-actions">
        <button class="btn btn-ghost btn-xs" onclick="apptDownload('${a.id}')" title="Aggiungi al calendario">📅 .ics</button>
        <button class="btn btn-ghost btn-xs" onclick="apptDelete('${a.id}')" title="Elimina">🗑</button>
      </div>
    </div>`;
  }).join('');

  // badge nav
  const upcoming = list.filter(a => `${a.date}T${a.time || '00:00'}` >= `${todayISO}T00:00`).length;
  const badge = document.getElementById('appt-badge');
  if (badge) { badge.textContent = upcoming; badge.style.display = upcoming ? 'inline-flex' : 'none'; }

  el.innerHTML = head + rows;
}

/* ── Globals ── */
function initApptGlobals() {
  window.apptNew = (t = '', c = '') => showApptModal(t, c);
  window.apptSaveFromModal = (toCal) => {
    const g = id => (document.getElementById(id)?.value || '').trim();
    const targa = g('ap-targa').toUpperCase();
    const date = g('ap-date');
    if (!date) { toast('❌ Inserisci una data', 't-err'); return; }
    const a = apptAdd({
      targa, cliente: g('ap-cliente'), date, time: g('ap-time') || '09:00',
      dur: parseInt(g('ap-dur')) || 30, note: g('ap-note')
    });
    document.querySelector('.rc-modal-overlay')?.remove();
    if (toCal) downloadICS(a);
    renderAppointmentsView();
    toast('✅ Appuntamento salvato', 't-ok');
  };
  window.apptDownload = (id) => { const a = appts.find(x => x.id === id); if (a) downloadICS(a); };
  window.apptDelete = (id) => {
    if (!confirm('Eliminare questo appuntamento?')) return;
    apptRemove(id); renderAppointmentsView(); toast('🗑 Eliminato', '');
  };
}

function initAppointments() {
  apptLoad();
  initApptGlobals();
}

window.APPT = {
  init: initAppointments,
  renderView: renderAppointmentsView,
  open: showApptModal,
  add: apptAdd,
  getAll: () => appts,
};
