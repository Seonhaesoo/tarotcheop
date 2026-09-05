/* 타로첩 — 카드 검색 (index.json 을 브라우저에서만 읽는다) */
(function () {
  'use strict';
  var form = document.getElementById('search');
  if (!form) return;
  var input = form.querySelector('input'), box = form.querySelector('.res');
  var index = null, loading = null, timer = null;
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, '').replace(/(카드|타로)$/g, ''); }
  function load() {
    if (index || loading) return loading;
    loading = fetch('/index.json').then(function (r) { return r.json(); }).then(function (j) { index = j; return j; }).catch(function () { index = []; return index; });
    return loading;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function render(qs) {
    var nq = norm(qs);
    if (!nq) { box.hidden = true; box.innerHTML = ''; return; }
    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var it = index[i], t = norm(it.t), e = norm(it.e), k = norm(it.k);
      var score = t.indexOf(nq) === 0 ? 4 : t.indexOf(nq) >= 0 ? 3 : e.indexOf(nq) === 0 ? 2.5 : e.indexOf(nq) >= 0 ? 2 : k.indexOf(nq) >= 0 ? 1 : 0;
      if (score) hits.push({ it: it, s: score });
    }
    hits.sort(function (a, b) { return b.s - a.s; });
    hits = hits.slice(0, 12);
    if (!hits.length) { box.innerHTML = '<div class="res-empty">찾는 카드가 없어요. 78장 목록에서 골라 보세요. <a href="/c/">전체 보기</a></div>'; box.hidden = false; return; }
    box.innerHTML = hits.map(function (h) {
      return '<a class="res-item" href="' + h.it.u + '"><b>' + esc(h.it.t) + '</b><span class="res-k">' + esc(h.it.e) + ' · ' + esc(h.it.g) + '</span></a>';
    }).join('');
    box.hidden = false;
  }
  input.addEventListener('input', function () {
    clearTimeout(timer);
    var v = input.value;
    timer = setTimeout(function () { load().then(function () { render(v); }); }, 120);
  });
  input.addEventListener('focus', function () { load(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    load().then(function () {
      render(input.value);
      var firstHit = box.querySelector('a.res-item');
      if (firstHit) location.href = firstHit.getAttribute('href');
    });
  });
  document.addEventListener('click', function (e) { if (!form.contains(e.target)) box.hidden = true; });
  input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { box.hidden = true; input.blur(); } });
  var q = new URLSearchParams(location.search).get('q');
  if (q) { input.value = q; load().then(function () { render(q); }); }
})();
