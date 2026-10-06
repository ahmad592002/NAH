/* ============================================================
   N.A.H landing page — behaviour
   Progressive enhancement throughout: with JS off the page still
   reads, scrolls, shows every FAQ answer and links out
   to WhatsApp and phone.
   ============================================================ */
(function () {
  'use strict';

  var WHATSAPP = '96176527121';
  var EMAIL    = 'khalidinazir21@gmail.com';

  var html = document.documentElement;
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var navlinks = document.getElementById('navlinks');

  /* ── 1. mobile menu ──────────────────────────────────── */
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  navlinks.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ── 2. language toggle (AR default ⇄ EN) ────────────── */
  // Arabic is the default in the markup: the client's own brief is in
  // Arabic and his Akkar/Tripoli customers read Arabic first.
  //
  // Only LEAF nodes are translated. Writing textContent into an element
  // that has element children would destroy that markup — the previous
  // version did exactly that and only survived because no translated
  // node happened to have children yet.
  var langBtns = document.querySelectorAll('.langtog button');

  function applyLang(lang) {
    var isAr = lang === 'ar';
    html.setAttribute('lang', isAr ? 'ar' : 'en');
    html.setAttribute('dir',  isAr ? 'rtl' : 'ltr');

    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (el.firstElementChild) return;              // not a leaf — skip, don't clobber
      var txt = el.getAttribute(isAr ? 'data-ar' : 'data-en');
      if (txt != null) el.textContent = txt;
    });

    langBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });

    if (typeof window.__nahMapLang === 'function') window.__nahMapLang(isAr);
    if (typeof window.__nahLiftLang === 'function') window.__nahLiftLang(isAr);

    try { localStorage.setItem('nah-lang', lang); } catch (e) { /* private mode */ }
  }

  langBtns.forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.dataset.lang); });
  });

  // Only switch away from the Arabic default if the visitor chose English
  // before, or their browser is clearly not Arabic-speaking.
  var saved;
  try { saved = localStorage.getItem('nah-lang'); } catch (e) { saved = null; }
  if (saved === 'en') {
    applyLang('en');
  } else if (!saved && (navigator.language || '').slice(0, 2) !== 'ar') {
    applyLang('en');
  }

  /* ── 3. coverage map ─────────────────────────────────── */
  // Leaflet + CARTO dark tiles: real geography, a pin per coverage area, no
  // API key and no billing account. Entirely optional — if the CDN or the
  // tile server is unreachable the area chips below the map still carry the
  // same information, so nothing is lost.
  (function () {
    var el = document.getElementById('mapCanvas');
    if (!el || typeof L === 'undefined') return;

    // Pins only, no text on the map: the OSM tiles already print every city
    // name, so our own labels doubled up on top of theirs ("بيروت" twice).
    // The area chips under the map name the regions. Mount Lebanon sits up in
    // Keserwan so its pin does not land on top of Beirut's.
    var AREAS = [
      { ar: 'عكار',            en: 'Akkar',      lat: 34.5428, lng: 36.0806 },
      { ar: 'طرابلس والشمال',  en: 'Tripoli',    lat: 34.4367, lng: 35.8497 },
      { ar: 'جبل لبنان',       en: 'Mt Lebanon', lat: 33.9900, lng: 35.6800 },
      { ar: 'بيروت',           en: 'Beirut',     lat: 33.8938, lng: 35.5018 }
    ];

    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var map;
    try {
      map = L.map(el, {
        scrollWheelZoom: false,          // never hijack the page scroll
        zoomControl: true,
        attributionControl: true,
        zoomAnimation: !calm,
        fadeAnimation: !calm,
        markerZoomAnimation: !calm
      });
    } catch (e) { return; }

    // Standard OpenStreetMap tiles — the only major basemap that is genuinely
    // free with no API key and no account. CARTO's dark theme now stamps
    // "API KEY REQUIRED" across anonymous requests and Esri wants an ArcGIS
    // account, so the dark look is produced with a CSS filter on .leaflet-tile
    // instead (see styles.css). Markers sit outside that filter and stay orange.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    var pins = [];
    function nameOf(a) { return document.documentElement.dir === 'rtl' ? a.ar : a.en; }
    AREAS.forEach(function (a) {
      var m = L.marker([a.lat, a.lng], {
        icon: L.divIcon({ className: 'pin', html: '<span class="pin__dot"></span>', iconSize: [0, 0] }),
        title: nameOf(a),               // tooltip on hover, name for screen readers
        keyboard: false
      }).addTo(map);
      pins.push({ area: a, marker: m });
    });

    map.fitBounds(AREAS.map(function (a) { return [a.lat, a.lng]; }), { padding: [42, 42] });

    // keep pin tooltips in the active language
    window.__nahMapLang = function (isAr) {
      pins.forEach(function (o) {
        var node = o.marker.getElement();
        if (node) node.setAttribute('title', isAr ? o.area.ar : o.area.en);
      });
    };

    // Leaflet mis-measures a container that was hidden or mid-reveal when it
    // initialised, which leaves grey gaps where tiles should be.
    var fix = function () { map.invalidateSize(); };
    window.addEventListener('resize', fix);
    if ('IntersectionObserver' in window) {
      var mio = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { fix(); mio.disconnect(); }
      }, { threshold: 0.1 });
      mio.observe(el);
    }
    setTimeout(fix, 400);
  })();

  /* ── 3b. elevator floor indicator ────────────────────── */
  // The page is a building: hero = top floor, Contact = ground floor (G).
  // Scrolling down rides the cab down; the display shows the floor, the arrow
  // lights while moving, and the doors open once the visitor stops scrolling.
  (function () {
    var rail = document.getElementById('lift');                      // desktop side rail
    var mlift = document.getElementById('mlift');                    // mobile scrollbar
    if (!rail && !mlift) return;

    // Below 1200px the page scrolls inside <body> (see styles.css), otherwise the window.
    function sc() { return getComputedStyle(document.documentElement).overflowY === 'hidden' ? document.body : document.scrollingElement; }
    function sY() { return sc().scrollTop; }
    function sMax() { var e = sc(); return e.scrollHeight - e.clientHeight; }

    var FLOORS = [
      { id: 'top',      ar: 'الرئيسية',      en: 'Home' },
      { id: 'services', ar: 'الخدمات',       en: 'Services' },
      { id: 'types',    ar: 'أنواع المصاعد', en: 'Elevators' },
      { id: 'projects', ar: 'مشاريعنا',      en: 'Projects' },
      { id: 'process',  ar: 'مراحل العمل',   en: 'Process' },
      { id: 'coverage', ar: 'مناطق العمل',   en: 'Coverage' },
      { id: 'faq',      ar: 'أسئلة شائعة',   en: 'FAQ' },
      { id: 'quote',    ar: 'عرض سعر',       en: 'Quote' },
      { id: 'contact',  ar: 'تواصل معنا',    en: 'Contact' }
    ].filter(function (f) { return document.getElementById(f.id); });

    var N = FLOORS.length;               // geometry (floor height, cab size) lives in styles.css
    var els = [rail, mlift].filter(Boolean);
    var mTimer;
    var stops = [], toast = rail && rail.querySelector('.lift__toast');
    var tops = [], last = null, lastY = null, current = -1, idle, toastTimer, queued = false;
    var ticks = [], dragging = false, dragged = false, dragStartY = 0;

    function isAr() { return html.getAttribute('dir') === 'rtl'; }
    function nameOf(i) { return isAr() ? FLOORS[i].ar : FLOORS[i].en; }
    function label(i) { var n = N - 1 - i; return n === 0 ? 'G' : String(n); }

    if (rail) {
      rail.style.setProperty('--n', N);
      var list = rail.querySelector('.lift__stops');
      FLOORS.forEach(function (f, i) {
        var li = document.createElement('li');
        li.style.setProperty('--i', i);
        var a = document.createElement('a');
        a.className = 'lift__stop';
        a.href = '#' + f.id;
        a.innerHTML = '<span class="lift__name"><b class="lift__fl"></b><span class="lift__nm"></span></span>';
        li.appendChild(a); list.appendChild(li); stops.push(a);
      });
    }

    if (mlift) {
      mlift.style.setProperty('--n', N);
      var tickBox = mlift.querySelector('.mlift__ticks');
      FLOORS.forEach(function (f, i) {
        var t = document.createElement('span'); tickBox.appendChild(t); ticks.push(t);
      });
    }
    if (mlift) {
      // Dragging the cab scrolls the page, like a scrollbar thumb; a tap on the
      // shaft rides there.
      var shaftEl = mlift.querySelector('.mlift__shaft');
      var toPoint = function (clientY) {
        var r = shaftEl.getBoundingClientRect(), CAB = mlift.querySelector('.mlift__cab').offsetHeight;
        return Math.max(0, Math.min(1, (clientY - r.top - CAB / 2) / (r.height - CAB))) * sMax();
      };
      mlift.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        dragging = true; dragged = false; dragStartY = e.clientY;
      });
      mlift.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        if (!dragged && Math.abs(e.clientY - dragStartY) < 6) return;   // still a tap
        if (!dragged) {
          dragged = true; mlift.classList.add('is-dragging');
          // Capture only once it is really a drag: capturing on press re-targets
          // the release to the container, so a plain tap never reached the button.
          try { mlift.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
        }
        sc().scrollTo({ top: toPoint(e.clientY), behavior: 'instant' });
        e.preventDefault();
      });
      mlift.addEventListener('pointerup', function (e) {
        if (!dragging) return;
        dragging = false;
        if (dragged) mlift.classList.remove('is-dragging');
        else sc().scrollTo({ top: toPoint(e.clientY), behavior: 'smooth' });
      });
      mlift.addEventListener('pointercancel', function () { dragging = false; mlift.classList.remove('is-dragging'); });
    }

    function setNames() {

      stops.forEach(function (a, i) {
        a.querySelector('.lift__fl').textContent = label(i);
        a.querySelector('.lift__nm').textContent = nameOf(i);
        a.setAttribute('aria-label', label(i) + ' — ' + nameOf(i));
      });
      if (rail) rail.setAttribute('aria-label', isAr() ? 'الطوابق' : 'Floors');
    }

    function setFloor(f, announce) {
      current = f;
      if (rail) {
        rail.querySelector('.lift__num').textContent = label(f);
        stops.forEach(function (a, i) {
          a.classList.toggle('is-current', i === f);
          if (i === f) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
        if (announce && toast) {
          toast.innerHTML = '<b class="lift__fl"></b><span></span>';
          toast.firstChild.textContent = label(f);
          toast.lastChild.textContent = nameOf(f);
          rail.style.setProperty('--f', f);
          rail.classList.add('is-announce');
          clearTimeout(toastTimer);
          toastTimer = setTimeout(function () { rail.classList.remove('is-announce'); }, 1500);
        }
      }
      if (mlift) {
        mlift.querySelector('.mlift__fl').textContent = label(f);
        mlift.querySelector('.mlift__nm').textContent = nameOf(f);
        if (announce) {
          mlift.classList.add('is-announce');
          clearTimeout(mTimer);
          mTimer = setTimeout(function () { mlift.classList.remove('is-announce'); }, 1500);
        }
      }
    }

    function measure() {
      tops = FLOORS.map(function (f) {
        return document.getElementById(f.id).getBoundingClientRect().top + sY();
      });
      // each floor sill sits at the scroll position where that floor becomes current
      var max = sMax();
      ticks.forEach(function (t, i) {
        var at = i === N - 1 ? 1 : (tops[i] - window.innerHeight * 0.4) / max;
        t.style.setProperty('--t', max > 0 ? Math.max(0, Math.min(1, at)).toFixed(4) : '0');
      });
    }

    // continuous position: 0 = top floor ... N-1 = ground floor
    function position() {
      var y = sY() + window.innerHeight * 0.4, i = 0;
      while (i < N - 1 && y >= tops[i + 1]) i++;
      var pos = i;
      if (i < N - 1) pos = i + Math.max(0, Math.min(1, (y - tops[i]) / (tops[i + 1] - tops[i])));
      if (sY() >= sMax() - 2) pos = N - 1;
      return pos;
    }

    function arrive() {
      els.forEach(function (el) {
        el.classList.remove('is-moving');
        // Desktop cab moves floor to floor, so it opens only at a floor. The mobile
        // cab is the scroll thumb and usually rests between floors: open on any stop.
        if (el === mlift || Math.abs(last - Math.round(last)) < 0.15) el.classList.add('is-open');
      });
    }

    function update() {
      queued = false;
      var pos = position(), y = sY();
      // Movement and direction come from the actual scroll, not from pos:
      // fonts, map tiles and reveals shift the layout and nudge pos without
      // anyone scrolling, which flipped the arrow and kept the doors shut.
      if (lastY !== null && Math.abs(y - lastY) > 1) {
        var up = y < lastY;
        els.forEach(function (el) {
          el.classList.add('is-moving');
          el.classList.remove('is-open');
          el.classList.toggle('is-up', up);
        });
        clearTimeout(idle);
        idle = setTimeout(arrive, 320);
      }
      last = pos; lastY = y;
      if (rail) rail.style.setProperty('--pos', pos.toFixed(3));
      if (mlift) {
        var max = sMax();
        mlift.style.setProperty('--sp', max > 0 ? Math.max(0, Math.min(1, y / max)).toFixed(4) : '0');
      }
      var floor = Math.round(pos);
      if (floor !== current) setFloor(floor, current !== -1);
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }

    window.__nahLiftLang = function () { setNames(); if (current >= 0) setFloor(current, false); };

    setNames();
    measure();
    update();
    els.forEach(function (el) { el.classList.add('is-open'); });

    document.addEventListener('scroll', queue, { passive: true, capture: true });
    window.addEventListener('resize', function () { measure(); queue(); });
    window.addEventListener('load', function () { measure(); queue(); });
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { measure(); queue(); }).observe(document.body);
    }
  })();

  /* ── 4. scroll reveal ────────────────────────────────── */
  var revs = document.querySelectorAll('.rev');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });
    revs.forEach(function (el) { io.observe(el); });
  } else {
    revs.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── 5. stat counters ────────────────────────────────── */
  var counters = document.querySelectorAll('[data-count]');
  function runCounter(el) {
    var target = parseInt(el.dataset.count, 10);
    var suffix = el.dataset.suffix || '';
    var start = null, dur = 1400;
    requestAnimationFrame(function tick(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    });
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        runCounter(en.target);
        cio.unobserve(en.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = el.dataset.count + (el.dataset.suffix || ''); });
  }

  /* ── 5b. process timeline — fill follows scroll ──────── */
  // --p runs 0→1 as the timeline travels up through the viewport; the CSS
  // turns it into the orange line length (width on desktop, height on the
  // vertical phone layout). Each step whose dot the line has reached gets
  // .is-done. Reduced-motion users get the finished state straight away.
  (function () {
    var tl = document.getElementById('timeline');
    if (!tl) return;
    var steps = [].slice.call(tl.querySelectorAll('.tl__step'));
    var last = steps.length - 1;

    function set(p) {
      tl.style.setProperty('--p', p.toFixed(3));
      steps.forEach(function (s, i) {
        s.classList.toggle('is-done', p > 0.01 && p >= i / last - 0.001);
      });
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { set(1); return; }

    var queued = false;
    function update() {
      queued = false;
      var r = tl.getBoundingClientRect(), vh = window.innerHeight;
      // starts when the top of the timeline reaches 80% of the viewport,
      // completes when its bottom reaches 60%
      var from = vh * 0.8, to = vh * 0.6;
      var p = (from - r.top) / ((from - to) + r.height);
      set(Math.max(0, Math.min(1, p)));
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    document.addEventListener('scroll', queue, { passive: true, capture: true });   // window or <body> scroller
    window.addEventListener('resize', queue);
    update();
  })();

  /* ── 6. active nav link ──────────────────────────────── */
  (function () {
    if (!('IntersectionObserver' in window)) return;
    var links = [].slice.call(navlinks.querySelectorAll('a'));
    var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });

    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var k = targets.indexOf(en.target);
        if (k < 0) return;
        links.forEach(function (a, n) {
          var on = n === k;
          a.classList.toggle('is-active', on);
          if (on) { a.setAttribute('aria-current', 'true'); }
          else    { a.removeAttribute('aria-current'); }
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    targets.forEach(function (t) { if (t) sio.observe(t); });
  })();

  /* ── 7. quote form → pre-filled WhatsApp message ─────── */
  // No backend. Validate locally, then hand the enquiry to WhatsApp
  // (the client's preferred inbox), with an email fallback kept in sync.
  var form = document.getElementById('quoteForm');
  var err  = document.getElementById('q-err');
  var mailLink = document.getElementById('mailFallback');

  function compose() {
    var f = form.elements;
    var L = [
      'طلب عرض سعر — N.A.H',
      '',
      'الاسم: ' + f.name.value.trim(),
      'الهاتف: ' + f.phone.value.trim(),
      'المنطقة: ' + f.area.value.trim(),
      'نوع المبنى: ' + f.building.value,
      'عدد الطوابق: ' + (f.floors.value || '—'),
      'الحمولة: ' + (f.capacity.value.trim() || '—'),
      'نوع الاستخدام: ' + f.use.value,
      'البئر: ' + f.shaft.value
    ];
    if (f.notes.value.trim()) L.push('ملاحظات: ' + f.notes.value.trim());
    return L.join('\n');
  }

  function showError(msg, field) {
    err.textContent = msg;
    err.hidden = !msg;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }

  if (form) {
    form.addEventListener('input', function (e) {
      e.target.removeAttribute('aria-invalid');
      err.hidden = true;
      mailLink.href = 'mailto:' + EMAIL +
        '?subject=' + encodeURIComponent('طلب عرض سعر لمصعد') +
        '&body=' + encodeURIComponent(compose());
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var isAr = html.getAttribute('dir') === 'rtl';
      var f = form.elements;

      var required = [
        [f.name,  isAr ? 'الرجاء إدخال الاسم.'      : 'Please enter your name.'],
        [f.phone, isAr ? 'الرجاء إدخال رقم الهاتف.' : 'Please enter your phone number.'],
        [f.area,  isAr ? 'الرجاء إدخال المنطقة.'    : 'Please enter your area.']
      ];
      for (var i = 0; i < required.length; i++) {
        if (!required[i][0].value.trim()) { showError(required[i][1], required[i][0]); return; }
      }
      if (f.phone.value.replace(/\D/g, '').length < 6) {
        showError(isAr ? 'رقم الهاتف غير صحيح.' : 'That phone number looks too short.', f.phone);
        return;
      }

      showError('', null);
      window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(compose()), '_blank', 'noopener');
    });
  }

  /* ── 8. footer year ──────────────────────────────────── */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
