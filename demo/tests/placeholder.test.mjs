// 체험판 자리 미리 잡기 (2026-11-16)
// 체험판(demo.js)은 번역 파일을 받아 온 뒤에야 폰 화면을 그린다. 그 전에는 #munote-demo가 비어 있다가 한꺼번에 약 646px 커져서,
// 앱의 「홈페이지에서 보기」(…/#business-info)로 들어온 사람이 사업자 정보 칸보다 위에서 멈췄다(아이폰 사파리 실측 · 크롬 계측:
// 부드러운 스크롤이 목적지를 정한 뒤 페이지가 커짐). 그래서 네 언어 홈은 처음부터 같은 모양의 빈 폰 틀과 안내 글을 담고,
// demo.js는 같은 모양으로 바꿔 그린다 — 크기가 안 바뀐다. 이 시험은 그 모양과 글이 어긋나지 않게 지킨다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const demoDict = JSON.parse(read('demo/i18n/demo.json'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PAGES = [['index.html', 'ko'], ['index-en.html', 'en'], ['index-es.html', 'es'], ['index-de.html', 'de']];

// #munote-demo 안쪽(한 줄로 둔다) — 여는 태그부터 짝이 맞는 닫는 </div>까지
function demoInner(html, lang) {
  const open = `<div id="munote-demo" data-lang="${lang}">`;
  const i = html.indexOf(open);
  assert.ok(i >= 0, `${lang}: #munote-demo 여는 태그가 없다`);
  let depth = 1, j = i + open.length;
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = j;
  for (let m; (m = re.exec(html)); ) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(j, m.index);
  }
  assert.fail(`${lang}: #munote-demo 닫는 태그를 못 찾음`);
}

for (const [page, lang] of PAGES) {
  test(`${page}: 체험판이 오기 전부터 폰 틀과 안내 글이 자리를 잡는다`, () => {
    const inner = demoInner(read(page), lang);
    const d = demoDict[lang];
    assert.equal(
      inner,
      `<div class="md-phone"><span class="md-ribbon">${esc(d.ribbon)}</span><div class="md-screen"></div></div><p class="md-hint">${d.hint}</p>`,
    );
  });
}

test('demo.js가 바꿔 그리는 틀도 같은 모양이다(폰 틀 → 띠 → 화면, 그 아래 안내 글)', () => {
  const src = read('demo/demo.js');
  assert.match(src, /<div class="md-phone"><span class="md-ribbon">\$\{esc\(T\.t\('demo\.ribbon'\)\)\}<\/span><div class="md-screen">/);
  assert.match(src, /<\/div><\/div><p class="md-hint">\$\{T\.t\('demo\.hint'\)\}<\/p>`/);
});
