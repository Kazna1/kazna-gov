/* Glossary Intelligence Center — поведение (R2.04): поиск + алфавит на хабе, term_* цели. */
(function () {
  'use strict';
  var YM = window.KAZNA_METRIKA_ID || 86763493;
  function goal(n, p) { try { if (typeof window.ym === 'function') window.ym(YM, 'reachGoal', n, p || {}); } catch (e) {} }

  var page = document.body.getAttribute('data-term-page');
  if (page) goal('term_view', { slug: page });

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-nav-location]');
    if (!el) return;
    var loc = el.getAttribute('data-nav-location'), label = el.getAttribute('data-nav-label') || '';
    if (loc === 'term_related' || loc === 'term_hub' || loc === 'term_category') goal('term_related_click', { kind: loc, label: label });
    else if (loc === 'term_money') goal('term_cta_click', { kind: 'service', label: label });
    if (el.hasAttribute('data-cta') && (loc === 'term_page' || loc === 'term_hub')) goal('term_cta_click', { kind: 'form' });
  }, { passive: true });

  /* хаб: поиск + алфавитный фильтр */
  var input = document.getElementById('glSearch');
  if (!input) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.oe-card'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.oe-catsec, .oe-popular'));
  var letters = Array.prototype.slice.call(document.querySelectorAll('.gl-letter'));
  var activeLetter = '';
  var note = document.createElement('p');
  note.className = 'oe-noresults'; note.hidden = true;
  note.innerHTML = 'Не нашли термин? <a href="/#form" data-cta data-cta-intent="term_help" data-nav-location="term_hub">Спросите специалиста</a> — ответим и добавим в глоссарий.';
  input.closest('.oe-search').appendChild(note);

  function apply() {
    var q = input.value.trim().toLowerCase();
    var words = q.split(/\s+/).filter(Boolean), shown = 0;
    cards.forEach(function (c) {
      var hay = (c.textContent + ' ' + (c.getAttribute('data-kw') || '')).toLowerCase();
      var hitQ = !words.length || words.every(function (w) { return hay.indexOf(w) !== -1; });
      var hitL = !activeLetter || c.getAttribute('data-letter') === activeLetter;
      var hit = hitQ && hitL;
      c.classList.toggle('is-hidden', !hit); if (hit) shown++;
    });
    sections.forEach(function (s) { s.classList.toggle('is-hidden', !s.querySelector('.oe-card:not(.is-hidden)')); });
    note.hidden = shown > 0;
  }

  var t = null;
  input.addEventListener('input', function () {
    clearTimeout(t);
    var q = input.value.trim().toLowerCase();
    t = setTimeout(function () { if (q.length > 2) goal('term_search', { query: q.slice(0, 60) }); }, 800);
    apply();
  });

  letters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var L = btn.getAttribute('data-letter') || '';
      activeLetter = (L === activeLetter) ? '' : L;
      letters.forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-letter') === activeLetter && activeLetter !== ''); });
      if (activeLetter) goal('term_letter_click', { letter: activeLetter });
      apply();
    });
  });
})();
