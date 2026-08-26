/* ================================================================
   Test dell'ORIGINE DELLO SCROLL del popup "⚠️ Prima di iniziare".

   Il popup viene realmente renderizzato (localStorage pulito, nessun
   bypass del disclaimer).

   Non basta che il popup sia dentro il viewport: qui si verifica che il
   PUNTO 1 della guida sia raggiungibile e che non esistano due aree di
   scorrimento verticale concorrenti.

   Per ogni combinazione viewport x scala:
     1) dentro #app-info-overlay esiste AL PIU' UN scroll container
        verticale (due scroller annidati rendono l'inizio irraggiungibile);
     2) all'apertura ogni scroller ha scrollTop === 0;
     3) all'apertura punto1.top >= visualViewport.offsetTop;
     4) con TUTTI gli scrollTop a 0 il punto 1 e' raggiungibile;
     5) l'ultimo elemento (i pulsanti) e' raggiungibile scorrendo;
     6) tornando a scrollTop 0 il punto 1 torna visibile (andata e ritorno);
     7) il centraggio orizzontale del fix precedente resta invariato.

   ── Come eseguirlo ────────────────────────────────────────────────
   1) python3 -m http.server 8899
   2) "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        --headless=new --remote-debugging-port=9222 \
        --user-data-dir=/tmp/tirescan-test --no-first-run
   3) node test/modal-scroll-origin.test.mjs
   ================================================================ */

const PORT    = process.env.CDP_PORT || 9222;
const APP_URL = process.env.APP_URL  || 'http://localhost:8899/index.html';
const TOLL    = 2;

const VIEWPORTS = [
  [320, 600], [344, 700], [360, 640], [360, 780],
  [390, 664], [412, 800], [430, 932], [740, 360],
];
const SCALES = [1, 1.25, 1.5, 2];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
}

const MEASURE = `(() => {
  const vv = window.visualViewport;
  const ov = document.getElementById('app-info-overlay');
  if (!ov) return JSON.stringify({ err: 'popup non renderizzato' });
  const md = ov.querySelector('.rc-modal');
  if (!md) return JSON.stringify({ err: '.rc-modal assente' });
  const h3 = ov.querySelector('h3');
  // il PUNTO 1 e' il primo blocco di contenuto dopo l'intestazione
  const punto1 = md.children[1] && md.children[1].firstElementChild;
  const azioni = ov.querySelector('.rc-modal-actions');
  if (!punto1 || !azioni) return JSON.stringify({ err: 'punto 1 o azioni non trovati' });

  // tutti gli scroll container verticali dentro l'overlay, overlay incluso
  const scrollers = [];
  const considera = (el) => {
    const cs = getComputedStyle(el);
    const puoScorrere = cs.overflowY === 'auto' || cs.overflowY === 'scroll';
    if (puoScorrere && el.scrollHeight > el.clientHeight + 1) {
      scrollers.push({
        tag: el.tagName.toLowerCase(), id: el.id || '',
        cls: (el.className || '').toString().slice(0, 28),
        overflowY: cs.overflowY, maxHeight: cs.maxHeight,
        scrollTop: +el.scrollTop.toFixed(1),
        scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
        range: el.scrollHeight - el.clientHeight
      });
    }
  };
  considera(ov);
  ov.querySelectorAll('*').forEach(considera);

  const vis = (r) => r.top >= vv.offsetTop - 0.5 && r.top <= vv.offsetTop + vv.height + 0.5;

  // (3) stato all'apertura
  const p1Apertura = punto1.getBoundingClientRect();
  const scrollTopApertura = scrollers.map((s) => s.scrollTop);

  // (4) forza tutti gli scroller a 0 e ricontrolla
  const tutti = [ov, ...ov.querySelectorAll('*')].filter((el) => {
    const cs = getComputedStyle(el);
    return cs.overflowY === 'auto' || cs.overflowY === 'scroll';
  });
  tutti.forEach((el) => { el.scrollTop = 0; });
  const p1Zero = punto1.getBoundingClientRect();

  // (5) fine raggiungibile: porta ogni scroller al massimo
  tutti.forEach((el) => { el.scrollTop = el.scrollHeight; });
  const azFine = azioni.getBoundingClientRect();
  const fineRaggiungibile = azFine.bottom <= vv.offsetTop + vv.height + 0.5;

  // (6) ritorno all'inizio
  tutti.forEach((el) => { el.scrollTop = 0; });
  const p1Ritorno = punto1.getBoundingClientRect();

  // (8) il gesto reale: l'overlay e' scorso in fondo e il dito e' dentro lo
  //     scroller piu' interno, che quindi consuma la risalita. Con un solo
  //     scroller questo coincide col caso normale; con due, l'interno arriva
  //     a 0 e il punto 1 resta comunque sopra il bordo, irraggiungibile.
  tutti.forEach((el) => { el.scrollTop = el.scrollHeight; });
  const piuInterno = tutti[tutti.length - 1];   // con un solo scroller e' l'overlay
  piuInterno.scrollTop = 0;
  const p1Interno = punto1.getBoundingClientRect();
  const risalitaInterna = vis(p1Interno);
  tutti.forEach((el) => { el.scrollTop = 0; });

  // (7) orizzontale
  const or = ov.getBoundingClientRect();
  const mr = md.getBoundingClientRect();
  const cbLeft = or.left + ov.clientLeft;
  const cbRight = cbLeft + ov.clientWidth;

  return JSON.stringify({
    titolo: (h3 && h3.textContent || '').trim(),
    punto1Testo: (punto1.textContent || '').trim().slice(0, 26),
    vvTop: +vv.offsetTop.toFixed(1), vvH: +vv.height.toFixed(1), vvW: +vv.width.toFixed(1),
    nScroller: scrollers.length,
    scrollers,
    scrollTopApertura,
    p1AperturaTop: +p1Apertura.top.toFixed(1),
    p1AperturaVisibile: vis(p1Apertura),
    p1ZeroTop: +p1Zero.top.toFixed(1),
    p1ZeroVisibile: vis(p1Zero),
    p1RitornoTop: +p1Ritorno.top.toFixed(1),
    p1RitornoVisibile: vis(p1Ritorno),
    p1InternoTop: +p1Interno.top.toFixed(1),
    risalitaInterna,
    azioniBottom: +azFine.bottom.toFixed(1),
    fineRaggiungibile,
    L: +(mr.left - vv.offsetLeft).toFixed(1),
    R: +(mr.right - vv.offsetLeft).toFixed(1),
    mSx: +(mr.left - cbLeft).toFixed(1),
    mDx: +(cbRight - mr.right).toFixed(1)
  });
})()`;

const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
const tab = await res.json();
const cdp = await new Promise((ok, ko) => {
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.onopen = () => ok(new CDP(ws)); ws.onerror = ko;
});
for (const d of ['Page', 'Runtime', 'Network']) await cdp.send(d + '.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await cdp.send('Network.setBypassServiceWorker', { bypass: true });
await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
  source: 'try{localStorage.clear()}catch(e){}'
});

let pass = 0, fail = 0; const failures = [];

for (const [W, H] of VIEWPORTS) {
  for (const scale of SCALES) {
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: W, height: H, deviceScaleFactor: 1, mobile: true });
    await cdp.send('Page.navigate', { url: APP_URL });

    let apparso = false;
    for (let t = 0; t < 80 && !apparso; t++) {
      const q = await cdp.send('Runtime.evaluate', {
        expression: `!!document.querySelector('#app-info-overlay .rc-modal')`,
        returnByValue: true });
      apparso = !!q.result.value;
      if (!apparso) await sleep(100);
    }
    if (scale !== 1) await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: scale });
    await sleep(650);

    const out = await cdp.send('Runtime.evaluate', { expression: MEASURE, returnByValue: true });
    const d = JSON.parse(out.result.value);
    const errs = [];
    if (d.err) errs.push(d.err);
    else {
      if (d.titolo !== '⚠️ Prima di iniziare') errs.push(`popup sbagliato: "${d.titolo}"`);
      // (1) un solo scroll container verticale
      if (d.nScroller > 1)
        errs.push(`${d.nScroller} scroll container concorrenti: ` +
          d.scrollers.map((s) => `${s.tag}${s.cls ? '.' + s.cls.split(' ')[0] : ''}(range ${s.range})`).join(' + '));
      // (2) tutti a zero all'apertura
      const nonZero = d.scrollTopApertura.filter((v) => v !== 0);
      if (nonZero.length) errs.push(`scrollTop non nullo all'apertura: ${JSON.stringify(d.scrollTopApertura)}`);
      // (3) punto 1 non sopra il visibile all'apertura
      if (d.p1AperturaTop < d.vvTop - 0.5)
        errs.push(`punto1.top ${d.p1AperturaTop} < visualViewport.offsetTop ${d.vvTop}`);
      if (!d.p1AperturaVisibile) errs.push(`punto 1 non visibile all'apertura (top ${d.p1AperturaTop})`);
      // (4) con tutti gli scrollTop a 0 il punto 1 e' raggiungibile
      if (!d.p1ZeroVisibile)
        errs.push(`con tutti gli scrollTop a 0 il punto 1 non e' raggiungibile (top ${d.p1ZeroTop})`);
      // (5) fine raggiungibile
      if (!d.fineRaggiungibile) errs.push(`fine non raggiungibile (azioni bottom ${d.azioniBottom})`);
      // (6) ritorno all'inizio
      if (!d.p1RitornoVisibile)
        errs.push(`dopo andata e ritorno il punto 1 non torna visibile (top ${d.p1RitornoTop})`);
      // (8) risalita agendo solo sullo scroller interno (gesto reale)
      if (!d.risalitaInterna)
        errs.push(`risalendo col solo scroller interno il punto 1 resta irraggiungibile (top ${d.p1InternoTop})`);
      // (7) orizzontale invariato
      if (d.L < 0)                        errs.push(`left ${d.L} < 0`);
      if (d.R > d.vvW)                    errs.push(`right ${d.R} > vv.width ${d.vvW}`);
      if (Math.abs(d.mSx - d.mDx) > TOLL) errs.push(`|mSx-mDx| = ${Math.abs(d.mSx - d.mDx).toFixed(1)} > ${TOLL}`);
    }

    const tag = `${String(W).padStart(3)}x${String(H).padEnd(3)} scala ${String(scale).padEnd(4)}`;
    if (errs.length) {
      fail++; failures.push(tag + ' :: ' + errs.join(' | '));
      console.log(`FAIL  ${tag} -> ${errs.join(' | ')}`);
    } else {
      pass++;
      console.log(`ok    ${tag} scroller=${d.nScroller}` +
        ` punto1@apertura=${String(d.p1AperturaTop).padStart(6)}` +
        ` fine=${d.fineRaggiungibile ? 'ok ' : 'NO '}` +
        ` ritorno=${d.p1RitornoVisibile ? 'ok ' : 'NO '}` +
        ` sx=${String(d.mSx).padStart(4)} dx=${String(d.mDx).padStart(4)}`);
    }
  }
}

console.log(`\n===== ${pass} passati, ${fail} falliti su ${pass + fail} =====`);
failures.forEach((f) => console.log('  - ' + f));

try { await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`); } catch { /* noop */ }
process.exit(fail ? 1 : 0);
