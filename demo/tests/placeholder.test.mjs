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
  // 틀 템플릿의 '맨 앞'이 폰 틀이어야 한다 — 폰 앞에 다른 요소를 넣으면 자리표시보다 커진다(리뷰 Low ②)
  assert.match(src, /root\.innerHTML = `<div class="md-phone"><span class="md-ribbon">\$\{esc\(T\.t\('demo\.ribbon'\)\)\}<\/span><div class="md-screen">/);
  assert.match(src, /<\/div><\/div><p class="md-hint">\$\{T\.t\('demo\.hint'\)\}<\/p>`/);
});

test('체험판 화면 칸은 비율과 넘침 숨김으로 높이가 고정된다(안에 무엇이 들어와도 자리표시와 같은 크기)', () => {
  const css = read('demo/demo.css');
  const rule = css.match(/\.md-screen\s*\{([^}]*)\}/);
  assert.ok(rule, '.md-screen 규칙이 없다');
  assert.match(rule[1], /aspect-ratio:\s*9\s*\/\s*19\.5/);
  assert.match(rule[1], /overflow:\s*hidden/);
});

test('번역 파일을 못 받으면 체험판 자리를 숨기고, 이유를 콘솔에 남긴다(미리 그린 빈 폰 틀이 남지 않게)', async () => {
  const fakeRoot = { dataset: { lang: 'ko' }, hidden: false, innerHTML: '' };
  const saved = { document: globalThis.document, fetch: globalThis.fetch, warn: console.warn };
  const warned = [];
  globalThis.document = { getElementById: (id) => (id === 'munote-demo' ? fakeRoot : null) };
  globalThis.fetch = () => Promise.reject(new Error('offline'));
  console.warn = (...args) => warned.push(args);
  let importError = null;
  try {
    await import(new URL('../demo.js?offline', import.meta.url).href);
  } catch (e) {
    importError = e; // 고치기 전엔 맨 위 await가 실패해 모듈째 깨졌다 — 원인을 메시지로 보여 준다(리뷰 Low ㉢)
  } finally {
    globalThis.document = saved.document;
    globalThis.fetch = saved.fetch;
    console.warn = saved.warn;
  }
  assert.equal(fakeRoot.hidden, true, importError ? `demo.js 불러오기 실패: ${importError.message}` : undefined);
  // 실패 이유가 아무 데도 안 남으면 나중에 원인을 못 찾는다(리뷰 Low ㉡)
  assert.ok(warned.some((args) => args.some((a) => a instanceof Error && a.message === 'offline')), '실패 이유(offline)가 console.warn에 없다');
});

// 체험판 프로그램 자체(demo.js나 화면 파일)를 못 받으면 demo.js가 아예 안 돈다 — 그때는 script 태그의 onerror가 자리를 숨긴다(리뷰 Low ㉠)
for (const [page, lang] of PAGES) {
  test(`${page}: 체험판 프로그램을 못 받으면 자리를 숨기는 장치가 있다`, () => {
    const tag = read(page).match(/<script type="module" src="demo\/demo\.js"[^>]*>/);
    assert.ok(tag, `${lang}: 체험판 script 태그가 없다`);
    assert.match(tag[0], /onerror="[^"]*getElementById\('munote-demo'\)[^"]*hidden\s*=\s*true/);
  });
}

// 친구 사진(loading="lazy")에 크기가 없으면 받기 전 2px → 받은 뒤 수백 px로 커져, 컴퓨터·아이패드 사파리에서
// #business-info가 사업자 정보 위에서 멈췄다(리뷰 Medium ③). 원본 크기를 적고 CSS는 height:auto(비율만 잡는다).
const pngSize = (p) => { const b = readFileSync(new URL(p, root)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
for (const [page, lang] of PAGES) {
  test(`${page}: 친구 사진이 받아지기 전부터 제 크기로 자리를 잡는다`, () => {
    const html = read(page);
    const m = html.match(/<figure class="friends-shot[^"]*"><img ([^>]*?)\s*\/?>/);
    assert.ok(m, `${lang}: 친구 사진 태그가 없다`);
    const [w, h] = pngSize(`img/shots/${lang}/06.png`);
    assert.match(m[1], new RegExp(`\\bwidth="${w}"`));
    assert.match(m[1], new RegExp(`\\bheight="${h}"`));
    assert.match(html, /\.friends-shot img \{[^}]*height:\s*auto/);
  });
}
