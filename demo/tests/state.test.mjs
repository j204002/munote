import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, startFocus, tickFocus, stopFocus, resumeFocus, skipFocus, endFocus, saveReflection, toggleReaction, setInstrument, todayMinutes, homeBadge, myPose, practicedToday, setCalendarMonth, selectDay, openSheet, closeSheet, setDayStart, focusPctOf, sessionsOf } from '../state.js';
import { COACH } from '../data.js';
const now = new Date('2026-09-07T10:00:00+09:00');
test('초기: 오늘 0분·배지 스트릭 8·내 무니 걷기', () => {
  const s = createStore(now).get();
  assert.equal(todayMinutes(s), 0); assert.deepEqual(homeBadge(s), { kind: 'streak', count: 8 }); assert.equal(myPose(s), 'walk'); assert.equal(practicedToday(s), false);
});
test('집중 대본: 12초 듣는 중 → 4초 무음(타이머 정지) → 반복; Stop/Resume; Skip', () => {
  let s = startFocus(createStore(now).get());
  for (let i = 0; i < 12; i += 1) s = tickFocus(s);
  assert.equal(s.focus.elapsedSec, 12); assert.equal(s.focus.phase, 'grace');
  for (let i = 0; i < 4; i += 1) s = tickFocus(s);
  assert.equal(s.focus.elapsedSec, 12, '무음 중 타이머 정지'); assert.equal(s.focus.phase, 'sounding');
  s = stopFocus(s); s = tickFocus(s); assert.equal(s.focus.elapsedSec, 12); assert.equal(s.focus.pauseCount, 1);
  s = resumeFocus(s); s = skipFocus(s); assert.equal(s.focus.elapsedSec, 1512); assert.equal(s.focus.focusPct, 89);
  // fix: 88→89 — 저장된 focusPct·회고 재계산(25/28min)·기록 재계산(25/28min)이 전부 같은 숫자로
  // 갈리지 않아야 한다(코덱스 리뷰 2026-09-07 High). SKIP_TO.wallSec은 고정값(1700)이라 elapsedSec과
  // 무관하게 항상 이 두 식과 일치한다.
  assert.equal(Math.round((1512 / 1700) * 100), 89);
  assert.equal(Math.round((25 / 28) * 100), 89);
});
test('End → 회고 → 저장: 오늘 세션·배지 9·내 무니 피아노·한마디 skip 문장', () => {
  let s = skipFocus(startFocus(createStore(now).get()));
  s = endFocus(s); assert.equal(s.screen, 'reflection'); assert.deepEqual(s.draft.pieces, ['쇼팽 발라드 1번'], '직전 세션 곡 미리 채움');
  s = saveReflection({ ...s, draft: { ...s.draft, pieces: ['베토벤 소나타'], types: ['section'], memo: '' } }, 'ko');
  assert.equal(s.screen, 'home'); assert.equal(todayMinutes(s), 25); assert.deepEqual(homeBadge(s), { kind: 'streak', count: 9 }); assert.equal(myPose(s), 'play_piano');
  const today = s.sessions.find((x) => x.dateKey === s.todayKey); assert.match(today.coach, /25분/);
});
test('20분 미만 저장 → 한마디 없음', () => {
  let s = startFocus(createStore(now).get()); for (let i = 0; i < 60; i += 1) s = tickFocus(s);
  s = saveReflection(endFocus(s), 'ko'); const today = s.sessions.find((x) => x.dateKey === s.todayKey); assert.equal(today.coach, undefined); assert.equal(today.practiceMin, 1);
});
test('반응: 탭=채움, 재탭=취소, 다른 것=교체', () => {
  let s = createStore(now).get();
  s = toggleReaction(s, 'f2', 'clap'); let f = s.friends.find((x) => x.id === 'f2'); assert.equal(f.reactions.clap, 1); assert.equal(f.mine, 'clap');
  s = toggleReaction(s, 'f2', 'fire'); f = s.friends.find((x) => x.id === 'f2'); assert.equal(f.reactions.clap, 0); assert.equal(f.reactions.fire, 1); assert.equal(f.mine, 'fire');
  s = toggleReaction(s, 'f2', 'fire'); f = s.friends.find((x) => x.id === 'f2'); assert.equal(f.reactions.fire, 0); assert.equal(f.mine, null);
});
test('악기 변경 → 내 포즈', () => {
  let s = saveReflection(endFocus(skipFocus(startFocus(createStore(now).get()))), 'ko');
  s = setInstrument(s, 'vocal'); assert.equal(myPose(s), 'play_vocal');
});
test('경계: 19분 31초는 19분, 한마디 없음', () => {
  let s = endFocus(startFocus(createStore(now).get()));
  s = { ...s, focus: { ...s.focus, elapsedSec: 1171, soundingSec: 1171, wallSec: 1300 } };
  s = saveReflection(s, 'ko');
  let today = s.sessions.find((x) => x.dateKey === s.todayKey);
  assert.equal(today.practiceMin, 19, '19분 31초는 19분');
  assert.equal(today.coach, undefined, '19분은 한마디 없음');
  // 1200초 케이스: 20분이 되고 한마디 생성
  let s2 = endFocus(startFocus(createStore(now).get()));
  s2 = { ...s2, focus: { ...s2.focus, elapsedSec: 1200, soundingSec: 1200, wallSec: 1200 } };
  s2 = saveReflection(s2, 'ko');
  today = s2.sessions.find((x) => x.dateKey === s2.todayKey);
  assert.equal(today.practiceMin, 20, '1200초는 20분');
  assert.match(today.coach, /20분/, '20분은 한마디 생성');
});
test('초기 selectedDay = 오늘 (앱은 null이지만 체험판은 오늘 상세를 바로 보여준다)', () => {
  const s = createStore(now).get();
  assert.equal(s.selectedDay, s.todayKey);
  assert.equal(s.calendarMonth, s.todayKey.slice(0, 7));
});
test('setCalendarMonth: 월 이동 + 선택 날짜 초기화', () => {
  let s = createStore(now).get();
  s = setCalendarMonth(s, '2026-08');
  assert.equal(s.calendarMonth, '2026-08');
  assert.equal(s.selectedDay, null, '월 이동 시 선택은 초기화(앱의 moveMonth와 동일)');
});
test('selectDay: 다른 날 선택, 같은 날 재선택은 토글 해제', () => {
  let s = createStore(now).get();
  s = selectDay(s, '2026-09-06');
  assert.equal(s.selectedDay, '2026-09-06');
  s = selectDay(s, '2026-09-06');
  assert.equal(s.selectedDay, null, '같은 날 재탭 = 선택 해제');
  s = selectDay(s, null);
  assert.equal(s.selectedDay, null);
});
test('B: skip 후 틱이 계속 흘러도(elapsedSec !== SKIP_TO.elapsedSec) skip 문장 유지', () => {
  let s = skipFocus(startFocus(createStore(now).get()));
  for (let i = 0; i < 3; i += 1) s = tickFocus(s);
  assert.notEqual(s.focus.elapsedSec, 1512, '3틱 후에는 SKIP_TO.elapsedSec과 더 이상 같지 않다');
  s = saveReflection(endFocus(s), 'ko');
  const today = s.sessions.find((x) => x.dateKey === s.todayKey);
  assert.equal(today.practiceMin, 25, '3틱 뒤에도 25분(1515초 floor)');
  assert.equal(today.coach, COACH.ko.skip, 'skip 문장이 이어져야 한다(elapsedSec 동등비교가 아니라 skipped 플래그로 판정)');
});
test('setDayStart: 새벽 시간대에 하루 시작 시각을 바꾸면 todayKey가 바뀌고, 고정 대본이 새 오늘로 다시 만들어지며, 이번 체험에서 저장한 세션은 살아남는다', () => {
  const dawn = new Date('2026-09-07T02:30:00+09:00'); // KST 02:30 — dayStartHour=4(기본)면 전날(09-06) 취급
  let s = createStore(dawn).get();
  assert.equal(s.todayKey, '2026-09-06', '기본 하루 시작 4시 기준으로 아직 어제');
  assert.deepEqual(homeBadge(s), { kind: 'streak', count: 8 });

  // 이번 체험에서 방문자가 직접 저장한 세션 하나(대본이 아니다 — id가 today-로 시작)
  s = saveReflection(endFocus(skipFocus(startFocus(s))), 'ko');
  const liveId = s.sessions.at(-1).id;
  assert.match(liveId, /^today-/);

  s = setDayStart(s, 0); // 자정 기준으로 바꾸면 02:30은 그냥 오늘(09-07)
  assert.equal(s.todayKey, '2026-09-07');
  // 고정 대본도 새 오늘 기준으로 다시 만들어졌다 — 가장 최근 대본 세션은 이제 D-1(새 오늘의 전날)
  const scriptSessions = s.sessions.filter((x) => !x.id.startsWith('today-'));
  const mostRecentScript = scriptSessions.reduce((a, b) => (a.dateKey > b.dateKey ? a : b));
  assert.equal(mostRecentScript.dateKey, '2026-09-06');
  assert.deepEqual(homeBadge(s), { kind: 'streak', count: 8 }, '대본이 새 오늘 기준으로 재구성돼도 스트릭은 그대로');
  // 방문자가 저장한 세션은 사라지지 않는다
  assert.ok(s.sessions.some((x) => x.id === liveId), '체험 중 저장한 세션이 살아남아야 한다');
});

test('setDayStart: 다른 달/날짜를 보고 있었다면 그 선택은 건드리지 않는다', () => {
  let s = createStore(now).get();
  s = setCalendarMonth(s, '2026-08');
  s = selectDay(s, '2026-08-15');
  s = setDayStart(s, 0);
  assert.equal(s.calendarMonth, '2026-08', '다른 달을 보고 있었다면 그대로');
  assert.equal(s.selectedDay, '2026-08-15', '다른 날을 선택 중이었다면 그대로');
});

test('skip 뒤 40초 진행 → 집중·회고·기록 모두 같은 %(코덱스 리뷰 2026-09-07 2차 High-1 회귀)', () => {
  let s = skipFocus(startFocus(createStore(now).get()));
  for (let i = 0; i < 40; i += 1) s = tickFocus(s);
  const focusScreenPct = s.focus.focusPct; // 집중 화면이 보여주는 값(초 단위 비율, tickFocus가 매 틱 갱신)
  s = saveReflection(endFocus(s), 'ko');
  const today = s.sessions.find((x) => x.id.startsWith('today-'));
  const recordsSessionPct = focusPctOf([today]); // 기록 화면 세션 한 줄
  const recordsDayPct = focusPctOf(sessionsOf(s, s.todayKey)); // 기록 화면 일 합계
  assert.equal(today.focusPct, focusScreenPct, '저장된 focusPct = 집중 화면이 보여준 값');
  assert.equal(recordsSessionPct, focusScreenPct, '기록 화면 세션 줄 = 집중 화면 값');
  assert.equal(recordsDayPct, focusScreenPct, '기록 화면 일 합계 = 집중 화면 값(오늘은 이 세션 하나뿐)');
});

test('openSheet/closeSheet: 친구 시트를 열고 닫는다', () => {
  let s = createStore(now).get();
  assert.equal(s.sheet, null);
  s = openSheet(s, { kind: 'friend', id: 'f3' });
  assert.deepEqual(s.sheet, { kind: 'friend', id: 'f3' });
  s = closeSheet(s);
  assert.equal(s.sheet, null);
});
