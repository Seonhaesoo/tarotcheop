/* 타로첩 정적 사이트 생성기
 *  /c/{slug}/                 카드 페이지 (그림·정방향·역방향·주제 요약·예아니오·관련 카드)
 *  /c/{slug}/reversed/        역방향 페이지
 *  /c/{slug}/{love|money|work|health}/  주제별 페이지
 *  /c/  /major/  /wands/ /cups/ /swords/ /pentacles/   목록
 *  /love/ /money/ /work/ /health/  주제 허브    /yesno/ 예·아니오 표
 *  /daily/ 오늘의 카드(매일 재빌드)   /draw/ 카드 뽑기   /spreads/ 배열법   /guide/ 타로 기초
 *  index.json 검색 색인, cards.json 뽑기용 데이터, sitemap.xml
 * 사용: node tools/build.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARDS, SUITS, RANK_MEANING } from '../data/cards/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');
const SITE = 'https://tarot.sajucheop.com';
const SAJU = 'https://sajucheop.com';
const SAENGIL = 'http://saengil.sajucheop.com';
const DREAM = 'https://dream.sajucheop.com';
const GA = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-JCDJSNZX4J"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-JCDJSNZX4J');</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9924140539322407" crossorigin="anonymous"></script>`;

/* ---------- 날짜 (KST) ---------- */
const t = new Date(Date.now() + 9 * 3600e3);
const today = { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
const pad = (n) => String(n).padStart(2, '0');
const BUILD_ISO = `${today.y}-${pad(today.m)}-${pad(today.d)}`;
const WD = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const wd = WD[new Date(Date.UTC(today.y, today.m - 1, today.d)).getUTCDay()];
const dayIndex = Math.floor(Date.UTC(today.y, today.m - 1, today.d) / 86400000);

/* ---------- 유틸 ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const paras = (s) => String(s).split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join('\n');
const first = (s) => { const m = String(s).match(/^.*?[.!?](?=\s|$)/); return (m ? m[0] : String(s)).trim(); };
const cUrl = (c) => `/c/${c.slug}/`;
const bySlug = Object.fromEntries(CARDS.map((c) => [c.slug, c]));
/* 주제 허브에 먼저 보일 카드 */
const TOPIC_PICK = {
    love: ['the-lovers', 'cups-2', 'cups-10', 'the-empress', 'cups-knight', 'swords-3', 'the-devil', 'cups-ace'].map((s) => bySlug[s]),
    money: ['pentacles-ace', 'pentacles-king', 'pentacles-10', 'wheel-of-fortune', 'pentacles-4', 'pentacles-5', 'the-sun', 'pentacles-9'].map((s) => bySlug[s]),
    work: ['the-chariot', 'wands-6', 'the-emperor', 'pentacles-3', 'pentacles-8', 'wands-10', 'the-magician', 'swords-king'].map((s) => bySlug[s]),
    health: ['strength', 'the-star', 'swords-4', 'temperance', 'the-sun', 'pentacles-5', 'swords-9', 'the-empress'].map((s) => bySlug[s])
};
const TOPICS = [
  { key: 'love', ko: '연애', title: '연애·관계', desc: '사랑·인연·관계' },
  { key: 'money', ko: '재물', title: '재물·금전', desc: '돈·투자·재정' },
  { key: 'work', ko: '직장', title: '직장·학업', desc: '일·진로·시험' },
  { key: 'health', ko: '건강', title: '건강', desc: '몸·마음·회복' }
];
const YESNO = { yes: { ko: '예', cls: 'yes' }, no: { ko: '아니오', cls: 'no' }, maybe: { ko: '보류', cls: 'maybe' } };
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
const rankLabel = (c) => c.arcana === 'major' ? ROMAN[c.no] : RANK_MEANING[c.rank].label;
const groupOf = (c) => c.arcana === 'major' ? '메이저 아르카나' : SUITS[c.suit].ko;
const groupUrl = (c) => c.arcana === 'major' ? '/major/' : `/${c.suit}/`;

/* ---------- 데이터 검증 ---------- */
{
  if (CARDS.length !== 78) throw new Error('카드 수 ' + CARDS.length + ' (78 필요)');
  const seen = new Set();
  for (const c of CARDS) {
    if (seen.has(c.slug)) throw new Error('slug 중복 ' + c.slug);
    seen.add(c.slug);
    for (const k of ['name', 'en', 'img', 'up', 'rev', 'advice', 'yesno', 'yesnoNote']) if (!c[k]) throw new Error(`${c.slug}: ${k} 없음`);
    for (const tp of TOPICS) { if (!c[tp.key] || !c[tp.key].up || !c[tp.key].rev) throw new Error(`${c.slug}: ${tp.key} 없음`); }
    if (!YESNO[c.yesno]) throw new Error(`${c.slug}: yesno 값 ${c.yesno}`);
    if (c.up.length < 180 || c.rev.length < 140) throw new Error(`${c.slug}: 본문이 짧음`);
    if (c.arcana === 'minor' && (!SUITS[c.suit] || !RANK_MEANING[c.rank])) throw new Error(`${c.slug}: suit/rank`);
  }
  for (const c of CARDS) for (const r of c.related || []) if (!bySlug[r]) console.warn(`  · 관련 카드 없음: ${c.slug} → ${r}`);
  const majors = CARDS.filter((c) => c.arcana === 'major');
  majors.forEach((c, i) => { if (c.no !== i) throw new Error('메이저 순서 ' + c.slug); });
  for (const s of Object.keys(SUITS)) {
    const list = CARDS.filter((c) => c.suit === s);
    if (list.length !== 14) throw new Error(s + ' 14장 아님');
    list.forEach((c, i) => { if (c.rank !== i + 1) throw new Error('수트 순서 ' + c.slug); });
  }
}

/* ---------- 카드 그림 (SVG) ---------- */
const GLYPH = {
  wands: '<path d="M100 60 L100 190" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M84 74 L100 58 L116 74" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M78 118 C88 104 112 104 122 118" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>',
  cups: '<path d="M62 70 H138 C138 118 118 134 100 138 C82 134 62 118 62 70 Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M100 138 V172 M72 184 H128" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>',
  swords: '<path d="M100 48 L100 168" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M66 130 H134" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M100 168 V190" stroke="currentColor" stroke-width="12" stroke-linecap="round"/><path d="M88 60 L100 40 L112 60 Z" fill="currentColor"/>',
  pentacles: '<circle cx="100" cy="122" r="62" fill="none" stroke="currentColor" stroke-width="8"/><path d="M100 70 L115 108 L156 110 L124 136 L134 176 L100 154 L66 176 L76 136 L44 110 L85 108 Z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>'
};
function cardSvg(c, cls) {
  const color = c.arcana === 'major' ? '#B8382D' : SUITS[c.suit].color;
  const top = rankLabel(c);
  const center = c.arcana === 'major'
    ? `<text x="100" y="150" text-anchor="middle" font-family="'Noto Serif KR', serif" font-size="72" font-weight="700" fill="${color}">${ROMAN[c.no]}</text>`
    : `<g style="color:${color}" transform="translate(0 10)">${GLYPH[c.suit]}</g>`;
  return `<svg class="${cls || 'cf'}" viewBox="0 0 200 320" role="img" aria-label="${esc(c.name)} 카드"><rect x="4" y="4" width="192" height="312" rx="14" fill="#FFFDF8" stroke="#211C15" stroke-width="3"/><rect x="14" y="14" width="172" height="292" rx="9" fill="none" stroke="${color}" stroke-width="1.5"/><text x="100" y="46" text-anchor="middle" font-family="'Noto Serif KR', serif" font-size="${c.arcana === 'major' ? 18 : 15}" font-weight="600" fill="#211C15">${esc(top)}</text>${center}<text x="100" y="262" text-anchor="middle" font-family="'Noto Serif KR', serif" font-size="19" font-weight="700" fill="#211C15">${esc(c.name)}</text><text x="100" y="286" text-anchor="middle" font-family="'Noto Sans KR', sans-serif" font-size="11" fill="#8B8070">${esc(c.en)}</text></svg>`;
}
const seal = (ch, size) => `<svg width="${size}" height="${size}" viewBox="0 0 30 30" aria-hidden="true"><rect x="1.5" y="1.5" width="27" height="27" rx="5" fill="#B8382D"/><text x="15" y="20.5" text-anchor="middle" font-family="'Noto Serif KR', serif" font-size="15" font-weight="700" fill="#F6F1E8">${ch}</text></svg>`;

/* ---------- 오늘의 카드 ---------- */
const todayCard = CARDS[(dayIndex * 31) % 78];
const todayRev = (dayIndex * 7) % 3 === 0;
const todayBox = () => `<div class="today"><div class="today-card">${cardSvg(todayCard, 'cf sm')}</div><div class="today-body"><div class="today-label">오늘의 카드 · ${today.y}년 ${today.m}월 ${today.d}일 ${wd}</div><h3><a href="${cUrl(todayCard)}${todayRev ? 'reversed/' : ''}">${esc(todayCard.name)} ${todayRev ? '역방향' : '정방향'}</a></h3><p>${esc(first(todayRev ? todayCard.rev : todayCard.up))}</p><p class="today-adv">${esc(todayCard.advice)}</p><a class="more" href="/daily/">오늘의 카드 자세히 →</a></div></div>`;

/* ---------- 셸 ---------- */
const SEARCH = `<form class="search" id="search" role="search" autocomplete="off"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="#9A8F7E" stroke-width="1.8"/><path d="M16.5 16.5L21 21" stroke="#9A8F7E" stroke-width="1.8" stroke-linecap="round"/></svg><input type="search" name="q" placeholder="카드 검색 — 연인, 죽음, 펜타클 에이스, 컵 퀸…" aria-label="카드 검색"><div class="res" hidden></div></form>`;
function shell(o) {
  const ld = o.jsonld ? `<script type="application/ld+json">${JSON.stringify(o.jsonld)}</script>` : '';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
${GA}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${SITE}${o.url}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<meta name="google-site-verification" content="50EAycnUsMXh9QFJPnt6HyF9vFgtOHGu0A8HO0EOp_U">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;600;700&display=swap">
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/tarot.css">
${ld}
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${SITE}${o.url}">
</head>
<body>
<div class="app">
<nav class="family-bar" aria-label="첩 시리즈">
  <a class="fb-item" href="${SAJU}/" title="사주첩 — 사주풀이"><i aria-hidden="true">四</i>사주첩</a>
  <a class="fb-item" href="${SAENGIL}/" title="생일첩 — 생년월일로 보는 나이·띠"><i aria-hidden="true">生</i>생일첩</a>
  <a class="fb-item" href="${DREAM}/" title="꿈첩 — 상황별 꿈해몽"><i aria-hidden="true">夢</i>꿈첩</a>
  <a class="fb-item on" href="/" aria-current="page"><i aria-hidden="true">占</i>타로첩</a>
</nav>
<header class="hdr">
  <a class="brand" href="/">${seal('占', 26)}<span class="brand-name">타로첩</span></a>
  <nav class="nav"><a href="/major/">메이저</a><a href="/c/">78장</a><a href="/yesno/">예·아니오</a><a href="/draw/">카드 뽑기</a></nav>
</header>
${o.noSearch ? '' : SEARCH}
${o.body}
<footer>
  <div class="frow"><span>© 타로첩 · <a href="${SAJU}/">사주첩</a> 자매 사이트</span><nav><a href="/guide/">타로 기초</a><a href="/about/">소개</a><a href="/terms/">이용약관</a><a href="/privacy/">개인정보</a></nav></div>
  <p class="fnote">타로 해석은 라이더 웨이트 전통을 바탕으로 한 참고용 콘텐츠입니다. 카드는 정해진 미래가 아니라 지금의 상황을 비추는 거울이며, 중요한 결정의 근거로 삼지 마세요.</p>
</footer>
</div>
<script src="/js/app.js" defer></script>
${o.extraScript || ''}
</body>
</html>
`;
}
function write(url, html) {
  const file = path.join(OUT, url, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
const urls = [];
const add = (url, html) => { write(url, html); urls.push(url); };
const crumbs = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: SITE + it.url })) });
const article = (title, desc, url) => ({ '@context': 'https://schema.org', '@type': 'Article', headline: title, description: desc, datePublished: '2026-09-06', dateModified: BUILD_ISO, inLanguage: 'ko', author: { '@type': 'Organization', name: '타로첩' }, publisher: { '@type': 'Organization', name: '타로첩' }, mainEntityOfPage: SITE + url });
const faq = (items) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const chips = (arr, cls) => `<div class="kw ${cls}">${arr.map((k) => `<span>${esc(k)}</span>`).join('')}</div>`;
const cardCell = (c, cur) => `<a class="cc${cur ? ' cur' : ''}" href="${cUrl(c)}"><b>${esc(rankLabel(c))}</b><span>${esc(c.name)}</span><small>${esc(c.kw.up.slice(0, 2).join('·'))}</small></a>`;
const grid = (list, cur) => `<div class="cgrid">${list.map((c) => cardCell(c, c === cur)).join('')}</div>`;
const relatedBox = (c) => {
  const rel = (c.related || []).map((s) => bySlug[s]).filter(Boolean);
  return rel.length ? `<section><h2>함께 보면 좋은 카드</h2>${grid(rel)}</section>` : '';
};
const neighbors = (c) => {
  const list = c.arcana === 'major' ? CARDS.filter((x) => x.arcana === 'major') : CARDS.filter((x) => x.suit === c.suit);
  const i = list.indexOf(c);
  const prev = list[(i + list.length - 1) % list.length], next = list[(i + 1) % list.length];
  return `<p class="callout">← <a href="${cUrl(prev)}">${esc(prev.name)}</a> · <a href="${cUrl(next)}">${esc(next.name)}</a> → · <a href="${groupUrl(c)}">${groupOf(c)} 전체</a> · <a href="/c/">78장 전체</a></p>`;
};
const yesnoLine = (c) => `<div class="yn ${YESNO[c.yesno].cls}"><b>${YESNO[c.yesno].ko}</b><span>${esc(c.yesnoNote)}</span></div>`;

/* ---------- 카드 페이지 ---------- */
CARDS.forEach((c) => {
  const url = cUrl(c);
  const g = groupOf(c);
  const structure = c.arcana === 'major'
    ? `<section><h2>카드의 자리</h2><ul class="meta"><li><b>번호</b> ${esc(c.meta.number)}</li><li><b>원소</b> ${esc(c.meta.element)}</li><li><b>점성</b> ${esc(c.meta.astro)}</li></ul><p>메이저 아르카나 22장은 바보(0)가 세계(21)에 이르는 여정입니다. ${esc(c.name)}는 그 ${c.no}번째 자리에서 ${esc(c.kw.up.slice(0, 3).join('·'))}의 주제를 맡습니다. <a href="/major/">메이저 22장 흐름 보기</a></p></section>`
    : `<section><h2>구조로 읽기 — ${SUITS[c.suit].ko} × ${esc(RANK_MEANING[c.rank].label)}</h2><p>${esc(SUITS[c.suit].ko)}는 ${SUITS[c.suit].el}의 원소로 ${esc(SUITS[c.suit].theme)}을 다룹니다. ${esc(RANK_MEANING[c.rank].text)} 그래서 ${esc(c.name)}는 ${esc(SUITS[c.suit].theme.split('·')[0])}의 영역에서 ${esc(RANK_MEANING[c.rank].label)}의 단계를 뜻합니다. <a href="/${c.suit}/">${SUITS[c.suit].ko} 14장 전체 보기</a></p></section>`;
  const topicSummary = TOPICS.map((tp) => `<li><a href="${url}${tp.key}/"><b>${tp.title}</b></a><span class="up">정: ${esc(first(c[tp.key].up.replace(/^[^,]*에서 /, '')))}</span><span class="rv">역: ${esc(first(c[tp.key].rev.replace(/^[^,]*에서 /, '')))}</span></li>`).join('\n');
  const title = `${c.name} 카드 의미 — 정방향·역방향, 연애·재물·직장 해석 (${c.en})`;
  const desc = `타로 ${c.name}(${c.en}) 카드 뜻. 정방향 ${c.kw.up.slice(0, 3).join('·')}, 역방향 ${c.kw.rev.slice(0, 3).join('·')}. ${first(c.up)} 연애·재물·직장·건강 해석과 예/아니오까지.`;
  const body = `
<div class="overline"><a href="/c/">타로 카드 78장</a> · <a href="${groupUrl(c)}">${g}</a></div>
<div class="chero">
  <div class="chero-card">${cardSvg(c)}</div>
  <div class="chero-body">
    <h1>${esc(c.name)} <small>${esc(c.en)}</small></h1>
    <div class="chips"><span>${g}</span><span>${esc(rankLabel(c))}</span>${c.arcana === 'major' ? `<span>${esc(c.meta.element)}</span>` : `<span>${SUITS[c.suit].el}</span>`}<span class="yn-chip ${YESNO[c.yesno].cls}">예·아니오: ${YESNO[c.yesno].ko}</span></div>
    <div class="kwrow"><b>정방향</b>${chips(c.kw.up, 'up')}</div>
    <div class="kwrow"><b>역방향</b>${chips(c.kw.rev, 'rv')}</div>
    <p class="lead">${esc(first(c.up))}</p>
  </div>
</div>
<section><h2>카드 그림</h2><p>${esc(c.img)}</p></section>
<section class="up-sec"><h2>${esc(c.name)} 정방향 의미</h2>${paras(c.up)}</section>
<section class="rv-sec"><h2>${esc(c.name)} 역방향 의미</h2>${paras(c.rev)}<p><a href="${url}reversed/">역방향 자세히 — 연애·재물·직장·건강별 역방향 해석 →</a></p></section>
<section><h2>주제별 해석</h2><ul class="topics">
${topicSummary}
</ul></section>
<section><h2>예·아니오 질문이라면</h2>${yesnoLine(c)}</section>
<section><h2>한 줄 조언</h2><p class="advice">${esc(c.advice)}</p></section>
${structure}
${relatedBox(c)}
${neighbors(c)}
<section class="draw-cta"><h2>이 카드가 오늘 나에게 나왔다면</h2><p>질문을 마음에 두고 한 장을 뽑아 보세요. 뽑은 카드의 의미가 바로 이어집니다.</p><a class="btn" href="/draw/">카드 뽑기</a> <a class="btn ghost" href="/daily/">오늘의 카드</a></section>
<p class="note">타로는 정해진 미래가 아니라 지금의 상황을 비추는 거울입니다. 태어난 날의 여덟 글자로 보는 흐름은 <a href="${SAJU}/">사주첩</a>에서, 꿈에 나온 상징은 <a href="${DREAM}/">꿈첩</a>에서 이어 보세요.</p>`;
  add(url, shell({ url, title, desc, body, jsonld: [crumbs([{ name: '타로첩', url: '/' }, { name: g, url: groupUrl(c) }, { name: c.name, url }]), article(title, desc, url), faq([
    [`타로 ${c.name} 카드는 어떤 뜻인가요?`, `${first(c.up)} 키워드는 ${c.kw.up.join(', ')}입니다.`],
    [`${c.name} 역방향은 어떤 뜻인가요?`, `${first(c.rev)} 키워드는 ${c.kw.rev.join(', ')}입니다.`],
    [`${c.name} 카드는 예/아니오 질문에서 어떻게 읽나요?`, `${YESNO[c.yesno].ko}에 가깝습니다. ${c.yesnoNote}`]
  ])] }));

  /* 역방향 페이지 */
  {
    const rurl = `${url}reversed/`;
    const rtitle = `${c.name} 역방향 의미 — 연애·재물·직장·건강별 해석 (${c.en} Reversed)`;
    const rdesc = `타로 ${c.name} 카드가 뒤집혀 나왔을 때. 역방향 키워드 ${c.kw.rev.join('·')}. ${first(c.rev)} 연애·재물·직장·건강에서 역방향이 뜻하는 것.`;
    const rbody = `
<div class="overline"><a href="/c/">타로 카드 78장</a> · <a href="${url}">${esc(c.name)}</a> · 역방향</div>
<div class="chero rev">
  <div class="chero-card flip">${cardSvg(c)}</div>
  <div class="chero-body">
    <h1>${esc(c.name)} 역방향 <small>${esc(c.en)} Reversed</small></h1>
    <div class="kwrow"><b>역방향 키워드</b>${chips(c.kw.rev, 'rv')}</div>
    <p class="lead">${esc(first(c.rev))}</p>
  </div>
</div>
<section><h2>역방향은 무엇이 다른가</h2><p>정방향 ${esc(c.name)}가 ${esc(c.kw.up.slice(0, 3).join('·'))}을 말한다면, 뒤집힌 ${esc(c.name)}는 그 힘이 막히거나 지나치거나 반대로 작동하는 것을 보여 줍니다. 역방향은 나쁜 카드가 아니라 같은 주제를 다른 각도에서 보라는 신호예요.</p>${paras(c.rev)}</section>
${TOPICS.map((tp) => `<section class="rv-sec"><h2>${tp.title}에서 ${esc(c.name)} 역방향</h2><p>${esc(c[tp.key].rev)}</p><p class="sub">정방향이라면: ${esc(first(c[tp.key].up))} <a href="${url}${tp.key}/">${tp.ko} 해석 전체 →</a></p></section>`).join('\n')}
<section><h2>역방향일 때 조언</h2><p class="advice">${esc(c.advice)}</p><p>역방향은 조언의 방향을 바꾸지 않고 시급함을 더합니다. 위 조언을 "지금 막혀 있는 것"에 적용해 보세요.</p></section>
<section><h2>예·아니오 질문이라면</h2>${yesnoLine(c)}<p class="sub">역방향은 대개 정방향의 답을 약하게 하거나 뒤집습니다. 정방향 "예"라면 "늦어짐·조건부", 정방향 "아니오"라면 "벗어남·완화"로 읽는 것이 보통입니다.</p></section>
${relatedBox(c)}
<p class="callout"><a href="${url}">${esc(c.name)} 정방향과 전체 의미</a> · <a href="${groupUrl(c)}">${g} 전체</a> · <a href="/guide/#reversed">역방향 읽는 법</a></p>`;
    add(rurl, shell({ url: rurl, title: rtitle, desc: rdesc, body: rbody, jsonld: [crumbs([{ name: '타로첩', url: '/' }, { name: c.name, url }, { name: '역방향', url: rurl }]), article(rtitle, rdesc, rurl)] }));
  }

  /* 주제별 페이지 */
  TOPICS.forEach((tp) => {
    const turl = `${url}${tp.key}/`;
    const others = TOPICS.filter((x) => x !== tp).map((x) => `<a href="${url}${x.key}/">${x.title}</a>`).join(' · ');
    const ttitle = `${c.name} 카드 ${tp.title} 해석 — 정방향·역방향 (${c.en})`;
    const tdesc = `타로 ${c.name}가 ${tp.desc} 질문에 나왔을 때. 정방향: ${first(c[tp.key].up)} 역방향: ${first(c[tp.key].rev)}`;
    const tbody = `
<div class="overline"><a href="/c/">타로 카드 78장</a> · <a href="${url}">${esc(c.name)}</a> · ${tp.title}</div>
<div class="chero">
  <div class="chero-card">${cardSvg(c)}</div>
  <div class="chero-body">
    <h1>${esc(c.name)} — ${tp.title} <small>${esc(c.en)}</small></h1>
    <div class="chips"><span>${g}</span><span>${tp.desc}</span><span class="yn-chip ${YESNO[c.yesno].cls}">예·아니오: ${YESNO[c.yesno].ko}</span></div>
    <p class="lead">${esc(first(c.up))} ${tp.desc}의 질문에서는 이렇게 읽습니다.</p>
  </div>
</div>
<section class="up-sec"><h2>${tp.title} 정방향</h2><p>${esc(c[tp.key].up)}</p></section>
<section class="rv-sec"><h2>${tp.title} 역방향</h2><p>${esc(c[tp.key].rev)}</p></section>
<section><h2>이 카드의 바탕 — 일반 의미</h2><p>${esc(first(c.up))} ${esc(c.up.split(/\n\s*\n/)[0].split(/(?<=[.!?])\s/).slice(1, 3).join(' '))} <a href="${url}">${esc(c.name)} 전체 의미 보기</a></p></section>
<section><h2>한 줄 조언</h2><p class="advice">${esc(c.advice)}</p></section>
<section><h2>같은 카드, 다른 질문</h2><p>${others} · <a href="${url}reversed/">역방향 전체</a></p></section>
<section><h2>${tp.title} 질문에 자주 나오는 카드</h2>${grid(TOPIC_PICK[tp.key].filter((x) => x !== c).slice(0, 6))}<p class="sub"><a href="/${tp.key}/">${tp.title} 타로 카드 78장 한눈에 →</a></p></section>
${neighbors(c)}`;
    add(turl, shell({ url: turl, title: ttitle, desc: tdesc, body: tbody, jsonld: [crumbs([{ name: '타로첩', url: '/' }, { name: c.name, url }, { name: tp.title, url: turl }]), article(ttitle, tdesc, turl)] }));
  });
});



/* ---------- 목록: 78장 · 메이저 · 수트 ---------- */
{
  const majors = CARDS.filter((c) => c.arcana === 'major');
  const url = '/c/';
  const body = `
<div class="overline">타로첩</div>
<h1>타로 카드 78장 의미 사전</h1>
<p class="lead">메이저 아르카나 22장과 마이너 아르카나 56장(완드·컵·소드·펜타클 각 14장). 카드마다 정방향·역방향 의미와 연애·재물·직장·건강별 해석, 예/아니오 판단을 정리했습니다. 카드 이름을 누르면 바로 이어집니다.</p>
<section><h2><a href="/major/">메이저 아르카나 22장</a></h2><p>바보에서 세계까지, 인생의 큰 주제를 맡은 카드들입니다.</p>${grid(majors)}</section>
${Object.values(SUITS).map((s) => `<section><h2><a href="/${s.slug}/">${s.ko} 14장</a> <small>${s.alt} · ${s.el}</small></h2><p>${esc(s.theme)}</p>${grid(CARDS.filter((c) => c.suit === s.slug))}</section>`).join('\n')}
<p class="callout"><a href="/yesno/">78장 예·아니오 표</a> · <a href="/love/">연애 카드</a> · <a href="/money/">재물 카드</a> · <a href="/work/">직장 카드</a> · <a href="/health/">건강 카드</a> · <a href="/guide/">타로 기초</a></p>`;
  add(url, shell({ url, title: '타로 카드 78장 의미 사전 — 메이저·마이너 정방향·역방향 해석', desc: '타로 카드 78장 전체 의미. 메이저 아르카나 22장과 완드·컵·소드·펜타클 56장의 정방향·역방향 뜻, 연애·재물·직장·건강별 해석, 예/아니오 판단까지 한 곳에.', body, jsonld: crumbs([{ name: '타로첩', url: '/' }, { name: '78장', url }]) }));

  const murl = '/major/';
  const mbody = `
<div class="overline"><a href="/c/">타로 카드 78장</a></div>
<h1>메이저 아르카나 22장 — 바보의 여정</h1>
<p class="lead">메이저 아르카나는 타로의 뼈대입니다. 0번 바보가 길을 떠나 마법사·여사제·여황제·황제(자아와 세계의 기초)를 만나고, 연인·전차·힘·은둔자(시련과 성숙)를 지나, 운명의 수레바퀴와 정의·매달린 사람·죽음(전환)을 거쳐, 절제·악마·탑·별·달·태양·심판(영혼의 밤과 새벽)을 통과해 21번 세계에서 완성됩니다. 리딩에서 메이저가 나오면 그 자리는 인생의 큰 흐름이 걸려 있다는 뜻이에요.</p>
<section><h2>22장 한눈에</h2>${grid(majors)}</section>
<section><h2>세 줄로 읽는 여정</h2>
<h3>0~7 · 세상으로 나가기</h3><p>${majors.slice(0, 8).map((c) => `<a href="${cUrl(c)}">${esc(c.name)}</a>(${esc(c.kw.up[0])})`).join(' → ')}</p>
<h3>8~14 · 안으로 돌아서기</h3><p>${majors.slice(8, 15).map((c) => `<a href="${cUrl(c)}">${esc(c.name)}</a>(${esc(c.kw.up[0])})`).join(' → ')}</p>
<h3>15~21 · 어둠을 지나 완성으로</h3><p>${majors.slice(15).map((c) => `<a href="${cUrl(c)}">${esc(c.name)}</a>(${esc(c.kw.up[0])})`).join(' → ')}</p></section>
<section><h2>메이저 22장 예·아니오</h2><table class="yntable"><thead><tr><th>카드</th><th>정방향 키워드</th><th>예·아니오</th></tr></thead><tbody>${majors.map((c) => `<tr><td><a href="${cUrl(c)}">${esc(c.name)}</a></td><td>${esc(c.kw.up.slice(0, 3).join('·'))}</td><td><span class="yn-chip ${YESNO[c.yesno].cls}">${YESNO[c.yesno].ko}</span></td></tr>`).join('')}</tbody></table></section>
<p class="callout"><a href="/wands/">완드</a> · <a href="/cups/">컵</a> · <a href="/swords/">소드</a> · <a href="/pentacles/">펜타클</a> · <a href="/guide/">타로 기초</a></p>`;
  add(murl, shell({ url: murl, title: '메이저 아르카나 22장 의미 — 바보에서 세계까지 정방향·역방향', desc: '타로 메이저 아르카나 22장 전체. 바보·마법사·여사제·여황제·황제·교황·연인·전차·힘·은둔자·운명의 수레바퀴·정의·매달린 사람·죽음·절제·악마·탑·별·달·태양·심판·세계의 뜻과 예/아니오.', body: mbody, jsonld: crumbs([{ name: '타로첩', url: '/' }, { name: '메이저 아르카나', url: murl }]) }));

  Object.values(SUITS).forEach((s) => {
    const list = CARDS.filter((c) => c.suit === s.slug);
    const surl = `/${s.slug}/`;
    const sbody = `
<div class="overline"><a href="/c/">타로 카드 78장</a> · 마이너 아르카나</div>
<h1>${s.ko} 카드 14장 의미 — ${s.el}의 수트</h1>
<p class="lead">${esc(s.intro)}</p>
<section><h2>${s.ko} 에이스부터 킹까지</h2>${grid(list)}</section>
<section><h2>숫자로 읽는 ${s.ko}</h2><ul class="ranklist">${list.map((c) => `<li><a href="${cUrl(c)}"><b>${esc(RANK_MEANING[c.rank].label)}</b> ${esc(c.name)}</a><span>${esc(c.kw.up.slice(0, 3).join(' · '))}</span><small>${esc(RANK_MEANING[c.rank].text)}</small></li>`).join('')}</ul></section>
<section><h2>${s.ko} 14장 예·아니오</h2><table class="yntable"><thead><tr><th>카드</th><th>정방향 키워드</th><th>예·아니오</th></tr></thead><tbody>${list.map((c) => `<tr><td><a href="${cUrl(c)}">${esc(c.name)}</a></td><td>${esc(c.kw.up.slice(0, 3).join('·'))}</td><td><span class="yn-chip ${YESNO[c.yesno].cls}">${YESNO[c.yesno].ko}</span></td></tr>`).join('')}</tbody></table></section>
<p class="callout">${Object.values(SUITS).filter((x) => x !== s).map((x) => `<a href="/${x.slug}/">${x.ko}</a>`).join(' · ')} · <a href="/major/">메이저 아르카나</a></p>`;
    add(surl, shell({ url: surl, title: `${s.ko} 카드 14장 의미 — 에이스부터 킹까지 정방향·역방향 (${s.alt}, ${s.el})`, desc: `타로 ${s.ko}(${s.alt}) 수트 14장. ${s.theme}을 다루는 ${s.el}의 카드들. 에이스·2~10·페이지·나이트·퀸·킹의 뜻과 연애·재물·직장 해석, 예/아니오.`, body: sbody, jsonld: crumbs([{ name: '타로첩', url: '/' }, { name: s.ko, url: surl }]) }));
  });
}

/* ---------- 주제 허브 ---------- */
TOPICS.forEach((tp) => {
  const url = `/${tp.key}/`;
  const rows = (list) => `<ul class="tlist">${list.map((c) => `<li><a href="${cUrl(c)}${tp.key}/"><b>${esc(c.name)}</b></a><span class="up">${esc(first(c[tp.key].up.replace(/^[^,]*에서 /, '')))}</span><span class="rv">역: ${esc(first(c[tp.key].rev.replace(/^[^,]*에서 /, '')))}</span></li>`).join('')}</ul>`;
  const INTRO = {
    love: '연애 질문에서 타로는 상대의 마음을 점치는 도구라기보다 지금 관계의 결을 비추는 거울입니다. 컵은 감정, 완드는 열정, 소드는 소통과 갈등, 펜타클은 현실적 기반을 말하고, 메이저는 관계의 큰 흐름을 말해요. 카드를 누르면 연애 정방향·역방향 해석으로 이어집니다.',
    money: '재물 질문에서는 펜타클이 직접 돈을 말하고, 완드는 벌이는 힘, 컵은 돈에 대한 감정, 소드는 계약과 판단을 말합니다. 메이저는 재정의 큰 전환을 뜻해요. 카드를 누르면 재물 정방향·역방향 해석으로 이어집니다.',
    work: '직장·학업 질문에서는 완드가 추진과 경쟁, 펜타클이 성과와 안정, 소드가 전략과 갈등, 컵이 직장 내 관계를 말합니다. 메이저는 커리어의 전환점이에요. 카드를 누르면 직장 정방향·역방향 해석으로 이어집니다.',
    health: '건강 질문에서 타로는 진단 도구가 아닙니다. 몸과 마음의 상태를 비추는 참고로만 읽고, 실제 증상은 반드시 의료진과 상의하세요. 카드를 누르면 건강 정방향·역방향 해석으로 이어집니다.'
  };
  const body = `
<div class="overline">타로첩 · 주제별</div>
<h1>${tp.title} 타로 카드 의미 — 78장 한눈에</h1>
<p class="lead">${esc(INTRO[tp.key])}</p>
<section><h2>${tp.title} 질문에 자주 나오는 카드</h2>${grid(TOPIC_PICK[tp.key])}</section>
<section><h2>메이저 아르카나 22장</h2>${rows(CARDS.filter((c) => c.arcana === 'major'))}</section>
${Object.values(SUITS).map((s) => `<section><h2>${s.ko} 14장</h2>${rows(CARDS.filter((c) => c.suit === s.slug))}</section>`).join('\n')}
<p class="callout">${TOPICS.filter((x) => x !== tp).map((x) => `<a href="/${x.key}/">${x.title}</a>`).join(' · ')} · <a href="/yesno/">예·아니오 표</a></p>`;
  add(url, shell({ url, title: `${tp.title} 타로 카드 의미 — 78장 정방향·역방향 ${tp.ko} 해석`, desc: `타로 78장의 ${tp.title} 해석을 한 페이지에. ${tp.desc} 질문에 카드가 나왔을 때 정방향과 역방향이 뜻하는 것.`, body, jsonld: crumbs([{ name: '타로첩', url: '/' }, { name: tp.title, url }]) }));
});

/* ---------- 예·아니오 ---------- */
{
  const url = '/yesno/';
  const groups = [['메이저 아르카나', CARDS.filter((c) => c.arcana === 'major')]].concat(Object.values(SUITS).map((s) => [s.ko, CARDS.filter((c) => c.suit === s.slug)]));
  const counts = { yes: 0, no: 0, maybe: 0 };
  CARDS.forEach((c) => counts[c.yesno]++);
  const body = `
<div class="overline">타로첩</div>
<h1>타로 예·아니오 — 78장 카드별 판단표</h1>
<p class="lead">"될까요, 안 될까요?"에 한 장으로 답을 얻는 방법입니다. 질문을 예/아니오로 답할 수 있게 다듬고, 한 장을 뽑아 아래 표에서 찾으세요. 정방향이면 표의 답을, 역방향이면 대개 그 답이 약해지거나 뒤집힙니다. 78장 가운데 예 ${counts.yes}장, 아니오 ${counts.no}장, 보류 ${counts.maybe}장입니다.</p>
<section><h2>읽는 법</h2><ul class="meta"><li><b>예</b> — 흐름이 질문을 밀어줍니다. 다만 카드의 조건(노력·시간·균형)을 함께 읽으세요.</li><li><b>아니오</b> — 지금 방식으로는 어렵다는 뜻입니다. 카드가 말하는 이유를 바꾸면 답도 바뀝니다.</li><li><b>보류</b> — 아직 정해지지 않았거나 당신의 선택에 달려 있습니다. 정보가 더 필요하거나 결정을 미루라는 뜻이에요.</li></ul></section>
${groups.map(([name, list]) => `<section><h2>${name}</h2><table class="yntable"><thead><tr><th>카드</th><th>답</th><th>이렇게 읽어요</th></tr></thead><tbody>${list.map((c) => `<tr><td><a href="${cUrl(c)}">${esc(c.name)}</a></td><td><span class="yn-chip ${YESNO[c.yesno].cls}">${YESNO[c.yesno].ko}</span></td><td>${esc(c.yesnoNote)}</td></tr>`).join('')}</tbody></table></section>`).join('\n')}
<section class="draw-cta"><h2>지금 한 장 뽑기</h2><p>질문을 마음에 두고 뽑으면 이 표의 답으로 바로 이어집니다.</p><a class="btn" href="/draw/?mode=yesno">예·아니오 카드 뽑기</a></section>`;
  add(url, shell({ url, title: '타로 예·아니오 — 78장 카드별 판단표 (예/아니오/보류)', desc: '타로 카드 78장을 예·아니오·보류로 정리한 표. 한 장 뽑기로 "될까요?"에 답하는 법, 정방향·역방향 읽는 법, 카드별 판단 이유.', body, jsonld: crumbs([{ name: '타로첩', url: '/' }, { name: '예·아니오', url }]) }));
}

/* ---------- 오늘의 카드 ---------- */
{
  const url = '/daily/';
  const c = todayCard, rev = todayRev;
  const body = `
<div class="overline">타로첩 · 매일 갱신</div>
<h1>오늘의 타로 카드 — ${today.y}년 ${today.m}월 ${today.d}일 ${wd}</h1>
<p class="lead">하루 한 장, 오늘의 결을 비추는 카드입니다. 날짜마다 정해진 카드가 뽑히고 매일 새벽 바뀝니다. 나만의 카드를 뽑고 싶다면 <a href="/draw/">카드 뽑기</a>로 가세요.</p>
<div class="chero${rev ? ' rev' : ''}">
  <div class="chero-card${rev ? ' flip' : ''}">${cardSvg(c)}</div>
  <div class="chero-body">
    <h2 class="h1like"><a href="${cUrl(c)}${rev ? 'reversed/' : ''}">${esc(c.name)} ${rev ? '역방향' : '정방향'}</a> <small>${esc(c.en)}${rev ? ' Reversed' : ''}</small></h2>
    <div class="kwrow"><b>오늘의 키워드</b>${chips(rev ? c.kw.rev : c.kw.up, rev ? 'rv' : 'up')}</div>
    <p class="lead">${esc(first(rev ? c.rev : c.up))}</p>
  </div>
</div>
<section><h2>오늘의 흐름</h2>${paras(rev ? c.rev : c.up)}</section>
<section><h2>오늘 하루에 적용하면</h2><ul class="topics">${TOPICS.map((tp) => `<li><a href="${cUrl(c)}${tp.key}/"><b>${tp.title}</b></a><span class="${rev ? 'rv' : 'up'}">${esc(first(c[tp.key][rev ? 'rev' : 'up'].replace(/^[^,]*에서 /, '')))}</span></li>`).join('')}</ul></section>
<section><h2>오늘의 한 줄</h2><p class="advice">${esc(c.advice)}</p></section>
<section><h2>이 카드 더 보기</h2><p><a href="${cUrl(c)}">${esc(c.name)} 전체 의미</a> · <a href="${cUrl(c)}reversed/">역방향</a> · <a href="${groupUrl(c)}">${groupOf(c)} 전체</a></p></section>
<p class="note">오늘의 일진(60갑자)으로 보는 하루 흐름은 <a href="${SAJU}/day/${BUILD_ISO}/">사주첩의 ${today.m}월 ${today.d}일 일진</a>에서, 오늘 꾼 꿈은 <a href="${DREAM}/">꿈첩</a>에서 이어 보세요.</p>`;
  add(url, shell({ url, title: `오늘의 타로 카드 ${today.m}월 ${today.d}일 — ${c.name} ${rev ? '역방향' : '정방향'}`, desc: `${today.y}년 ${today.m}월 ${today.d}일 오늘의 타로 카드는 ${c.name} ${rev ? '역방향' : '정방향'}. ${first(rev ? c.rev : c.up)} 하루 한 장, 매일 새벽 갱신.`, body, jsonld: crumbs([{ name: '타로첩', url: '/' }, { name: '오늘의 카드', url }]) }));
}

/* ---------- 카드 뽑기 ---------- */
{
  const url = '/draw/';
  const body = `
<div class="overline">타로첩</div>
<h1>타로 카드 뽑기 — 원카드 · 쓰리카드 · 예아니오</h1>
<p class="lead">질문을 마음에 두고 뽑으세요. 카드는 78장 가운데 무작위로 나오며, 역방향은 셋 중 하나 정도의 확률로 섞입니다. 뽑은 카드는 의미 페이지로 바로 이어집니다.</p>
<div class="draw" id="draw">
  <div class="draw-modes" role="tablist"><button data-mode="one" class="on">한 장</button><button data-mode="three">세 장 (과거·현재·미래)</button><button data-mode="yesno">예·아니오</button></div>
  <label class="draw-q"><span>질문 (선택)</span><input type="text" id="draw-q" maxlength="60" placeholder="예: 이 일을 시작해도 될까?"></label>
  <button class="btn big" id="draw-go">카드 뽑기</button>
  <div class="draw-result" id="draw-result" hidden></div>
</div>
<section><h2>어떻게 읽나요</h2><ul class="meta"><li><b>한 장</b> — 오늘 하루나 하나의 질문에. 카드의 정·역방향 의미를 그대로 읽습니다.</li><li><b>세 장</b> — 왼쪽부터 과거(원인)·현재(상황)·미래(흐름). 세 장이 하나의 이야기가 되게 이어 읽습니다.</li><li><b>예·아니오</b> — 한 장의 예/아니오/보류 판단과 그 이유를 봅니다. 역방향은 답을 약하게 하거나 뒤집습니다.</li></ul><p>배열법이 더 궁금하면 <a href="/spreads/">타로 배열법 안내</a>, 처음이라면 <a href="/guide/">타로 기초</a>를 먼저 보세요.</p></section>
<p class="note">뽑기는 브라우저에서만 이루어지며 질문과 결과는 저장되지 않습니다.</p>`;
  add(url, shell({ url, title: '타로 카드 뽑기 — 원카드·쓰리카드·예아니오 무료 타로', desc: '질문을 두고 타로 카드를 뽑아 보세요. 한 장, 세 장(과거·현재·미래), 예·아니오. 뽑은 카드의 정방향·역방향 의미로 바로 이어집니다.', body, jsonld: { '@context': 'https://schema.org', '@type': 'WebApplication', name: '타로첩 카드 뽑기', url: SITE + url, applicationCategory: 'LifestyleApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' } }, extraScript: '<script src="/js/draw.js" defer></script>' }));
}

/* ---------- 배열법 · 기초 ---------- */
{
  const url = '/spreads/';
  const body = `
<div class="overline">타로첩 · 안내</div>
<h1>타로 배열법 — 원카드·쓰리카드·켈틱 크로스</h1>
<p class="lead">배열법(스프레드)은 카드를 놓는 자리마다 뜻을 정해 두는 약속입니다. 자리가 정해져 있으면 같은 카드도 "원인"인지 "결과"인지 읽을 수 있어요. 처음에는 한 장과 세 장으로 충분합니다.</p>
<section><h2>원카드 — 하루 한 장</h2><p>질문 하나에 한 장. 가장 단순하고 가장 자주 쓰는 방법입니다. 아침에 뽑아 하루의 결로 삼거나, 결정을 앞두고 조언을 청할 때 씁니다. 카드의 정·역방향 의미를 그대로 읽고, 주제(연애·재물·직장·건강)가 있으면 그 해석을 봅니다. <a href="/daily/">오늘의 카드</a>가 이 방식이에요.</p></section>
<section><h2>쓰리카드 — 과거·현재·미래</h2><p>왼쪽부터 세 장을 놓습니다. 첫 장은 지금 상황의 원인이나 지나온 흐름, 둘째 장은 현재 상황의 핵심, 셋째 장은 이대로 갈 때의 흐름이에요. 같은 세 자리를 "상황·장애·조언"이나 "나·상대·관계"로 바꿔 읽어도 됩니다. 세 장을 따로 읽지 말고 한 문장의 이야기로 이어 보세요. 소드 3(상처) → 소드 4(휴식) → 별(희망)이면 "상처 뒤 쉬어 가면 회복된다"는 식입니다.</p></section>
<section><h2>켈틱 크로스 — 열 장으로 보는 전체</h2><p>가장 유명한 큰 배열입니다. 1 현재 상황, 2 가로놓인 장애(또는 도움), 3 뿌리(무의식·원인), 4 지나간 과거, 5 의식·목표(머리 위), 6 다가오는 가까운 미래, 7 나 자신의 태도, 8 주변 환경과 사람, 9 희망과 두려움, 10 최종 흐름. 열 장을 다 읽으려면 메이저·마이너의 비율, 수트의 분포, 반복되는 숫자를 먼저 보고 세부로 들어가세요. 익숙해지기 전에는 세 장이 낫습니다.</p></section>
<section><h2>관계 배열 — 나·상대·사이</h2><p>세 장을 나, 상대, 두 사람 사이로 놓습니다. 연애 질문에 잘 맞고, 상대 자리의 카드는 상대의 마음이 아니라 "관계 안에서 상대가 보이는 결"로 읽는 것이 안전합니다. <a href="/love/">연애 카드 78장</a>과 함께 보세요.</p></section>
<section><h2>몇 가지 원칙</h2><ul class="meta"><li><b>질문을 먼저</b> — 막연한 질문은 막연한 답을 냅니다. "그 사람이 나를 좋아할까?"보다 "이 관계에서 내가 볼 것은?"이 더 쓸모 있어요.</li><li><b>같은 질문을 반복해서 뽑지 않기</b> — 답이 마음에 안 들어 다시 뽑으면 카드는 거울 노릇을 멈춥니다.</li><li><b>역방향은 선택</b> — 처음엔 정방향만 읽어도 됩니다. 익숙해지면 역방향을 섞으세요.</li><li><b>결정은 내 것</b> — 카드는 상황을 비추지 결정을 대신하지 않습니다.</li></ul></section>
<section class="draw-cta"><h2>바로 뽑기</h2><a class="btn" href="/draw/">한 장 · 세 장 뽑기</a> <a class="btn ghost" href="/guide/">타로 기초</a></section>`;
  add(url, shell({ url, title: '타로 배열법 — 원카드·쓰리카드·켈틱 크로스·관계 배열 읽는 법', desc: '타로 스프레드 안내. 하루 한 장 원카드, 과거·현재·미래 쓰리카드, 열 장 켈틱 크로스, 관계 배열의 자리 뜻과 읽는 원칙.', body, jsonld: crumbs([{ name: '타로첩', url: '/' }, { name: '배열법', url }]) }));

  const gurl = '/guide/';
  const gbody = `
<div class="overline">타로첩 · 안내</div>
<h1>타로 기초 — 78장의 구조와 읽는 법</h1>
<p class="lead">타로는 78장의 그림 카드입니다. 22장의 메이저 아르카나는 인생의 큰 주제를, 56장의 마이너 아르카나는 일상의 결을 맡아요. 점이라기보다 지금 상황을 다른 언어로 비추는 거울이라 생각하면 읽기가 편해집니다.</p>
<section id="structure"><h2>메이저와 마이너</h2><p><a href="/major/">메이저 아르카나</a>는 바보(0)부터 세계(21)까지 번호가 있고, 각 카드가 하나의 큰 주제(시작·선택·시련·전환·완성)를 맡습니다. 리딩에서 메이저가 나오면 그 자리는 인생의 흐름이 걸린 곳이에요. <a href="/c/">마이너 아르카나</a>는 네 수트로 나뉩니다. <a href="/wands/">완드</a>(불·행동), <a href="/cups/">컵</a>(물·감정), <a href="/swords/">소드</a>(공기·생각), <a href="/pentacles/">펜타클</a>(흙·물질). 각 수트는 에이스~10의 숫자 카드 열 장과 페이지·나이트·퀸·킹의 궁정 카드 넷으로 이루어져요.</p></section>
<section id="numbers"><h2>숫자와 궁정 카드</h2><ul class="ranklist">${Object.entries(RANK_MEANING).map(([k, v]) => `<li><b>${esc(v.label)}</b><small>${esc(v.text)}</small></li>`).join('')}</ul></section>
<section id="reversed"><h2>정방향과 역방향</h2><p>카드가 뒤집혀 나오면 역방향입니다. 역방향은 나쁜 카드가 아니라 같은 주제가 막히거나, 지나치거나, 반대로 작동하거나, 안으로 향한다는 신호예요. 태양 역방향은 "불행"이 아니라 "빛이 잠시 가려짐"이고, 악마 역방향은 오히려 "속박에서 벗어남"입니다. 각 카드 페이지의 역방향 해석과 <a href="/yesno/">예·아니오 표</a>의 역방향 읽는 법을 참고하세요. 처음엔 정방향만 읽어도 충분합니다.</p></section>
<section id="question"><h2>좋은 질문 만들기</h2><p>타로는 질문의 질을 그대로 돌려줍니다. "될까요?"만 묻는 것보다 "이 상황에서 내가 놓치고 있는 것은?", "다음 한 달 어디에 힘을 둘까?"처럼 내가 움직일 수 있는 것을 물으세요. 남의 마음을 묻는 질문은 "관계 안에서 내가 볼 것"으로 바꾸면 더 쓸모 있는 답이 나옵니다.</p></section>
<section id="ethics"><h2>읽을 때 지킬 것</h2><ul class="meta"><li>건강·법률·재정의 중요한 결정은 카드가 아니라 전문가와 상의하세요.</li><li>같은 질문을 답이 마음에 들 때까지 반복해 뽑지 마세요.</li><li>카드는 정해진 미래가 아니라 지금의 흐름입니다. 흐름은 행동으로 바뀝니다.</li></ul></section>
<section class="draw-cta"><h2>시작하기</h2><a class="btn" href="/draw/">카드 뽑기</a> <a class="btn ghost" href="/spreads/">배열법 보기</a> <a class="btn ghost" href="/c/">78장 사전</a></section>
<p class="note">타로첩은 <a href="${SAJU}/">사주첩</a>이 만든 자매 사이트입니다. 태어난 날의 여덟 글자로 보는 흐름은 사주첩에서, 꿈의 상징은 <a href="${DREAM}/">꿈첩</a>에서, 생년월일의 나이·띠·기념일은 <a href="${SAENGIL}/">생일첩</a>에서 이어 보세요.</p>`;
  add(gurl, shell({ url: gurl, title: '타로 기초 — 78장의 구조, 정방향·역방향, 질문 만드는 법', desc: '타로 입문. 메이저 22장과 마이너 56장의 구조, 네 수트와 숫자·궁정 카드의 뜻, 역방향 읽는 법, 좋은 질문 만들기와 읽을 때 지킬 원칙.', body: gbody, jsonld: crumbs([{ name: '타로첩', url: '/' }, { name: '타로 기초', url: gurl }]) }));
}

/* ---------- 홈 ---------- */
{
  const majors = CARDS.filter((c) => c.arcana === 'major');
  const body = `
<section class="hero">
  <h1>타로첩 <small>占</small></h1>
  <p>타로 카드 78장의 의미를 정방향·역방향, 연애·재물·직장·건강별로 풀어 둔 사전입니다. 오늘의 카드를 보고, 한 장을 뽑고, 나온 카드의 뜻을 바로 읽으세요.</p>
  <div class="hero-cta"><a class="btn" href="/draw/">카드 뽑기</a><a class="btn ghost" href="/c/">78장 사전</a><a class="btn ghost" href="/yesno/">예·아니오</a></div>
</section>
${todayBox()}
<section><h2><a href="/major/">메이저 아르카나 22장</a></h2>${grid(majors)}</section>
<section><h2>마이너 아르카나 — 네 수트</h2><div class="suits">${Object.values(SUITS).map((s) => `<a class="suit" href="/${s.slug}/" style="--sc:${s.color}"><svg viewBox="0 0 200 320" aria-hidden="true"><g style="color:${s.color}" transform="translate(0 40)">${GLYPH[s.slug]}</g></svg><b>${s.ko}</b><span>${esc(s.alt)} · ${s.el}</span><small>${esc(s.theme)}</small></a>`).join('')}</div></section>
<section><h2>질문별로 보기</h2><div class="hubs">${TOPICS.map((tp) => `<a href="/${tp.key}/"><b>${tp.title}</b><span>${tp.desc} 질문에 나온 카드의 뜻</span></a>`).join('')}<a href="/yesno/"><b>예·아니오</b><span>78장 판단표</span></a><a href="/spreads/"><b>배열법</b><span>원카드·쓰리카드·켈틱 크로스</span></a><a href="/guide/"><b>타로 기초</b><span>구조·역방향·질문법</span></a><a href="/daily/"><b>오늘의 카드</b><span>매일 새벽 한 장</span></a></div></section>
<section class="about"><h2>타로첩은</h2><p>타로첩(占帖)은 <a href="${SAJU}/">사주첩</a>이 만든 네 번째 자매 사이트입니다. 첩(帖)은 글을 모아 묶은 책, 점(占)은 비춰 보는 일. 라이더 웨이트 덱 78장을 기준으로 카드마다 그림 묘사, 정방향·역방향 의미, 네 가지 주제 해석, 예·아니오 판단, 한 줄 조언을 한 장씩 담았습니다. 검색창에 카드 이름을 치거나 위의 목록에서 고르세요.</p></section>`;
  add('/', shell({ url: '/', title: '타로첩 — 타로 카드 78장 의미 사전, 오늘의 카드와 카드 뽑기', desc: '타로 카드 78장 정방향·역방향 의미, 연애·재물·직장·건강별 해석, 예·아니오 판단표, 오늘의 카드, 무료 카드 뽑기. 사주첩이 만든 타로 사전.', body, jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: '타로첩', url: SITE + '/', potentialAction: { '@type': 'SearchAction', target: SITE + '/c/?q={q}', 'query-input': 'required name=q' } } }));
}

/* ---------- 정적 페이지 ---------- */
{
  const simple = (url, title, h1, html) => add(url, shell({ url, title: `${title} — 타로첩`, desc: `${title}. 타로첩 안내.`, body: `<div class="overline">타로첩</div><h1>${h1}</h1><div class="prose">${html}</div>`, noSearch: true }));
  simple('/about/', '소개', '타로첩 소개', `<p>타로첩(占帖)은 <a href="${SAJU}/">사주첩</a>이 만든 자매 사이트입니다. 라이더 웨이트 덱 78장을 기준으로 카드마다 그림 묘사, 정방향·역방향 의미, 연애·재물·직장·건강별 해석, 예·아니오 판단, 한 줄 조언을 정리했습니다.</p><p>해석은 라이더 웨이트 전통과 널리 쓰이는 현대 해석을 바탕으로 타로첩이 새로 썼습니다. 카드 그림은 저작권 문제가 없는 타로첩 고유의 도안(번호·수트 상징·이름)입니다.</p><p>오늘의 카드는 날짜에 따라 정해지며 매일 새벽 갱신됩니다. 카드 뽑기는 브라우저에서만 이루어지고 질문과 결과는 어디에도 저장되지 않습니다.</p><p>문의: <a href="${SAJU}/">사주첩</a> 페이지 하단의 연락처를 이용해 주세요.</p>`);
  simple('/terms/', '이용약관', '이용약관', `<h3>1. 서비스</h3><p>타로첩은 타로 카드 의미 사전과 카드 뽑기를 무료로 제공하는 정보 서비스입니다.</p><h3>2. 콘텐츠의 성격</h3><p>모든 해석은 참고용이며 미래를 예언하거나 보증하지 않습니다. 건강·법률·재정 등 중요한 결정은 반드시 전문가와 상의하세요. 이용으로 발생한 결과에 대해 타로첩은 책임지지 않습니다.</p><h3>3. 저작권</h3><p>본문과 도안의 저작권은 타로첩에 있습니다. 출처를 밝힌 짧은 인용은 허용하며, 상업적 복제·전재는 금지합니다.</p><h3>4. 광고</h3><p>사이트에는 Google AdSense 광고가 게재될 수 있습니다.</p>`);
  simple('/privacy/', '개인정보처리방침', '개인정보처리방침', `<h3>1. 수집하는 정보</h3><p>타로첩은 회원 가입이나 개인정보 입력을 요구하지 않습니다. 카드 뽑기의 질문과 결과는 서버로 전송되지 않고 브라우저에서만 처리됩니다.</p><h3>2. 쿠키와 분석</h3><p>Google Analytics로 방문 통계(페이지 조회, 기기 종류 등)를 익명으로 수집하며, Google AdSense가 광고 게재를 위해 쿠키를 사용할 수 있습니다. 브라우저 설정에서 쿠키를 차단할 수 있습니다.</p><h3>3. 제3자 제공</h3><p>수집한 정보를 제3자에게 판매·제공하지 않습니다.</p><h3>4. 문의</h3><p>개인정보 관련 문의는 <a href="${SAJU}/">사주첩</a>의 연락처로 보내 주세요.</p>`);
  fs.writeFileSync(path.join(OUT, '404.html'), shell({ url: '/404.html', title: '페이지를 찾을 수 없어요 — 타로첩', desc: '요청한 페이지가 없습니다.', body: `<div class="overline">타로첩</div><h1>이 카드는 덱에 없어요</h1><p class="lead">주소가 바뀌었거나 없는 페이지입니다. 위 검색창에 카드 이름을 넣거나 <a href="/c/">78장 목록</a>에서 찾아보세요.</p>` }));
}

/* ---------- 검색 색인 · 뽑기 데이터 · 사이트맵 · robots · 정적 파일 ---------- */
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(CARDS.map((c) => ({ t: c.name, e: c.en, u: cUrl(c), k: [c.en].concat(c.alt || [], c.kw.up.slice(0, 3)).join(' '), g: groupOf(c) }))));
fs.writeFileSync(path.join(OUT, 'cards.json'), JSON.stringify(CARDS.map((c) => ({ s: c.slug, n: c.name, e: c.en, g: groupOf(c), r: rankLabel(c), a: c.arcana, su: c.suit || null, up: first(c.up), rv: first(c.rev), ku: c.kw.up, kr: c.kw.rev, yn: c.yesno, ynn: c.yesnoNote, ad: c.advice }))));
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'].concat(urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${BUILD_ISO}</lastmod>${u === '/daily/' || u === '/' ? '<changefreq>daily</changefreq>' : ''}</url>`)).concat(['</urlset>', '']).join('\n'));
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, 'CNAME'), 'tarot.sajucheop.com\n');
fs.writeFileSync(path.join(OUT, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><rect x="1.5" y="1.5" width="27" height="27" rx="5" fill="#B8382D"/><text x="15" y="20.5" text-anchor="middle" font-family="'Noto Serif KR', serif" font-size="15" font-weight="700" fill="#F6F1E8">占</text></svg>`);
fs.cpSync(SRC, OUT, { recursive: true });
console.log(`타로첩 빌드 완료: 카드 78, 페이지 ${urls.length} · 오늘의 카드 ${todayCard.name}${todayRev ? ' 역방향' : ''}`);
