import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render, coachCardHtml, justSavedSession } from '../screens/reflection.js';
import { makeT } from '../i18n.js';
import { createStore, startFocus, skipFocus, endFocus, saveReflection } from '../state.js';
import { PIECES, TYPES } from '../data.js';

const load = (l) => JSON.parse(readFileSync(new URL(`../i18n/${l}.json`, import.meta.url), 'utf8'));
const demo = JSON.parse(readFileSync(new URL('../i18n/demo.json', import.meta.url), 'utf8'));
const { t } = makeT('ko', load('ko'), demo.ko);
const now = new Date('2026-09-07T10:00:00+09:00');

const buildState = () => endFocus(skipFocus(startFocus(createStore(now).get())));

test('회고 화면: 제목·요약(25분/전체 28분·집중도 89%/일시정지 0회)·섹션 제목·저장 버튼', () => {
  const s = buildState();
  const html = render(s, t);
  assert.match(html, /오늘의 연습/);
  assert.match(html, />25분</);
  // fix G: 집중도는 records.js와 같은 식(25/28 min → 89%)으로 다시 계산한다 — f.focusPct(88, 초 단위 비율)와는
  // 반올림 경로가 달라 회고·기록 화면 표기가 어긋났었다.
  assert.match(html, /전체 28분 · 집중도 89%/);
  assert.match(html, /일시정지 0회/);
  assert.match(html, /연습한 곡/);
  assert.match(html, /연습 유형/);
  assert.match(html, /\+ 메모/);
  assert.match(html, /저장하고 마치기/);
});

test('4개 곡 전부·7개 유형 라벨 전부 렌더', () => {
  const s = buildState();
  const html = render(s, t);
  for (const p of PIECES) assert.ok(html.includes(p), `누락된 곡: ${p}`);
  assert.equal(TYPES.length, 7);
  for (const ty of TYPES) assert.ok(html.includes(t(`practiceType.${ty}`)), `누락된 유형: ${ty}`);
});

test('직전 세션 곡("쇼팽 발라드 1번") 미리 선택 — selected + aria-pressed=true', () => {
  const s = buildState();
  assert.deepEqual(s.draft.pieces, ['쇼팽 발라드 1번']);
  const html = render(s, t);
  const m = html.match(/<button[^>]*data-piece="쇼팽 발라드 1번"[^>]*>/);
  assert.ok(m, '곡 버튼을 찾지 못함');
  assert.match(m[0], /selected/);
  assert.match(m[0], /aria-pressed="true"/);
  // 나머지 3곡은 선택되지 않음
  const others = PIECES.filter((p) => p !== '쇼팽 발라드 1번');
  for (const p of others) {
    const om = html.match(new RegExp(`<button[^>]*data-piece="${p}"[^>]*>`));
    assert.ok(om, `${p} 버튼을 찾지 못함`);
    assert.match(om[0], /aria-pressed="false"/);
  }
});

test('곡 2개를 선택한 draft로 렌더하면 selected 2개', () => {
  const s = buildState();
  const s2 = { ...s, draft: { ...s.draft, pieces: [PIECES[0], PIECES[1]] } };
  const html = render(s2, t);
  const selected = html.match(/data-piece="[^"]+"\s+aria-pressed="true"/g) || [];
  assert.equal(selected.length, 2);
});

test('coachCardHtml: 라벨 “MU:note의 한마디” + 큰따옴표 인용문', () => {
  const html = coachCardHtml(t, '테스트 한마디 문장입니다.');
  assert.match(html, /MU:note의 한마디/);
  assert.match(html, /“테스트 한마디 문장입니다\.”/);
});

test('두 번 반복된 사이클: 짧은 세션 후 긴 세션 — justSavedSession이 마지막 세션 반환, 코치 문장 포함', () => {
  // 초기 상태(정규 배포판 데이터 포함)
  let s = createStore(now).get();
  const initialCount = s.sessions.length;
  const initialTodayCount = s.sessions.filter((x) => x.dateKey === s.todayKey).length;

  // 첫 번째 사이클: 짧은 세션(60초) 저장
  s = startFocus(s);
  s = { ...s, focus: { ...s.focus, elapsedSec: 60, wallSec: 60, focusPct: 100 } }; // 1분
  s = endFocus(s);
  let next = saveReflection(s, 'ko');

  // 검증: 세션 1개 증가, 마지막 세션이 1분 세션(코치 없음)
  assert.equal(next.sessions.length, initialCount + 1);
  let saved = justSavedSession(next);
  assert.strictEqual(saved.coach, undefined, '1분 세션은 코치 없음');
  assert.equal(saved.practiceMin, 1);

  // 두 번째 사이클: 긴 세션(25분) 저장
  s = next;
  s = startFocus(s);
  s = skipFocus(s); // 25분 스킵
  s = endFocus(s);
  next = saveReflection(s, 'ko');

  // 검증: 세션 2개 증가, 마지막 세션이 25분 세션(코치 포함)
  assert.equal(next.sessions.length, initialCount + 2);
  const sameDayCount = next.sessions.filter((x) => x.dateKey === next.todayKey).length;
  assert.equal(sameDayCount, initialTodayCount + 2);

  saved = justSavedSession(next);
  assert.ok(saved.coach, '25분 세션은 코치 문장을 포함해야 함');
  assert.match(saved.coach, /25분/);
});
