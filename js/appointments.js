/* ================================================================
   TireScan-Pro  |  js/appointments.js  — Agenda Appuntamenti v2.0
   - Calendario mensile interno (vista mese + vista elenco)
   - Creazione, modifica ed eliminazione appuntamenti
   - Export .ics conforme RFC 5545 (VTIMEZONE Europe/Rome,
     line folding, METHOD:PUBLISH)
   - Condivisione con altre app: Web Share API (file .ics),
     Google Calendar, Outlook, download singolo o agenda completa
   Open Source — github.com/pezzaliapp/TireScan-Pro
   ================================================================ */
'use strict';

const APPT_KEY = 'handyscan_appointments';
const APPT_TZ  = 'Europe/Rome';
let appts = [];

/* Stato vista calendario */
let apptViewMode = 'cal';                    // 'cal' | 'list'
let calCursor = new Date();                  // mese visualizzato
calCursor.setDate(1);

/* ── Storage ── */
function apptLoad() {
  try { appts = JSON.parse(localStorage.getItem(APPT_KEY) || '[]'); } catch { appts = []; }
  if (!Array.isArray(appts)) appts = [];
}
function apptSave() { localStorage.setItem(APPT_KEY, JSON.stringify(appts)); apptUpdateBadge(); }

/* ── CRUD ── */
function apptAdd(a) {
  a.id = a.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  a.createdAt = new Date().toISOString();
  appts.push(a);
  apptSave();
  return a;
}
function apptUpdate(id, patch) {
  const i = appts.findIndex(x => x.id === id);
  if (i < 0) return null;
  appts[i] = { ...appts[i], ...patch, id, updatedAt: new Date().toISOString() };
  apptSave();
  return appts[i];
}
function apptRemove(id) { appts = appts.filter(a => a.id !== id); apptSave(); }
function apptSorted() {
  return appts.slice().sort((a, b) =>
    `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));
}
function apptForDate(iso) { return apptSorted().filter(a => a.date === iso); }

/* ── Date utils ── */
function pad(n) { return String(n).padStart(2, '0'); }
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayISO() { return isoDate(new Date()); }
function isPastAppt(a) {
  return `${a.date}T${a.time || '00:00'}` < `${todayISO()}T00:00`;
}

/* ================================================================
   COSTRUZIONE .ics — RFC 5545
   ================================================================ */
function icsDateTime(dateStr, timeStr) {
  const [Y, M, D] = dateStr.split('-').map(Number);
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  return `${Y}${pad(M)}${pad(D)}T${pad(h)}${pad(m)}00`;
}
function addMinutes(dateStr, timeStr, mins) {
  const [Y, M, D] = dateStr.split('-').map(Number);
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  const d = new Date(Y, M - 1, D, h, m + (mins || 30));
  return icsDateTime(isoDate(d), `${pad(d.getHours())}:${pad(d.getMinutes())}`);
}
function icsEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n');
}
/* Line folding: righe max 75 ottetti, continuazione con CRLF+spazio */
function icsFold(line) {
  const bytes = s => new TextEncoder().encode(s).length;
  if (bytes(line) <= 75) return line;
  const out = [];
  let cur = '';
  for (const ch of line) {
    if (bytes(cur + ch) > (out.length ? 74 : 75)) { out.push(cur); cur = ch; }
    else cur += ch;
  }
  if (cur) out.push(cur);
  return out.map((l, i) => (i ? ' ' + l : l)).join('\r\n');
}
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${APPT_TZ}`,
  'X-LIC-LOCATION:' + APPT_TZ,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST',
  'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET',
  'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE'
];

function apptSummary(a) {
  return `Pneumatici ${a.targa || ''}${a.cliente ? (a.targa ? ' · ' : '') + a.cliente : ''}`.trim() || 'Appuntamento officina';
}
function apptLocation() {
  try {
    const cfg = JSON.parse(localStorage.getItem('handyscan_rc_config') || '{}');
    return cfg.officina || '';
  } catch { return ''; }
}

function buildVEVENT(a) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const summary = apptSummary(a);
  const loc = apptLocation();
  const desc = [a.note, a.cliente ? 'Cliente: ' + a.cliente : '', a.targa ? 'Targa: ' + a.targa : '']
    .filter(Boolean).join('\n');
  return [
    'BEGIN:VEVENT',
    `UID:${a.id}@tirescanpro`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${APPT_TZ}:${icsDateTime(a.date, a.time)}`,
    `DTEND;TZID=${APPT_TZ}:${addMinutes(a.date, a.time, a.dur)}`,
    `SUMMARY:${icsEscape(summary)}`,
    desc ? `DESCRIPTION:${icsEscape(desc)}` : '',
    loc ? `LOCATION:${icsEscape(loc)}` : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(summary)}`, 'END:VALARM',
    'END:VEVENT'
  ].filter(Boolean);
}

function buildICS(list, calName) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//TireScan-Pro//IT',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(calName || 'TireScan-Pro Agenda')}`,
    `X-WR-TIMEZONE:${APPT_TZ}`,
    ...VTIMEZONE,
    ...list.flatMap(buildVEVENT),
    'END:VCALENDAR'
  ];
  return lines.map(icsFold).join('\r\n');
}

/* ── Download / Condivisione ── */
function icsBlob(list, calName) {
  return new Blob([buildICS(list, calName)], { type: 'text/calendar;charset=utf-8' });
}
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function downloadICS(a) {
  triggerDownload(icsBlob([a], apptSummary(a)), `appuntamento_${(a.targa || 'officina')}_${a.date}.ics`);
}
function downloadAgendaICS() {
  const list = apptSorted();
  if (!list.length) { toast('❌ Nessun appuntamento da esportare', 't-err'); return; }
  triggerDownload(icsBlob(list), `tirescanpro_agenda_${todayISO()}.ics`);
  toast(`📅 Agenda esportata (${list.length} eventi)`, 't-ok');
}

/* Web Share API — condivide il file .ics con altre app (calendario,
   email, WhatsApp…). Fallback: download del file.                  */
async function shareICS(list, calName, filename) {
  const blob = icsBlob(list, calName);
  const file = new File([blob], filename, { type: 'text/calendar' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: calName || 'TireScan-Pro Agenda' });
      return;
    } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  triggerDownload(blob, filename);
  toast('⬇ File .ics scaricato: aprilo per aggiungerlo al calendario', '');
}
function shareAppt(id) {
  const a = appts.find(x => x.id === id); if (!a) return;
  shareICS([a], apptSummary(a), `appuntamento_${(a.targa || 'officina')}_${a.date}.ics`);
}
function shareAgenda() {
  const list = apptSorted();
  if (!list.length) { toast('❌ Nessun appuntamento da condividere', 't-err'); return; }
  shareICS(list, 'TireScan-Pro Agenda', `tirescanpro_agenda_${todayISO()}.ics`);
}

/* Link diretti Google Calendar / Outlook per il singolo evento */
function gcalLink(a) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: apptSummary(a),
    dates: `${icsDateTime(a.date, a.time)}/${addMinutes(a.date, a.time, a.dur)}`,
    ctz: APPT_TZ,
    details: [a.note, a.cliente ? 'Cliente: ' + a.cliente : '', a.targa ? 'Targa: ' + a.targa : ''].filter(Boolean).join('\n'),
    location: apptLocation(),
  });
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}
function outlookLink(a) {
  const iso = (dt) => `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T${dt.slice(9, 11)}:${dt.slice(11, 13)}:00`;
  const p = new URLSearchParams({
    path: '/calendar/action/compose', rru: 'addevent',
    subject: apptSummary(a),
    startdt: iso(icsDateTime(a.date, a.time)),
    enddt: iso(addMinutes(a.date, a.time, a.dur)),
    body: [a.note, a.cliente ? 'Cliente: ' + a.cliente : '', a.targa ? 'Targa: ' + a.targa : ''].filter(Boolean).join('\n'),
    location: apptLocation(),
  });
  return 'https://outlook.live.com/calendar/0/deeplink/compose?' + p.toString();
}

/* ================================================================
   MODALE crea / modifica
   ================================================================ */
function showApptModal(targa = '', cliente = '', plates = null, presetDate = '', editId = null) {
  const editing = editId ? appts.find(x => x.id === editId) : null;
  if (editing) {
    targa = editing.targa || ''; cliente = editing.cliente || '';
  } else if (!cliente && targa && window.HS) {
    const r = HS.getRecords().find(x => x.targa === targa);
    if (r) cliente = r.cliente || '';
  }
  const list = Array.isArray(plates) ? plates.filter(Boolean) : [];
  if (!targa && list.length === 1) targa = list[0];
  const defDate = editing ? editing.date : (presetDate || todayISO());
  const defTime = editing ? (editing.time || '09:00') : '09:00';
  const defDur  = editing ? (editing.dur || 30) : 30;
  const defNote = editing ? (editing.note || '') : '';

  const targaField = list.length > 1
    ? `<select id="ap-targa" class="form-input">
         ${list.map(t => `<option value="${HS.escHTML(t)}"${t === targa ? ' selected' : ''}>${HS.escHTML(t)}</option>`).join('')}
       </select>`
    : `<input id="ap-targa" class="form-input" type="text" value="${HS.escHTML(targa)}" placeholder="es. AB123CD">`;

  const m = document.createElement('div');
  m.className = 'rc-modal-overlay';
  m.innerHTML = `<div class="rc-modal">
    <div class="rc-modal-head"><h3>${editing ? '✎ Modifica appuntamento' : '📅 Nuovo appuntamento'}</h3>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.rc-modal-overlay').remove()">✕</button></div>
    <input type="hidden" id="ap-edit-id" value="${editing ? HS.escHTML(editing.id) : ''}">
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">
      <div class="form-grid">
        <div class="form-group"><label class="form-label">Targa${list.length > 1 ? ' (scegli)' : ''}</label>${targaField}</div>
        <div class="form-group"><label class="form-label">Cliente</label><input id="ap-cliente" class="form-input" type="text" value="${HS.escHTML(cliente)}"></div>
        <div class="form-group"><label class="form-label">Data</label><input id="ap-date" class="form-input" type="date" value="${defDate}"></div>
        <div class="form-group"><label class="form-label">Ora</label><input id="ap-time" class="form-input" type="time" value="${defTime}"></div>
        <div class="form-group"><label class="form-label">Durata (min)</label><input id="ap-dur" class="form-input" type="number" min="15" step="15" value="${defDur}"></div>
      </div>
      <div class="form-group"><label class="form-label">Note</label><input id="ap-note" class="form-input" type="text" value="${HS.escHTML(defNote)}" placeholder="es. cambio gomme stagionale, deposito 521…"></div>
      <div id="ap-conflict" class="ap-conflict" style="display:none"></div>
    </div>
    <div class="rc-modal-actions">
      ${editing ? `<button class="btn btn-danger btn-sm" style="margin-right:auto" onclick="apptDelete('${HS.escHTML(editing.id)}', true)">🗑 Elimina</button>` : ''}
      <button class="btn btn-primary" onclick="apptSaveFromModal(true)">💾 Salva e aggiungi al calendario</button>
      <button class="btn btn-ghost" onclick="apptSaveFromModal(false)">Salva soltanto</button>
      <button class="btn btn-ghost" onclick="this.closest('.rc-modal-overlay').remove()">Annulla</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  ['ap-date', 'ap-time', 'ap-dur'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', apptCheckConflict));
  apptCheckConflict();
  setTimeout(() => document.getElementById('ap-cliente')?.focus(), 80);
}

/* Avviso sovrapposizione con altri appuntamenti dello stesso giorno */
function apptCheckConflict() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const box = document.getElementById('ap-conflict');
  if (!box) return;
  const date = g('ap-date'), time = g('ap-time') || '09:00';
  const dur = parseInt(g('ap-dur')) || 30;
  const editId = g('ap-edit-id');
  if (!date) { box.style.display = 'none'; return; }
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const s1 = toMin(time), e1 = s1 + dur;
  const clash = apptForDate(date).filter(a => {
    if (a.id === editId) return false;
    const s2 = toMin(a.time || '09:00'), e2 = s2 + (a.dur || 30);
    return s1 < e2 && s2 < e1;
  });
  if (clash.length) {
    box.style.display = '';
    box.innerHTML = `⚠️ Sovrapposizione con: ${clash.map(a =>
      `<strong>${HS.escHTML(a.time || '')}</strong> ${HS.escHTML(a.targa || a.cliente || '')}`).join(' · ')}`;
  } else box.style.display = 'none';
}

/* ================================================================
   RENDERING — vista Agenda (calendario / elenco)
   ================================================================ */
const MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DOW = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

function apptUpdateBadge() {
  const t0 = `${todayISO()}T00:00`;
  const upcoming = appts.filter(a => `${a.date}T${a.time || '00:00'}` >= t0).length;
  const badge = document.getElementById('appt-badge');
  if (badge) { badge.textContent = upcoming; badge.style.display = upcoming ? 'inline-flex' : 'none'; }
}

function renderAppointmentsView() {
  const el = document.getElementById('appts-container');
  if (!el) return;
  apptUpdateBadge();

  const head = `<div class="appt-toolbar">
      <button class="btn btn-primary btn-sm" onclick="apptNew()">＋ Nuovo appuntamento</button>
      <div class="cal-view-toggle">
        <button class="btn btn-ghost btn-sm ${apptViewMode === 'cal' ? 'active' : ''}" onclick="apptSetView('cal')">🗓 Mese</button>
        <button class="btn btn-ghost btn-sm ${apptViewMode === 'list' ? 'active' : ''}" onclick="apptSetView('list')">☰ Elenco</button>
      </div>
      <span style="flex:1"></span>
      <button class="btn btn-ghost btn-sm" onclick="apptShareAgenda()" title="Condividi l'agenda con altre app (calendario, email, WhatsApp)">📤 Condividi agenda</button>
      <button class="btn btn-ghost btn-sm" onclick="apptExportAgenda()" title="Scarica tutta l'agenda in formato .ics (importabile in Google Calendar, Apple Calendar, Outlook)">⬇ Esporta .ics</button>
    </div>`;

  el.innerHTML = head + (apptViewMode === 'cal' ? renderCalendarHTML() : renderListHTML());
}

/* ── Vista elenco ── */
function renderListHTML() {
  const list = apptSorted();
  if (!list.length) {
    return `<div class="empty-state"><div class="ei">📅</div>
      <p>Nessun appuntamento in agenda.<br>Creane uno dai <strong>Richiami</strong>, dall'<strong>anagrafica</strong>, dal <strong>calendario</strong> o col pulsante qui sopra.</p></div>`;
  }
  return list.map(a => {
    const past = isPastAppt(a);
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
        <button class="btn btn-ghost btn-xs" onclick="apptEdit('${a.id}')" title="Modifica">✎</button>
        <button class="btn btn-ghost btn-xs" onclick="apptShare('${a.id}')" title="Condividi / aggiungi al calendario">📤</button>
        <button class="btn btn-ghost btn-xs" onclick="apptDownload('${a.id}')" title="Scarica .ics">📅</button>
        <a class="btn btn-ghost btn-xs" href="${gcalLink(a)}" target="_blank" rel="noopener" title="Apri in Google Calendar">🗓 G</a>
        <button class="btn btn-ghost btn-xs" onclick="apptDelete('${a.id}')" title="Elimina">🗑</button>
      </div>
    </div>`;
  }).join('');
}

/* ── Vista calendario mensile ── */
function renderCalendarHTML() {
  const Y = calCursor.getFullYear(), M = calCursor.getMonth();
  const first = new Date(Y, M, 1);
  // Lunedì = inizio settimana
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(Y, M, 1 - startOffset);
  const tISO = todayISO();

  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const iso = isoDate(d);
    const inMonth = d.getMonth() === M;
    const isToday = iso === tISO;
    const dayAppts = apptForDate(iso);
    const chips = dayAppts.slice(0, 3).map(a =>
      `<div class="cal-chip${isPastAppt(a) ? ' cal-chip-past' : ''}" onclick="event.stopPropagation();apptEdit('${a.id}')" title="${HS.escHTML(`${a.time || ''} ${a.targa || ''} ${a.cliente || ''}`.trim())}">
        <span class="cal-chip-time">${HS.escHTML(a.time || '')}</span> ${HS.escHTML(a.targa || a.cliente || '•')}
      </div>`).join('');
    const more = dayAppts.length > 3 ? `<div class="cal-more">+${dayAppts.length - 3} altri</div>` : '';
    cells += `<div class="cal-cell${inMonth ? '' : ' cal-out'}${isToday ? ' cal-today' : ''}" onclick="apptNewOnDate('${iso}')" title="Nuovo appuntamento il ${iso.split('-').reverse().join('/')}">
      <div class="cal-daynum">${d.getDate()}</div>${chips}${more}
    </div>`;
  }

  return `<div class="cal-wrap">
    <div class="cal-header">
      <button class="btn btn-ghost btn-sm" onclick="apptCalNav(-1)" title="Mese precedente">‹</button>
      <div class="cal-title">${MONTH_NAMES[M]} ${Y}</div>
      <button class="btn btn-ghost btn-sm" onclick="apptCalNav(1)" title="Mese successivo">›</button>
      <button class="btn btn-ghost btn-sm" onclick="apptCalToday()">Oggi</button>
    </div>
    <div class="cal-dow">${DOW.map(d => `<div>${d}</div>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
    <div class="cal-hint">Clicca su un giorno per creare un appuntamento · clicca su un appuntamento per modificarlo</div>
  </div>`;
}

/* ================================================================
   Globals (chiamate dagli onclick inline)
   ================================================================ */
function initApptGlobals() {
  window.apptNew = (t = '', c = '', plates = null) => showApptModal(t, c, plates);
  window.apptNewOnDate = (iso) => showApptModal('', '', null, iso);
  window.apptEdit = (id) => showApptModal('', '', null, '', id);
  window.apptSetView = (mode) => { apptViewMode = mode; renderAppointmentsView(); };
  window.apptCalNav = (dir) => { calCursor.setMonth(calCursor.getMonth() + dir); renderAppointmentsView(); };
  window.apptCalToday = () => { calCursor = new Date(); calCursor.setDate(1); renderAppointmentsView(); };
  window.apptShare = shareAppt;
  window.apptShareAgenda = shareAgenda;
  window.apptExportAgenda = downloadAgendaICS;

  window.apptSaveFromModal = (toCal) => {
    const g = id => (document.getElementById(id)?.value || '').trim();
    const targa = g('ap-targa').toUpperCase();
    const date = g('ap-date');
    if (!date) { toast('❌ Inserisci una data', 't-err'); return; }
    const payload = {
      targa, cliente: g('ap-cliente'), date, time: g('ap-time') || '09:00',
      dur: parseInt(g('ap-dur')) || 30, note: g('ap-note')
    };
    const editId = g('ap-edit-id');
    const a = editId ? apptUpdate(editId, payload) : apptAdd(payload);
    document.querySelector('.rc-modal-overlay')?.remove();
    if (a) {
      // porta il calendario sul mese dell'appuntamento
      const [yy, mm] = date.split('-').map(Number);
      calCursor = new Date(yy, mm - 1, 1);
      if (toCal) shareICS([a], apptSummary(a), `appuntamento_${(a.targa || 'officina')}_${a.date}.ics`);
      renderAppointmentsView();
      toast(editId ? '✅ Appuntamento aggiornato' : '✅ Appuntamento salvato', 't-ok');
    }
  };
  window.apptDownload = (id) => { const a = appts.find(x => x.id === id); if (a) downloadICS(a); };
  window.apptDelete = (id, fromModal = false) => {
    if (!confirm('Eliminare questo appuntamento?')) return;
    apptRemove(id);
    if (fromModal) document.querySelector('.rc-modal-overlay')?.remove();
    renderAppointmentsView(); toast('🗑 Eliminato', '');
  };
}

function initAppointments() {
  apptLoad();
  initApptGlobals();
  apptUpdateBadge();
}

window.APPT = {
  init: initAppointments,
  renderView: renderAppointmentsView,
  open: showApptModal,
  add: apptAdd,
  update: apptUpdate,
  remove: apptRemove,
  exportAll: downloadAgendaICS,
  shareAll: shareAgenda,
  getAll: () => appts,
};
