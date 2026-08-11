/**
 * attribution.js — сквозной захват источника лида для kazna-gov.ru / kaznaexpert.ru.
 * First-touch + last-touch: utm_*, yclid, gclid, referrer.
 * Хранение: localStorage (90 дней), фолбэк cookie.
 * Отдача: скрытые поля во все <form> при submit + window.kaznaAttribution()
 * для JS-отправок на api.kazna-gov.ru (fetch/XHR — добавить поля в payload вручную).
 * Подключение: <script src="/assets/attribution.js" defer></script> через
 * site/partials/scripts-common.html (НЕ инлайном в страницы).
 */
(function () {
  'use strict';

  var KEY = 'kazna_attr';
  var TTL_DAYS = 90;
  var PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'];

  function now() { return Date.now(); }

  function readStore() {
    try {
      var raw = localStorage.getItem(KEY) || getCookie(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.ts || now() - data.ts > TTL_DAYS * 864e5) return null;
      return data;
    } catch (e) { return null; }
  }

  function writeStore(data) {
    var raw = JSON.stringify(data);
    try { localStorage.setItem(KEY, raw); } catch (e) { /* private mode */ }
    setCookie(KEY, raw, TTL_DAYS);
  }

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setCookie(name, value, days) {
    var d = new Date(now() + days * 864e5);
    document.cookie = name + '=' + encodeURIComponent(value) +
      '; expires=' + d.toUTCString() + '; path=/; SameSite=Lax; Secure';
  }

  function captureCurrent() {
    var qs = new URLSearchParams(location.search);
    var touch = {};
    var has = false;
    PARAMS.forEach(function (p) {
      var v = qs.get(p);
      if (v) { touch[p] = v.slice(0, 200); has = true; }
    });
    // Органика/рефералы без меток: фиксируем источник по referrer
    if (!has && document.referrer) {
      try {
        var host = new URL(document.referrer).hostname;
        if (host && host !== location.hostname) {
          touch.utm_source = host;
          touch.utm_medium = 'referral';
          has = true;
        }
      } catch (e) { /* ignore */ }
    }
    if (!has) return null;
    touch.landing = location.pathname.slice(0, 200);
    touch.ts = now();
    return touch;
  }

  function update() {
    var store = readStore() || { ts: now(), first: null, last: null };
    var touch = captureCurrent();
    if (touch) {
      if (!store.first) store.first = touch;
      store.last = touch; // last-touch перезаписывается каждым новым источником
      store.ts = now();
      writeStore(store);
    } else if (!readStore() && store.first) {
      writeStore(store);
    }
    return store;
  }

  /** Плоский объект для передачи в lead.php / CRM. */
  function flat() {
    var s = readStore() || {};
    var out = {};
    var last = s.last || {};
    var first = s.first || {};
    PARAMS.forEach(function (p) { if (last[p]) out[p] = last[p]; });
    out.first_utm_source = first.utm_source || '';
    out.first_landing = first.landing || '';
    out.attribution_ts = last.ts ? new Date(last.ts).toISOString() : '';
    return out;
  }

  function injectInto(form) {
    var data = flat();
    Object.keys(data).forEach(function (name) {
      if (!data[name]) return;
      var input = form.querySelector('input[name="' + name + '"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        form.appendChild(input);
      }
      input.value = data[name];
    });
  }

  update();

  // Скрытые поля во все формы в момент submit (ловим и динамические формы)
  document.addEventListener('submit', function (e) {
    if (e.target && e.target.tagName === 'FORM') injectInto(e.target);
  }, true);

  // Для JS-отправок: Object.assign(payload, window.kaznaAttribution())
  window.kaznaAttribution = flat;
})();
