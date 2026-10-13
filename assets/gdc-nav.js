/* Primary nav menus. One open at a time; Escape, outside click and blur close.
   No dependencies, no framework, safe to load with defer on every page. */
(function () {
  function init() {
    var menus = [].slice.call(document.querySelectorAll('.navmenu'));
    if (!menus.length) return;

    function close(menu) {
      var btn = menu.querySelector('button');
      var panel = menu.querySelector('.navmenu-panel');
      if (!btn || !panel) return;
      btn.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
    }
    /* A wide panel anchored to its button can run off the left edge on a
       narrow laptop. Nudge it back so it always sits 16px inside the window. */
    function keepInView(panel) {
      if (!panel.classList.contains('navmenu-wide')) return;
      panel.style.translate = '';
      var r = panel.getBoundingClientRect();
      if (r.left < 16) panel.style.translate = (16 - r.left) + 'px 0';
      else if (r.right > window.innerWidth - 16) panel.style.translate = (window.innerWidth - 16 - r.right) + 'px 0';
    }
    function closeAll(except) {
      menus.forEach(function (m) { if (m !== except) close(m); });
    }

    menus.forEach(function (menu) {
      var btn = menu.querySelector('button');
      var panel = menu.querySelector('.navmenu-panel');
      if (!btn || !panel) return;
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = btn.getAttribute('aria-expanded') === 'true';
        closeAll(menu);
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel.hidden = open;
        if (!open) keepInView(panel);
      });

      btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          closeAll(menu);
          btn.setAttribute('aria-expanded', 'true');
          panel.hidden = false;
          var first = panel.querySelector('a');
          if (first) first.focus();
        }
      });

      menu.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { close(menu); btn.focus(); }
      });

      menu.addEventListener('focusout', function (e) {
        if (!menu.contains(e.relatedTarget)) close(menu);
      });
    });

    document.addEventListener('click', function (e) {
      menus.forEach(function (m) { if (!m.contains(e.target)) close(m); });
    });
  }


  /* Mobile: collapse the primary nav behind a Menu button under 1024px.
     "Book a call" stays visible in the bar; everything else opens below. */
  function initToggle() {
    var navs = [].slice.call(document.querySelectorAll('nav[aria-label="Primary"]'));
    navs.forEach(function (nav, i) {
      var bar = nav.parentElement;
      if (!bar || bar.querySelector('.navtoggle')) return;
      if (!nav.id) nav.id = 'primary-nav' + (i ? '-' + i : '');
      bar.classList.add('has-navtoggle');
      var t = document.createElement('button');
      t.type = 'button';
      t.className = 'navtoggle';
      t.setAttribute('aria-expanded', 'false');
      t.setAttribute('aria-controls', nav.id);
      t.innerHTML = '<span class="navtoggle-bars" aria-hidden="true"></span><span class="navtoggle-label">Menu</span>';
      bar.insertBefore(t, nav);
      function set(open) {
        bar.classList.toggle('nav-open', open);
        t.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      t.addEventListener('click', function () { set(!bar.classList.contains('nav-open')); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && bar.classList.contains('nav-open')) { set(false); t.focus(); }
      });
      window.addEventListener('resize', function () {
        if (window.innerWidth > 1024 && bar.classList.contains('nav-open')) set(false);
      });
    });
  }

  /* Mobile action bar (12 Oct 2026). One sticky action under 760px, shown
     once the visitor has scrolled past the opening screen and hidden again
     when the page's own closing call to action or the footer is in view.
     The action follows the visitor's temperature: reading pages offer the
     free diagnostic, buying pages offer the call. Pages that already carry
     their own bar (.m-cta) or have one job of their own are skipped. */
  var BUY = ['obd', 'executive-coaching', 'coaching-engagement', 'schools', 'schools/rates',
    'products', 'goodestart', 'building-the-bench', 'know-thyself', 'owners-manual',
    'psychological-safety', 'diagnostic/bottleneck', 'diagnostic/drift', 'diagnostic/growth-gap',
    'diagnostic/stall', 'diagnostic/new-seat'];
  var SKIP = ['diagnostic', 'diagnostic/readout', 'diagnostic/share', 'booked', 'downloads',
    'privacy', 'terms', 'ps-tool', 'couldnt-have-been-an-email', 'couldnt-have-been-an-email/thanks',
    'field-tested/sampler', 'field-tested/sampler/thanks', 'no-average-brain/chapter',
    'school-meeting-forms', 'eighth-idea', 'clutch/review', 'free'];
  function initActionBar() {
    if (document.querySelector('.m-cta')) return;
    var path = location.pathname.replace(/^\/+|\/+$/g, '').replace(/index\.html$/, '').replace(/\/$/, '');
    if (SKIP.indexOf(path) !== -1 || /404/.test(path)) return;
    var slug = (path || 'home').replace(/\//g, '-');
    var buy = BUY.indexOf(path) !== -1;
    var bar = document.createElement('div');
    bar.className = 'm-cta m-cta-auto';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = buy
      ? '<span>Thirty minutes, then decide.</span><a class="btn" tabindex="-1" href="https://calendly.com/matt-thatsgoodedesign/chatt-with-matt?utm_content=' + slug + '-sticky">Book a call</a>'
      : '<span>Where is your system slipping?</span><a class="btn" tabindex="-1" href="/diagnostic/?src=' + slug + '-sticky#doors">Free diagnostic</a>';
    document.body.appendChild(bar);
    if (!('IntersectionObserver' in window)) return;
    var stops = [].slice.call(document.querySelectorAll('.book-call, .lab, footer, .hero-doors'));
    var stopIn = {}, scrolled = false;
    function set() {
      var anyStop = Object.keys(stopIn).some(function (k) { return stopIn[k]; });
      bar.classList.toggle('show', scrolled && !anyStop);
    }
    stops.forEach(function (el, i) {
      new IntersectionObserver(function (es) { stopIn[i] = es[0].isIntersecting; set(); }).observe(el);
    });
    function onScroll() { var s = window.scrollY > window.innerHeight * 0.8; if (s !== scrolled) { scrolled = s; set(); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function boot() { initToggle(); init(); initActionBar(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
