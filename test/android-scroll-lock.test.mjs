/* ================================================================
   Test ANDROID: isolamento dello scroll della schermata disclaimer.

   Mentre #android-disclaimer-screen esiste, html e body non devono
   poter scorrere in alcun modo: l'unico elemento verticalmente
   scrollabile e' la schermata. Alla chiusura con "Accetto e continuo"
   lo stato inline di html/body va ripristinato esattamente.

   Emula Android (user agent + userAgentData). localStorage pulito: il
   cancello viene realmente mostrato. Dietro la schermata vengono
   caricati i dati demo, cosi' la pagina sottostante ha davvero
   contenuto piu' alto del viewport.

   Verifica:
     A) prima dell'apertura si registra lo stato inline di html/body
     B) con la schermata aperta il documento NON e' scrollabile
        (scrollingElement.scrollHeight === clientHeight)
     C) window.scrollTo(0, N) e scrollingElement.scrollTop = N non
        spostano nulla: window.scrollY resta 0
     D) 10 cicli TOP -> BOTTOM -> TOP: cambia solo
        #android-disclaimer-screen.scrollTop, mentre window.scrollY e
        scrollingElement.scrollTop restano invariati
     E) a ogni ritorno in cima sono visibili "Prima di iniziare" e
        "Versione: 2.10.4"; in fondo sono raggiungibili entrambi i pulsanti
     F) dopo "Accetto e continuo" lo stato inline di html/body e' quello
        di partenza e il documento torna scrollabile

   ── Come eseguirlo ────────────────────────────────────────────────
   1) python3 -m http.server 8899
   2) "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        --headless=new --remote-debugging-port=9222 \
        --user-data-dir=/tmp/tirescan-test --no-first-run
   3) node test/android-scroll-lock.test.mjs
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

/* stato inline di html/body: serve per il confronto prima/dopo */
const STILI = `(function () {
  const h = document.documentElement, b = document.body;
  return {
    html: h.getAttribute('style') || '',
    body: b.getAttribute('style') || ''
  };
})`;

/* misura: opzionalmente muove lo scroll della schermata, poi rileva tutto */
const STATO = `(function (azione) {
  const de = document.scrollingElement || document.documentElement;
  const sc = document.getElementById('android-disclaimer-screen');
  if (!sc) return { err: 'schermata assente' };
  if (azione === 'fondo') sc.scrollTop = sc.scrollHeight;
  if (azione === 'cima')  sc.scrollTop = 0;

  const titolo = sc.querySelector('.android-disclaimer-title');
  const versione = sc.querySelector('.android-disclaimer-body > div');
  const azioni = sc.querySelectorAll('.android-disclaimer-actions .btn');
  const vv = window.visualViewport;
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > vv.offsetTop + 0.5 && r.top < vv.offsetTop + vv.height - 0.5;
  };
  return {
    scrollY: window.scrollY,
    docScrollTop: de.scrollTop,
    docScrollHeight: de.scrollHeight,
    docClientHeight: de.clientHeight,
    docScrollabile: de.scrollHeight > de.clientHeight + 1,
    scScrollTop: sc.scrollTop,
    scRange: sc.scrollHeight - sc.clientHeight,
    titoloVisibile: vis(titolo),
    titoloTesto: titolo ? (titolo.textContent || '').trim() : null,
    versioneVisibile: vis(versione),
    versioneTesto: versione ? (versione.textContent || '').trim().slice(0, 22) : null,
    nPulsanti: azioni.length,
    pulsantiVisibili: Array.prototype.every.call(azioni, vis)
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

  // (A) stato inline di html/body PRIMA che la schermata compaia
  let stiliPrima = null;
  for (let t = 0; t < 80; t++) {
    const q = await cdp.send('Runtime.evaluate', {
      expression: `!!document.getElementById('android-disclaimer-screen')`, returnByValue: true });
    if (q.result.value) break;
    if (t === 2) stiliPrima = await val(STILI, null);   // dopo il primo render, prima del gate
    await sleep(100);
  }
  if (!stiliPrima) stiliPrima = { html: '', body: '' };
  // dati demo dietro: la pagina sottostante deve essere piu' alta del viewport
  await cdp.send('Runtime.evaluate', { expression: `try{loadDemoData()}catch(e){}`, returnByValue: true });
  await sleep(700);

  const errs = [];
  const ap = await val(STATO, 'nessuna');
  if (ap.err) errs.push(ap.err);
  else {
    // (B) documento non scrollabile
    if (ap.docScrollabile)
      errs.push(`documento scrollabile: scrollHeight ${ap.docScrollHeight} > clientHeight ${ap.docClientHeight}`);
    if (ap.scRange <= 0) errs.push('la schermata non e\' scrollabile: test non significativo');

    // (C) tentativi espliciti di scorrere la pagina
    await cdp.send('Runtime.evaluate', { expression:
      `window.scrollTo(0, 500); (document.scrollingElement||document.documentElement).scrollTop = 500;`,
      returnByValue: true });
    await sleep(200);
    const forzato = await val(STATO, 'nessuna');
    if (forzato.scrollY !== 0)
      errs.push(`window.scrollTo ha spostato la pagina: scrollY=${forzato.scrollY}`);
    if (forzato.docScrollTop !== 0)
      errs.push(`scrollingElement.scrollTop forzato: ${forzato.docScrollTop}`);

    // (D)(E) 10 cicli TOP -> BOTTOM -> TOP
    for (let c = 1; c <= CICLI && !errs.length; c++) {
      const giu = await val(STATO, 'fondo');
      if (giu.scrollY !== 0)      errs.push(`ciclo ${c} BOTTOM: scrollY=${giu.scrollY} (atteso 0)`);
      if (giu.docScrollTop !== 0) errs.push(`ciclo ${c} BOTTOM: docScrollTop=${giu.docScrollTop} (atteso 0)`);
      if (giu.scScrollTop <= 0)   errs.push(`ciclo ${c} BOTTOM: la schermata non ha scorso`);
      if (giu.nPulsanti !== 2)    errs.push(`ciclo ${c} BOTTOM: ${giu.nPulsanti} pulsanti (attesi 2)`);
      if (!giu.pulsantiVisibili)  errs.push(`ciclo ${c} BOTTOM: pulsanti non raggiungibili`);

      const su = await val(STATO, 'cima');
      if (su.scrollY !== 0)       errs.push(`ciclo ${c} TOP: scrollY=${su.scrollY} (atteso 0)`);
      if (su.docScrollTop !== 0)  errs.push(`ciclo ${c} TOP: docScrollTop=${su.docScrollTop} (atteso 0)`);
      if (su.scScrollTop !== 0)   errs.push(`ciclo ${c} TOP: schermata scrollTop=${su.scScrollTop}`);
      if (!su.titoloVisibile)     errs.push(`ciclo ${c} TOP: titolo non visibile`);
      if (!/Prima di iniziare/.test(su.titoloTesto || ''))
        errs.push(`ciclo ${c} TOP: titolo inatteso "${su.titoloTesto}"`);
      if (!su.versioneVisibile)   errs.push(`ciclo ${c} TOP: riga Versione non visibile`);
      if (!/^Versione:\s*2\.10\.4/.test(su.versioneTesto || ''))
        errs.push(`ciclo ${c} TOP: riga Versione inattesa "${su.versioneTesto}"`);
    }

    // (F) accettazione e ripristino
    if (!errs.length) {
      await cdp.send('Runtime.evaluate', {
        expression: `document.getElementById('android-disclaimer-accept').click()`, returnByValue: true });
      await sleep(400);
      const stiliDopo = await val(STILI, null);
      const dopo = await cdp.send('Runtime.evaluate', { expression: `JSON.stringify({
        rimossa: !document.getElementById('android-disclaimer-screen'),
        salvato: localStorage.getItem('handyscan_disclaimer_ok'),
        htmlOverflow: getComputedStyle(document.documentElement).overflowY,
        bodyPosition: getComputedStyle(document.body).position,
        docScrollabile: (document.scrollingElement||document.documentElement).scrollHeight >
                        (document.scrollingElement||document.documentElement).clientHeight + 1
      })`, returnByValue: true });
      const d = JSON.parse(dopo.result.value);
      if (!d.rimossa)        errs.push('accetto: schermata non rimossa');
      if (d.salvato !== '1') errs.push(`accetto: handyscan_disclaimer_ok=${d.salvato}`);
      if (stiliDopo.html !== stiliPrima.html)
        errs.push(`ripristino html: "${stiliPrima.html}" -> "${stiliDopo.html}"`);
      if (stiliDopo.body !== stiliPrima.body)
        errs.push(`ripristino body: "${stiliPrima.body}" -> "${stiliDopo.body}"`);
      if (d.bodyPosition === 'fixed') errs.push('ripristino: body ancora position:fixed');
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
    console.log(`ok    ${tag} doc bloccato (scrollH=clientH=${ap.docClientHeight})` +
      ` schermata range=${ap.scRange}px  ${CICLI} cicli: scrollY sempre 0, ripristino ok`);
  }
}

console.log(`\n===== ${pass} passati, ${fail} falliti su ${pass + fail} =====`);
failures.forEach((f) => console.log('  - ' + f));

try { await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`); } catch { /* noop */ }
process.exit(fail ? 1 : 0);
