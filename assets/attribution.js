/**
 * attribution.js — сквозной захват источника лида для kazna-gov.ru / kaznaexpert.ru.
 * First-touch + last-touch: utm_*, yclid, gclid, referrer.
 * Хранение: localStorage (90 дней), фолбэк cookie.
 * Отдача:
 *   1) скрытые поля во все <form> при submit;
 *   2) АВТОМАТИЧЕСКОЕ обогащение JSON-payload для fetch/XHR на api.kazna-gov.ru
 *      (эндпоинты /api/contact и /api/lead*) — ручной Object.assign больше не нужен;
 *   3) window.kaznaAttribution() — если payload собирается где-то вручную.
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

  // --- Автоматическое обогащение JSON-payload лид-эндпоинтов --------------
  // Формы отправляются через fetch на api.kazna-gov.ru и раньше теряли атрибуцию:
  // скрытые поля из injectInto() в JSON-body не попадают. Перехватываем отправку
  // и дописываем недостающие поля сами. Существующие непустые значения не трогаем.

  var LEAD_PATH = /^\/api\/(contact|lead)/;

  function isLeadUrl(url) {
    try {
      var u = new URL(url, location.href);
      if (u.hostname !== 'api.kazna-gov.ru' && u.hostname !== location.hostname) return false;
      return LEAD_PATH.test(u.pathname);
    } catch (e) { return false; }
  }

  /** Дописать атрибуцию + контекст страницы в объект payload (не перетирая заполненное). */
  function enrich(payload) {
    var attr = flat();
    Object.keys(attr).forEach(function (k) {
      if (attr[k] && !payload[k]) payload[k] = attr[k];
    });
    if (!payload.page_url) payload.page_url = location.href.slice(0, 500);
    if (!payload.page_title) payload.page_title = (document.title || '').slice(0, 200);
    // Referer-заголовок до кросс-доменного API доезжает только как origin,
    // поэтому реальный реферер кладём в тело.
    if (!payload.referrer && document.referrer) payload.referrer = document.referrer.slice(0, 500);
    return payload;
  }

  /** Обогатить JSON-строку тела запроса. Любая ошибка — возвращаем исходник. */
  function enrichBody(body) {
    if (typeof body !== 'string') return body;
    var s = body.trim();
    if (s.charAt(0) !== '{') return body;
    try {
      var payload = JSON.parse(s);
      if (!payload || typeof payload !== 'object') return body;
      return JSON.stringify(enrich(payload));
    } catch (e) { return body; }
  }

  // fetch
  if (typeof window.fetch === 'function') {
    var origFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        var url = (typeof input === 'string') ? input : (input && input.url);
        var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        if (method === 'POST' && url && isLeadUrl(url) && init && typeof init.body === 'string') {
          init = Object.assign({}, init, { body: enrichBody(init.body) });
        }
      } catch (e) { /* никогда не блокируем отправку */ }
      return origFetch.call(this, input, init);
    };
  }

  // XMLHttpRequest — на случай старых форм
  if (window.XMLHttpRequest && XMLHttpRequest.prototype.send) {
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      try {
        this.__kgLead = String(method).toUpperCase() === 'POST' && isLeadUrl(url);
      } catch (e) { this.__kgLead = false; }
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
      try {
        if (this.__kgLead && typeof body === 'string') body = enrichBody(body);
      } catch (e) { /* ignore */ }
      return origSend.call(this, body);
    };
  }
})();
