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

  function boot() { initToggle(); init(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
