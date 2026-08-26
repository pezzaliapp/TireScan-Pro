/* ================================================================
   Test ANDROID: il riquadro del disclaimer e' l'UNICO scroll container
   e non si sposta mai fisicamente.

   Emula Android (user agent + userAgentData) cosi' che si applichi la
   classe platform-android. Il popup viene realmente renderizzato:
   localStorage pulito, nessun bypass del disclaimer.

   Proprieta' verificata, semplice e deterministica:

     modalRectTop all'apertura
     -> modal.scrollTop = modal.scrollHeight  => modalRectTop IDENTICO
     -> modal.scrollTop = 0                   => modalRectTop IDENTICO
                                                 titolo.top > 0
                                                 primoBlocco.top > 0

   piu' l'architettura:
     overlay.scrollTop === 0
     overlay.scrollHeight === overlay.clientHeight   (l'overlay non scorre)
     .rc-modal e' l'unico elemento scrollabile
     modal.scrollHeight > modal.clientHeight quando il contenuto e' lungo
     all'apertura titolo, versione/licenza e punto 1 sono visibili
     a fondo scroll i pulsanti finali sono raggiungibili

   ── Come eseguirlo ────────────────────────────────────────────────
   1) python3 -m http.server 8899
   2) "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        --headless=new --remote-debugging-port=9222 \
        --user-data-dir=/tmp/tirescan-test --no-first-run
   3) node test/android-modal-scroller.test.mjs
   ================================================================ */

const PORT    = process.env.CDP_PORT || 9222;
const APP_URL = process.env.APP_URL  || 'http://localhost:8899/index.html';

const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S916B) AppleWebKit/537.36 ' +
                   '(KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36';

const VIEWPORTS = [
  [320, 600], [344, 700], [360, 640], [360, 754], [390, 664], [412, 800],
];
const SCALES = [1, 1.5, 2];
const MARG = 14;              // inset richiesto dei quattro lati

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

/* misura(azione): applica l'azione allo scroll del riquadro, poi misura */
const MISURA = `(function (azione) {
  const vv = window.visualViewport;
  const ov = document.getElementById('app-info-overlay');
  if (!ov) return { err: 'popup non renderizzato' };
  const md = ov.querySelector('.rc-modal');
  if (!md) return { err: '.rc-modal assente' };
  const head = ov.querySelector('.rc-modal-head');
  const primo = md.children[1] ? md.children[1].firstElementChild : null;
  const azioni = ov.querySelector('.rc-modal-actions');

  if (azione === 'fondo') md.scrollTop = md.scrollHeight;
  if (azione === 'cima')  md.scrollTop = 0;

  const r1 = (v) => Math.round(v * 10) / 10;
  const mr = md.getBoundingClientRect();
  const or = ov.getBoundingClientRect();
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > vv.offsetTop + 0.5 && r.top < vv.offsetTop + vv.height - 0.5;
  };

  // ogni elemento scrollabile dentro l'overlay, overlay incluso
  const scrollers = [];
  const guarda = (el) => {
    const cs = getComputedStyle(el);
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight + 1) {
      scrollers.push((el.id || el.className || el.tagName).toString().split(' ')[0]);
    }
  };
  guarda(ov); ov.querySelectorAll('*').forEach(guarda);

  return {
    androidClass: document.documentElement.classList.contains('platform-android'),
    overlayOverflowY: getComputedStyle(ov).overflowY,
    overlayScrollTop: ov.scrollTop,
    overlayScrollHeight: ov.scrollHeight,
    overlayClientHeight: ov.clientHeight,
    overlayTop: r1(or.top), overlayBottom: r1(or.bottom),
    modalPosition: getComputedStyle(md).position,
    modalOverflowY: getComputedStyle(md).overflowY,
    modalScrollTop: md.scrollTop,
    modalScrollHeight: md.scrollHeight,
    modalClientHeight: md.clientHeight,
    modalTop: r1(mr.top), modalBottom: r1(mr.bottom),
    modalLeft: r1(mr.left), modalRight: r1(mr.right),
    titoloTop: head ? r1(head.getBoundingClientRect().top) : null,
    primoTop: primo ? r1(primo.getBoundingClientRect().top) : null,
    titoloVisibile: vis(head),
    primoVisibile: vis(primo),
    azioniVisibili: vis(azioni),
    scrollers: scrollers,
    vvTop: r1(vv.offsetTop), vvHeight: r1(vv.height), vvWidth: r1(vv.width)
  };
})`;

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
await cdp.send('Network.setUserAgentOverride', {
  userAgent: UA_ANDROID, platform: 'Android',
  userAgentMetadata: {
    brands: [{ brand: 'Google Chrome', version: '151' }],
    fullVersion: '151.0.0.0', platform: 'Android', platformVersion: '14',
    architecture: '', model: 'SM-S916B', mobile: true
  }
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
    await sleep(600);

    const misura = async (azione) => {
      const out = await cdp.send('Runtime.evaluate', {
        expression: `JSON.stringify((${MISURA})(${JSON.stringify(azione)}))`,
        returnByValue: true });
      return JSON.parse(out.result.value);
    };

    const errs = [];
    const apertura = await misura('nessuna');
    if (apertura.err) errs.push(apertura.err);
    else {
      const modalRectTop = apertura.modalTop;

      // ── architettura
      if (!apertura.androidClass) errs.push('classe platform-android non applicata');
      if (apertura.overlayOverflowY !== 'hidden')
        errs.push(`overlay overflow-y=${apertura.overlayOverflowY} (atteso hidden)`);
      if (apertura.overlayScrollTop !== 0)
        errs.push(`overlay.scrollTop=${apertura.overlayScrollTop} (atteso 0)`);
      if (apertura.overlayScrollHeight !== apertura.overlayClientHeight)
        errs.push(`overlay scrollHeight ${apertura.overlayScrollHeight} != clientHeight ${apertura.overlayClientHeight}: l'overlay scorre`);
      if (apertura.modalPosition !== 'absolute')
        errs.push(`modal position=${apertura.modalPosition} (atteso absolute)`);
      if (apertura.modalOverflowY !== 'auto')
        errs.push(`modal overflow-y=${apertura.modalOverflowY} (atteso auto)`);
      if (apertura.scrollers.length !== 1 || apertura.scrollers[0] !== 'rc-modal')
        errs.push(`scroller attesi ["rc-modal"], trovati ${JSON.stringify(apertura.scrollers)}`);
      if (apertura.modalScrollHeight <= apertura.modalClientHeight)
        errs.push('il riquadro non e\' scrollabile: contenuto piu\' corto del previsto');

      // ── inset dai quattro lati rispetto al visual viewport
      if (Math.abs(apertura.modalTop - (apertura.vvTop + MARG)) > 1)
        errs.push(`modal.top ${apertura.modalTop} != vv.top+${MARG}`);
      if (Math.abs((apertura.vvTop + apertura.vvHeight - MARG) - apertura.modalBottom) > 1)
        errs.push(`modal.bottom ${apertura.modalBottom} != vv.height-${MARG} (${apertura.vvHeight - MARG})`);
      if (Math.abs(apertura.modalLeft - MARG) > 1)
        errs.push(`modal.left ${apertura.modalLeft} != ${MARG}`);
      if (Math.abs(apertura.vvWidth - MARG - apertura.modalRight) > 1)
        errs.push(`modal.right ${apertura.modalRight} != vv.width-${MARG}`);

      // ── apertura: inizio visibile, scrollTop 0
      if (apertura.modalScrollTop !== 0) errs.push(`modal.scrollTop=${apertura.modalScrollTop} all'apertura`);
      if (!apertura.titoloVisibile) errs.push('titolo non visibile all\'apertura');
      if (!apertura.primoVisibile)  errs.push('punto 1 non visibile all\'apertura');

      // ── BOTTOM: il rect NON deve muoversi
      const fondo = await misura('fondo');
      if (fondo.modalTop !== modalRectTop)
        errs.push(`(BOTTOM) modal.top cambiato: ${modalRectTop} -> ${fondo.modalTop}`);
      if (fondo.overlayScrollTop !== 0)
        errs.push(`(BOTTOM) overlay.scrollTop=${fondo.overlayScrollTop} (atteso 0)`);
      if (fondo.modalScrollTop <= 0)
        errs.push('(BOTTOM) il riquadro non ha scorso');
      if (!fondo.azioniVisibili)
        errs.push('(BOTTOM) pulsanti finali non raggiungibili');

      // ── TOP: il rect NON deve muoversi, inizio di nuovo visibile
      const cima = await misura('cima');
      if (cima.modalTop !== modalRectTop)
        errs.push(`(TOP) modal.top cambiato: ${modalRectTop} -> ${cima.modalTop}`);
      if (cima.modalScrollTop !== 0)
        errs.push(`(TOP) modal.scrollTop=${cima.modalScrollTop} (atteso 0)`);
      if (!(cima.titoloTop > 0)) errs.push(`(TOP) titolo.top=${cima.titoloTop} non > 0`);
      if (!(cima.primoTop > 0))  errs.push(`(TOP) primoBlocco.top=${cima.primoTop} non > 0`);
      if (!cima.titoloVisibile)  errs.push('(TOP) titolo non visibile');
      if (!cima.primoVisibile)   errs.push('(TOP) punto 1 non visibile');
    }

    const tag = `${String(W).padStart(3)}x${String(H).padEnd(3)} scala ${String(scale).padEnd(3)}`;
    if (errs.length) {
      fail++; failures.push(tag + ' :: ' + errs.join(' | '));
      console.log(`FAIL  ${tag} -> ${errs.join(' | ')}`);
    } else {
      pass++;
      console.log(`ok    ${tag} overlay(${apertura.overlayOverflowY}, scrollH=clientH=${apertura.overlayClientHeight})` +
        ` modal.top=${apertura.modalTop} bottom=${apertura.modalBottom} FISSO` +
        ` scroll=${apertura.modalScrollHeight - apertura.modalClientHeight}px`);
    }
  }
}

console.log(`\n===== ${pass} passati, ${fail} falliti su ${pass + fail} =====`);
failures.forEach((f) => console.log('  - ' + f));

try { await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`); } catch { /* noop */ }
process.exit(fail ? 1 : 0);
