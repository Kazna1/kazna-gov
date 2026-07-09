/* Тематические экспертные центры — поведение (R2.06): поиск + фильтр по типу, цели hub_*. */
(function () {
  'use strict';
  var YM = window.KAZNA_METRIKA_ID || 86763493;
  function goal(n, p) { try { if (typeof window.ym === 'function') window.ym(YM, 'reachGoal', n, p || {}); } catch (e) {} }

  var hub = document.body.getAttribute('data-hub-page');
  if (!hub) return;
  goal('hub_view', { hub: hub });

  document.addEventListener('click', function (e) {
    var ex = e.target.closest('[data-faq-expand]');
    if (ex) {
      ex.closest('.oe-catsec').classList.add('is-expanded');
      ex.setAttribute('aria-expanded', 'true');
      goal('hub_related_click', { hub: hub, kind: 'expand' });
      return;
    }
    var fl = e.target.closest('[data-hub-filter]');
    if (fl) { applyFilter(fl.getAttribute('data-hub-filter')); return; }
    var el = e.target.closest('[data-nav-location]');
    if (!el) return;
    var loc = el.getAttribute('data-nav-location'), label = el.getAttribute('data-nav-label') || '';
    if (loc === 'hub_entity') goal('hub_entity_click', { hub: hub, label: label.slice(0, 80) });
    else if (loc === 'hub_money') goal('hub_money_click', { hub: hub, label: label });
    else if (loc === 'hub_related') goal('hub_related_click', { hub: hub, label: label.slice(0, 80) });
    if (el.hasAttribute('data-cta')) goal('hub_cta_click', { hub: hub });
  }, { passive: true });

  var input = document.getElementById('hbSearch');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.oe-card, .gl-chip[data-etype]'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.oe-catsec'));
  var filters = Array.prototype.slice.call(document.querySelectorAll('[data-hub-filter]'));
  var activeType = '';

  function apply() {
    var q = (input && input.value.trim().toLowerCase()) || '';
    var words = q.split(/\s+/).filter(Boolean);
    cards.forEach(function (c) {
      var hay = (c.textContent + ' ' + (c.getAttribute('data-kw') || '')).toLowerCase();
      var hitQ = !words.length || words.every(function (w) { return hay.indexOf(w) !== -1; });
      var hitT = !activeType || c.getAttribute('data-etype') === activeType;
      c.classList.toggle('is-hidden', !(hitQ && hitT));
    });
    sections.forEach(function (s) {
      var inner = s.querySelectorAll('.oe-card, .gl-chip[data-etype]');
      if (!inner.length) { s.classList.toggle('is-hidden', !!activeType); return; }
      var has = s.querySelector('.oe-card:not(.is-hidden), .gl-chip[data-etype]:not(.is-hidden)');
      s.classList.toggle('is-hidden', !has);
      s.classList.toggle('is-searching', !!(q || activeType));
    });
  }
  function applyFilter(v) {
    activeType = (v === activeType) ? '' : v;
    filters.forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-hub-filter') === activeType || (!activeType && b.getAttribute('data-hub-filter') === '')); });
    goal('hub_filter', { hub: hub, type: activeType || 'all' });
    apply();
  }
  if (input) {
    var t = null;
    input.addEventListener('input', function () {
      clearTimeout(t);
      var q = input.value.trim();
      t = setTimeout(function () { if (q.length > 2) goal('hub_search', { hub: hub, query: q.slice(0, 80).toLowerCase() }); }, 800);
      apply();
    });
  }
})();
