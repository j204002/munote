// notices.json(앱 공지 새 글 점의 기준 날짜)이 4개 언어 공지 페이지의 최신 글 날짜와 같은지 — 공지 글을 고치면 둘을 함께 올린다
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (f) => readFileSync(new URL(f, root), 'utf8');

test('notices.json latest = 공지 페이지 최신 글 날짜(4개 언어 동일)', () => {
  const { latest } = JSON.parse(read('notices.json'));
  assert.match(latest, /^\d{4}-\d{2}-\d{2}$/);
  for (const f of ['notices.html', 'notices-en.html', 'notices-es.html', 'notices-de.html']) {
    const dates = [...read(f).matchAll(/<p class="note">(\d{4}-\d{2}-\d{2})<\/p>/g)].map((m) => m[1]).sort();
    assert.ok(dates.length > 0, `${f}: 글 날짜 없음`);
    assert.equal(dates[dates.length - 1], latest, `${f}: 최신 글 날짜 ${dates[dates.length - 1]} ≠ notices.json ${latest}`);
  }
});
