import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../screens/friends.js';
import { makeT } from '../i18n.js';
import { createStore, toggleReaction, openSheet, startFocus, skipFocus, endFocus, saveReflection } from '../state.js';
import { FRIENDS } from '../data.js';

const load = (l) => JSON.parse(readFileSync(new URL(`../i18n/${l}.json`, import.meta.url), 'utf8'));
const demo = JSON.parse(readFileSync(new URL('../i18n/demo.json', import.meta.url), 'utf8'));
const { t } = makeT('ko', load('ko'), demo.ko);
const now = new Date('2026-09-07T10:00:00+09:00');

test('연습실: 오늘 연습한 친구 4명·전 친구 이름·무니 8명·카드 4개(반응 알약 12개)', () => {
  const s = createStore(now).get();
  const html = render(s, t);
  assert.match(html, /오늘 연습한 친구 4/);
  for (const f of FRIENDS) assert.ok(html.includes(f.name), `누락된 친구: ${f.name}`);
  assert.ok(html.includes(s.me.name), '내 이름(무니) 누락');
  const muniCount = (html.match(/data-friend="/g) ?? []).length;
  // 방(8명: 나+친구7) + 오늘 카드(4명) = data-friend 속성 12개, 그중 방의 8개만 .md-muni
  assert.equal((html.match(/class="md-muni[^"]*" data-friend="/g) ?? []).length, 8, '방 안 무니 버튼 8개');
  assert.ok(muniCount >= 8);
  const reactCount = (html.match(/data-react="/g) ?? []).length;
  assert.equal(reactCount, 12, '오늘 카드 4개 × 반응 알약 3개');
});

test('a11y: 지우(오늘 연습함)·민재(일주일 넘게 쉬는 중)', () => {
  const s = createStore(now).get();
  const html = render(s, t);
  assert.match(html, /지우[^"]*·[^"]*오늘 연습함/);
  assert.match(html, /민재[^"]*·[^"]*일주일 넘게 쉬는 중/);
});

test('toggleReaction: f2 clap 알약이 눌린 상태(aria-pressed=true)로 바뀐다', () => {
  const s = toggleReaction(createStore(now).get(), 'f2', 'clap');
  const html = render(s, t);
  assert.match(html, /data-react="f2:clap" aria-pressed="true"/);
});

test('openSheet: 친구 시트가 열리고(role=dialog) 이름·연속 일수(12일)를 보여준다', () => {
  const s = openSheet(createStore(now).get(), { kind: 'friend', id: 'f3' });
  const html = render(s, t);
  assert.match(html, /role="dialog"/);
  assert.ok(html.includes('세인'));
  assert.ok(html.includes('12일'));
});

test('저장된 세션 후: 내 무니가 연주 포즈(play_piano)로 정지한다', () => {
  let s = createStore(now).get();
  s = saveReflection(endFocus(skipFocus(startFocus(s))), 'ko');
  const html = render(s, t);
  const meButton = html.match(/<button[^>]*data-friend="me"[\s\S]*?<\/button>/)[0];
  assert.match(meButton, /play_piano/);
});
