import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../screens/focus.js';
import { makeT } from '../i18n.js';
import { createStore, startFocus, tickFocus, stopFocus, skipFocus } from '../state.js';

const load = (l) => JSON.parse(readFileSync(new URL(`../i18n/${l}.json`, import.meta.url), 'utf8'));
const demo = JSON.parse(readFileSync(new URL('../i18n/demo.json', import.meta.url), 'utf8'));
const { t } = makeT('ko', load('ko'), demo.ko);
const now = new Date('2026-09-07T10:00:00+09:00');

test('집중모드 초기 화면: 연주 감지 중·00:00·일시정지 0회·데모 안내·스킵·Stop/End', () => {
  const s = startFocus(createStore(now).get());
  const html = render(s, t);
  assert.match(html, /● 연주 감지 중/);
  assert.match(html, />00:00</);
  assert.match(html, /일시정지 0회/);
  assert.match(html, /체험판에서는 소리를 듣지 않아요/);
  assert.match(html, /▶︎ 25분 뒤로/);
  assert.match(html, />Stop</);
  assert.match(html, />End</);
});

test('12틱 후: 무음(유예)으로 전환·타이머 정지', () => {
  let s = startFocus(createStore(now).get());
  for (let i = 0; i < 12; i += 1) s = tickFocus(s);
  const html = render(s, t);
  assert.match(html, /◌ 무음 \(유예\)/);
  assert.match(html, />00:12</);
});

test('Stop 후: 일시정지·재개 라벨', () => {
  let s = startFocus(createStore(now).get());
  for (let i = 0; i < 12; i += 1) s = tickFocus(s);
  s = stopFocus(s);
  const html = render(s, t);
  assert.match(html, /○ 일시정지/);
  assert.match(html, />재개</);
});

test('25분 뒤로: 25:12로 건너뜀', () => {
  let s = startFocus(createStore(now).get());
  for (let i = 0; i < 12; i += 1) s = tickFocus(s);
  s = skipFocus(s);
  const html = render(s, t);
  assert.match(html, />25:12</);
});
