/* Document Center — поведение (R2.03): поиск по хабу + document_* цели. */
(function () {
  'use strict';
  var YM = window.KAZNA_METRIKA_ID || 86763493;
  function goal(n, p) { try { if (typeof window.ym === 'function') window.ym(YM, 'reachGoal', n, p || {}); } catch (e) {} }

  var page = document.body.getAttribute('data-doc-page');
  if (page) goal('document_view', { slug: page });

  document.addEventListener('click', function (e) {
    var dl = e.target.closest('[data-doc-download]');
    if (dl) { goal('document_download', { slug: dl.getAttribute('data-doc-slug'), format: dl.getAttribute('data-doc-download'), place: (dl.closest('.dd-downloads') || {}).getAttribute ? dl.closest('.dd-downloads').getAttribute('data-place') : '' }); return; }
    var el = e.target.closest('[data-nav-location]');
    if (!el) return;
    var loc = el.getAttribute('data-nav-location'), label = el.getAttribute('data-nav-label') || '';
    if (loc === 'doc_category') goal('document_related_click', { kind: 'category', label: label });
    else if (loc === 'doc_related' || loc === 'doc_hub') goal('document_related_click', { kind: loc, label: label });
    else if (loc === 'doc_money') goal('document_cta_click', { kind: 'service', label: label });
    if (el.hasAttribute('data-cta') && (loc === 'doc_page' || loc === 'doc_hub')) goal('document_cta_click', { kind: 'form' });
  }, { passive: true });

  /* просмотр истории версий */
  var vers = document.getElementById('versii');
  if (page && vers && 'IntersectionObserver' in window) {
    var seen = false;
    new IntersectionObserver(function (en) {
      if (!seen && en[0].isIntersecting) { seen = true; goal('document_version_view', { slug: page }); }
    }, { threshold: 0.4 }).observe(vers);
  }

  /* поиск по хабу документов */
  var input = document.getElementById('ddSearch');
  if (!input) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.oe-card'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.oe-catsec, .oe-popular, .oe-updates'));
  var note = document.createElement('p');
  note.className = 'oe-noresults'; note.hidden = true;
  note.innerHTML = 'Не нашли документ? <a href="/#form" data-cta data-cta-intent="docs_help" data-nav-location="doc_hub">Подготовим под вашу ситуацию</a>.';
  input.closest('.oe-search').appendChild(note);
  var t = null;
  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase();
    clearTimeout(t);
    t = setTimeout(function () { if (q.length > 2) goal('document_search', { query: q.slice(0, 60) }); }, 800);
    if (!q) {
      cards.forEach(function (c) { c.classList.remove('is-hidden'); });
      sections.forEach(function (s) { s.classList.remove('is-hidden'); });
      note.hidden = true; return;
    }
    var words = q.split(/\s+/).filter(Boolean), shown = 0;
    cards.forEach(function (c) {
      var hay = (c.textContent + ' ' + (c.getAttribute('data-kw') || '')).toLowerCase();
      var hit = words.every(function (w) { return hay.indexOf(w) !== -1; });
      c.classList.toggle('is-hidden', !hit); if (hit) shown++;
    });
    sections.forEach(function (s) { s.classList.toggle('is-hidden', !s.querySelector('.oe-card:not(.is-hidden)')); });
    note.hidden = shown > 0;
  });
})();
