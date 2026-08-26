/* ================================================================
   TireScan-Pro  |  js/debug-popup.js   — DIAGNOSTICA TEMPORANEA

   Pannello di misura del popup "Prima di iniziare" da leggere
   direttamente sullo schermo del telefono.

   Si attiva SOLO se entrambe le condizioni sono vere:
     - l'URL contiene  ?debugpopup=1
     - il dispositivo e' Android
   Senza il parametro questo file non fa assolutamente nulla e l'app
   resta identica. Su iPhone e su Mac non si attiva mai.

   Non modifica il layout: il pannello e' position:fixed, appeso a
   <body>, non entra nel flusso ne' nell'area di scorrimento del popup.
   Non usa scrollIntoView.

   File temporaneo: da rimuovere insieme al suo <script> in index.html
   quando la diagnosi e' conclusa.
   ================================================================ */
(function () {
  'use strict';

  /* ── attivazione ────────────────────────────────────────────────── */
  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { return; }
  if (params.get('debugpopup') !== '1') return;

  /* Android rilevato in modo indipendente dalla classe platform-android:
     se la classe NON fosse applicata (una delle ipotesi da verificare) il
     pannello deve comunque comparire e dirlo. */
  var uaData = navigator.userAgentData;
  var android = (uaData && uaData.platform)
    ? uaData.platform === 'Android'
    : /Android/i.test(navigator.userAgent || '');
  if (!android) return;

  var n = function (v) { return (typeof v === 'number' && isFinite(v)) ? Math.round(v * 10) / 10 : v; };
  var rect = function (el) { return el ? el.getBoundingClientRect() : null; };

  /* ── raccolta dei valori ────────────────────────────────────────── */
  function raccogli() {
    var de = document.documentElement;
    var vv = window.visualViewport || null;
    var ov = document.getElementById('app-info-overlay');
    var md = ov ? ov.querySelector('.rc-modal') : null;
    var head = ov ? ov.querySelector('.rc-modal-head') : null;
    var primo = (md && md.children[1]) ? md.children[1].firstElementChild : null;

    var ocs = ov ? getComputedStyle(ov) : null;
    var mcs = md ? getComputedStyle(md) : null;
    var orr = rect(ov), mrr = rect(md), hrr = rect(head), prr = rect(primo);

    return {
      AMBIENTE: {
        userAgent: navigator.userAgent,
        'userAgentData.platform': (uaData && uaData.platform) || '(assente)',
        'documentElement.className': de.className || '(vuota)',
        'contains(platform-android)': de.classList.contains('platform-android')
      },
      FINESTRA: {
        'window.innerWidth': window.innerWidth,
        'window.innerHeight': window.innerHeight,
        'docEl.clientWidth': de.clientWidth,
        'docEl.clientHeight': de.clientHeight,
        'docEl.scrollWidth': de.scrollWidth,
        'docEl.scrollHeight': de.scrollHeight
      },
      VISUALVIEWPORT: vv ? {
        width: n(vv.width), height: n(vv.height),
        offsetLeft: n(vv.offsetLeft), offsetTop: n(vv.offsetTop),
        pageLeft: n(vv.pageLeft), pageTop: n(vv.pageTop),
        scale: n(vv.scale)
      } : { '(non disponibile)': true },
      OVERLAY: ov ? {
        display: ocs.display,
        alignItems: ocs.alignItems,
        justifyContent: ocs.justifyContent,
        paddingTop: ocs.paddingTop,
        position: ocs.position,
        'style.top': ov.style.top || '(non impostato)',
        'style.left': ov.style.left || '(non impostato)',
        'style.width': ov.style.width || '(non impostato)',
        'style.height': ov.style.height || '(non impostato)',
        'computed top': ocs.top,
        'computed left': ocs.left,
        'computed width': ocs.width,
        'computed height': ocs.height,
        classi: ov.className,
        scrollTop: n(ov.scrollTop),
        scrollHeight: ov.scrollHeight,
        clientHeight: ov.clientHeight,
        'rect.top': n(orr.top),
        'rect.bottom': n(orr.bottom)
      } : { '(overlay assente)': true },
      MODAL: md ? {
        marginTop: mcs.marginTop,
        marginBottom: mcs.marginBottom,
        position: mcs.position,
        'rect.top': n(mrr.top),
        'rect.bottom': n(mrr.bottom),
        height: n(mrr.height)
      } : { '(modal assente)': true },
      TITOLO: hrr ? { 'rect.top': n(hrr.top), 'rect.bottom': n(hrr.bottom) }
                  : { '(titolo assente)': true },
      PRIMO_BLOCCO: prr ? {
        testo: (primo.textContent || '').trim().slice(0, 40),
        'rect.top': n(prr.top),
        'rect.bottom': n(prr.bottom)
      } : { '(primo blocco assente)': true }
    };
  }

  /* valori che cambiano mentre si scorre */
  function live() {
    var vv = window.visualViewport;
    var ov = document.getElementById('app-info-overlay');
    var md = ov ? ov.querySelector('.rc-modal') : null;
    var head = ov ? ov.querySelector('.rc-modal-head') : null;
    var primo = (md && md.children[1]) ? md.children[1].firstElementChild : null;
    return {
      'overlay.scrollTop': ov ? n(ov.scrollTop) : '-',
      'visualViewport.offsetTop': vv ? n(vv.offsetTop) : '-',
      'modal.top': md ? n(rect(md).top) : '-',
      'titolo.top': head ? n(rect(head).top) : '-',
      'primoBlocco.top': primo ? n(rect(primo).top) : '-'
    };
  }

  function testo(o, indent) {
    indent = indent || '';
    var out = [];
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      var v = o[k];
      if (v && typeof v === 'object') {
        out.push(indent + k + ':');
        out.push(testo(v, indent + '  '));
      } else {
        out.push(indent + k + ' = ' + v);
      }
    }
    return out.join('\n');
  }

  /* ── pannello ───────────────────────────────────────────────────── */
  var pannello, corpo, corpoLive, avviso;

  function crea() {
    pannello = document.createElement('div');
    pannello.id = 'debug-popup-panel';
    pannello.style.cssText = [
      'position:fixed', 'left:0', 'right:0', 'bottom:0',
      'z-index:2147483647',
      'background:rgba(2,8,20,.95)', 'color:#c8f5ff',
      'font:10px/1.35 ui-monospace,Menlo,Consolas,monospace',
      'border-top:2px solid #00d4ff',
      'max-height:46vh', 'overflow:auto',
      '-webkit-overflow-scrolling:touch',
      'padding:6px 8px', 'box-sizing:border-box',
      'white-space:pre-wrap', 'word-break:break-word'
    ].join(';');

    var barra = document.createElement('div');
    barra.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;position:sticky;top:-6px;background:rgba(2,8,20,.98);padding:4px 0';
    [['TOP', vaiTop], ['BOTTOM', vaiBottom], ['COPIA DATI', copia], ['CHIUDI', chiudi]].forEach(function (b) {
      var btn = document.createElement('button');
      btn.textContent = b[0];
      btn.style.cssText = 'font:700 11px/1 ui-monospace,monospace;padding:8px 10px;background:#0d2740;color:#7fe9ff;border:1px solid #00d4ff;border-radius:6px';
      btn.addEventListener('click', b[1]);
      barra.appendChild(btn);
    });
    pannello.appendChild(barra);

    avviso = document.createElement('div');
    avviso.style.cssText = 'color:#7CFFB2;min-height:12px;margin-bottom:4px';
    pannello.appendChild(avviso);

    corpoLive = document.createElement('div');
    corpoLive.style.cssText = 'color:#ffd479;border-bottom:1px dashed #1e3d6b;padding-bottom:4px;margin-bottom:4px';
    pannello.appendChild(corpoLive);

    corpo = document.createElement('div');
    pannello.appendChild(corpo);

    document.body.appendChild(pannello);
  }

  function vaiTop() {
    var ov = document.getElementById('app-info-overlay');
    if (ov) ov.scrollTop = 0;                 // niente scrollIntoView
    aggiorna();
  }
  function vaiBottom() {
    var ov = document.getElementById('app-info-overlay');
    if (ov) ov.scrollTop = ov.scrollHeight;   // niente scrollIntoView
    aggiorna();
  }
  function chiudi() {
    if (pannello && pannello.parentNode) pannello.parentNode.removeChild(pannello);
    pannello = null;
  }

  function tuttoIlTesto() {
    return 'TireScan-Pro — diagnostica popup Android\n' +
           'istante: ' + new Date().toISOString() + '\n\n' +
           'LIVE:\n' + testo(live(), '  ') + '\n\n' +
           testo(raccogli(), '');
  }

  function copia() {
    var t = tuttoIlTesto();
    function ok() { avviso.textContent = 'Dati copiati negli appunti.'; }
    function ko() {
      // ripiego: selezione manuale
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.style.cssText = 'position:fixed;left:0;bottom:0;width:100%;height:30vh;z-index:2147483647;font:10px monospace';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try {
        var r = document.execCommand('copy');
        avviso.textContent = r ? 'Dati copiati negli appunti.'
                               : 'Copia automatica non riuscita: seleziona il testo qui sopra e copialo a mano.';
      } catch (e) {
        avviso.textContent = 'Copia automatica non riuscita: seleziona il testo qui sopra e copialo a mano.';
      }
      setTimeout(function () { if (ta.parentNode) ta.parentNode.removeChild(ta); }, 12000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(ok, ko);
    } else { ko(); }
  }

  function aggiorna() {
    if (!pannello) return;
    corpoLive.textContent = 'LIVE (aggiornato mentre scorri)\n' + testo(live(), '  ');
    corpo.textContent = testo(raccogli(), '');
  }

  /* ── avvio: attende che il popup esista ─────────────────────────── */
  function avvia() {
    if (pannello) return;
    crea();
    aggiorna();

    var ov = document.getElementById('app-info-overlay');
    if (ov) ov.addEventListener('scroll', aggiornaLive, { passive: true });
    window.addEventListener('scroll', aggiornaLive, { passive: true, capture: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('scroll', aggiornaLive);
      window.visualViewport.addEventListener('resize', aggiorna);
    }
    setInterval(aggiornaLive, 120);   // rete di sicurezza per lo scroll touch
    setInterval(aggiorna, 1000);
  }

  var attesaLive = false;
  function aggiornaLive() {
    if (attesaLive || !pannello) return;
    attesaLive = true;
    requestAnimationFrame(function () {
      attesaLive = false;
      corpoLive.textContent = 'LIVE (aggiornato mentre scorri)\n' + testo(live(), '  ');
    });
  }

  function attendiPopup() {
    if (document.getElementById('app-info-overlay')) { avvia(); return; }
    var t0 = Date.now();
    var id = setInterval(function () {
      if (document.getElementById('app-info-overlay')) { clearInterval(id); avvia(); }
      else if (Date.now() - t0 > 15000) {
        // il popup non e' comparso: mostra comunque il pannello, serve saperlo
        clearInterval(id); avvia();
      }
    }, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attendiPopup);
  } else {
    attendiPopup();
  }
})();
