// demo/tests/wander.test.mjs — practice-app/__tests__/muniWander.test.ts에서 3개 이식.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialSlots, nextTarget, drawOrder } from '../wander.js';

const B = { left: 24, right: 378, top: 250, bottom: 345 };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('initialSlots: 경계 안, 서로 44pt 이상, 결정적', () => {
  const a = initialSlots(6, B, 7);
  const b = initialSlots(6, B, 7);
  assert.deepEqual(a, b);
  assert.equal(a.length, 6);
  for (const s of a) {
    assert.ok(s.x >= B.left && s.x <= B.right);
    assert.ok(s.y >= B.top && s.y <= B.bottom);
  }
  const s = initialSlots(12, B, 3);
  for (let i = 0; i < s.length; i += 1) {
    for (let j = i + 1; j < s.length; j += 1) assert.ok(dist(s[i], s[j]) >= 44);
  }
});

test('nextTarget: 경계 안, 24~120pt 이동, 결정적', () => {
  const from = { x: 200, y: 300 };
  const others = [{ x: 240, y: 300 }, { x: 160, y: 300 }];
  const t1 = nextTarget(from, B, others, 11);
  const t2 = nextTarget(from, B, others, 11);
  assert.deepEqual(t1, t2);
  const d = dist(from, t1);
  assert.ok(d >= 24 && d <= 120);
  assert.ok(t1.x >= B.left && t1.x <= B.right);
  assert.ok(t1.y >= B.top && t1.y <= B.bottom);
});

test('drawOrder: feetY 오름차순, 같은 값은 원래 순서 유지', () => {
  assert.deepEqual(
    drawOrder([
      { id: 'walker-back', feetY: 240 },
      { id: 'lying-front', feetY: 300 },
      { id: 'play-mid', feetY: 270 },
    ]),
    ['walker-back', 'play-mid', 'lying-front'],
  );
  assert.deepEqual(
    drawOrder([{ id: 'a', feetY: 10 }, { id: 'b', feetY: 10 }, { id: 'c', feetY: 5 }]),
    ['c', 'a', 'b'],
  );
});
