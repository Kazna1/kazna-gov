/* FAQ Intelligence Center — поведение (R2.05): естественный поиск + faq_* цели. */
(function () {
  'use strict';
  var YM = window.KAZNA_METRIKA_ID || 86763493;
  function goal(n, p) { try { if (typeof window.ym === 'function') window.ym(YM, 'reachGoal', n, p || {}); } catch (e) {} }

  var page = document.body.getAttribute('data-faq-page');
  if (page) goal('faq_view', { slug: page, intent: document.body.getAttribute('data-faq-intent') || '' });

  document.addEventListener('click', function (e) {
    var ex = e.target.closest('[data-faq-expand]');
    if (ex) {
      var sec = ex.closest('.oe-catsec');
      sec.classList.add('is-expanded');
      ex.setAttribute('aria-expanded', 'true');
      goal('faq_expand', { category: ex.getAttribute('data-faq-expand') });
      return;
    }
    var el = e.target.closest('[data-nav-location]');
    if (!el) return;
    var loc = el.getAttribute('data-nav-location'), label = el.getAttribute('data-nav-label') || '';
    if (loc === 'faq_related' || loc === 'faq_hub' || loc === 'faq_category') goal('faq_related_click', { kind: loc, label: label.slice(0, 80) });
    else if (loc === 'faq_money') goal('faq_cta_click', { kind: 'service', label: label });
    if (el.hasAttribute('data-cta') && (loc === 'faq_page' || loc === 'faq_hub')) goal('faq_cta_click', { kind: 'form' });
  }, { passive: true });

  /* хаб: поиск с пониманием разговорных формулировок */
  var input = document.getElementById('fqSearch');
  if (!input) return;
  /* синонимы: расширяют запрос до канонической лексики карточек (data-kw = вопрос + алиасы) */
  var SYN = {
    'платежка': 'платеж поручение распоряжение', 'платёжка': 'платеж поручение распоряжение',
    'не проходит': 'вернул возврат отказ', 'не пропускает': 'вернул возврат отказ', 'не принимает': 'вернул возврат отказ',
    'застрял': 'висит задержка', 'завис': 'висит задержка',
    'деньги': 'средства', 'забрать': 'вывести вывод', 'снять': 'вывести вывод',
    'уфк': 'казначейство', 'казначейство': 'уфк',
    'эб': 'электронный бюджет гиис', 'гиис': 'электронный бюджет',
    'подпись': 'эцп укэп сертификат', 'эцп': 'подпись сертификат',
    'счет': 'счёт', 'открыть': 'открытие', 'закрыть': 'закрытие',
    'ошибка': 'вернул исправить', 'заблокировали': 'блокировка приостановление',
    'igk': 'игк', 'ндс': 'налог', 'зп': 'зарплата', 'аренда': 'аренду'
  };
  function expand(q) {
    var words = q.split(/\s+/).filter(Boolean);
    return words.map(function (w) { return SYN[w] ? w + ' ' + SYN[w] : w; });
  }
  var cards = Array.prototype.slice.call(document.querySelectorAll('.oe-card'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.oe-catsec, .oe-popular'));
  var note = document.createElement('p');
  note.className = 'oe-noresults'; note.hidden = true;
  note.innerHTML = 'Не нашли ответ? <a href="/#form" data-cta data-cta-intent="faq_help" data-nav-location="faq_hub">Задайте вопрос специалисту</a> — ответим и добавим в базу.';
  input.closest('.oe-search').appendChild(note);

  var t = null;
  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase();
    clearTimeout(t);
    t = setTimeout(function () { if (q.length > 2) goal('faq_search', { query: q.slice(0, 80) }); }, 800);
    if (!q) {
      cards.forEach(function (c) { c.classList.remove('is-hidden'); });
      sections.forEach(function (s) { s.classList.remove('is-hidden', 'is-searching'); });
      note.hidden = true; return;
    }
    var groups = expand(q), shown = 0; /* каждый терм запроса: достаточно совпадения одного из синонимов */
    cards.forEach(function (c) {
      var hay = (c.textContent + ' ' + (c.getAttribute('data-kw') || '')).toLowerCase();
      var hit = groups.every(function (g) {
        return g.split(' ').some(function (w) { return w.length > 1 && hay.indexOf(w) !== -1; });
      });
      c.classList.toggle('is-hidden', !hit); if (hit) shown++;
    });
    sections.forEach(function (s) {
      var has = s.querySelector('.oe-card:not(.is-hidden)');
      s.classList.toggle('is-hidden', !has);
      s.classList.toggle('is-searching', !!has);
    });
    note.hidden = shown > 0;
  });
})();
