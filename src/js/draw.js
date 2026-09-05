/* 타로첩 — 카드 뽑기 (cards.json, 브라우저에서만 동작·저장 없음) */
(function () {
  'use strict';
  var root = document.getElementById('draw');
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var modeBtns = root.querySelectorAll('.draw-modes button');
  var mode = 'one';
  var m = new URLSearchParams(location.search).get('mode');
  if (m === 'three' || m === 'yesno') mode = m;
  modeBtns.forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-mode') === mode);
    b.addEventListener('click', function () {
      mode = b.getAttribute('data-mode');
      modeBtns.forEach(function (x) { x.classList.toggle('on', x === b); });
    });
  });

  var cards = null, loading = null;
  function load() {
    if (cards) return Promise.resolve(cards);
    if (!loading) loading = fetch('/cards.json').then(function (r) { return r.json(); }).then(function (j) { cards = j; return j; });
    return loading;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  var ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
  var COLOR = { wands: '#B8382D', cups: '#2F5D8A', swords: '#4A4A5A', pentacles: '#7A6A2E' };
  var GLYPH = {
    wands: '<path d="M100 60 L100 190" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M84 74 L100 58 L116 74" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M78 118 C88 104 112 104 122 118" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>',
    cups: '<path d="M62 70 H138 C138 118 118 134 100 138 C82 134 62 118 62 70 Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M100 138 V172 M72 184 H128" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>',
    swords: '<path d="M100 48 L100 168" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M66 130 H134" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M100 168 V190" stroke="currentColor" stroke-width="12" stroke-linecap="round"/><path d="M88 60 L100 40 L112 60 Z" fill="currentColor"/>',
    pentacles: '<circle cx="100" cy="122" r="62" fill="none" stroke="currentColor" stroke-width="8"/><path d="M100 70 L115 108 L156 110 L124 136 L134 176 L100 154 L66 176 L76 136 L44 110 L85 108 Z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>'
  };
  function svg(c) {
    var color = c.a === 'major' ? '#B8382D' : COLOR[c.su];
    var idx = cards.indexOf(c);
    var center = c.a === 'major'
      ? '<text x="100" y="150" text-anchor="middle" font-family="\'Noto Serif KR\', serif" font-size="72" font-weight="700" fill="' + color + '">' + ROMAN[idx] + '</text>'
      : '<g style="color:' + color + '" transform="translate(0 10)">' + GLYPH[c.su] + '</g>';
    return '<svg class="cf" viewBox="0 0 200 320" role="img" aria-label="' + esc(c.n) + '"><rect x="4" y="4" width="192" height="312" rx="14" fill="#FFFDF8" stroke="#211C15" stroke-width="3"/><rect x="14" y="14" width="172" height="292" rx="9" fill="none" stroke="' + color + '" stroke-width="1.5"/><text x="100" y="46" text-anchor="middle" font-family="\'Noto Serif KR\', serif" font-size="' + (c.a === 'major' ? 18 : 15) + '" font-weight="600" fill="#211C15">' + esc(c.r) + '</text>' + center + '<text x="100" y="262" text-anchor="middle" font-family="\'Noto Serif KR\', serif" font-size="19" font-weight="700" fill="#211C15">' + esc(c.n) + '</text><text x="100" y="286" text-anchor="middle" font-family="\'Noto Sans KR\', sans-serif" font-size="11" fill="#8B8070">' + esc(c.e) + '</text></svg>';
  }
  function rnd(n) {
    if (window.crypto && crypto.getRandomValues) { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
    return Math.floor(Math.random() * n);
  }
  function pick(n) {
    var pool = cards.slice(), out = [];
    for (var i = 0; i < n; i++) { var k = rnd(pool.length); out.push({ c: pool.splice(k, 1)[0], rev: rnd(3) === 0 }); }
    return out;
  }
  var YN = { yes: '예', no: '아니오', maybe: '보류' };
  function cardHtml(p, pos) {
    var c = p.c, rev = p.rev;
    var url = '/c/' + c.s + '/' + (rev ? 'reversed/' : '');
    return '<div class="dcard' + (rev ? ' flip' : '') + '">' + (pos ? '<div class="pos">' + pos + '</div>' : '') + svg(c) +
      '<h3><a href="' + url + '">' + esc(c.n) + '</a></h3><div class="dir">' + (rev ? '역방향' : '정방향') + ' · ' + esc(c.g) + '</div>' +
      '<div class="kw ' + (rev ? 'rv' : 'up') + '">' + (rev ? c.kr : c.ku).slice(0, 3).map(function (k) { return '<span>' + esc(k) + '</span>'; }).join('') + '</div>' +
      '<p>' + esc(rev ? c.rv : c.up) + '</p><p><a href="' + url + '">' + esc(c.n) + (rev ? ' 역방향' : '') + ' 자세히 →</a></p></div>';
  }
  function run() {
    var q = ($('#draw-q').value || '').trim();
    var res = $('#draw-result');
    load().then(function () {
      var html = q ? '<div class="draw-q-echo">질문 · ' + esc(q) + '</div>' : '';
      if (mode === 'one') {
        var p = pick(1)[0];
        html += '<div class="dcards">' + cardHtml(p, '') + '</div><div class="advice">' + esc(p.c.ad) + '</div>';
      } else if (mode === 'three') {
        var ps = pick(3), pos = ['과거 · 원인', '현재 · 상황', '미래 · 흐름'];
        html += '<div class="dcards">' + ps.map(function (p, i) { return cardHtml(p, pos[i]); }).join('') + '</div>' +
          '<p class="sub" style="margin-top:12px">세 장을 한 문장으로 이어 읽어 보세요 — ' + ps.map(function (p) { return esc(p.c.n) + (p.rev ? '(역)' : ''); }).join(' → ') + '. <a href="/spreads/">쓰리카드 읽는 법</a></p>';
      } else {
        var y = pick(1)[0];
        var ans = y.c.yn, note = y.c.ynn;
        var shown = ans;
        if (y.rev) { shown = ans === 'yes' ? 'maybe' : ans === 'no' ? 'maybe' : 'maybe'; }
        html += '<div class="dcards"><div style="max-width:190px;margin:0 auto">' + cardHtml(y, '') + '</div></div>' +
          '<div class="dyn ' + shown + '"><b>' + YN[shown] + '</b><p>' + esc(note) + (y.rev ? ' 역방향으로 나와 답이 약해집니다 — 조건부나 시기 지연으로 읽으세요.' : '') + '</p></div>';
      }
      html += '<div class="draw-again"><button class="btn ghost" id="draw-again">다시 뽑기</button></div>';
      res.innerHTML = html;
      res.hidden = false;
      res.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var again = document.getElementById('draw-again');
      if (again) again.addEventListener('click', run);
    }).catch(function () {
      res.innerHTML = '<p class="sub">카드를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.</p>';
      res.hidden = false;
    });
  }
  $('#draw-go').addEventListener('click', run);
  $('#draw-q').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });
  load();
})();
