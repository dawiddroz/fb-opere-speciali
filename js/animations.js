/* FB Opere Speciali — animations.js (GSAP + Lenis: reveal, parallax, scroll) */
(function () {
  'use strict';

  /* ---------- Lenis smooth scroll — UNA istanza, retry-loop ---------- */
  (function initLenis() {
    if (typeof Lenis === 'undefined') {
      if (window.__lenisRetries === undefined) window.__lenisRetries = 0;
      if (++window.__lenisRetries > 40) return;
      setTimeout(initLenis, 250);
      return;
    }
    if (window.lenis) return; // una sola istanza
    window.lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return 1 - Math.pow(1 - t, 3); },
      smoothWheel: true
    });
    function raf(time) { window.lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (window.__lenisSynced !== true && typeof ScrollTrigger !== 'undefined') {
      window.lenis.on('scroll', ScrollTrigger.update);
      window.__lenisSynced = true;
    }
  })();

  /* ---------- GSAP init retry-loop ---------- */
  (function initGSAP() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      if (window.__gsapRetries === undefined) window.__gsapRetries = 0;
      if (++window.__gsapRetries > 32) return;
      setTimeout(initGSAP, 250);
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    if (window.lenis && window.__lenisSynced !== true) {
      window.lenis.on('scroll', ScrollTrigger.update);
      window.__lenisSynced = true;
    }
    window.__gsapReady = true;

    /* Pre-hide sotto la fold SOLO elementi reveal (anti-flash senza blink) */
    gsap.set('.reveal', { opacity: 0, y: 36 });
    gsap.set('.section-head, .cta-banner, .review-score', { opacity: 0, y: 30 });

    /* --- Reveal con scrub (movimento legato allo scroll = sito VIVO) --- */
    gsap.utils.toArray('.cards .reveal').forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, y: 48 },
        {
          opacity: 1, y: 0, duration: 1, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 30%', scrub: 0.6 }
        }
      );
    });

    gsap.utils.toArray('.lavori-grid .reveal, .lavoro').forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, y: 48 },
        {
          opacity: 1, y: 0, duration: 1, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 30%', scrub: 0.6 }
        }
      );
    });

    /* --- Section heads: fade-up one-shot --- */
    gsap.utils.toArray('.section-head').forEach(function (el) {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: function () {
          gsap.fromTo(el,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
          );
        }
      });
    });

    /* --- Split media (azienda): parallax sottile immagine --- */
    var splitImg = document.querySelector('.split-media .media-frame img');
    if (splitImg) {
      gsap.fromTo(splitImg,
        { yPercent: -6 },
        {
          yPercent: 6, ease: 'none',
          scrollTrigger: { trigger: '.split-media', start: 'top bottom', end: 'bottom top', scrub: true }
        }
      );
    }

    /* --- CTA banner: scale-in leggero --- */
    var ctaBanner = document.querySelector('.cta-banner');
    if (ctaBanner) {
      ScrollTrigger.create({
        trigger: ctaBanner,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          gsap.fromTo(ctaBanner,
            { opacity: 0, scale: 0.96 },
            { opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' }
          );
        }
      });
    }

    /* --- Review score: pop-in --- */
    var reviewScore = document.querySelector('.review-score');
    if (reviewScore) {
      ScrollTrigger.create({
        trigger: reviewScore,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          gsap.fromTo(reviewScore,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
          );
        }
      });
    }

    ScrollTrigger.refresh();
  })();

  /* ---------- Safety net: se GSAP non parte, mostra tutto ---------- */
  setTimeout(function () {
    if (window.__gsapReady) return;
    var els = document.querySelectorAll('.reveal, .section-head, .cta-banner, .review-score');
    for (var i = 0; i < els.length; i++) {
      els[i].style.opacity = '1';
      els[i].style.transform = 'none';
    }
  }, 4000);
})();
