/* 타로첩 카드 데이터 — 78장
 * 카드 스키마:
 *  slug      URL 조각 (/c/{slug}/). 메이저 the-fool…the-world, 마이너 {suit}-{ace|2..10|page|knight|queen|king}
 *  no        메이저 0~21, 마이너 1~14(11 페이지 12 나이트 13 퀸 14 킹)
 *  arcana    'major' | 'minor'    suit  'wands'|'cups'|'swords'|'pentacles' (마이너만)   rank 1~14 (마이너만)
 *  name/en   한글·영문 이름   alt  검색 별칭
 *  kw        { up:[...], rev:[...] } 키워드
 *  meta      메이저만 { element, astro, number }
 *  img       그림 묘사(1문단)   up/rev  정·역방향 일반 의미(문단은 \n\n 구분)
 *  love/money/work/health  { up, rev } 주제별 의미
 *  advice    한 줄 조언   yesno 'yes'|'no'|'maybe'   yesnoNote  예/아니오 설명
 *  related   관련 카드 slug 3개 */
import major1 from './major-1.mjs';
import major2 from './major-2.mjs';
import major3 from './major-3.mjs';
import wands1 from './wands-1.mjs';
import wands2 from './wands-2.mjs';
import cups1 from './cups-1.mjs';
import cups2 from './cups-2.mjs';
import swords1 from './swords-1.mjs';
import swords2 from './swords-2.mjs';
import pentacles1 from './pentacles-1.mjs';
import pentacles2 from './pentacles-2.mjs';

export const CARDS = [...major1, ...major2, ...major3, ...wands1, ...wands2, ...cups1, ...cups2, ...swords1, ...swords2, ...pentacles1, ...pentacles2];

export const SUITS = {
  wands: { slug: 'wands', ko: '완드', alt: '막대·지팡이', el: '불', theme: '행동·열정·창조·일', color: '#B8382D',
    intro: '완드(Wands)는 불의 원소를 맡은 수트입니다. 막대·지팡이로 그려지며 행동·열정·의지·창조·일과 야망을 다룹니다. 완드 카드가 많이 나오면 지금 상황은 생각이나 감정보다 움직임과 추진의 문제라는 뜻이에요. 에이스에서 킹까지는 불씨가 붙는 순간부터 그 불을 다스리는 왕까지, 열정이 자라는 열네 단계입니다.' },
  cups: { slug: 'cups', ko: '컵', alt: '성배·잔', el: '물', theme: '감정·관계·직관·사랑', color: '#2F5D8A',
    intro: '컵(Cups)은 물의 원소를 맡은 수트입니다. 성배·잔으로 그려지며 감정·사랑·관계·직관·상상력을 다룹니다. 컵 카드가 많이 나오면 지금 상황의 핵심은 마음과 관계라는 뜻이에요. 에이스에서 킹까지는 감정이 차오르는 순간부터 그 감정을 다스리는 왕까지, 마음이 자라는 열네 단계입니다.' },
  swords: { slug: 'swords', ko: '소드', alt: '검·칼', el: '공기', theme: '생각·진실·갈등·소통', color: '#4A4A5A',
    intro: '소드(Swords)는 공기의 원소를 맡은 수트입니다. 검·칼로 그려지며 생각·논리·진실·말·갈등을 다룹니다. 소드 카드가 많이 나오면 지금 상황은 머리와 말의 문제이고, 종종 고통스러운 진실이 함께 있다는 뜻이에요. 에이스에서 킹까지는 명료함이 번뜩이는 순간부터 그 검을 공정하게 쓰는 왕까지, 생각이 자라는 열네 단계입니다.' },
  pentacles: { slug: 'pentacles', ko: '펜타클', alt: '동전·별', el: '흙', theme: '돈·물질·일·몸', color: '#7A6A2E',
    intro: '펜타클(Pentacles)은 흙의 원소를 맡은 수트입니다. 별이 새겨진 동전으로 그려지며 돈·재산·일·몸·현실의 결과를 다룹니다. 펜타클 카드가 많이 나오면 지금 상황은 현실과 물질, 시간을 들여 쌓는 것의 문제라는 뜻이에요. 에이스에서 킹까지는 씨앗이 손에 놓이는 순간부터 왕국을 세운 왕까지, 결실이 자라는 열네 단계입니다.' }
};

/* 숫자 카드 공통 뜻 (마이너 1~10) */
export const RANK_MEANING = {
  1: { label: '에이스', text: '에이스는 수트의 순수한 씨앗입니다. 아직 형태는 없지만 그 원소의 힘이 처음 손에 놓이는 순간이에요.' },
  2: { label: '2', text: '2는 둘 사이의 균형과 선택입니다. 시작한 힘이 둘로 나뉘어 어디로 갈지, 누구와 갈지 정하는 단계예요.' },
  3: { label: '3', text: '3은 처음으로 형태가 나오는 자리입니다. 둘이 만나 셋이 되듯, 계획이 첫 결과와 협력으로 드러납니다.' },
  4: { label: '4', text: '4는 네 모서리의 안정입니다. 얻은 것을 굳히고 지키는 단계라 안정과 정체가 함께 있어요.' },
  5: { label: '5', text: '5는 안정이 흔들리는 자리입니다. 갈등·상실·시련이 오지만 그것이 다음 성장을 만듭니다.' },
  6: { label: '6', text: '6은 시련 뒤의 조화와 회복입니다. 균형이 돌아오고 주고받음이 이루어지는 단계예요.' },
  7: { label: '7', text: '7은 평가와 시험의 자리입니다. 지금까지 온 길을 돌아보고 버틸지 바꿀지 정하는 단계예요.' },
  8: { label: '8', text: '8은 힘이 붙어 움직이는 자리입니다. 숙련·속도·속박처럼 힘이 크게 작동하는 단계예요.' },
  9: { label: '9', text: '9는 완성 직전의 자리입니다. 거의 다 이뤘지만 마지막 고비가 남은, 혼자 서는 단계예요.' },
  10: { label: '10', text: '10은 수트의 완성이자 끝입니다. 결실이든 과부하든 그 원소가 다다를 수 있는 끝에 서는 단계예요.' },
  11: { label: '페이지', text: '페이지는 그 원소를 배우는 학생입니다. 미숙하지만 호기심이 있고, 새 소식과 시작을 가져옵니다.' },
  12: { label: '나이트', text: '나이트는 그 원소를 행동으로 옮기는 사람입니다. 움직임과 추진, 때로는 지나침이 함께 있어요.' },
  13: { label: '퀸', text: '퀸은 그 원소를 안으로 성숙시킨 사람입니다. 내면의 힘으로 주변을 돌보고 이끄는 단계예요.' },
  14: { label: '킹', text: '킹은 그 원소를 밖으로 완성한 사람입니다. 권위와 책임으로 그 힘을 다스리는 단계예요.' }
};
