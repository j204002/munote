import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../screens/settings.js';
import { makeT } from '../i18n.js';
import { createStore, setGoal, setInstrument, setWeekStart, openSheet } from '../state.js';

const load = (l) => JSON.parse(readFileSync(new URL(`../i18n/${l}.json`, import.meta.url), 'utf8'));
const demo = JSON.parse(readFileSync(new URL('../i18n/demo.json', import.meta.url), 'utf8'));
const { t } = makeT('ko', load('ko'), demo.ko);
const now = new Date('2026-09-07T10:00:00+09:00');

test('초기 렌더: 계정 카드·연습 그룹·앱 그룹 전부, 로그아웃/계정삭제 없음', () => {
  const s = createStore(now).get();
  const html = render(s, t);
  assert.match(html, />연습</);
  assert.match(html, /전공 악기/);
  assert.match(html, />피아노</);
  assert.match(html, /하루 연습 목표/);
  assert.match(html, />60분</);
  assert.match(html, /연습 리마인더/);
  assert.match(html, /저녁 7시/);
  assert.match(html, /새벽 4시 · 일요일/);
  assert.match(html, />Language</);
  assert.match(html, />한국어</);
  assert.match(html, /이용약관/);
  assert.match(html, /개인정보처리방침/);
  assert.match(html, />버전</);
  assert.match(html, /1\.2 \(체험판\)/);
  assert.match(html, /무니/);
  assert.match(html, /체험판/);
  assert.match(html, /data-go="home"/);
  assert.doesNotMatch(html, /로그아웃/);
  assert.doesNotMatch(html, /계정 삭제/);
});

test('목표 0분: 없음 표시', () => {
  const s = setGoal(createStore(now).get(), 0);
  const html = render(s, t);
  assert.match(html, /없음/);
});

test('악기 시트 열림: role=dialog, 4개 옵션, 피아노 선택됨', () => {
  const s = openSheet(createStore(now).get(), { kind: 'setting', which: 'instrument' });
  const html = render(s, t);
  assert.match(html, /role="dialog"/);
  const opts = html.match(/data-opt="instrument:[a-z]+"/g) ?? [];
  assert.equal(opts.length, 4);
  assert.match(html, /data-opt="instrument:piano"[^>]*aria-pressed="true"/);
});

test('악기를 성악으로: 악기 Row 값이 성악으로 바뀜', () => {
  const s = setInstrument(createStore(now).get(), 'vocal');
  const html = render(s, t);
  assert.match(html, /전공 악기[\s\S]*?성악/);
});

test('한 주 시작을 월요일로: 달력 Row 값에 월요일 포함', () => {
  const s = setWeekStart(createStore(now).get(), true);
  const html = render(s, t);
  assert.match(html, /월요일/);
});
