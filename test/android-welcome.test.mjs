/* ================================================================
   Test ANDROID della schermata di benvenuto #android-welcome-screen.

   E' la schermata che sul Samsung diventava irraggiungibile: contiene
   "2 Importa direttamente l'Excel", "3 Contatti e appuntamenti",
   "I tuoi dati sono privati", "App indipendente e gratuita — leggi
   prima di usarla".

   Emula Android (user agent + userAgentData). localStorage pulito: la
   welcome viene realmente mostrata, nessun bypass.

   Verifica:
     A) su Android il vecchio #welcome-overlay NON viene creato
     B) esiste #android-welcome-screen figlio diretto di <body>
     C) un SOLO scroll container verticale: #android-welcome-screen
     D) nessun discendente con overflow-y auto/scroll, max-height,
        position fixed/absolute o transform
     E) apertura: scrollTop === 0 e primo elemento (il logo) visibile
     F) 10 cicli TOP -> BOTTOM -> TOP:
          in fondo sono raggiungibili i pulsanti finali
          in cima scrollTop === 0 e il primo elemento e' visibile
          window.scrollY e scrollingElement.scrollTop restano invariati
     G) i 4 blocchi visti sul dispositivo sono presenti
     H) chiudendo con "Esplora l'app" html/body tornano allo stato di
        partenza e la pagina torna scrollabile

   ── Come eseguirlo ────────────────────────────────────────────────
   1) python3 -m http.server 8899
   2) "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        --headless=new --remote-debugging-port=9222 \
        --user-data-dir=/tmp/tirescan-test --no-first-run
   3) node test/android-welcome.test.mjs
   ================================================================ */

const PORT    = process.env.CDP_PORT || 9222;
const APP_URL = process.env.APP_URL  || 'http://localhost:8899/index.html';

const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S916B) AppleWebKit/537.36 ' +
                   '(KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36';

const VIEWPORTS = [
  [320, 600], [344, 700], [360, 640], [360, 754], [390, 664], [412, 800],
];
const CICLI = 10;

const BLOCCHI_ATTESI = [
  "Importa direttamente l'Excel",
  'Contatti e appuntamenti',
  'I tuoi dati sono privati',
  'App indipendente e gratuita'
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

const STILI = `(function () {
  return { html: document.documentElement.getAttribute('style') || '',
           body: document.body.getAttribute('style') || '' };
})`;

const STRUTTURA = `(function () {
  const sc = document.getElementById('android-welcome-screen');
  if (!sc) return { err: 'schermata Android assente' };
  const scrollers = [], vietati = [];
  const esamina = (el, radice) => {
    const cs = getComputedStyle(el);
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight + 1) {
      scrollers.push((el.id || el.className || el.tagName).toString().split(' ')[0]);
    }
    if (!radice) {
      const nome = (el.id || el.className || el.tagName).toString().split(' ')[0];
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') vietati.push(nome + ':overflow-y');
      if (cs.maxHeight !== 'none')                              vietati.push(nome + ':max-height=' + cs.maxHeight);
      if (cs.position === 'fixed' || cs.position === 'absolute') vietati.push(nome + ':position=' + cs.position);
      if (cs.transform !== 'none')                               vietati.push(nome + ':transform');
    }
  };
  esamina(sc, true);
  sc.querySelectorAll('*').forEach((el) => esamina(el, false));
  const cs = getComputedStyle(sc);
  const testo = sc.textContent || '';
  return {
    overlayVecchio: !!document.getElementById('welcome-overlay'),
    figlioDiBody: sc.parentElement === document.body,
    position: cs.position, overflowY: cs.overflowY, alignItems: cs.alignItems, display: cs.display,
    scrollers, vietati,
    scrollRange: sc.scrollHeight - sc.clientHeight,
    blocchi: ${JSON.stringify(BLOCCHI_ATTESI)}.filter((b) => testo.includes(b)),
    androidClass: document.documentElement.classList.contains('platform-android')
  };
})`;

const STATO = `(function (azione) {
  const de = document.scrollingElement || document.documentElement;
  const sc = document.getElementById('android-welcome-screen');
  if (!sc) return { err: 'schermata assente' };
  if (azione === 'fondo') sc.scrollTop = sc.scrollHeight;
  if (azione === 'cima')  sc.scrollTop = 0;
  const primo = sc.querySelector('.welcome-logo');
  const cta = sc.querySelectorAll('.welcome-cta > *');
  const hint = sc.querySelector('.welcome-hint');
  const vv = window.visualViewport;
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > vv.offsetTop + 0.5 && r.top < vv.offsetTop + vv.height - 0.5;
  };
  return {
    scrollY: window.scrollY,
    docScrollTop: de.scrollTop,
    docScrollabile: de.scrollHeight > de.clientHeight + 1,
    scScrollTop: sc.scrollTop,
    primoVisibile: vis(primo),
    primoTop: primo ? Math.round(primo.getBoundingClientRect().top) : null,
    nCta: cta.length,
    ctaVisibili: Array.prototype.every.call(cta, vis),
    hintVisibile: vis(hint)
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
  source: 'try{localStorage.clear()}catch(e){};window.confirm=()=>true;'
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

  const val = async (expr, arg) => {
    const out = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify((${expr})(${JSON.stringify(arg)}))`, returnByValue: true });
    return JSON.parse(out.result.value);
  };

  // stato inline di html/body prima di qualunque schermata
  let stiliPrima = null;
  for (let t = 0; t < 80; t++) {
    const q = await cdp.send('Runtime.evaluate', {
      expression: `!!document.getElementById('android-disclaimer-screen')`, returnByValue: true });
    if (t === 1) stiliPrima = await val(STILI, null);
    if (q.result.value) break;
    await sleep(100);
  }
  if (!stiliPrima) stiliPrima = { html: '', body: '' };

  // percorso reale: accetta il disclaimer, poi arriva la welcome
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('android-disclaimer-accept')?.click()`, returnByValue: true });
  let welcome = false;
  for (let t = 0; t < 60 && !welcome; t++) {
    const q = await cdp.send('Runtime.evaluate', {
      expression: `!!document.getElementById('android-welcome-screen')`, returnByValue: true });
    welcome = !!q.result.value;
    if (!welcome) await sleep(100);
  }
  // La pagina sottostante deve essere piu' alta del viewport, altrimenti il
  // controllo sul body lock non direbbe nulla. Non si usa loadDemoData()
  // perche' chiama closeWelcome() e chiuderebbe la schermata sotto test:
  // si inietta uno spaziatore, che e' impalcatura del test e non tocca l'app.
  await cdp.send('Runtime.evaluate', {
    expression: `(()=>{const a=document.getElementById('app'); if(a) a.style.minHeight='3000px';})()`,
    returnByValue: true });
  await sleep(600);

  const errs = [];
  const str = await val(STRUTTURA, null);
  if (str.err) errs.push(str.err);
  else {
    if (!str.androidClass)   errs.push('classe platform-android non applicata');
    if (str.overlayVecchio)  errs.push("il vecchio #welcome-overlay E' stato creato");
    if (!str.figlioDiBody)   errs.push("la schermata non e' figlia diretta di body");
    if (str.position !== 'fixed') errs.push(`position=${str.position} (atteso fixed)`);
    if (str.overflowY !== 'auto') errs.push(`overflow-y=${str.overflowY} (atteso auto)`);
    if (str.display === 'flex')   errs.push('la schermata e\' ancora un flex container');
    if (str.scrollers.length !== 1 || str.scrollers[0] !== 'android-welcome-screen')
      errs.push(`scroller attesi ["android-welcome-screen"], trovati ${JSON.stringify(str.scrollers)}`);
    if (str.vietati.length)
      errs.push(`proprieta' vietate su discendenti: ${str.vietati.slice(0, 4).join(', ')}`);
    if (str.scrollRange <= 0) errs.push("la schermata non e' scrollabile: test non significativo");
    if (str.blocchi.length !== BLOCCHI_ATTESI.length)
      errs.push(`blocchi mancanti: trovati ${str.blocchi.length}/${BLOCCHI_ATTESI.length}`);

    const ap = await val(STATO, 'nessuna');
    if (ap.scrollTop !== 0 && ap.scScrollTop !== 0) errs.push(`apertura: scrollTop=${ap.scScrollTop}`);
    if (!ap.primoVisibile) errs.push(`apertura: primo elemento non visibile (top ${ap.primoTop})`);
    if (ap.docScrollabile) errs.push('apertura: il documento sottostante e\' ancora scrollabile');

    // tentativo esplicito di muovere la pagina
    await cdp.send('Runtime.evaluate', { expression:
      `window.scrollTo(0, 500); (document.scrollingElement||document.documentElement).scrollTop = 500;`,
      returnByValue: true });
    await sleep(200);
    const forzato = await val(STATO, 'nessuna');
    if (forzato.scrollY !== 0)      errs.push(`window.scrollTo ha spostato la pagina: scrollY=${forzato.scrollY}`);
    if (forzato.docScrollTop !== 0) errs.push(`scrollingElement.scrollTop forzato: ${forzato.docScrollTop}`);

    for (let c = 1; c <= CICLI && !errs.length; c++) {
      const giu = await val(STATO, 'fondo');
      if (giu.scrollY !== 0)      errs.push(`ciclo ${c} BOTTOM: scrollY=${giu.scrollY}`);
      if (giu.docScrollTop !== 0) errs.push(`ciclo ${c} BOTTOM: docScrollTop=${giu.docScrollTop}`);
      if (giu.scScrollTop <= 0)   errs.push(`ciclo ${c} BOTTOM: la schermata non ha scorso`);
      if (giu.nCta !== 5)         errs.push(`ciclo ${c} BOTTOM: ${giu.nCta} pulsanti (attesi 5)`);
      if (!giu.ctaVisibili)       errs.push(`ciclo ${c} BOTTOM: pulsanti non tutti raggiungibili`);
      if (!giu.hintVisibile)      errs.push(`ciclo ${c} BOTTOM: ultimo elemento non raggiungibile`);

      const su = await val(STATO, 'cima');
      if (su.scrollY !== 0)       errs.push(`ciclo ${c} TOP: scrollY=${su.scrollY}`);
      if (su.docScrollTop !== 0)  errs.push(`ciclo ${c} TOP: docScrollTop=${su.docScrollTop}`);
      if (su.scScrollTop !== 0)   errs.push(`ciclo ${c} TOP: schermata scrollTop=${su.scScrollTop}`);
      if (!su.primoVisibile)      errs.push(`ciclo ${c} TOP: primo elemento non visibile (top ${su.primoTop})`);
    }

    // chiusura e ripristino
    if (!errs.length) {
      await cdp.send('Runtime.evaluate', { expression: `closeWelcome()`, returnByValue: true });
      await sleep(600);
      const stiliDopo = await val(STILI, null);
      const dopo = await cdp.send('Runtime.evaluate', { expression: `JSON.stringify({
        rimossa: !document.getElementById('android-welcome-screen'),
        bodyPosition: getComputedStyle(document.body).position,
        htmlOverflow: getComputedStyle(document.documentElement).overflowY,
        docScrollabile: (document.scrollingElement||document.documentElement).scrollHeight >
                        (document.scrollingElement||document.documentElement).clientHeight + 1
      })`, returnByValue: true });
      const d = JSON.parse(dopo.result.value);
      if (!d.rimossa) errs.push('chiusura: schermata non rimossa');
      if (stiliDopo.html !== stiliPrima.html)
        errs.push(`ripristino html: "${stiliPrima.html}" -> "${stiliDopo.html}"`);
      if (stiliDopo.body !== stiliPrima.body)
        errs.push(`ripristino body: "${stiliPrima.body}" -> "${stiliDopo.body}"`);
      if (d.bodyPosition === 'fixed')  errs.push('ripristino: body ancora position:fixed');
      if (d.htmlOverflow === 'hidden') errs.push('ripristino: html ancora overflow hidden');
      if (!d.docScrollabile) errs.push('ripristino: la pagina non torna scrollabile');
    }
  }

  const tag = `${String(W).padStart(3)}x${String(H).padEnd(3)}`;
  if (errs.length) {
    fail++; failures.push(tag + ' :: ' + errs.join(' | '));
    console.log(`FAIL  ${tag} -> ${errs.join(' | ')}`);
  } else {
    pass++;
    console.log(`ok    ${tag} overlayVecchio=no scroller=1 range=${str.scrollRange}px` +
      ` blocchi=${str.blocchi.length}/4  ${CICLI} cicli: scrollY sempre 0, ripristino ok`);
  }
}

console.log(`\n===== ${pass} passati, ${fail} falliti su ${pass + fail} =====`);
failures.forEach((f) => console.log('  - ' + f));

try { await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`); } catch { /* noop */ }
process.exit(fail ? 1 : 0);
