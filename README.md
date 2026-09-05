# 타로첩 (占帖)

타로 카드 78장 의미 사전 — 사주첩(sajucheop.com)의 네 번째 자매 사이트. https://tarot.sajucheop.com

- 카드 데이터: `data/cards/*.mjs` (손으로 쓴 본문, 스키마는 `data/cards/index.mjs` 주석)
- 생성기: `node tools/build.mjs` → `dist/` (카드 78 × 6 페이지 + 목록·주제 허브·예아니오·오늘의 카드·카드 뽑기·안내)
- 로컬: `node server.js` → http://localhost:8324
- 배포: GitHub Actions → GitHub Pages, 매일 01:30 KST 재빌드(오늘의 카드 갱신)
