/* 타로첩 — 카드 뽑기: 섞고, 고르고, 한 장씩 뒤집기 (cards.json · 브라우저에서만 동작, 질문·결과는 저장하지 않음)
 * #tarot-app  : /draw/ — 한 장 · 세 장(과거·현재·미래) · 예아니오, 주제(연애·재물·직장·건강), 공유 링크 #r=모드:주제:카드,카드.r
 * #tarot-mini : 홈 — 부채꼴 일곱 장 중 한 장 */
(function () {
  'use strict';
  var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- 데이터·도구 ---------- */
  var cards = null, bySlug = {}, loading = null;
  function load() {
    if (cards) return Promise.resolve(cards);
    if (!loading) {
      loading = fetch('/cards.json').then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (j) {
        j.forEach(function (c, i) { c.i = i; bySlug[c.s] = c; });
        cards = j;
        return j;
      });
      loading.catch(function () { loading = null; });
    }
    return loading;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function rnd(n) {
    if (window.crypto && window.crypto.getRandomValues) { var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] % n; }
    return Math.floor(Math.random() * n);
  }
  function shuffled(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function wait(ms) { return new Promise(function (res) { setTimeout(res, REDUCE ? 0 : ms); }); }
  function frame() { return new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(res); }); }); }
  function track(name, p) { try { if (typeof window.gtag === 'function') window.gtag('event', name, p || {}); } catch (e) { /* 통계 실패는 무시 */ } }

  var ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
  var COLOR = { wands: '#B8382D', cups: '#2F5D8A', swords: '#4A4A5A', pentacles: '#7A6A2E' };
  var GLYPH = {
    wands: '<path d="M100 60 L100 190" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M84 74 L100 58 L116 74" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M78 118 C88 104 112 104 122 118" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>',
    cups: '<path d="M62 70 H138 C138 118 118 134 100 138 C82 134 62 118 62 70 Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M100 138 V172 M72 184 H128" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>',
    swords: '<path d="M100 48 L100 168" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M66 130 H134" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M100 168 V190" stroke="currentColor" stroke-width="12" stroke-linecap="round"/><path d="M88 60 L100 40 L112 60 Z" fill="currentColor"/>',
    pentacles: '<circle cx="100" cy="122" r="62" fill="none" stroke="currentColor" stroke-width="8"/><path d="M100 70 L115 108 L156 110 L124 136 L134 176 L100 154 L66 176 L76 136 L44 110 L85 108 Z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>'
  };
  function front(c) {
    var color = c.a === 'major' ? '#B8382D' : COLOR[c.su];
    var center = c.a === 'major'
      ? '<text x="100" y="150" text-anchor="middle" font-family="\'Noto Serif KR\', serif" font-size="72" font-weight="700" fill="' + color + '">' + ROMAN[c.i] + '</text>'
      : '<g style="color:' + color + '" transform="translate(0 10)">' + GLYPH[c.su] + '</g>';
    return '<svg class="cf" viewBox="0 0 200 320" role="img" aria-label="' + esc(c.n) + '"><rect x="4" y="4" width="192" height="312" rx="14" fill="#FFFDF8" stroke="#211C15" stroke-width="3"/><rect x="14" y="14" width="172" height="292" rx="9" fill="none" stroke="' + color + '" stroke-width="1.5"/><text x="100" y="46" text-anchor="middle" font-family="\'Noto Serif KR\', serif" font-size="' + (c.a === 'major' ? 18 : 15) + '" font-weight="600" fill="#211C15">' + esc(c.r) + '</text>' + center + '<text x="100" y="262" text-anchor="middle" font-family="\'Noto Serif KR\', serif" font-size="19" font-weight="700" fill="#211C15">' + esc(c.n) + '</text><text x="100" y="286" text-anchor="middle" font-family="\'Noto Sans KR\', sans-serif" font-size="11" fill="#8B8070">' + esc(c.e) + '</text></svg>';
  }
  /* 카드 뒷면 — 격자(창살)는 CSS 배경, 가운데 낙관·별·달은 SVG (id 없이 그려 여러 장 넣어도 안전) */
  var BACK = '<span class="tb"><svg viewBox="0 0 200 320" aria-hidden="true" focusable="false">' +
    '<circle cx="100" cy="160" r="50" fill="#211C15" stroke="#D9C9A3" stroke-width="2"/><circle cx="100" cy="160" r="42" fill="none" stroke="#8C7A55" stroke-width="1"/>' +
    '<rect x="78" y="138" width="44" height="44" rx="7" fill="#B8382D"/><text x="100" y="171" text-anchor="middle" font-family="\'Noto Serif KR\', serif" font-size="29" font-weight="700" fill="#F6F1E8">占</text>' +
    '<path d="M100 44 L104.7 55.5 116 56.6 107.5 64.2 110 75.3 100 69.5 90 75.3 92.5 64.2 84 56.6 95.3 55.5Z" fill="#D9C9A3"/>' +
    '<path d="M100 252 A16 16 0 0 0 100 284 A20 20 0 0 1 100 252 Z" fill="#D9C9A3"/></svg></span>';
  function cardInner() { return '<span class="tflip"><span class="tface tbk">' + BACK + '</span><span class="tface tfr"></span></span>'; }
  function kws(c, rev) { return (rev ? c.kr : c.ku).slice(0, 3).map(function (k) { return '<span>' + esc(k) + '</span>'; }).join(''); }
  function putFront(btn, p) {
    var fr = btn.querySelector('.tfr');
    fr.innerHTML = front(p.c);
    fr.classList.toggle('rev', !!p.rev);
  }

  /* 뒤집힌 카드를 A 자리에서 B 자리로 날려 보내는 효과 (실제 이동은 호출한 쪽에서 DOM 으로) */
  function fly(fromEl, toEl) {
    if (REDUCE) return Promise.resolve();
    var a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    var w = fromEl.offsetWidth, h = fromEl.offsetHeight;
    if (!w || !b.width) return Promise.resolve();
    var g = document.createElement('div');
    g.className = 'tghost';
    g.innerHTML = BACK;
    var left = a.left + a.width / 2 - w / 2, top = a.top + a.height / 2 - h / 2;
    var rot = parseFloat(getComputedStyle(fromEl).getPropertyValue('--r')) || 0;
    g.style.cssText = 'left:' + left + 'px;top:' + top + 'px;width:' + w + 'px;height:' + h + 'px;transform:rotate(' + rot + 'deg)';
    document.body.appendChild(g);
    return frame().then(function () {
      var dx = (b.left + b.width / 2) - (left + w / 2), dy = (b.top + b.height / 2) - (top + h / 2);
      g.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + (b.width / w) + ')';
      return wait(520);
    }).then(function () { g.remove(); });
  }

  var YN = { yes: '예', no: '아니오', maybe: '보류' };
  var TOPIC = { all: '전체', love: '연애', money: '재물', work: '직장', health: '건강' };
  var TOPIC_RO = { love: '연애로', money: '재물로', work: '직장으로', health: '건강으로' };

  /* ================= /draw/ ================= */
  function Full(root) {
    var MODES = {
      one: { n: 1, pos: ['나의 카드'], hint: '마음이 가는 카드 한 장을 고르세요' },
      three: { n: 3, pos: ['과거 · 원인', '현재 · 상황', '미래 · 흐름'], hint: '마음이 가는 카드 세 장을 차례로 고르세요' },
      yesno: { n: 1, pos: ['답을 여는 카드'], hint: '질문을 떠올리며 카드 한 장을 고르세요' }
    };
    var SPREAD_N = 21;
    var st = { mode: 'one', topic: 'all', phase: 'idle', deck: [], picks: [], busy: false, shared: false };
    function $(s) { return root.querySelector(s); }
    var modeBtns = root.querySelectorAll('.t-modes button');
    var topicBtns = root.querySelectorAll('.t-topics button');
    var el = { topics: $('.t-topics'), q: $('#t-q'), stage: $('.t-stage'), deck: $('.t-deck'), spread: $('.t-spread'), slots: $('.t-slots'),
      status: $('.t-status'), go: $('#t-go'), reads: $('.t-reads'), final: $('.t-final'), note: $('.t-shared') };

    function setStatus(t) { el.status.textContent = t; }
    function setPhase(p) { st.phase = p; root.setAttribute('data-phase', p); }
    function setMode(m) {
      st.mode = m;
      modeBtns.forEach(function (b) { var on = b.getAttribute('data-mode') === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      el.topics.hidden = m === 'yesno';
    }
    function setTopic(t) {
      st.topic = t;
      topicBtns.forEach(function (b) { var on = b.getAttribute('data-topic') === t; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    }
    function makeSlots() {
      var m = MODES[st.mode];
      el.slots.className = 't-slots n' + m.n;
      el.slots.innerHTML = m.pos.map(function (p, i) {
        return '<div class="tslot" data-i="' + i + '"><div class="tslot-pos">' + esc(p) + '</div><div class="tslot-box"></div></div>';
      }).join('');
      el.slots.hidden = false;
    }
    function reset(keepMode) {
      setPhase('idle'); st.picks = []; st.deck = []; st.busy = false;
      if (st.shared) { st.shared = false; el.note.hidden = true; if (location.hash) history.replaceState(null, '', location.pathname + location.search); }
      el.spread.innerHTML = ''; el.spread.className = 't-spread'; el.slots.hidden = true; el.slots.innerHTML = '';
      el.reads.innerHTML = ''; el.final.innerHTML = ''; el.final.hidden = true;
      el.stage.hidden = false; el.stage.classList.remove('gone');
      el.deck.hidden = false; el.deck.classList.remove('shuffling', 'out');
      el.go.textContent = '카드 섞기'; el.go.className = 'btn big'; el.go.disabled = false;
      setStatus('질문을 마음에 두고 카드를 섞으세요.');
      if (!keepMode) setMode(st.mode);
    }

    /* 섞기 → 펼치기 */
    function shuffleAndDeal() {
      if (st.busy) return;
      st.busy = true;
      el.go.disabled = true;
      reset(true);
      st.busy = true; el.go.disabled = true;
      setStatus('카드를 섞는 중…');
      track('tarot_shuffle', { mode: st.mode, topic: st.topic });
      el.deck.classList.add('shuffling');
      Promise.all([load(), wait(1250)]).then(function () {
        el.deck.classList.remove('shuffling');
        st.deck = shuffled(cards).slice(0, SPREAD_N).map(function (c) { return { c: c, rev: rnd(3) === 0 }; });
        makeSlots();
        return deal();
      }).then(function () {
        setPhase('picking'); st.busy = false;
        el.go.textContent = '다시 섞기'; el.go.className = 'btn ghost'; el.go.disabled = false;
        setStatus(MODES[st.mode].hint + ' (0/' + MODES[st.mode].n + ')');
      }).catch(function () {
        st.busy = false; el.go.disabled = false; el.deck.classList.remove('shuffling');
        setStatus('카드를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.');
      });
    }
    function deal() {
      var html = '';
      for (var i = 0; i < SPREAD_N; i++) {
        var col = i % 7, d = col - 3;
        html += '<button type="button" class="tcard" data-i="' + i + '" aria-label="엎어 둔 카드 ' + (i + 1) + '번" style="--r:' + (d * 3.5) + 'deg;--y:' + (d * d * 1.6) + 'px;--d:' + (i * 28) + 'ms">' + cardInner() + '</button>';
      }
      el.spread.innerHTML = html;
      el.spread.classList.add('pre');
      var dk = el.deck.getBoundingClientRect(), cx = dk.left + dk.width / 2, cy = dk.top + dk.height / 2;
      el.spread.querySelectorAll('.tcard').forEach(function (b) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--dx', (cx - (r.left + r.width / 2)) + 'px');
        b.style.setProperty('--dy', (cy - (r.top + r.height / 2)) + 'px');
      });
      return frame().then(function () {
        el.spread.classList.remove('pre');
        el.deck.classList.add('out');
        return wait(SPREAD_N * 28 + 480);
      }).then(function () { el.deck.hidden = true; });
    }

    /* 고르기 */
    function pick(btn) {
      if (st.phase !== 'picking' || st.busy || btn.classList.contains('taken')) return;
      var m = MODES[st.mode], k = st.picks.length;
      if (k >= m.n) return;
      var p = st.deck[+btn.getAttribute('data-i')];
      st.picks.push(p);
      btn.classList.add('taken');
      btn.disabled = true;
      var slot = el.slots.querySelectorAll('.tslot')[k];
      var box = slot.querySelector('.tslot-box');
      st.busy = true;
      fly(btn, box).then(function () {
        box.innerHTML = '<button type="button" class="tcard inslot" data-k="' + k + '" aria-label="' + esc(m.pos[k]) + ' 카드 뒤집기">' + cardInner() + '</button>';
        slot.classList.add('filled');
        st.busy = false;
        if (st.picks.length < m.n) { setStatus(m.hint + ' (' + st.picks.length + '/' + m.n + ')'); return; }
        toReveal();
      });
    }
    function toReveal() {
      setPhase('revealing');
      setStatus(MODES[st.mode].n > 1 ? '카드를 눌러 한 장씩 뒤집어 보세요.' : '카드를 눌러 뒤집어 보세요.');
      el.spread.classList.add('fade');
      wait(420).then(function () {
        el.stage.classList.add('gone');
        el.stage.hidden = true;
        var first = el.slots.querySelector('.tcard.inslot');
        if (first) first.focus({ preventScroll: true });
        el.slots.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'center' });
      });
    }

    /* 뒤집기 */
    function open(btn) {
      if (st.phase !== 'revealing' || btn.classList.contains('open')) return;
      var k = +btn.getAttribute('data-k'), p = st.picks[k];
      putFront(btn, p);
      btn.classList.add('open');
      btn.setAttribute('aria-label', MODES[st.mode].pos[k] + ' — ' + p.c.n + (p.rev ? ' 역방향' : ' 정방향'));
      p.opened = true;
      wait(380).then(function () {
        renderReads();
        if (st.picks.every(function (x) { return x.opened; })) done();
      });
    }
    function readHtml(p, pos) {
      var c = p.c, rev = p.rev, t = st.mode === 'yesno' ? 'all' : st.topic;
      var base = '/c/' + c.s + '/';
      var url = t !== 'all' ? base + t + '/' : (rev ? base + 'reversed/' : base);
      var text = t !== 'all' ? c.t[t][rev ? 1 : 0] : (rev ? c.rv : c.up);
      var h = '<article class="tread"><div class="tr-pos">' + esc(pos) + '</div>' +
        '<h3><a href="' + url + '">' + esc(c.n) + '</a> <span class="tr-dir ' + (rev ? 'rv' : 'up') + '">' + (rev ? '역방향' : '정방향') + '</span> <span class="tr-grp">' + esc(c.g) + '</span></h3>' +
        '<div class="kw ' + (rev ? 'rv' : 'up') + '">' + kws(c, rev) + '</div>' +
        (t !== 'all' ? '<div class="tr-topic">' + TOPIC_RO[t] + ' 읽으면</div>' : '') +
        '<p>' + esc(text) + '</p>';
      if (st.mode === 'yesno') {
        var shown = rev ? 'maybe' : c.yn;
        h += '<div class="dyn ' + shown + '"><b>' + YN[shown] + '</b><p>' + esc(c.ynn) + (rev ? ' 역방향으로 나와 답이 약해집니다 — 조건부나 시기 지연으로 읽으세요.' : '') + '</p></div>';
      } else if (st.mode === 'one') {
        h += '<div class="advice">' + esc(c.ad) + '</div>';
      }
      h += '<p class="tr-more"><a href="' + url + '">' + esc(c.n) + (t !== 'all' ? ' · ' + TOPIC[t] + ' 해석' : (rev ? ' 역방향' : '')) + ' 자세히 →</a></p></article>';
      return h;
    }
    function renderReads() {
      var m = MODES[st.mode], q = (el.q.value || '').trim();
      var html = q ? '<div class="t-qecho">질문 · ' + esc(q) + '</div>' : '';
      st.picks.forEach(function (p, i) { if (p.opened) html += readHtml(p, m.pos[i]); });
      el.reads.innerHTML = html;
    }
    function summary() {
      var k = st.picks.map(function (p) { return (p.rev ? p.c.kr : p.c.ku)[0]; });
      var revN = st.picks.filter(function (p) { return p.rev; }).length;
      var majN = st.picks.filter(function (p) { return p.c.a === 'major'; }).length;
      var notes = [];
      if (majN >= 2) notes.push('메이저 카드가 ' + majN + '장 — 개인의 선택을 넘어서는 큰 흐름이 움직이는 때예요.');
      if (revN >= 2) notes.push('역방향이 ' + revN + '장 — 막히거나 늦어지는 신호예요. 서두르기보다 점검이 먼저예요.');
      if (!revN) notes.push('세 장 모두 정방향 — 흐름이 막힘없이 이어지는 편이에요.');
      return '<div class="tsum"><b>세 장을 이어 읽으면</b><p>과거엔 ‘' + esc(k[0]) + '’, 지금은 ‘' + esc(k[1]) + '’, 앞으로는 ‘' + esc(k[2]) + '’의 흐름이에요.</p>' +
        notes.map(function (n) { return '<p class="sub">' + esc(n) + '</p>'; }).join('') + '<p class="sub"><a href="/spreads/">쓰리카드 읽는 법 →</a></p></div>';
    }
    function done() {
      setPhase('done');
      setStatus('');
      el.final.innerHTML = (st.mode === 'three' ? summary() : '') +
        '<div class="t-acts"><button type="button" class="btn" id="t-share">결과 공유하기</button><button type="button" class="btn ghost" id="t-again">다시 뽑기</button></div>' +
        '<p class="t-toast" role="status" hidden></p>';
      el.final.hidden = false;
      el.go.hidden = true;
      track('tarot_reveal', { mode: st.mode, topic: st.topic, cards: st.picks.map(function (p) { return p.c.s + (p.rev ? '.r' : ''); }).join(',') });
    }

    /* 공유 */
    function resultUrl() {
      return location.origin + '/draw/#r=' + st.mode + ':' + (st.mode === 'yesno' ? 'all' : st.topic) + ':' +
        st.picks.map(function (p) { return p.c.s + (p.rev ? '.r' : ''); }).join(',');
    }
    function toast(t) {
      var e = el.final.querySelector('.t-toast');
      if (!e) return;
      e.textContent = t; e.hidden = false;
      setTimeout(function () { e.hidden = true; }, 2600);
    }
    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
      return new Promise(function (res, rej) {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-100px;opacity:0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); }
        ta.remove();
      });
    }
    function share() {
      var url = resultUrl();
      var names = st.picks.map(function (p) { return p.c.n + (p.rev ? '(역)' : ''); }).join(' · ');
      track('tarot_share', { mode: st.mode });
      if (navigator.share) {
        navigator.share({ title: '타로첩 카드 뽑기', text: '내가 뽑은 타로 카드: ' + names, url: url }).catch(function () {});
        return;
      }
      copyText(url).then(function () { toast('결과 링크를 복사했어요.'); }, function () { toast('링크 복사가 막혀 있어요: ' + url); });
    }

    /* 공유받은 결과 열기 — #r=모드:주제:카드,카드.r */
    function openShared() {
      var m = /^#r=([a-z]+):([a-z]+):([a-z0-9.,-]+)$/.exec(location.hash);
      if (!m || !MODES[m[1]] || !TOPIC[m[2]]) return Promise.resolve(false);
      return load().then(function () {
        var list = m[3].split(',').map(function (x) { var rev = /\.r$/.test(x), s = x.replace(/\.r$/, ''); return bySlug[s] ? { c: bySlug[s], rev: rev, opened: true } : null; });
        if (list.length !== MODES[m[1]].n || list.some(function (x) { return !x; })) return false;
        setMode(m[1]); setTopic(m[2]);
        st.picks = list; setPhase('revealing'); st.shared = true;
        makeSlots();
        el.slots.querySelectorAll('.tslot').forEach(function (slot, i) {
          var box = slot.querySelector('.tslot-box');
          box.innerHTML = '<button type="button" class="tcard inslot open" data-k="' + i + '" aria-label="' + esc(MODES[m[1]].pos[i] + ' — ' + list[i].c.n) + '">' + cardInner() + '</button>';
          putFront(box.querySelector('.tcard'), list[i]);
          slot.classList.add('filled');
        });
        el.stage.hidden = true; el.deck.hidden = true;
        el.note.hidden = false;
        renderReads();
        done();
        el.go.hidden = true;
        return true;
      });
    }

    /* 이벤트 */
    modeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var m = b.getAttribute('data-mode');
        if (m === st.mode && st.phase === 'idle') return;
        setMode(m); el.go.hidden = false; reset(true);
      });
    });
    topicBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        setTopic(b.getAttribute('data-topic'));
        if (st.phase === 'revealing' || st.phase === 'done') { renderReads(); if (st.phase === 'done' && st.shared) history.replaceState(null, '', resultUrl().replace(location.origin, '')); }
      });
    });
    el.go.addEventListener('click', function () { el.go.hidden = false; shuffleAndDeal(); });
    el.spread.addEventListener('click', function (e) { var b = e.target.closest('.tcard'); if (b) pick(b); });
    el.slots.addEventListener('click', function (e) { var b = e.target.closest('.tcard.inslot'); if (b) open(b); });
    root.addEventListener('click', function (e) {
      if (e.target.closest('#t-share')) share();
      else if (e.target.closest('#t-again')) { el.go.hidden = false; reset(true); shuffleAndDeal(); }
      else if (e.target.closest('#t-fresh')) { el.go.hidden = false; reset(true); el.stage.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'center' }); }
    });
    el.q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (st.phase === 'idle') shuffleAndDeal(); } });

    var qm = new URLSearchParams(location.search).get('mode');
    setMode(MODES[qm] ? qm : 'one');
    setTopic('all');
    root.classList.add('ready');
    openShared().then(function (shown) { if (!shown) { reset(true); load().catch(function () {}); } });
  }

  /* ================= 홈: 일곱 장 중 한 장 ================= */
  function Mini(root) {
    var fan = root.querySelector('.tm-fan'), res = root.querySelector('.tm-res');
    var busy = false;
    function prefetch() { load().catch(function () {}); }
    root.addEventListener('pointerenter', prefetch, { once: true });
    root.addEventListener('focusin', prefetch, { once: true });
    setTimeout(prefetch, 2500);
    fan.addEventListener('click', function (e) {
      var b = e.target.closest('.tcard');
      if (!b || busy || fan.classList.contains('chosen')) return;
      busy = true;
      load().then(function () {
        var p = { c: cards[rnd(cards.length)], rev: rnd(3) === 0 };
        fan.classList.add('chosen');
        b.classList.add('me');
        putFront(b, p);
        track('tarot_mini_pick', { card: p.c.s + (p.rev ? '.r' : '') });
        return wait(420).then(function () {
          b.classList.add('open');
          b.setAttribute('aria-label', p.c.n + (p.rev ? ' 역방향' : ' 정방향'));
          return wait(500);
        }).then(function () {
          var c = p.c, url = '/c/' + c.s + '/' + (p.rev ? 'reversed/' : '');
          res.innerHTML = '<div class="tm-card"><h3><a href="' + url + '">' + esc(c.n) + '</a> <span class="tr-dir ' + (p.rev ? 'rv' : 'up') + '">' + (p.rev ? '역방향' : '정방향') + '</span></h3>' +
            '<div class="kw ' + (p.rev ? 'rv' : 'up') + '">' + kws(c, p.rev) + '</div><p>' + esc(p.rev ? c.rv : c.up) + '</p><div class="advice">' + esc(c.ad) + '</div>' +
            '<div class="t-acts"><a class="btn" href="' + url + '">' + esc(c.n) + ' 자세히</a><a class="btn ghost" href="/draw/?mode=three">세 장 뽑기</a><button type="button" class="btn ghost" id="tm-again">다시 고르기</button></div></div>';
          res.hidden = false;
          busy = false;
        });
      }).catch(function () {
        busy = false;
        res.innerHTML = '<p class="sub">카드를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.</p>';
        res.hidden = false;
      });
    });
    root.addEventListener('click', function (e) {
      if (!e.target.closest('#tm-again')) return;
      res.hidden = true; res.innerHTML = '';
      fan.classList.remove('chosen');
      fan.querySelectorAll('.tcard').forEach(function (b) {
        b.classList.remove('me', 'open');
        b.setAttribute('aria-label', '엎어 둔 카드 ' + (+b.getAttribute('data-k') + 4) + '번');
        b.querySelector('.tfr').innerHTML = '';
      });
    });
  }

  var full = document.getElementById('tarot-app');
  if (full) Full(full);
  var mini = document.getElementById('tarot-mini');
  if (mini) Mini(mini);
})();
