import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../screens/home.js';
import { makeT } from '../i18n.js';
import { createStore, startFocus, endFocus, skipFocus, saveReflection } from '../state.js';

const load = (l) => JSON.parse(readFileSync(new URL(`../i18n/${l}.json`, import.meta.url), 'utf8'));
const demo = JSON.parse(readFileSync(new URL('../i18n/demo.json', import.meta.url), 'utf8'));
const { t } = makeT('ko', load('ko'), demo.ko);
const now = new Date('2026-09-07T10:00:00+09:00');

test('홈 초기 상태: 오늘 0분·목표 0%·스트릭 8·시작 버튼·데모 안내·톱니', () => {
  const s = createStore(now).get();
  const html = render(s, t);
  assert.match(html, /오늘 연습/);
  assert.match(html, />0분</);
  assert.match(html, /목표 0%/);
  assert.match(html, /🔥 연속 8일 연습 중/);
  assert.match(html, /연습 시작/);
  assert.match(html, /체험판에서는 소리를 듣지 않아요/);
  assert.match(html, /data-go="settings"/);
  assert.match(html, /aria-label="설정"/);
});

test('저장 후: 25분·목표 42%·스트릭 9', () => {
  let s = saveReflection(endFocus(skipFocus(startFocus(createStore(now).get()))), 'ko');
  const html = render(s, t);
  assert.match(html, />25분</);
  assert.match(html, /목표 42%/);
  assert.match(html, /🔥 연속 9일 연습 중/);
});
