import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../screens/records.js';
import { makeT } from '../i18n.js';
import { createStore, selectDay, setCalendarMonth } from '../state.js';
import { buildSessions } from '../data.js';

const load = (l) => JSON.parse(readFileSync(new URL(`../i18n/${l}.json`, import.meta.url), 'utf8'));
const demo = JSON.parse(readFileSync(new URL('../i18n/demo.json', import.meta.url), 'utf8'));
const { t } = makeT('ko', load('ko'), demo.ko);
const now = new Date('2026-09-07T10:00:00+09:00');

const nonZeroLevels = (html) => (html.match(/data-level="[1-4]"/g) ?? []).length;

test('초기(오늘 선택): 월 제목·요일 7개·오늘 셀 선택 링·이번 달 진하기 칸·범례·알약 3개 게이트·오늘 기록 없음', () => {
  const s = createStore(now).get();
  const html = render(s, t);
  assert.match(html, /2026년 9월/);
  for (const w of ['일', '월', '화', '수', '목', '금', '토']) assert.match(html, new RegExp(`>${w}<`));
  assert.match(html, /data-day="2026-09-07"[^>]*aria-pressed="true"/);
  assert.match(html, /md-cal-ring on/);
  // 9월 스크립트 세션 수(D-6~D-1): buildSessions 기준으로 계산 — 하드코딩 금지.
  const septCount = buildSessions(s.todayKey).filter((x) => x.dateKey.startsWith('2026-09')).length;
  assert.equal(nonZeroLevels(html), septCount);
  assert.match(html, /연습량:/);
  assert.match(html, /~20분/);
  assert.match(html, /20분\+/);
  assert.match(html, /1시간\+/);
  assert.match(html, /2시간\+/);
  const gateCount = (html.match(/data-gate="demo\.inApp"/g) ?? []).length;
  assert.equal(gateCount, 3, '오늘은 세션이 없어 패널 알약 3개만 게이트(세션 카드의 editAll·delete 게이트는 없음)');
  assert.match(html, /이날의 기록이 없어요/);
  assert.doesNotMatch(html, /md-cal-total/); // 오늘 세션이 없으니 합계 카드 없음
});

test('과거 달(8월) 합: 9월+8월 = 스크립트 15일', () => {
  const s = createStore(now).get();
  const aug = render(setCalendarMonth(s, '2026-08'), t);
  const sept = render(s, t);
  assert.equal(nonZeroLevels(aug) + nonZeroLevels(sept), 15);
});

test('월 이동: 8월로 → 제목 변경, 선택 날짜 초기화', () => {
  let s = createStore(now).get();
  s = setCalendarMonth(s, '2026-08');
  assert.equal(s.selectedDay, null);
  const html = render(s, t);
  assert.match(html, /2026년 8월/);
});

test('하루 선택(9/6, 어제): 합계 카드·세션 줄·곡·유형·한마디(과거 문장2)', () => {
  let s = createStore(now).get();
  s = selectDay(s, '2026-09-06');
  const html = render(s, t);
  // fix round 1: 세션 한 줄의 집중도는 practiceMin/elapsedMin(43/49)에서 다시 계산 — 저장된 focusPct 리터럴(87)이 아니라 88%.
  // 이날은 세션이 1개뿐이라 day-total(합계 카드)도 같은 43/49에서 나오므로 두 표기가 정확히 같아야 한다(더 이상 91% vs 87% 드리프트 없음).
  assert.match(html, /연습 43분 · 집중도 88% · 세션 1개/);
  assert.match(html, /20:00 · 43분 · 집중도 88% · 곡 1개/);
  assert.match(html, /쇼팽 발라드 1번/);
  assert.match(html, /전체 런스루/);
  assert.match(html, /MU:note의 한마디/);
  assert.match(html, /3일 연속으로 같은 시간대에 앉았어요\. 리듬이 잡히고 있어요\./);
  // 세션 카드 안의 editAll·deleteSession은 게이트만(표시만)
  assert.match(html, /전체 편집/);
  assert.match(html, /세션 삭제/);
  // 단일 세션 날짜는 day-total 집중도 == 세션 줄 집중도(같은 rows에서 파생) — 명시적 동등성 검증.
  const dayFocus = html.match(/연습 43분 · 집중도 (\d+)% · 세션 1개/)[1];
  const sessionFocus = html.match(/20:00 · 43분 · 집중도 (\d+)% · 곡 1개/)[1];
  assert.equal(dayFocus, sessionFocus, '단일 세션 날짜: 합계 카드와 세션 줄의 집중도가 같아야 한다');
});

test('같은 날 재선택 → 토글 해제', () => {
  let s = createStore(now).get();
  s = selectDay(s, s.todayKey); // 이미 오늘이 기본 선택 → 토글하면 해제
  assert.equal(s.selectedDay, null);
  const html = render(s, t);
  assert.doesNotMatch(html, /md-cal-panels/);
});

test('영어: 월 이름 로케일, 주 시작 월요일 시 요일 회전', () => {
  const enT = makeT('en', load('en'), demo.en).t;
  let s = createStore(now).get();
  s = { ...s, lang: 'en', me: { ...s.me, weekStartMon: true } };
  const html = render(s, enT);
  assert.match(html, />September 2026</);
  assert.match(html, /Mo<\/p><p class="md-cal-weekday">Tu/);
});

test('탭바 records 활성', () => {
  const s = createStore(now).get();
  const html = render(s, t);
  assert.match(html, /data-go="records"[^>]*aria-current="page"/);
});
