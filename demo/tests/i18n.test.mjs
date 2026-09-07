import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeT } from '../i18n.js';
const load = (l) => JSON.parse(readFileSync(new URL(`../i18n/${l}.json`, import.meta.url), 'utf8'));
const demo = JSON.parse(readFileSync(new URL('../i18n/demo.json', import.meta.url), 'utf8'));
test('점 표기·치환·복수형·demo 접두', () => {
  const { t } = makeT('ko', load('ko'), demo.ko);
  assert.equal(t('tabs.home'), '홈');
  assert.equal(t('home.streak', { count: 8 }), '🔥 연속 8일 연습 중');
  assert.equal(t('reflection.minutes', { min: 25 }), '25분');
  assert.equal(t('demo.skip'), '▶︎ 25분 뒤로');
});
test('demo.json은 4개 언어 키 집합이 같다', () => {
  const keys = (o) => Object.keys(o).sort().join(',');
  for (const l of ['en', 'es', 'de']) assert.equal(keys(demo[l]), keys(demo.ko), l);
});
