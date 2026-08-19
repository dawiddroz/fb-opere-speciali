/* FB Opere Speciali — animations.js
   Motion (motion.dev) + Lenis: scroll-linked, reveal, horizontal gallery, parallax, magnetic.
   Pattern retry-loop: i vendor sono locali, ma l'init resta robusto. */
(function () {
  'use strict';

  function initLenis() {
    if (typeof Lenis === 'undefined') {
      if (window.__lenisRetries === undefined) window.__lenisRetries = 0;
      if (++window.__lenisRetries > 40) return;
      setTimeout(initLenis, 250);
      return;
    }
    window.lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return 1 - Math.pow(1 - t, 3); },
      smoothWheel: true
    });
    function raf(time) { window.lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    window.__lenisReady = true;
  }

  function initMotion() {
    if (typeof Motion === 'undefined' || typeof Motion.scroll !== 'function') {
      if (window.__motionRetries === undefined) window.__motionRetries = 0;
      if (++window.__motionRetries > 40) return;
      setTimeout(initMotion, 250);
      return;
    }
    var M = Motion;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Reveal generici (inView + spring, una volta sola) ---------- */
    var revealEls = document.querySelectorAll('.reveal, .reveal-img, .reveal-line');
    revealEls.forEach(function (el) {
      if (el.closest('.lavori-track')) return; // i pannelli lavori li gestisce il track
      if (el.closest('.split-media')) return;  // la composizione media ha il suo pattern sotto
      M.inView(el, function () {
        M.animate(el, {
          opacity: [0, 1],
          y: el.classList.contains('reveal-img') ? [30, 0] : [24, 0],
          scale: el.classList.contains('reveal-img') ? [1.03, 1] : [1, 1]
        }, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
      }, { amount: 0.25, once: true });
    });

    /* ---------- Split media: reveal composizione ---------- */
    var mediaMain = document.querySelector('.split-media .media-main');
    if (mediaMain) {
      M.inView(mediaMain, function () {
        M.animate(mediaMain, { opacity: [0, 1], y: [36, 0], scale: [1.02, 1] },
          { duration: 1, ease: [0.22, 1, 0.36, 1] });
      }, { amount: 0.3, once: true });
    }
    var mediaSecond = document.querySelector('.split-media .media-second');
    if (mediaSecond) {
      M.inView(mediaSecond, function () {
        M.animate(mediaSecond, { opacity: [0, 1], y: [30, 0] },
          { duration: 0.9, delay: 0.18, ease: [0.22, 1, 0.36, 1] });
      }, { amount: 0.4, once: true });
    }
    var dataCard = document.querySelector('.split-media .data-card');
    if (dataCard) {
      M.inView(dataCard, function () {
        M.animate(dataCard, { opacity: [0, 1], x: [-26, 0] },
          { duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] });
      }, { amount: 0.6, once: true });
    }

    /* ---------- Parallax hero (scroll-linked) ---------- */
    var heroBg = document.querySelector('.hero-bg');
    if (heroBg) {
      M.scroll(function (p) {
        heroBg.style.transform = 'scale(1.06) translateY(' + (p * 60) + 'px)';
      }, { target: document.querySelector('.hero'), offset: ['start start', 'end start'] });
    }

    /* ---------- Progress bar ---------- */
    var pbar = document.querySelector('.progress-bar');
    if (pbar) {
      M.scroll(function (p) {
        pbar.style.transform = 'scaleX(' + p + ')';
      });
    }

    /* ---------- Gallery orizzontale lavori — SELF-CONTAINED ----------
       Il track è uno scroller NATIVO (overflow-x + scrollLeft): funziona in
       qualunque ambiente (browser, webview, preview, touch). Input:
       - frecce / drag / rotella sul track → scrollLeft
       - scroll verticale della pagina → avanza la gallery SOLO se si osserva
         movimento reale del rect (nei browser normali), mai in ambienti anomali
       Barra di progresso = scrollLeft / max → sincronizzata con TUTTI gli input. */
    var scrollSec = document.getElementById('lavori');
    var track = document.getElementById('lavoriTrack');
    var pbar2 = document.getElementById('lavoriProgressBar');
    if (scrollSec && track) {
      var maxScroll = function () { return Math.max(track.scrollWidth - track.clientWidth, 0); };

      var syncBar = function () {
        var m = maxScroll();
        pbar2.style.transform = 'scaleX(' + (m > 0 ? track.scrollLeft / m : 0) + ')';
      };
      track.addEventListener('scroll', syncBar, { passive: true });

      // Frecce
      var step = function () { return Math.min((window.innerWidth || 1280) * 0.85, 560); };
      var prevBtn = document.getElementById('lavoriPrev');
      var nextBtn = document.getElementById('lavoriNext');
      if (prevBtn) prevBtn.addEventListener('click', function () {
        manualUntil = performance.now() + 2500;
        track.scrollBy({ left: -step(), behavior: 'smooth' });
      });
      if (nextBtn) nextBtn.addEventListener('click', function () {
        manualUntil = performance.now() + 2500;
        track.scrollBy({ left: step(), behavior: 'smooth' });
      });

      // Drag con mouse (il touch scrolla nativamente)
      var down = false, startX = 0, startSL = 0;
      track.addEventListener('pointerdown', function (e) {
        down = true; startX = e.clientX; startSL = track.scrollLeft;
        if (track.setPointerCapture) track.setPointerCapture(e.pointerId);
        manualUntil = performance.now() + 2500;
      });
      track.addEventListener('pointermove', function (e) {
        if (!down) return;
        track.scrollLeft = startSL - (e.clientX - startX);
      });
      var endDrag = function () { down = false; };
      track.addEventListener('pointerup', endDrag);
      track.addEventListener('pointercancel', endDrag);

      // Rotella verticale sul track → scorrimento orizzontale (se c'è strada)
      track.addEventListener('wheel', function (e) {
        var m = maxScroll();
        var atStart = track.scrollLeft <= 0 && e.deltaY < 0;
        var atEnd = track.scrollLeft >= m - 1 && e.deltaY > 0;
        if (atStart || atEnd || m <= 0) return;
        e.preventDefault();
        track.scrollLeft += e.deltaY;
        manualUntil = performance.now() + 2500;
      }, { passive: false });

      // Avanzamento via scroll pagina (ENHANCEMENT guardato):
      // p = 0 quando la sezione entra dal basso, avanza mentre la sezione
      // scorre verso l'alto, p = 1 dopo ~60% di viewport. Indipendente
      // dall'altezza della sezione. Attivo SOLO se si osserva movimento
      // reale del rect (nei browser normali) e fuori dalla pausa manuale.
      var observed = false, lastTop = null;
      var manualUntil = 0;
      (function loop() {
        var r = scrollSec.getBoundingClientRect();
        if (lastTop !== null && Math.abs(r.top - lastTop) > 1) observed = true;
        lastTop = r.top;
        var m = maxScroll();
        var vh = window.innerHeight || 800;
        var inView = r.bottom > 0 && r.top < vh;
        if (observed && inView && m > 0 && performance.now() > manualUntil) {
          var p = Math.min(Math.max(-r.top / (vh * 0.6), 0), 1);
          var target = p * m;
          if (Math.abs(track.scrollLeft - target) > 2) track.scrollLeft = target;
        }
        requestAnimationFrame(loop);
      })();

      window.addEventListener('resize', syncBar, { passive: true });
      syncBar();

      /* video pannello: parte quando entra in vista */
      var vid = track.querySelector('video');
      if (vid) {
        M.inView(vid, function () {
          var pr = vid.play();
          if (pr && pr.catch) pr.catch(function () {});
        }, { amount: 0.4, once: true });
      }
    }

    /* ---------- Magnetic buttons ---------- */
    var mags = document.querySelectorAll('[data-magnetic]');
    if (window.matchMedia('(pointer: fine)').matches) {
      mags.forEach(function (el) {
        el.addEventListener('mousemove', function (e) {
          var r = el.getBoundingClientRect();
          var dx = e.clientX - (r.left + r.width / 2);
          var dy = e.clientY - (r.top + r.height / 2);
          M.animate(el, { x: dx * 0.22, y: dy * 0.34 }, { duration: 0.4, ease: 'spring' });
        });
        el.addEventListener('mouseleave', function () {
          M.animate(el, { x: 0, y: 0 }, { duration: 0.5, ease: 'spring' });
        });
      });
    }

    /* ---------- Ticker: pausa su hover ---------- */
    var ticker = document.querySelector('.ticker-track');
    if (ticker) {
      var tWrap = document.querySelector('.ticker');
      if (tWrap) {
        tWrap.addEventListener('mouseenter', function () { ticker.style.animationPlayState = 'paused'; });
        tWrap.addEventListener('mouseleave', function () { ticker.style.animationPlayState = 'running'; });
      }
    }

    window.__motionReady = true;
  }

  initLenis();
  initMotion();

  /* ---------- Safety net: se Motion non parte, rivela tutto ---------- */
  setTimeout(function () {
    if (window.__motionReady) return;
    var els = document.querySelectorAll('.reveal, .reveal-img, .reveal-line, .hero-badge, .hero-title .word span, .hero-sub, .hero-status, .hero-cta, .hero-stats .stat');
    els.forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }, 4000);
})();
