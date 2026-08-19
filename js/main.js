/* FB Opere Speciali — main.js (vanilla: nav, status, counters, scramble, cursor, carousel, form, sticky CTA) */
(function () {
  'use strict';

  /* ---------- Nav toggle ---------- */
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Nav scrolled ---------- */
  var nav = document.getElementById('nav');
  if (nav) {
    var onNavScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 30); };
    window.addEventListener('scroll', onNavScroll, { passive: true });
    onNavScroll();
  }

  /* ---------- Sticky CTA mobile ---------- */
  var mobileCta = document.getElementById('mobileCta');
  var heroEl = document.querySelector('.hero');
  if (mobileCta && heroEl) {
    var onCtaScroll = function () {
      var past = window.scrollY > heroEl.offsetHeight - 140;
      mobileCta.classList.toggle('is-visible', past);
    };
    window.addEventListener('scroll', onCtaScroll, { passive: true });
    onCtaScroll();
  }

  /* ---------- Status aperto/chiuso LIVE (orari reali GMaps: Lun-Ven 09-16) ---------- */
  var HOURS = [null, [9, 16], [9, 16], [9, 16], [9, 16], [9, 16], null]; // 0=Dom..6=Sab
  var DAYS_IT = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var heroText = document.getElementById('heroStatusText');
  var heroDot = document.getElementById('heroDot');

  function fmtHM(h) {
    return String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.round((h % 1) * 60)).padStart(2, '0');
  }
  function updateStatus() {
    if (!heroText || !heroDot) return;
    var now = new Date();
    var day = now.getDay();
    var mins = now.getHours() + now.getMinutes() / 60;
    var today = HOURS[day];
    var msg = '', openNow = false;
    if (today) {
      if (mins >= today[0] && mins < today[1]) {
        openNow = true;
        msg = 'Aperto ora — chiudiamo alle ' + fmtHM(today[1]);
      } else if (mins < today[0]) {
        msg = 'Apriamo oggi alle ' + fmtHM(today[0]);
      } else {
        msg = 'Chiuso — riapriamo ' + DAYS_IT[(day + 1) % 7] + ' alle ' + fmtHM(HOURS[(day + 1) % 7][0]);
      }
    } else {
      var next = (day + 1) % 7;
      while (!HOURS[next]) next = (next + 1) % 7;
      msg = 'Chiuso — riapriamo ' + DAYS_IT[next] + ' alle ' + fmtHM(HOURS[next][0]);
    }
    heroText.textContent = msg;
    heroDot.className = 'status-dot ' + (openNow ? 'is-open' : 'is-closed');
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- Giorno corrente nella tabella orari ---------- */
  var today = new Date().getDay(); // 0=Dom
  var dayIdx = today === 0 ? 7 : today;
  var todayRow = document.querySelector('.hours-table tr[data-day="' + dayIdx + '"]');
  if (todayRow) todayRow.classList.add('is-today');

  /* ---------- Counters (IntersectionObserver + rAF) ---------- */
  function initCounters() {
    var els = document.querySelectorAll('.counter');
    if (!els.length) return;
    els.forEach(function (el) {
      var target = parseFloat(el.dataset.count || '0');
      var decimals = parseInt(el.dataset.decimals || '0', 10);
      var done = false;
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !done) {
            done = true;
            obs.disconnect();
            var start = performance.now();
            var duration = 1800;
            function tick() {
              var p = Math.min((performance.now() - start) / duration, 1);
              var v = target * (1 - Math.pow(1 - p, 3));
              el.textContent = v.toFixed(decimals);
              if (p < 1) requestAnimationFrame(tick);
              else el.textContent = target.toFixed(decimals);
            }
            requestAnimationFrame(tick);
          }
        });
      }, { threshold: 0.4 }).observe(el);
    });
  }
  if (document.readyState !== 'loading') initCounters();
  else document.addEventListener('DOMContentLoaded', initCounters);

  /* ---------- Text scramble (etichette) ---------- */
  var SCRAMBLE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+';
  function scramble(el) {
    var original = el.textContent;
    var frame = 0;
    var total = original.length;
    var interval = setInterval(function () {
      var out = '';
      for (var i = 0; i < total; i++) {
        if (i < frame) out += original.charAt(i);
        else out += SCRAMBLE_CHARS.charAt(Math.floor(Math.random() * SCRAMBLE_CHARS.length));
      }
      el.textContent = out;
      frame++;
      if (frame > total) { clearInterval(interval); el.textContent = original; }
    }, 24);
  }
  function initScramble() {
    var targets = document.querySelectorAll('[data-scramble]');
    if (!targets.length) return;
    targets.forEach(function (el) {
      var done = false;
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !done) {
            done = true;
            obs.disconnect();
            scramble(el);
          }
        });
      }, { threshold: 0.6 }).observe(el);
    });
  }
  if (document.readyState !== 'loading') initScramble();
  else document.addEventListener('DOMContentLoaded', initScramble);

  /* ---------- Custom cursor (solo desktop) ---------- */
  var dot = document.querySelector('.cursor-dot');
  var ring = document.querySelector('.cursor-ring');
  if (dot && ring && window.matchMedia('(pointer: fine)').matches) {
    var mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + (mx - 3) + 'px,' + (my - 3) + 'px)';
    });
    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + (rx - 18) + 'px,' + (ry - 18) + 'px)';
      requestAnimationFrame(loop);
    })();
    var hoverables = 'a, button, .btn, .card, .lavoro-panel, .process-card, input, select, textarea, label';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hoverables)) ring.classList.add('is-active');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hoverables)) ring.classList.remove('is-active');
    });
  }

  /* ---------- Recensioni carousel ---------- */
  var track = document.getElementById('reviewTrack');
  var dotsWrap = document.getElementById('reviewDots');
  if (track && dotsWrap) {
    var cards = track.querySelectorAll('.review-card');
    var idx = 0;
    cards.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Recensione ' + (i + 1));
      if (i === 0) b.classList.add('is-active');
      b.addEventListener('click', function () { go(i); resetTimer(); });
      dotsWrap.appendChild(b);
    });
    function go(i) {
      idx = i;
      track.style.transform = 'translateX(-' + (idx * 100) + '%)';
      dotsWrap.querySelectorAll('button').forEach(function (b, j) {
        b.classList.toggle('is-active', j === idx);
      });
    }
    var timer = setInterval(function () { go((idx + 1) % cards.length); }, 5500);
    function resetTimer() { clearInterval(timer); timer = setInterval(function () { go((idx + 1) % cards.length); }, 5500); }
    var carousel = document.getElementById('reviewCarousel');
    if (carousel) {
      carousel.addEventListener('mouseenter', function () { clearInterval(timer); });
      carousel.addEventListener('mouseleave', resetTimer);
    }
  }

  /* ---------- Form (nessuna logica: formsubmit si occupa di tutto) ---------- */
  var form = document.getElementById('contactForm');
  var formNote = document.getElementById('formNote');
  if (form && formNote) {
    form.addEventListener('submit', function () {
      formNote.textContent = 'Invio in corso…';
      formNote.classList.add('is-sent');
    });
  }
})();
