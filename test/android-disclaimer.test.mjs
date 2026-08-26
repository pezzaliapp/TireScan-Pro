/* ================================================================
   Test ANDROID della schermata dedicata #android-disclaimer-screen.

   Emula Android (user agent + userAgentData) cosi' che si applichi la
   classe platform-android. localStorage pulito: il cancello d'ingresso
   viene realmente mostrato, nessun bypass.

   Verifica:
     A) su Android il vecchio popup #app-info-overlay NON viene creato
     B) esiste #android-disclaimer-screen figlio diretto di <body>
     C) un SOLO scroll container verticale: #android-disclaimer-screen
     D) nessun discendente con overflow-y auto/scroll, max-height,
        position fixed/absolute o transform
     E) apertura: scrollTop === 0, titolo visibile, punto 1 visibile
     F) 10 cicli TOP -> BOTTOM -> TOP:
          in fondo i pulsanti sono raggiungibili
          in cima scrollTop === 0, titolo e punto 1 di nuovo visibili
     G) "Accetto e continuo" salva handyscan_disclaimer_ok, rimuove la
        schermata e prosegue

   ── Come eseguirlo ────────────────────────────────────────────────
   1) python3 -m http.server 8899
   2) "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        --headless=new --remote-debugging-port=9222 \
        --user-data-dir=/tmp/tirescan-test --no-first-run
   3) node test/android-disclaimer.test.mjs
   ================================================================ */

const PORT    = process.env.CDP_PORT || 9222;
const APP_URL = process.env.APP_URL  || 'http://localhost:8899/index.html';

const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S916B) AppleWebKit/537.36 ' +
                   '(KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36';

const VIEWPORTS = [
  [320, 600], [344, 700], [360, 640], [360, 754], [390, 664], [412, 800],
];
const CICLI = 10;

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

/* struttura: controlli che si fanno una volta sola */
const STRUTTURA = `(function () {
  const sc = document.getElementById('android-disclaimer-screen');
  if (!sc) return { err: 'schermata Android assente' };
  const cont = sc.querySelector('.android-disclaimer-content');
  if (!cont) return { err: 'contenuto assente' };

  const scrollers = [], vietati = [];
  const esamina = (el, radice) => {
    const cs = getComputedStyle(el);
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight + 1) {
      scrollers.push(el.id || el.className || el.tagName);
    }
    if (!radice) {
      const nome = (el.id || el.className || el.tagName).toString().split(' ')[0];
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') vietati.push(nome + ':overflow-y=' + cs.overflowY);
      if (cs.maxHeight !== 'none')                              vietati.push(nome + ':max-height=' + cs.maxHeight);
      if (cs.position === 'fixed' || cs.position === 'absolute') vietati.push(nome + ':position=' + cs.position);
      if (cs.transform !== 'none')                               vietati.push(nome + ':transform=' + cs.transform);
    }
  };
  esamina(sc, true);
  sc.querySelectorAll('*').forEach((el) => esamina(el, false));

  const cs = getComputedStyle(sc);
  return {
    popupVecchio: !!document.getElementById('app-info-overlay'),
    figlioDiBody: sc.parentElement === document.body,
    position: cs.position, overflowY: cs.overflowY, zIndex: cs.zIndex,
    scrollers, vietati,
    scrollRange: sc.scrollHeight - sc.clientHeight,
    androidClass: document.documentElement.classList.contains('platform-android')
  };
})`;

/* stato: si rimisura a ogni passo del ciclo */
const STATO = `(function (azione) {
  const sc = document.getElementById('android-disclaimer-screen');
  if (!sc) return { err: 'schermata assente' };
  if (azione === 'fondo') sc.scrollTop = sc.scrollHeight;
  if (azione === 'cima')  sc.scrollTop = 0;

  const titolo = sc.querySelector('.android-disclaimer-title');
  const primo  = sc.querySelector('.android-disclaimer-body > div');
  const azioni = sc.querySelector('.android-disclaimer-actions');
  const vv = window.visualViewport;
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > vv.offsetTop + 0.5 && r.top < vv.offsetTop + vv.height - 0.5;
  };
  const r1 = (v) => Math.round(v * 10) / 10;
  return {
    scrollTop: sc.scrollTop,
    titoloVisibile: vis(titolo), titoloTop: titolo ? r1(titolo.getBoundingClientRect().top) : null,
    primoVisibile: vis(primo),   primoTop: primo ? r1(primo.getBoundingClientRect().top) : null,
    primoTesto: primo ? (primo.textContent || '').trim().slice(0, 24) : null,
    azioniVisibili: vis(azioni)
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
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width: W, height: H, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.navigate', { url: APP_URL });

  let apparso = false;
  for (let t = 0; t < 80 && !apparso; t++) {
    const q = await cdp.send('Runtime.evaluate', {
      expression: `!!document.getElementById('android-disclaimer-screen')`, returnByValue: true });
    apparso = !!q.result.value;
    if (!apparso) await sleep(100);
  }
  await sleep(400);

  const val = async (expr, arg) => {
    const out = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify((${expr})(${JSON.stringify(arg)}))`, returnByValue: true });
    return JSON.parse(out.result.value);
  };

  const errs = [];
  const str = await val(STRUTTURA, null);
  if (str.err) errs.push(str.err);
  else {
    if (!str.androidClass)  errs.push('classe platform-android non applicata');
    if (str.popupVecchio)   errs.push("il vecchio popup #app-info-overlay E' stato creato");
    if (!str.figlioDiBody)  errs.push("la schermata non e' figlia diretta di body");
    if (str.position !== 'fixed')  errs.push(`position=${str.position} (atteso fixed)`);
    if (str.overflowY !== 'auto')  errs.push(`overflow-y=${str.overflowY} (atteso auto)`);
    if (str.scrollers.length !== 1 || str.scrollers[0] !== 'android-disclaimer-screen')
      errs.push(`scroller attesi ["android-disclaimer-screen"], trovati ${JSON.stringify(str.scrollers)}`);
    if (str.vietati.length)
      errs.push(`proprieta' vietate su discendenti: ${str.vietati.slice(0, 4).join(', ')}`);
    if (str.scrollRange <= 0) errs.push("la schermata non e' scrollabile");

    // apertura
    const ap = await val(STATO, 'nessuna');
    if (ap.scrollTop !== 0)   errs.push(`apertura: scrollTop=${ap.scrollTop}`);
    if (!ap.titoloVisibile)   errs.push(`apertura: titolo non visibile (top ${ap.titoloTop})`);
    if (!ap.primoVisibile)    errs.push(`apertura: punto 1 non visibile (top ${ap.primoTop})`);
    if (!/^Versione:/.test(ap.primoTesto || ''))
      errs.push(`apertura: primo blocco inatteso "${ap.primoTesto}"`);

    // 10 cicli TOP -> BOTTOM -> TOP
    for (let c = 1; c <= CICLI && !errs.length; c++) {
      const giu = await val(STATO, 'fondo');
      if (!giu.azioniVisibili) errs.push(`ciclo ${c} BOTTOM: pulsanti non raggiungibili`);
      if (giu.scrollTop <= 0)  errs.push(`ciclo ${c} BOTTOM: non ha scorso`);
      const su = await val(STATO, 'cima');
      if (su.scrollTop !== 0)  errs.push(`ciclo ${c} TOP: scrollTop=${su.scrollTop}`);
      if (!su.titoloVisibile)  errs.push(`ciclo ${c} TOP: titolo non visibile (top ${su.titoloTop})`);
      if (!su.primoVisibile)   errs.push(`ciclo ${c} TOP: punto 1 non visibile (top ${su.primoTop})`);
    }

    // accettazione
    if (!errs.length) {
      const acc = await cdp.send('Runtime.evaluate', { expression: `(async()=>{
        document.getElementById('android-disclaimer-accept').click();
        await new Promise(r=>setTimeout(r,250));
        return JSON.stringify({ rimossa: !document.getElementById('android-disclaimer-screen'),
          salvato: localStorage.getItem('handyscan_disclaimer_ok') });
      })()`, awaitPromise: true, returnByValue: true });
      const a = JSON.parse(acc.result.value);
      if (!a.rimossa)          errs.push("accetto: la schermata non e' stata rimossa");
      if (a.salvato !== '1')   errs.push(`accetto: handyscan_disclaimer_ok=${a.salvato}`);
    }
  }

  const tag = `${String(W).padStart(3)}x${String(H).padEnd(3)}`;
  if (errs.length) {
    fail++; failures.push(tag + ' :: ' + errs.join(' | '));
    console.log(`FAIL  ${tag} -> ${errs.join(' | ')}`);
  } else {
    pass++;
    console.log(`ok    ${tag} popupVecchio=no scroller=1 range=${str.scrollRange}px` +
      ` ${CICLI} cicli top-bottom-top ok, accetto ok`);
  }
}

console.log(`\n===== ${pass} passati, ${fail} falliti su ${pass + fail} =====`);
failures.forEach((f) => console.log('  - ' + f));

try { await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`); } catch { /* noop */ }
process.exit(fail ? 1 : 0);
