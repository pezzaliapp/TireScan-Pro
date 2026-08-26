/* ================================================================
   TireScan-Pro  |  js/overlay-viewport.js
   Ancoraggio degli overlay al visual viewport.

   Su Chrome / Samsung Internet (Android) gli elementi position:fixed
   sono ancorati al LAYOUT viewport. Se la pagina e' ingrandita
   (pinch-zoom, oppure lo zoom che Chrome memorizza per il sito) il
   VISUAL viewport — cioe' la porzione realmente visibile — e' piu'
   stretto del layout viewport: un overlay inset:0 resta largo quanto
   il layout viewport e il riquadro centrato con flex finisce fuori
   schermo a destra e decentrato.

   window.innerWidth, documentElement.clientWidth/scrollWidth e l'unita'
   100vw si riferiscono TUTTI al layout viewport, quindi non rilevano il
   problema e non possono risolverlo: serve window.visualViewport.

   Su desktop e su iOS lo scostamento orizzontale non si presenta, e la
   correzione si attiva solo quando lo scostamento esiste davvero: senza
   di esso non viene toccato nulla e vale il posizionamento CSS.
   ================================================================ */
(function () {
  'use strict';

  var vv = window.visualViewport;
  if (!vv) return;                 // fallback pulito: resta il CSS attuale

  var SEL = '.rc-modal-overlay, #welcome-overlay, #tire-report-overlay';
  var PROPS = ['left', 'top', 'width', 'height', 'right', 'bottom'];
  var pinned = false;
  var queued = false;

  /* Lo scostamento e' orizzontale (larghezza/offset) o di scala. La sola
     differenza di ALTEZZA — barra indirizzi che compare o scompare — non
     conta: li' il comportamento attuale e' gia' corretto e toccarlo
     cambierebbe iPhone e desktop senza motivo. */
  function mismatch() {
    return Math.abs(vv.scale - 1) > 0.01 ||
           Math.abs(vv.offsetLeft) > 0.5 ||
           Math.abs(vv.width - document.documentElement.clientWidth) > 0.5;
  }

  function apply() {
    var overlays = document.querySelectorAll(SEL);
    if (!overlays.length) return;

    if (mismatch()) {
      pinned = true;
      for (var i = 0; i < overlays.length; i++) {
        var s = overlays[i].style;
        // inset:0 (foglio di stile o inline) va neutralizzato su right/bottom
        s.left   = vv.offsetLeft + 'px';
        s.top    = vv.offsetTop  + 'px';
        s.width  = vv.width      + 'px';
        s.height = vv.height     + 'px';
        s.right  = 'auto';
        s.bottom = 'auto';
        overlays[i].classList.add('vv-pinned');
      }
    } else if (pinned) {
      pinned = false;
      for (var j = 0; j < overlays.length; j++) {
        for (var k = 0; k < PROPS.length; k++) {
          overlays[j].style.removeProperty(PROPS[k]);
        }
        overlays[j].classList.remove('vv-pinned');
      }
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; apply(); });
  }

  vv.addEventListener('resize', schedule);
  vv.addEventListener('scroll', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);

  // Gli overlay sono creati dinamicamente e appesi a <body>.
  new MutationObserver(schedule).observe(document.body, { childList: true });

  schedule();
})();
