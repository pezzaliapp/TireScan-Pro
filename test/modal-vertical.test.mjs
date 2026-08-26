/* ================================================================
   Test dello scorrimento VERTICALE del popup "⚠️ Prima di iniziare".

   Il popup viene realmente renderizzato (localStorage pulito, nessun
   bypass del disclaimer).

   Per ogni combinazione viewport x scala verifica:
     1) popup che ci sta        -> verticalmente centrato
     2) popup piu' alto         -> parte dal bordo superiore con margine
     3) scrollTop = 0           -> l'inizio reale e' visibile
     4) scrollTop = scrollHeight-> la fine e' visibile
     5) niente parti irraggiungibili sopra l'origine di scorrimento
     6) il centraggio orizzontale del fix precedente resta perfetto

   Ogni caso viene provato in due modalita':
     - "safe"   : il browser supporta align-items: safe center
     - "nosafe" : simula un browser che scarta il keyword "safe" (come
                  risulta comportarsi il browser Android reale), dove
                  resta valido l'align-items: center che lo precede.
   La modalita' "nosafe" e' quella che riproduce il bug reale.

   ── Come eseguirlo ────────────────────────────────────────────────
   1) python3 -m http.server 8899
   2) "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        --headless=new --remote-debugging-port=9222 \
        --user-data-dir=/tmp/tirescan-test --no-first-run
   3) node test/modal-vertical.test.mjs
   ================================================================ */

const PORT    = process.env.CDP_PORT || 9222;
const APP_URL = process.env.APP_URL  || 'http://localhost:8899/index.html';
const TOLL    = 2;      // px di asimmetria ammessi
const MARGINE_MIN = 8;  // px minimi sopra il riquadro quando parte dall'alto

const VIEWPORTS = [
  [320, 600], [344, 700], [360, 640], [360, 780],
  [390, 664], [412, 800], [740, 360],   // ultimo: landscape basso
];
const SCALES = [1, 1.25, 1.5, 2];
const MODI   = ['safe', 'nosafe'];

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

/* Simula un browser privo del keyword "safe": la dichiarazione
   "align-items: safe center" sarebbe invalida e resterebbe quella
   precedente nella stessa regola, cioe' "align-items: center". */
const FORZA_NOSAFE = `(() => {
  const s = document.createElement('style');
  s.textContent = '.rc-modal-overlay{align-items:center !important}';
  document.head.appendChild(s);
})()`;

const MEASURE = `(() => {
  const vv = window.visualViewport;
  const ov = document.getElementById('app-info-overlay');
  if (!ov) return JSON.stringify({ err: 'popup non renderizzato' });
  const md = ov.querySelector('.rc-modal');
  if (!md) return JSON.stringify({ err: '.rc-modal assente' });
  const h3 = ov.querySelector('h3');
  const cs = getComputedStyle(ov);
  const padTop = parseFloat(cs.paddingTop), padBot = parseFloat(cs.paddingBottom);

  ov.scrollTop = 0;
  const or0 = ov.getBoundingClientRect();
  const mr0 = md.getBoundingClientRect();
  const hr0 = h3.getBoundingClientRect();
  const topGap = mr0.top - or0.top;                 // scarto sopra, a scrollTop 0
  const topNelloScroll = topGap + ov.scrollTop;     // posizione nell'area di scorrimento
  const inizioVisibile = hr0.top >= or0.top - 0.5;

  // fondo: scorri tutto in basso
  ov.scrollTop = ov.scrollHeight;
  const or1 = ov.getBoundingClientRect();
  const mr1 = md.getBoundingClientRect();
  const fineVisibile = mr1.bottom <= or1.bottom + 0.5;

  ov.scrollTop = 0;
  const or2 = ov.getBoundingClientRect();
  const mr2 = md.getBoundingClientRect();
  const bottomGap = or2.bottom - mr2.bottom;
  const ciSta = (mr2.height + padTop + padBot) <= ov.clientHeight + 0.5;

  // orizzontale, relativo al VISUAL viewport (fix precedente): contenimento
  const L = mr2.left  - vv.offsetLeft;
  const R = mr2.right - vv.offsetLeft;
  // simmetria misurata sul CONTENT BOX dell'overlay: clientWidth esclude la
  // scrollbar classica, che e' un elemento visibile e non spazio sprecato.
  // (Su Android le scrollbar sono overlay e non occupano spazio: li' i due
  //  riferimenti coincidono.)
  const cbLeft  = or2.left + ov.clientLeft;
  const cbRight = cbLeft + ov.clientWidth;

  return JSON.stringify({
    titolo: (h3 && h3.textContent || '').trim(),
    alignItems: cs.alignItems,
    vvW: +vv.width.toFixed(1), vvH: +vv.height.toFixed(1),
    clientH: ov.clientHeight, scrollH: ov.scrollHeight,
    modalH: +mr2.height.toFixed(1),
    padTop,
    ciSta,
    topGap: +topGap.toFixed(1),
    bottomGap: +bottomGap.toFixed(1),
    topNelloScroll: +topNelloScroll.toFixed(1),
    inizioVisibile, fineVisibile,
    L: +L.toFixed(1), R: +R.toFixed(1),
    mSx: +(mr2.left - cbLeft).toFixed(1), mDx: +(cbRight - mr2.right).toFixed(1),
    scrollbarPx: Math.round(ov.offsetWidth - ov.clientWidth - ov.clientLeft * 2)
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
  source: 'try{localStorage.clear()}catch(e){}'   // il gate compare davvero
});

let pass = 0, fail = 0; const failures = [];

for (const [W, H] of VIEWPORTS) {
  for (const scale of SCALES) {
    for (const modo of MODI) {
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
      if (modo === 'nosafe') await cdp.send('Runtime.evaluate', { expression: FORZA_NOSAFE, returnByValue: true });
      if (scale !== 1) await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: scale });
      await sleep(650);

      const out = await cdp.send('Runtime.evaluate', { expression: MEASURE, returnByValue: true });
      const d = JSON.parse(out.result.value);
      const errs = [];
      if (d.err) errs.push(d.err);
      else {
        if (d.titolo !== '⚠️ Prima di iniziare') errs.push(`popup sbagliato: "${d.titolo}"`);
        // (5) niente parti sopra l'origine di scorrimento
        if (d.topNelloScroll < -0.5) errs.push(`inizio irraggiungibile: top ${d.topNelloScroll} < 0`);
        // (1) e (2)
        if (d.ciSta) {
          if (Math.abs(d.topGap - d.bottomGap) > TOLL)
            errs.push(`ci sta ma non centrato: sopra ${d.topGap} / sotto ${d.bottomGap}`);
        } else {
          if (Math.abs(d.topGap - d.padTop) > 1)
            errs.push(`piu' alto del viewport ma non parte dall'alto: topGap ${d.topGap} != padTop ${d.padTop}`);
          if (d.topGap < MARGINE_MIN)
            errs.push(`margine superiore ${d.topGap} < ${MARGINE_MIN}`);
        }
        // (3) e (4)
        if (!d.inizioVisibile) errs.push('con scrollTop=0 l\'inizio non e\' visibile');
        if (!d.fineVisibile)   errs.push('con scrollTop=scrollHeight la fine non e\' visibile');
        // (6) centraggio orizzontale del fix precedente
        if (d.L < 0)                        errs.push(`left ${d.L} < 0`);
        if (d.R > d.vvW)                    errs.push(`right ${d.R} > vv.width ${d.vvW}`);
        if (Math.abs(d.mSx - d.mDx) > TOLL) errs.push(`|mSx-mDx| = ${Math.abs(d.mSx - d.mDx).toFixed(1)} > ${TOLL}`);
      }

      const tag = `${String(W).padStart(3)}x${String(H).padEnd(3)} scala ${String(scale).padEnd(4)} ${modo.padEnd(6)}`;
      if (errs.length) {
        fail++; failures.push(tag + ' :: ' + errs.join(' | '));
        console.log(`FAIL  ${tag} -> ${errs.join(' | ')}`);
      } else {
        pass++;
        console.log(`ok    ${tag} ${(d.ciSta ? 'centrato' : 'dall-alto').padEnd(9)}` +
          ` modalH=${String(d.modalH).padStart(5)} clientH=${String(d.clientH).padStart(4)}` +
          ` sopra=${String(d.topGap).padStart(5)} sotto=${String(d.bottomGap).padStart(6)}` +
          ` sx=${String(d.mSx).padStart(4)} dx=${String(d.mDx).padStart(4)}`);
      }
    }
  }
}

console.log(`\n===== ${pass} passati, ${fail} falliti su ${pass + fail} =====`);
failures.forEach((f) => console.log('  - ' + f));

try { await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`); } catch { /* noop */ }
process.exit(fail ? 1 : 0);
