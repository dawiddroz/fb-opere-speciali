/* FB Opere Speciali — animations.js
   Motion (motion.dev) per reveal/micro-interazioni + rAF watchdog per TUTTO
   ciò che dipende dallo scroll (gallery, parallax, progress bar).
   Lenis smooth scroll ripristinato (v4.2): scrolla la pagina NATIVAMENTE,
   quindi il watchdog rAF e i listener scroll restano identici. */
(function () {
  'use strict';

  /* ---------- Lenis smooth scroll ----------
     Una sola istanza + rAF loop ufficiale. Lenis aggiorna window.scrollY
     ad ogni frame: gallery, parallax e progress bar (tutti rAF/scroll-based)
     funzionano senza alcuna modifica. */
  if (typeof Lenis !== 'undefined' && !window.__lenis) {
    var lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.35
    });
    window.__lenis = lenis;
    (function lenisLoop(time) {
      lenis.raf(time);
      requestAnimationFrame(lenisLoop);
    })(0);

    /* Anchor interni: scroll liscio (offset = altezza nav fissa 76px).
       Il skip-link resta istantaneo per accessibilità. */
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a || a.classList.contains('skip-link')) return;
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -84, duration: 1.3 });
      if (history.replaceState) history.replaceState(null, '', id);
    });
  }

  function initMotion() {
    if (typeof Motion === 'undefined' || typeof Motion.scroll !== 'function') {
      if (window.__motionRetries === undefined) window.__motionRetries = 0;
      if (++window.__motionRetries > 40) return;
      setTimeout(initMotion, 250);
      return;
    }
    var M = Motion;

    /* ---------- Reveal generici (inView + spring, una volta sola) ---------- */
    var revealEls = document.querySelectorAll('.reveal, .reveal-img, .reveal-line');
    revealEls.forEach(function (el) {
      if (el.closest('.lavori-track')) return; // i pannelli lavori sono sempre visibili
      if (el.closest('.split-media')) return;  // composizione media gestita sotto
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
    var tWrap = document.querySelector('.ticker');
    if (ticker && tWrap) {
      tWrap.addEventListener('mouseenter', function () { ticker.style.animationPlayState = 'paused'; });
      tWrap.addEventListener('mouseleave', function () { ticker.style.animationPlayState = 'running'; });
    }

    window.__motionReady = true;
  }
  initMotion();

  /* ============================================================
     GALLERY LAVORI — scroll-driven con rAF watchdog puro.
     La sezione ha altezza = corsa orizzontale + viewport; il pin
     sticky resta fermo mentre la pagina scorre; il watchdog legge
     la geometria reale OGNI frame e traduce il track. Nessun evento
     scroll richiesto: funziona con Lenis (scroll nativo), rotella,
     touch, webview, qualsiasi cosa.
     Frecce e drag compongono un offset manuale sopra lo scroll.
     ============================================================ */
  var sec = document.getElementById('lavori');
  var track = document.getElementById('lavoriTrack');
  var bar = document.getElementById('lavoriProgressBar');
  if (sec && track) {
    var maxShift = 0;
    var dragOffset = 0;
    var down = false, startX = 0, startOff = 0;

    var setHeights = function () {
      var vw = window.innerWidth || document.documentElement.clientWidth || 1280;
      var vh = window.innerHeight || document.documentElement.clientHeight || 800;
      maxShift = Math.max(track.scrollWidth - vw, 0);
      sec.style.height = Math.max(maxShift + vh, vh) + 'px';
      /* ri-clamp dell'offset manuale dopo resize/ricarica immagini */
      if (dragOffset > maxShift) dragOffset = maxShift;
      if (dragOffset < -maxShift) dragOffset = -maxShift;
    };

    var render = function (p) {
      var x = -(p * maxShift + dragOffset);
      if (x > 0) x = 0;
      if (x < -maxShift) x = -maxShift;
      track.style.transform = 'translate3d(' + x + 'px,0,0)';
      // barra = posizione reale (scroll + offset manuale), sincronizzata con tutto
      var pos = Math.min(Math.max((p * maxShift + dragOffset) / maxShift, 0), 1);
      if (bar) bar.style.transform = 'scaleX(' + (maxShift > 0 ? pos : 0) + ')';
    };

    var tick = function () {
      var r = sec.getBoundingClientRect();
      var vh = window.innerHeight || 800;
      var total = r.height - vh;
      var p = total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : 0;
      render(p);
      requestAnimationFrame(tick);
    };

    setHeights();
    /* Ricalcolo di sicurezza: a load completo (immagini+font) e a ogni resize.
       I pannelli sono a larghezza fissa, quindi il primo calcolo è già corretto,
       ma se qualcosa ritarda il layout questi passano sopra. */
    window.addEventListener('load', setHeights);
    window.addEventListener('resize', setHeights, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { setHeights(); });
    }

    /* Frecce */
    var step = function () { return Math.min((window.innerWidth || 1280) * 0.85, 520); };
    var prevBtn = document.getElementById('lavoriPrev');
    var nextBtn = document.getElementById('lavoriNext');
    if (prevBtn) prevBtn.addEventListener('click', function () {
      dragOffset = Math.max(-maxShift, dragOffset - step());
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      dragOffset = Math.min(maxShift, dragOffset + step());
    });

    /* Drag: pointerdown sulla viewport, pointermove/up su window (funziona
       anche se il pointer esce dal track; capture come fallback) */
    var viewport = sec.querySelector('.lavori-viewport');
    var dragTarget = viewport || track;
    var setDragging = function (on) {
      if (viewport) viewport.classList.toggle('dragging', on);
    };
    dragTarget.addEventListener('pointerdown', function (e) {
      down = true;
      startX = e.clientX;
      startOff = dragOffset;
      setDragging(true);
      if (dragTarget.setPointerCapture) dragTarget.setPointerCapture(e.pointerId);
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      dragOffset = Math.min(maxShift, Math.max(startOff + (e.clientX - startX), -maxShift));
    });
    window.addEventListener('pointerup', function () { down = false; setDragging(false); });
    window.addEventListener('pointercancel', function () { down = false; setDragging(false); });

    requestAnimationFrame(tick);

    /* video pannello: parte quando entra in vista (IO puro) */
    var vid = track.querySelector('video');
    if (vid && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var pr = vid.play();
            if (pr && pr.catch) pr.catch(function () {});
            io.disconnect();
          }
        });
      }, { threshold: 0.4 });
      io.observe(vid);
    }
  }

  /* ============================================================
     HERO PARALLAX + PROGRESS BAR TOP — rAF, zero eventi richiesti
     ============================================================ */
  var heroBg = document.querySelector('.hero-bg');
  var heroEl = document.querySelector('.hero');
  var pbar = document.querySelector('.progress-bar');
  (function loop() {
    var vh = window.innerHeight || 800;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    if (heroBg && heroEl) {
      var p = Math.min(y / heroEl.offsetHeight, 1);
      heroBg.style.transform = 'translateY(' + (p * 50) + 'px)';
    }
    if (pbar) {
      var doc = document.documentElement;
      var max = Math.max(doc.scrollHeight - vh, 1);
      pbar.style.transform = 'scaleX(' + Math.min(y / max, 1) + ')';
    }
    requestAnimationFrame(loop);
  })();

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
