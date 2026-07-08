/* Error Intelligence Center — поведение (R2.02): поиск по хабу + аналитика.
   Контент полностью работает без JS: поиск — прогрессивное улучшение. */
(function () {
  'use strict';
  var YM = window.KAZNA_METRIKA_ID || 86763493;
  function goal(name, params) {
    try { if (typeof window.ym === 'function') window.ym(YM, 'reachGoal', name, params || {}); } catch (e) { /* noop */ }
  }

  /* просмотр страницы ошибки */
  var errPage = document.body.getAttribute('data-error-page');
  if (errPage) goal('error_view', { slug: errPage });

  /* клики: категории / related / CTA (делегированно, поверх nav.js-целей) */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-nav-location]');
    if (!el) return;
    var loc = el.getAttribute('data-nav-location');
    var label = el.getAttribute('data-nav-label') || '';
    if (loc === 'error_category') goal('error_category_click', { label: label });
    else if (loc === 'error_related' || loc === 'error_article' || loc === 'error_doc') goal('error_related_click', { label: label, kind: loc });
    else if (loc === 'error_money') goal('error_cta_click', { kind: 'service', label: label });
    if (el.hasAttribute('data-cta') && (loc === 'error_page' || loc === 'error_hub')) goal('error_cta_click', { kind: 'form' });
  }, { passive: true });

  /* поиск по хабу */
  var input = document.getElementById('oeSearch');
  if (!input) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.oe-card'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.oe-catsec, .oe-popular, .oe-updates'));
  var note = document.createElement('p');
  note.className = 'oe-noresults';
  note.hidden = true;
  note.innerHTML = 'Ничего не нашлось. Опишите ситуацию нам — <a href="/#form" data-cta data-cta-intent="error_fix" data-nav-location="error_hub">разберём бесплатно</a>.';
  input.closest('.oe-search').appendChild(note);

  var t = null;
  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase();
    clearTimeout(t);
    t = setTimeout(function () { if (q.length > 2) goal('error_search', { query: q.slice(0, 60) }); }, 800);

    if (!q) {
      cards.forEach(function (c) { c.classList.remove('is-hidden'); });
      sections.forEach(function (s) { s.classList.remove('is-hidden'); });
      note.hidden = true;
      return;
    }
    var words = q.split(/\s+/).filter(Boolean);
    var shown = 0;
    cards.forEach(function (c) {
      var hay = (c.textContent + ' ' + (c.getAttribute('data-kw') || '')).toLowerCase();
      var hit = words.every(function (w) { return hay.indexOf(w) !== -1; });
      c.classList.toggle('is-hidden', !hit);
      if (hit) shown++;
    });
    sections.forEach(function (s) {
      var any = s.querySelector('.oe-card:not(.is-hidden)');
      s.classList.toggle('is-hidden', !any && !s.classList.contains('oe-updates') ? true : !any);
    });
    note.hidden = shown > 0;
  });
})();
