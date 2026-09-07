import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ME, PIECES, buildSessions, FRIENDS, COACH, FOCUS_TIMELINE, SKIP_TO } from '../data.js';
import { addDays } from '../dateKey.js';
const T = '2026-09-07';
test('기록 3주: 15일·D-8~D-1 연속·범위', () => {
  const s = buildSessions(T);
  const days = new Set(s.map((x) => x.dateKey));
  assert.equal(days.size, 15);
  for (let i = 1; i <= 8; i += 1) assert.ok(days.has(addDays(T, -i)), `D-${i}`);
  assert.ok(!days.has(T));
  for (const x of s) {
    assert.ok(x.practiceMin >= 20 && x.practiceMin <= 62); assert.ok(x.focusPct >= 71 && x.focusPct <= 94); assert.ok(x.pieces.every((p) => PIECES.includes(p)));
    // fix round 1: elapsedMin은 focusPct에서 round(practiceMin/(focusPct/100))로 역산된 값이라, practiceMin/elapsedMin을
    // 다시 반올림하면 정수 나눗셈의 이중 반올림 오차(최대 1%p)가 생길 수 있다 — 이 오차 안에서만 허용, 그 이상 벌어지면(=드리프트) 실패.
    const derived = Math.round((x.practiceMin / x.elapsedMin) * 100);
    assert.ok(Math.abs(derived - x.focusPct) <= 1, `elapsedMin·focusPct 정합(±1%p): ${x.id} practiceMin=${x.practiceMin} elapsedMin=${x.elapsedMin} focusPct=${x.focusPct} derived=${derived}`);
  }
  assert.ok(s.some((x) => x.pieces.includes('베토벤 소나타')));
  assert.deepEqual(buildSessions(T), s, '결정적');
});
test('친구 7명: 연주4·누움2·걷기1, 악기 4종', () => {
  assert.equal(FRIENDS.length, 7);
  assert.equal(FRIENDS.filter((f) => f.pose === 'play').length, 4);
  assert.equal(FRIENDS.filter((f) => f.pose.startsWith('lying')).length, 2);
  assert.deepEqual(new Set(FRIENDS.filter((f) => f.pose === 'play').map((f) => f.instrument)), new Set(['piano', 'winds', 'strings', 'vocal']));
});
const RULES = (s, lang) => {
  const sentences = s.split(/(?<=[.!?。])\s+/).filter(Boolean);
  assert.equal(sentences.length, 2, `두 문장: ${s}`);
  assert.equal((s.match(/\d+/g) ?? []).length, 1, `숫자 1개: ${s}`);
  assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(s), `이모지: ${s}`);
  assert.ok(!/(정말|매우|너무|엄청|아주|어제보다|보다 )/.test(s), `금지어: ${s}`);
  if (lang === 'ko') assert.ok(sentences.every((x) => /요\.$/.test(x.trim())), `-요체: ${s}`);
};
test('한마디 4개 언어 규칙', () => {
  for (const lang of ['ko', 'en', 'es', 'de']) {
    const c = COACH[lang];
    RULES(c.skip, lang); RULES(c.natural.replace('{min}', '31'), lang);
    assert.equal(c.past.length, 3); c.past.forEach((x) => RULES(x, lang));
  }
});
test('집중 대본', () => { assert.deepEqual(FOCUS_TIMELINE, [{ state: 'sounding', sec: 12 }, { state: 'grace', sec: 4 }]); assert.equal(SKIP_TO.elapsedSec, 1512); });
test('ME·PIECES', () => { assert.equal(ME.name, '무니'); assert.equal(PIECES.length, 4); });
