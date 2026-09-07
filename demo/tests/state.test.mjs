import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, startFocus, tickFocus, stopFocus, resumeFocus, skipFocus, endFocus, saveReflection, toggleReaction, setInstrument, todayMinutes, homeBadge, myPose, practicedToday, setCalendarMonth, selectDay, openSheet, closeSheet, setDayStart } from '../state.js';
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
test('openSheet/closeSheet: 친구 시트를 열고 닫는다', () => {
  let s = createStore(now).get();
  assert.equal(s.sheet, null);
  s = openSheet(s, { kind: 'friend', id: 'f3' });
  assert.deepEqual(s.sheet, { kind: 'friend', id: 'f3' });
  s = closeSheet(s);
  assert.equal(s.sheet, null);
});
