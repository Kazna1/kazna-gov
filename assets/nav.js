/* ============================================================
   kazna-gov.ru — поведение единой навигации. R1.04.
   Только поведение: все ссылки работают без JS.
   Зоны ответственности: dropdown, mobile drawer, ESC/outside close,
   aria-expanded, focus management, scroll-lock, аналитика по data-атрибутам.
   ============================================================ */
(function () {
  'use strict';

  var header = document.getElementById('kzHeader');
  if (!header) return;

  /* ---------- тень при скролле (compositor-friendly, без layout) ---------- */
  var ticking = false;
  addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        header.classList.toggle('is-scrolled', scrollY > 8);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  /* ---------- desktop dropdowns ---------- */
  var items = Array.prototype.slice.call(header.querySelectorAll('.kznav__item--sub'));

  function closeItem(item) {
    item.classList.remove('is-open');
    var btn = item.querySelector('[aria-expanded]');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
  function closeAll(except) {
    items.forEach(function (it) { if (it !== except) closeItem(it); });
  }

  items.forEach(function (item) {
    var btn = item.querySelector('.kznav__link[aria-controls]');
    if (!btn) return;
    var hoverOpenedAt = 0;

    btn.addEventListener('click', function () {
      /* если панель только что открыл hover-intent — клик не должен её схлопнуть */
      if (item.classList.contains('is-open') && Date.now() - hoverOpenedAt < 500) {
        btn.setAttribute('aria-expanded', 'true');
        return;
      }
      var open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      closeAll(item);
    });

    /* hover-intent на устройствах с курсором; клик остаётся для тача/клавиатуры */
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var t;
      item.addEventListener('mouseenter', function () {
        t = setTimeout(function () {
          closeAll(item);
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
          hoverOpenedAt = Date.now();
        }, 120);
      });
      item.addEventListener('mouseleave', function () {
        clearTimeout(t);
        setTimeout(function () {
          if (!item.matches(':hover')) closeItem(item);
        }, 180);
      });
    }
  });

  /* закрытие по клику вне и по Tab за пределы */
  document.addEventListener('click', function (e) {
    if (!header.contains(e.target)) closeAll(null);
  });
  document.addEventListener('focusin', function (e) {
    if (!header.contains(e.target)) closeAll(null);
  });

  /* ---------- mobile drawer ---------- */
  var drawer = document.getElementById('kzDrawer');
  var burger = document.getElementById('kzBurger');
  var lastFocus = null;

  function drawerOpen() {
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('kz-scroll-lock');
    document.body.classList.add('kz-scroll-lock');
    var closeBtn = drawer.querySelector('.kzdrawer__close');
    if (closeBtn) closeBtn.focus();
  }
  function drawerClose() {
    drawer.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('kz-scroll-lock');
    document.body.classList.remove('kz-scroll-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (drawer && burger) {
    burger.addEventListener('click', function () {
      drawer.classList.contains('is-open') ? drawerClose() : drawerOpen();
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('[data-drawer-close]')) drawerClose();
      /* переход по ссылке внутри drawer закрывает его */
      if (e.target.closest('a[href]')) drawerClose();
    });

    /* аккордеоны внутри drawer */
    drawer.querySelectorAll('.kzdrawer__acc').forEach(function (acc) {
      acc.addEventListener('click', function () {
        var open = acc.getAttribute('aria-expanded') === 'true';
        /* один открытый аккордеон за раз */
        drawer.querySelectorAll('.kzdrawer__acc').forEach(function (a) {
          a.setAttribute('aria-expanded', 'false');
        });
        acc.setAttribute('aria-expanded', String(!open));
      });
    });

    /* focus-ловушка внутри drawer */
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !drawer.classList.contains('is-open')) return;
      var focusables = drawer.querySelectorAll('a[href], button:not([disabled])');
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- ESC закрывает всё ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (drawer && drawer.classList.contains('is-open')) { drawerClose(); return; }
    var openItem = items.find ? items.find(function (it) { return it.classList.contains('is-open'); })
                              : items.filter(function (it) { return it.classList.contains('is-open'); })[0];
    if (openItem) {
      closeItem(openItem);
      var btn = openItem.querySelector('.kznav__link[aria-controls]');
      if (btn) btn.focus();
    }
  });

  /* ---------- аналитика: делегированная отправка целей Метрики ----------
     Разметка — data-атрибуты (data-nav-click / data-cta и т.д.).
     Если счётчик недоступен — молча пропускаем, ссылки работают как обычно. */
  var YM_ID = window.KAZNA_METRIKA_ID || 86763493;
  function goal(name, params) {
    try { if (typeof window.ym === 'function') window.ym(YM_ID, 'reachGoal', name, params || {}); } catch (e) { /* не мешаем навигации */ }
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-nav-click], [data-cta]');
    if (!el) return;
    if (el.hasAttribute('data-cta')) {
      goal('cta_click', { intent: el.getAttribute('data-cta-intent') || '', location: el.getAttribute('data-nav-location') || '' });
    } else {
      goal('nav_click', {
        label: el.getAttribute('data-nav-label') || el.textContent.trim().slice(0, 40),
        location: el.getAttribute('data-nav-location') || '',
        intent: el.getAttribute('data-nav-intent') || ''
      });
    }
  }, { passive: true });
})();

/* R3: интерактивная сетка футера — свечение за курсором (канон главной) */
(function () {
  var f = document.getElementById('kzFooter');
  if (!f || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var raf = null;
  f.addEventListener('mousemove', function (e) {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      var r = f.getBoundingClientRect();
      f.style.setProperty('--fx', (e.clientX - r.left) + 'px');
      f.style.setProperty('--fy', (e.clientY - r.top) + 'px');
      raf = null;
    });
  }, { passive: true });
})();
