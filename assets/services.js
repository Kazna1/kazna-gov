/* Service Entities — аналитика услуг (R2.08): цели service_*. */
(function () {
  'use strict';
  var YM = window.KAZNA_METRIKA_ID || 86763493;
  function goal(n, p) { try { if (typeof window.ym === 'function') window.ym(YM, 'reachGoal', n, p || {}); } catch (e) {} }

  var svc = document.body.getAttribute('data-service-page');
  if (!svc) return;
  goal('service_view', { service: svc });

  /* скролл до Knowledge Layer и до 80% страницы */
  var kn = document.getElementById('service-knowledge');
  var marks = { knowledge: false, deep: false };
  if ('IntersectionObserver' in window && kn) {
    new IntersectionObserver(function (en) {
      if (!marks.knowledge && en[0].isIntersecting) { marks.knowledge = true; goal('service_scroll', { service: svc, mark: 'knowledge' }); }
    }, { threshold: 0.1 }).observe(kn);
  }
  window.addEventListener('scroll', function onS() {
    if (marks.deep) { window.removeEventListener('scroll', onS); return; }
    var h = document.documentElement;
    if ((h.scrollTop + h.clientHeight) / h.scrollHeight > 0.8) {
      marks.deep = true; goal('service_scroll', { service: svc, mark: '80' });
      window.removeEventListener('scroll', onS);
    }
  }, { passive: true });

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-nav-location], [data-cta]');
    if (!el) return;
    var loc = el.getAttribute('data-nav-location') || '';
    var label = (el.getAttribute('data-nav-label') || '').slice(0, 80);
    var map = { service_tool: 'service_tool_click', service_document: 'service_document_click', service_error: 'service_error_click', service_pricing: 'service_pricing_click', service_faq: 'service_faq_click', service_case: 'service_case_click', service_related: 'service_cta_click' };
    if (map[loc]) goal(map[loc], { service: svc, label: label });
    if (el.hasAttribute('data-cta')) {
      var intent = el.getAttribute('data-cta-intent') || '';
      goal('service_cta_click', { service: svc, intent: intent });
      if (intent.indexOf('service_conversion') === 0) goal('service_conversion', { service: svc });
    }
  }, { passive: true });
})();
