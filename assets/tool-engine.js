/* Decision Engine — клиентский движок мастеров (R2.07): шаги, результат, tool_* цели. */
(function () {
  'use strict';
  var YM = window.KAZNA_METRIKA_ID || 86763493;
  function goal(n, p) { try { if (typeof window.ym === 'function') window.ym(YM, 'reachGoal', n, p || {}); } catch (e) {} }

  var tool = document.body.getAttribute('data-tool-page');
  var wizard = document.getElementById('toolWizard');
  var treeEl = document.getElementById('toolTree');
  if (!tool || !wizard || !treeEl) return;

  var tree;
  try { tree = JSON.parse(treeEl.textContent); } catch (e) { goal('tool_error', { tool: tool, err: 'tree-parse' }); return; }

  var path = [];      // [{node, label}]
  var started = false;

  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function render(nodeId) {
    var node = tree.nodes[nodeId];
    if (!node) { goal('tool_error', { tool: tool, err: 'node-' + nodeId }); return; }
    var stepN = path.length + 1;
    var html = '<div class="tl-progress" aria-hidden="true">Шаг ' + stepN + '</div>' +
      '<p class="tl-q" role="heading" aria-level="2">' + esc(node.q) + '</p>' +
      (node.help ? '<p class="tl-help">' + esc(node.help) + '</p>' : '') +
      '<div class="tl-options" role="group">' +
      node.options.map(function (o, i) {
        return '<button type="button" class="tl-opt" data-i="' + i + '">' + esc(o.label) + '</button>';
      }).join('') + '</div>' +
      (path.length ? '<button type="button" class="tl-back">← Назад</button>' : '');
    wizard.innerHTML = html;
    wizard.setAttribute('data-node', nodeId);
    var first = wizard.querySelector('.tl-opt');
    if (started && first) first.focus();
  }

  function showResult(oid) {
    document.querySelectorAll('.tl-outcome').forEach(function (el) { el.hidden = el.getAttribute('data-outcome') !== oid; });
    var el = document.getElementById('result-' + oid);
    var answers = path.map(function (p) { return p.label; }).join(' → ');
    wizard.innerHTML = '<div class="tl-progress">Готово: ' + path.length + ' ' + (path.length === 1 ? 'ответ' : 'ответа(ов)') + '</div>' +
      '<p class="tl-q">Ваш результат ниже ↓</p>' +
      '<p class="tl-help">Ответы: ' + esc(answers) + '</p>' +
      '<div class="tl-options">' +
      '<button type="button" class="tl-opt tl-restart">Пройти заново</button>' +
      '<button type="button" class="tl-opt tl-print">Сохранить чек-лист (печать/PDF)</button>' +
      '<button type="button" class="tl-opt tl-share">Скопировать ссылку на результат</button></div>';
    if (el) { el.hidden = false; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    try { history.replaceState(null, '', '#' + oid); } catch (e) {}
    goal('tool_complete', { tool: tool, steps: path.length });
    goal('tool_result', { tool: tool, outcome: oid });
  }

  wizard.addEventListener('click', function (e) {
    var back = e.target.closest('.tl-back');
    if (back) { path.pop(); render(path.length ? nextOf(path[path.length - 1]) : tree.start); if (!path.length) render(tree.start); return; }
    if (e.target.closest('.tl-restart')) {
      path = []; document.querySelectorAll('.tl-outcome').forEach(function (el) { el.hidden = true; });
      try { history.replaceState(null, '', location.pathname); } catch (err) {}
      render(tree.start); goal('tool_start', { tool: tool, restart: 1 }); return;
    }
    if (e.target.closest('.tl-print')) { goal('tool_download', { tool: tool }); window.print(); return; }
    if (e.target.closest('.tl-share')) {
      goal('tool_share', { tool: tool });
      try { navigator.clipboard.writeText(location.href); e.target.textContent = 'Ссылка скопирована ✓'; } catch (err) {}
      return;
    }
    var btn = e.target.closest('.tl-opt');
    if (!btn) return;
    var nodeId = wizard.getAttribute('data-node');
    var node = tree.nodes[nodeId];
    var opt = node.options[+btn.getAttribute('data-i')];
    if (!opt) return;
    if (!started) { started = true; goal('tool_start', { tool: tool }); }
    path.push({ node: nodeId, label: opt.label });
    goal('tool_step', { tool: tool, step: path.length, node: nodeId });
    if (opt.next.charAt(0) === '#') showResult(opt.next.slice(1));
    else render(opt.next);
  });

  function nextOf(entry) {
    var node = tree.nodes[entry.node];
    var opt = node && node.options.find(function (o) { return o.label === entry.label; });
    return opt && !opt.next.startsWith('#') ? opt.next : tree.start;
  }

  /* результат из hash (переход по shared-ссылке) */
  var h = location.hash.slice(1);
  if (h && document.getElementById('result-' + h)) {
    document.getElementById('result-' + h).hidden = false;
    wizard.innerHTML = '<p class="tl-q">Сохранённый результат ниже ↓</p><div class="tl-options"><button type="button" class="tl-opt tl-restart">Пройти мастер самому</button></div>';
  } else {
    render(tree.start);
  }

  /* цели CTA */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-tool-cta], [data-nav-location="tool_money"]');
    if (el) goal('tool_cta_click', { tool: tool, outcome: el.getAttribute('data-tool-cta') || '' });
  }, { passive: true });
})();
