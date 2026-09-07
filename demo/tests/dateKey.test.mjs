import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateKeyOfInstant, addDays, weekdayOf } from '../dateKey.js';

test('새벽 4시 규칙: KST 02:30은 전날', () => {
  assert.equal(dateKeyOfInstant('2026-09-07T02:30:00+09:00', 'Asia/Seoul', 4), '2026-09-06');
  assert.equal(dateKeyOfInstant('2026-09-07T04:00:00+09:00', 'Asia/Seoul', 4), '2026-09-07');
  assert.equal(dateKeyOfInstant('2026-09-07T02:30:00+09:00', 'Asia/Seoul', 0), '2026-09-07');
});

test('시간대 다르면 키도 다르다', () => {
  assert.equal(dateKeyOfInstant('2026-09-07T01:00:00Z', 'America/Los_Angeles', 0), '2026-09-06');
});

test('addDays·weekdayOf', () => {
  assert.equal(addDays('2026-09-07', -20), '2026-08-18');
  assert.equal(weekdayOf('2026-09-07'), 1); // 월
});

test('앱 벡터: Seoul 4h rule', () => {
  assert.equal(dateKeyOfInstant('2026-08-08T18:30:00Z', 'Asia/Seoul', 4), '2026-08-08');
  assert.equal(dateKeyOfInstant('2026-08-08T19:00:00Z', 'Asia/Seoul', 4), '2026-08-09');
  assert.equal(dateKeyOfInstant('2026-08-08T22:00:00Z', 'America/New_York', 0), '2026-08-08');
});
