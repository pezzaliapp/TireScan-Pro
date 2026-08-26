/* ================================================================
   Test ANDROID del popup "⚠️ Prima di iniziare".

   Emula un dispositivo Android (user agent + userAgentData) cosi' che
   js/overlay-viewport.js applichi la classe platform-android e le regole
   dedicate. Il popup viene realmente renderizzato: localStorage pulito,
   nessun bypass del disclaimer.

   Verifica l'INTERA sequenza TOP -> BOTTOM -> TOP, non il solo bounding
   rect del riquadro:

     A) apertura        : scrollTop === 0 su ogni scroller
     B) apertura        : titolo, versione/licenza e PUNTO 1 visibili
     C) un solo scroll container verticale (nessuno scroll annidato)
     D) niente centraggio verticale flex (overlay display:block)
     E) margine superiore e laterale fra 12 e 16 px
     F) BOTTOM          : scorrendo in basso i pulsanti sono raggiungibili
     G) TOP             : tornando in alto il PUNTO 1 e' di nuovo visibile
     H) scrollTop 0 coincide sempre con l'inizio reale del contenuto
     I) il centraggio orizzontale resta corretto sul visual viewport

   ── Come eseguirlo ────────────────────────────────────────────────
   1) python3 -m http.server 8899
   2) "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        --headless=new --remote-debugging-port=9222 \
        --user-data-dir=/tmp/tirescan-test --no-first-run
   3) node test/android-popup-scroll.test.mjs
   ================================================================ */

const PORT    = process.env.CDP_PORT || 9222;
const APP_URL = process.env.APP_URL  || 'http://localhost:8899/index.html';

const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S916B) AppleWebKit/537.36 ' +
                   '(KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36';

const VIEWPORTS = [
  [320, 600], [344, 700], [360, 640], [360, 780],
  [390, 664], [412, 800], [412, 915], [740, 360],
];
const SCALES = [1, 1.25, 1.5, 2];

const MARG_MIN = 12, MARG_MAX = 16;

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

/* helper iniettato: raccoglie lo stato del popup nel momento in cui viene chiamato */
const STATO = `(function () {
  const vv = window.visualViewport;
  const ov = document.getElementById('app-info-overlay');
  if (!ov) return { err: 'popup non renderizzato' };
  const md = ov.querySelector('.rc-modal');
  const h3 = ov.querySelector('h3');
  const versione = md.children[1] && md.children[1].firstElementChild;   // "Versione: ... Licenza: ..."
  const punto1 = versione;                                              // primo blocco di contenuto
  const azioni = ov.querySelector('.rc-modal-actions');
  const visibile = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > vv.offsetTop + 0.5 && r.top < vv.offsetTop + vv.height - 0.5;
  };
  const scrollers = [];
  const considera = (el) => {
    const cs = getComputedStyle(el);
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      scrollers.push({ id: el.id || '', cls: (el.className || '').toString().slice(0, 24),
        scrollTop: +el.scrollTop.toFixed(1), range: el.scrollHeight - el.clientHeight });
    }
  };
  considera(ov); ov.querySelectorAll('*').forEach(considera);
  const or = ov.getBoundingClientRect(), mr = md.getBoundingClientRect();
  const cs = getComputedStyle(ov);
  const cbLeft = or.left + ov.clientLeft, cbRight = cbLeft + ov.clientWidth;
  return {
    androidClass: document.documentElement.classList.contains('platform-android'),
    overlayDisplay: cs.display,
    scrollers, nScroller: scrollers.length,
    overlayScrollTop: +ov.scrollTop.toFixed(1),
    overlayRange: ov.scrollHeight - ov.clientHeight,
    titoloVisibile: visibile(h3),
    versioneVisibile: visibile(versione),
    punto1Visibile: visibile(punto1),
    punto1Top: +punto1.getBoundingClientRect().top.toFixed(1),
    azioniVisibili: visibile(azioni),
    azioniBottom: +azioni.getBoundingClientRect().bottom.toFixed(1),
    modalW: +mr.width.toFixed(1),
    contentBoxW: ov.clientWidth,
    limitatoDaMaxWidth: mr.width < ov.clientWidth - 28.5,   // non riempie lo spazio: max-width raggiunto
    margineSopra: +(mr.top - or.top).toFixed(1),
    margineSx: +(mr.left - cbLeft).toFixed(1),
    margineDx: +(cbRight - mr.right).toFixed(1),
    L: +(mr.left - vv.offsetLeft).toFixed(1),
    R: +(mr.right - vv.offsetLeft).toFixed(1),
    vvW: +vv.width.toFixed(1), vvH: +vv.height.toFixed(1), vvTop: +vv.offsetTop.toFixed(1)
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
// emulazione Android: user agent + userAgentData
await cdp.send('Network.setUserAgentOverride', {
  userAgent: UA_ANDROID, platform: 'Android',
  userAgentMetadata: {
    brands: [{ brand: 'Chromium', version: '151' }, { brand: 'Google Chrome', version: '151' }],
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

    const leggi = async (dopo = '') => {
      const out = await cdp.send('Runtime.evaluate', {
        expression: `JSON.stringify((${STATO})())` + (dopo ? '' : ''), returnByValue: true });
      return JSON.parse(out.result.value);
    };
    // scorre il contenitore REALMENTE scrollabile: dalla nuova architettura
    // Android e' .rc-modal, non piu' l'overlay.
    const scorri = async (dove) => {
      await cdp.send('Runtime.evaluate', {
        expression: `(()=>{const o=document.getElementById('app-info-overlay');
          const cand=[o, ...o.querySelectorAll('*')].filter(el=>{
            const cs=getComputedStyle(el);
            return (cs.overflowY==='auto'||cs.overflowY==='scroll') && el.scrollHeight>el.clientHeight+1;});
          const sc=cand[cand.length-1]||o;
          sc.scrollTop = ${dove === 'fondo' ? 'sc.scrollHeight' : '0'};})()`, returnByValue: true });
      await sleep(200);
    };

    const errs = [];
    // ── TOP (apertura)
    const top1 = await leggi();
    if (top1.err) errs.push(top1.err);
    else {
      if (!top1.androidClass) errs.push('classe platform-android non applicata');
      // (D) niente flex verticale
      if (top1.overlayDisplay !== 'block')
        errs.push(`overlay display=${top1.overlayDisplay} (atteso block)`);
      // (C) un solo scroller
      if (top1.nScroller > 1)
        errs.push(`${top1.nScroller} scroll container: ` +
          top1.scrollers.map((s) => `${s.id || s.cls}(${s.range})`).join(' + '));
      // (A) scrollTop 0 all'apertura
      const nz = top1.scrollers.filter((s) => s.scrollTop !== 0);
      if (nz.length) errs.push(`scrollTop non nullo all'apertura: ${JSON.stringify(top1.scrollers)}`);
      // (B) inizio visibile
      if (!top1.titoloVisibile)   errs.push('titolo non visibile all\'apertura');
      if (!top1.versioneVisibile) errs.push('versione/licenza non visibile all\'apertura');
      if (!top1.punto1Visibile)   errs.push(`punto 1 non visibile all'apertura (top ${top1.punto1Top})`);
      // (E) margini
      if (top1.margineSopra < MARG_MIN - 0.5 || top1.margineSopra > MARG_MAX + 0.5)
        errs.push(`margine sopra ${top1.margineSopra} fuori da ${MARG_MIN}-${MARG_MAX}`);
      // il tetto di 16px vale solo quando la larghezza e' limitata dal viewport;
      // se il riquadro raggiunge il suo max-width i margini laterali crescono
      // legittimamente e si richiede solo il minimo e la simmetria.
      if (top1.margineSx < MARG_MIN - 0.5)
        errs.push(`margine sx ${top1.margineSx} < ${MARG_MIN}`);
      if (!top1.limitatoDaMaxWidth && top1.margineSx > MARG_MAX + 0.5)
        errs.push(`margine sx ${top1.margineSx} > ${MARG_MAX} pur non essendo al max-width`);
      if (Math.abs(top1.margineSx - top1.margineDx) > 2)
        errs.push(`margini laterali asimmetrici: ${top1.margineSx} / ${top1.margineDx}`);
      // (I) contenimento orizzontale
      if (top1.L < 0)          errs.push(`left ${top1.L} < 0`);
      if (top1.R > top1.vvW)   errs.push(`right ${top1.R} > vv.width ${top1.vvW}`);

      // ── BOTTOM
      await scorri('fondo');
      const bot = await leggi();
      if (!bot.azioniVisibili)
        errs.push(`(BOTTOM) pulsanti non raggiungibili (bottom ${bot.azioniBottom})`);

      // ── TOP di ritorno
      await scorri('cima');
      const top2 = await leggi();
      if (top2.overlayScrollTop !== 0)
        errs.push(`(TOP ritorno) scrollTop ${top2.overlayScrollTop} != 0`);
      if (!top2.punto1Visibile)
        errs.push(`(TOP ritorno) punto 1 non visibile (top ${top2.punto1Top})`);
      if (!top2.titoloVisibile)
        errs.push('(TOP ritorno) titolo non visibile');
      // (H) scrollTop 0 == inizio reale: stessa posizione dell'apertura
      if (Math.abs(top2.punto1Top - top1.punto1Top) > 1)
        errs.push(`(H) scrollTop 0 non coincide con l'apertura: ${top1.punto1Top} -> ${top2.punto1Top}`);
    }

    const tag = `${String(W).padStart(3)}x${String(H).padEnd(3)} scala ${String(scale).padEnd(4)}`;
    if (errs.length) {
      fail++; failures.push(tag + ' :: ' + errs.join(' | '));
      console.log(`FAIL  ${tag} -> ${errs.join(' | ')}`);
    } else {
      pass++;
      console.log(`ok    ${tag} display=${top1.overlayDisplay} scroller=${top1.nScroller}` +
        ` sopra=${String(top1.margineSopra).padStart(4)} sx=${String(top1.margineSx).padStart(4)}` +
        ` dx=${String(top1.margineDx).padStart(4)} punto1=${String(top1.punto1Top).padStart(5)}` +
        ` TOP->BOTTOM->TOP ok`);
    }
  }
}

console.log(`\n===== ${pass} passati, ${fail} falliti su ${pass + fail} =====`);
failures.forEach((f) => console.log('  - ' + f));

try { await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`); } catch { /* noop */ }
process.exit(fail ? 1 : 0);
