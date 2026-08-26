/* ================================================================
   Test di centraggio del popup "⚠️ Prima di iniziare" rispetto al
   VISUAL VIEWPORT.

   Il criterio NON e' document.scrollWidth == innerWidth: quei valori
   si riferiscono al layout viewport e restano "sani" anche quando il
   popup e' fuori schermo. Il criterio e' geometrico:

     popup.left  >= 0
     popup.right <= visualViewport.width
     |margineSinistro - margineDestro| <= 2px

   Il disclaimer NON viene bypassato via localStorage: il gate viene
   realmente renderizzato in ogni caso di prova.

   ── Come eseguirlo ────────────────────────────────────────────────
   1) servire la cartella del progetto, es.:
        python3 -m http.server 8899
   2) avviare Chrome headless con il debug remoto:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
          --headless=new --remote-debugging-port=9222 \
          --user-data-dir=/tmp/tirescan-test --no-first-run
   3) node test/modal-centering.test.mjs

   Variabili opzionali: APP_URL (default http://localhost:8899/index.html),
   CDP_PORT (default 9222). Usa solo moduli built-in di Node (>= 22).
   ================================================================ */

const PORT     = process.env.CDP_PORT || 9222;
const APP_URL  = process.env.APP_URL  || 'http://localhost:8899/index.html';
const TOLL     = 2;                       // px di asimmetria ammessi

const WIDTHS = [320, 344, 360, 390, 412, 430];
const CASES  = [
  { scale: 1,    pan: 0,   nome: 'scala 1 (visual == layout)' },
  { scale: 1.25, pan: 0,   nome: 'scala 1.25' },
  { scale: 1.5,  pan: 0,   nome: 'scala 1.5' },
  { scale: 2,    pan: 0,   nome: 'scala 2' },
  { scale: 2,    pan: 150, nome: 'scala 2 + pan orizzontale' },
  { scale: 3,    pan: 0,   nome: 'scala 3' },
];

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
  const r  = md.getBoundingClientRect();
  const left  = r.left  - vv.offsetLeft;      // contenimento: relativo al
  const right = r.right - vv.offsetLeft;      // VISUAL viewport
  // La SIMMETRIA si misura sul content box dell'overlay: clientWidth esclude
  // la scrollbar classica, che e' UI visibile e non spazio sprecato. Su
  // Android/iOS le scrollbar sono overlay e i due riferimenti coincidono.
  // (stessa convenzione di modal-vertical e modal-scroll-origin)
  const orr = ov.getBoundingClientRect();
  const cbLeft  = orr.left + ov.clientLeft;
  const cbRight = cbLeft + ov.clientWidth;
  return JSON.stringify({
    titolo: (h3 && h3.textContent || '').trim(),
    vvWidth: +vv.width.toFixed(1),
    vvOffsetLeft: +vv.offsetLeft.toFixed(1),
    vvScale: +vv.scale.toFixed(3),
    clientWidth: document.documentElement.clientWidth,
    overlayW: +ov.getBoundingClientRect().width.toFixed(1),
    left: +left.toFixed(1),
    right: +right.toFixed(1),
    mSx: +(r.left - cbLeft).toFixed(1),
    mDx: +(cbRight - r.right).toFixed(1),
    hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    topCut: +(r.top - ov.getBoundingClientRect().top + ov.scrollTop).toFixed(1)
  });
})()`;

const res  = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
const tab  = await res.json();
const cdp  = await new Promise((ok, ko) => {
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.onopen = () => ok(new CDP(ws)); ws.onerror = ko;
});
for (const d of ['Page', 'Runtime', 'Network']) await cdp.send(d + '.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await cdp.send('Network.setBypassServiceWorker', { bypass: true });
// localStorage pulito => il gate compare davvero (non lo si bypassa)
await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
  source: 'try{localStorage.clear()}catch(e){}'
});

let pass = 0, fail = 0; const failures = [];

for (const W of WIDTHS) {
  for (const c of CASES) {
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: W, height: 780, deviceScaleFactor: 1, mobile: true });
    await cdp.send('Page.navigate', { url: APP_URL });

    // attesa attiva del gate (showAppInfo(true) parte 300ms dopo il load)
    let apparso = false;
    for (let t = 0; t < 80 && !apparso; t++) {
      const q = await cdp.send('Runtime.evaluate', {
        expression: `!!document.querySelector('#app-info-overlay .rc-modal')`,
        returnByValue: true });
      apparso = !!q.result.value;
      if (!apparso) await sleep(100);
    }

    if (c.scale !== 1) await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: c.scale });
    if (c.pan) {
      await sleep(200);
      await cdp.send('Input.dispatchMouseEvent',
        { type: 'mouseWheel', x: 50, y: 200, deltaX: c.pan, deltaY: 0 });
    }
    await sleep(600);

    const out = await cdp.send('Runtime.evaluate', { expression: MEASURE, returnByValue: true });
    const d = JSON.parse(out.result.value);
    const errs = [];
    if (d.err) errs.push(d.err);
    else {
      if (d.titolo !== '⚠️ Prima di iniziare') errs.push(`popup sbagliato: "${d.titolo}"`);
      if (d.left < 0)                          errs.push(`left ${d.left} < 0`);
      if (d.right > d.vvWidth)                 errs.push(`right ${d.right} > vv.width ${d.vvWidth}`);
      if (Math.abs(d.mSx - d.mDx) > TOLL)      errs.push(`|mSx-mDx| = ${Math.abs(d.mSx - d.mDx).toFixed(1)} > ${TOLL}`);
      if (d.hScroll > 0)                       errs.push(`scroll orizzontale ${d.hScroll}px`);
      if (d.topCut < -1)                       errs.push(`tagliato in alto di ${(-d.topCut).toFixed(1)}px`);
    }

    const tag = `${String(W).padStart(3)}px · ${c.nome}`;
    if (errs.length) {
      fail++; failures.push(tag + ' :: ' + errs.join(' | '));
      console.log(`FAIL  ${tag.padEnd(34)} -> ${errs.join(' | ')}`);
    } else {
      pass++;
      console.log(`ok    ${tag.padEnd(34)} vv=${String(d.vvWidth).padStart(6)}` +
        ` overlay=${String(d.overlayW).padStart(6)} L=${String(d.left).padStart(5)}` +
        ` R=${String(d.right).padStart(6)} sx=${String(d.mSx).padStart(5)}` +
        ` dx=${String(d.mDx).padStart(5)} Δ=${Math.abs(d.mSx - d.mDx).toFixed(1)}`);
    }
  }
}

console.log(`\n===== ${pass} passati, ${fail} falliti su ${pass + fail} =====`);
failures.forEach((f) => console.log('  - ' + f));

try { await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`); } catch { /* noop */ }
process.exit(fail ? 1 : 0);
