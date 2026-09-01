/* ==========================================================================
   kg-lead.js — конверсионный слой статей блога kazna-gov.ru
     1. Вставляет мид-форму после первой трети статьи
     2. Убирает cookie-бар и мобильную панель, пока виден блок заявки
     3. Шлёт события фокуса по полям обеих форм, чтобы видеть реальный отвал
   Подключается одной строкой с defer. HTML статей не меняется.
   ========================================================================== */
(function () {
  'use strict';

  var ENDPOINT = 'https://api.kazna-gov.ru/api/contact';
  var PHONE_DISPLAY = '+7 (495) 108-42-32';
  var POLICY_URL = 'https://kazna-gov.ru/personal_data_policy';

  /* --- цель Метрики. window.ym читаем каждый раз: при отказе от cookies
         существующий код подменяет его пустышкой, и отказ соблюдается --- */
  function goal(name, params) {
    try {
      var id = window.kgYmId || window.KAZNA_METRIKA_ID || 86763493;
      if (typeof window.ym === 'function') window.ym(id, 'reachGoal', name, params || {});
    } catch (e) {}
  }

  /* ---------------------------------------------------------------- телефон */
  function digits(s) { return (s || '').replace(/\D+/g, ''); }

  function normalize(d) {
    if (!d) return '';
    if (d.charAt(0) === '7' || d.charAt(0) === '8') d = d.slice(1);
    return '7' + d.slice(0, 10);
  }

  function format(d) {
    if (!d) return '';
    var p = '+7';
    if (d.length > 1) p += ' (' + d.slice(1, 4);
    if (d.length >= 4) p += ')';
    if (d.length >= 5) p += ' ' + d.slice(4, 7);
    if (d.length >= 8) p += '-' + d.slice(7, 9);
    if (d.length >= 10) p += '-' + d.slice(9, 11);
    return p;
  }

  function bindPhoneMask(input) {
    function apply() { input.value = format(normalize(digits(input.value))); }
    input.addEventListener('focus', function () { if (!input.value) input.value = '+7 '; });
    input.addEventListener('input', apply);
    input.addEventListener('blur', function () { if (digits(input.value).length <= 1) input.value = ''; });
    input.addEventListener('paste', function (e) {
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData('text');
      input.value = format(normalize(digits(t)));
    });
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      var pos = input.selectionStart;
      if (pos !== input.selectionEnd) return;
      var val = input.value, back = e.key === 'Backspace';
      var i = back ? pos - 1 : pos;
      while (i >= 0 && i < val.length) {
        var c = val.charCodeAt(i);
        if (c >= 48 && c <= 57) break;
        i += back ? -1 : 1;
      }
      if (i < 0 || i >= val.length) return;
      e.preventDefault();
      input.value = val.slice(0, i) + val.slice(i + 1);
      apply();
    });
  }

  /* ------------------------------------------------- 3. события по полям --- */
  /* Цель full_form_start сейчас висит на появлении секции в зоне видимости,
     то есть считает доскроллы, а не заполнение. Эти события дают настоящий
     первый контакт с полем — по ним видно, где именно человек бросает форму. */
  function trackFields(form, place) {
    var fired = {};
    ['name', 'phone', 'comment'].forEach(function (fieldName) {
      var el = form.querySelector('[name="' + fieldName + '"]');
      if (!el) return;
      el.addEventListener('focus', function () {
        if (fired['focus_' + fieldName]) return;
        fired['focus_' + fieldName] = true;
        goal('form_field_focus', { place: place, field: fieldName });
        if (!fired.started) {
          fired.started = true;
          goal('form_fill_started', { place: place });
        }
      });
      el.addEventListener('change', function () {
        if (!el.value.trim() || fired['filled_' + fieldName]) return;
        fired['filled_' + fieldName] = true;
        goal('form_field_filled', { place: place, field: fieldName });
      });
    });
    var consent = form.querySelector('[name="consent"]');
    if (consent) {
      consent.addEventListener('change', function () {
        if (!consent.checked || fired.consent) return;
        fired.consent = true;
        goal('form_consent_checked', { place: place });
      });
    }
  }

  /* ------------------------------------------------------ 1. мид-форма ---- */
  function buildMidForm(slug) {
    var wrap = document.createElement('section');
    wrap.className = 'kgmid';
    wrap.id = 'kgMidLead';
    wrap.setAttribute('data-nosnippet', '');
    wrap.innerHTML =
      '<div class="kgmid__label">Разбор вашей ситуации</div>' +
      '<h2 class="kgmid__title">Не тратьте время на теорию — покажем на вашем контракте</h2>' +
      '<p class="kgmid__sub">Посмотрим контракт, назовём ваше УФК, сроки и порядок действий. ' +
      'Ответ в течение часа в рабочее время. Без обязательств.</p>' +
      '<form class="kgmid__form" novalidate>' +
        '<div class="kgmid__row">' +
          '<input class="kgmid__input" name="name" placeholder="Имя" required minlength="2" maxlength="80" autocomplete="name">' +
          '<input class="kgmid__input" name="phone" type="tel" placeholder="+7 (___) ___-__-__" required autocomplete="tel" inputmode="tel">' +
          '<button class="kgmid__submit" type="submit">Получить разбор</button>' +
        '</div>' +
        '<label class="kgmid__policy">' +
          '<input type="checkbox" name="consent" required>' +
          '<span>Согласен на обработку персональных данных в соответствии с ' +
          '<a href="' + POLICY_URL + '" target="_blank" rel="noopener">политикой</a>.</span>' +
        '</label>' +
        '<div class="kgmid__msg" hidden></div>' +
      '</form>' +
      '<div class="kgmid__done">' +
        '<span class="kgmid__done-icon" aria-hidden="true">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</span>' +
        '<span>Заявка принята. Перезвоним в течение часа в рабочее время. ' +
        'Если срочно — <a href="tel:+74951084232">' + PHONE_DISPLAY + '</a>.</span>' +
      '</div>';

    var form = wrap.querySelector('form');
    var msg = wrap.querySelector('.kgmid__msg');
    var phone = form.phone;
    bindPhoneMask(phone);
    trackFields(form, 'mid');

    function show(text, ok) {
      msg.hidden = false;
      msg.textContent = text;
      msg.classList.remove('is-success', 'is-error');
      msg.classList.add(ok ? 'is-success' : 'is-error');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var d = digits(phone.value);
      form.name.classList.remove('is-invalid');
      phone.classList.remove('is-invalid');

      if (name.length < 2) { form.name.classList.add('is-invalid'); return show('Введите имя', false); }
      if (d.length !== 11 || d.charAt(0) !== '7') { phone.classList.add('is-invalid'); return show('Введите полный номер: +7 (___) ___-__-__', false); }
      if (!form.consent.checked) return show('Подтвердите согласие с политикой', false);

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Отправляем…';
      msg.hidden = true;

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          contact: '+' + d,
          message: 'Источник: article-mid/' + slug,
          consent_pd: true,
          consent_at: new Date().toISOString(),
          hp: ''
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          btn.disabled = false;
          btn.textContent = 'Получить разбор';
          if (res && res.success) {
            wrap.classList.add('is-sent');
            goal('lead_submitted_mid', { place: 'mid', slug: slug });
            goal('lead_submitted', { source: 'article-mid' });
          } else {
            show('Ошибка: ' + ((res && res.error) || 'не удалось отправить'), false);
          }
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'Получить разбор';
          show('Сеть недоступна. Позвоните ' + PHONE_DISPLAY + ' или напишите в Telegram.', false);
        });
    });

    return wrap;
  }

  function insertMidForm() {
    if (document.getElementById('kgMidLead')) return;
    var article = document.querySelector('article.kg-content');
    if (!article) return;

    /* только заголовки самого текста: служебные блоки (FAQ, похожие,
       финальная форма) лежат вне article.kg-content либо имеют свой класс */
    var heads = [].slice.call(article.querySelectorAll('h2')).filter(function (h) {
      return !h.closest('.kgmid, .kg-final, .kg-faq, .kg-related, .kg-discuss');
    });
    if (heads.length < 4) return; /* короткие статьи не разрезаем */

    /* точка вставки — примерно первая треть, но не первый и не последний H2 */
    var idx = Math.max(1, Math.min(heads.length - 2, Math.round(heads.length / 3)));
    var anchor = heads[idx];

    /* поднимаемся до прямого ребёнка article, чтобы вставка не попала внутрь
       таблицы, списка или карточки */
    var node = anchor;
    while (node.parentNode && node.parentNode !== article) node = node.parentNode;
    if (node.parentNode !== article) return;

    var slug = (location.pathname.replace(/\/+$/, '').split('/').pop() || 'article');
    article.insertBefore(buildMidForm(slug), node);

    /* показ мид-формы — отдельное событие, чтобы считать её конверсию */
    if ('IntersectionObserver' in window) {
      var seen = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting || seen) return;
          seen = true;
          goal('midform_view', { slug: slug });
          io.disconnect();
        });
      }, { threshold: 0.4 });
      io.observe(document.getElementById('kgMidLead'));
    }
  }

  /* ------------------------------- 2. cookie-бар и панель не мешают форме -- */
  function tuckOverlays() {
    if (!('IntersectionObserver' in window)) return;
    var targets = [document.getElementById('kgMidLead'), document.getElementById('form')].filter(Boolean);
    if (!targets.length) return;

    var bar = document.getElementById('kgCookieBar');
    var cta = document.getElementById('kgMobileCta');
    var dock = document.getElementById('kgDock');

    /* считаем множеством, а не счётчиком: в первом же вызове наблюдателя
       приходят все цели сразу, и инкремент/декремент в одном батче
       обнуляет результат */
    var shown = [];

    function apply() {
      var on = shown.length > 0;
      if (bar) bar.classList.toggle('kg-cookie-bar--tucked', on);
      if (cta) cta.classList.toggle('kg-mobile-cta--tucked', on);
      if (dock) dock.classList.toggle('kg-dock--tucked', on);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = shown.indexOf(en.target);
        if (en.isIntersecting && i === -1) shown.push(en.target);
        if (!en.isIntersecting && i !== -1) shown.splice(i, 1);
      });
      apply();
    }, { threshold: 0.15 });

    targets.forEach(function (t) { io.observe(t); });
  }

  /* --------------------------------------------------------------- запуск -- */
  function init() {
    try { insertMidForm(); } catch (e) {}
    try {
      var fin = document.getElementById('kgFinalForm');
      if (fin) trackFields(fin, 'final');
    } catch (e) {}
    try { tuckOverlays(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
