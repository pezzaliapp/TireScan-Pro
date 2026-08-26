/* ================================================================
   TireScan-Pro  |  js/debug-popup.js   — DIAGNOSTICA TEMPORANEA

   Due piccoli pulsanti fixed, indipendenti dal popup, che mostrano le
   misure con window.prompt() (testo selezionabile e copiabile).

   Si attiva SOLO se entrambe le condizioni sono vere:
     - l'URL contiene  ?debugpopup=1
     - il dispositivo e' Android
   Senza il parametro questo file esce subito e l'app resta identica.
   Su iPhone e su Mac non si attiva mai.

   Non crea pannelli, non crea overlay, non usa elementi scrollabili per
   mostrare i risultati, non usa scrollIntoView, non tocca il layout.

   File temporaneo: da rimuovere insieme al suo <script> in index.html
   quando la diagnosi e' conclusa.
   ================================================================ */
(function () {
  'use strict';

  /* ── attivazione ────────────────────────────────────────────────── */
  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { return; }
  if (params.get('debugpopup') !== '1') return;

  /* Android rilevato indipendentemente dalla classe platform-android: se la
     classe non fosse applicata, i pulsanti devono comunque comparire. */
  var uaData = navigator.userAgentData;
  var android = (uaData && uaData.platform)
    ? uaData.platform === 'Android'
    : /Android/i.test(navigator.userAgent || '');
  if (!android) return;

  /* ── utilita' ───────────────────────────────────────────────────── */
  function r1(v) {
    return (typeof v === 'number' && isFinite(v)) ? Math.round(v * 10) / 10 : v;
  }
  function elementi() {
    var ov = document.getElementById('app-info-overlay');
    var md = ov ? ov.querySelector('.rc-modal') : null;
    var head = ov ? ov.querySelector('.rc-modal-head') : null;
    var primo = (md && md.children[1]) ? md.children[1].firstElementChild : null;
    return { ov: ov, md: md, head: head, primo: primo };
  }
  function rt(el) { return el ? r1(el.getBoundingClientRect().top) : 'n/d'; }
  function rb(el) { return el ? r1(el.getBoundingClientRect().bottom) : 'n/d'; }

  /* ── [DEBUG] : fotografia dello stato in questo istante ─────────── */
  function datiDebug() {
    var e = elementi();
    var vv = window.visualViewport;
    var se = document.scrollingElement || document.documentElement;
    var d = [
      'window.scrollY=' + r1(window.scrollY),
      'scrollingElement.scrollTop=' + r1(se ? se.scrollTop : 'n/d'),
      'vv.height=' + (vv ? r1(vv.height) : 'n/d'),
      'vv.offsetTop=' + (vv ? r1(vv.offsetTop) : 'n/d'),
      'vv.pageTop=' + (vv ? r1(vv.pageTop) : 'n/d'),
      'vv.scale=' + (vv ? r1(vv.scale) : 'n/d'),
      'overlay.scrollTop=' + (e.ov ? r1(e.ov.scrollTop) : 'n/d'),
      'overlay.scrollHeight=' + (e.ov ? e.ov.scrollHeight : 'n/d'),
      'overlay.clientHeight=' + (e.ov ? e.ov.clientHeight : 'n/d'),
      'overlay.top=' + rt(e.ov),
      'overlay.bottom=' + rb(e.ov),
      'modal.top=' + rt(e.md),
      'modal.bottom=' + rb(e.md),
      'titolo.top=' + rt(e.head),
      'titolo.bottom=' + rb(e.head),
      'primo.top=' + rt(e.primo),
      'primo.bottom=' + rb(e.primo),
      'androidClass=' + document.documentElement.classList.contains('platform-android'),
      'overlayPresente=' + !!e.ov
    ];
    return 'DEBUG | ' + d.join(' | ');
  }

  /* ── [RESET TOP] : azzera i tre livelli di scroll e rimisura ─────── */
  function resetTop() {
    var e = elementi();
    var se = document.scrollingElement || document.documentElement;
    var prima = datiDebug();

    if (se) se.scrollTop = 0;
    window.scrollTo(0, 0);
    if (e.ov) e.ov.scrollTop = 0;

    requestAnimationFrame(function () {
      var e2 = elementi();
      var vv = window.visualViewport;
      var se2 = document.scrollingElement || document.documentElement;
      var dopo = [
        'window.scrollY=' + r1(window.scrollY),
        'scrollingElement.scrollTop=' + r1(se2 ? se2.scrollTop : 'n/d'),
        'overlay.scrollTop=' + (e2.ov ? r1(e2.ov.scrollTop) : 'n/d'),
        'modal.top=' + rt(e2.md),
        'titolo.top=' + rt(e2.head),
        'primo.top=' + rt(e2.primo),
        'vv.offsetTop=' + (vv ? r1(vv.offsetTop) : 'n/d'),
        'vv.pageTop=' + (vv ? r1(vv.pageTop) : 'n/d')
      ];
      mostra('RESET TOP — copia il testo qui sotto',
             'RESET-DOPO | ' + dopo.join(' | ') + '   /// PRIMA: ' + prima);
    });
  }

  function mostra(titolo, testo) {
    try { window.prompt(titolo, testo); }
    catch (err) { /* se prompt e' bloccato non c'e' altro da fare */ }
  }

  /* ── pulsanti ───────────────────────────────────────────────────── */
  function bottone(etichetta, bottom, azione) {
    var b = document.createElement('button');
    b.textContent = etichetta;
    b.setAttribute('data-debugpopup', '1');
    b.style.cssText = [
      'position:fixed', 'right:8px', 'bottom:' + bottom + 'px',
      'z-index:2147483647', 'pointer-events:auto',
      'font:700 11px/1 ui-monospace,Menlo,Consolas,monospace',
      'padding:8px 10px', 'margin:0',
      'background:#0d2740', 'color:#7fe9ff',
      'border:1px solid #00d4ff', 'border-radius:6px',
      'box-shadow:0 2px 10px rgba(0,0,0,.5)',
      '-webkit-appearance:none', 'appearance:none'
    ].join(';');
    b.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      azione();
    });
    document.body.appendChild(b);
    return b;
  }

  function avvia() {
    if (document.querySelector('button[data-debugpopup]')) return;
    bottone('DEBUG', 80, function () {
      mostra('DEBUG — copia il testo qui sotto', datiDebug());
    });
    bottone('RESET TOP', 40, resetTop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }
})();
