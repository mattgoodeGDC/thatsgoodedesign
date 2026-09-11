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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
