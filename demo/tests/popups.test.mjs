// popups.json(앱 안 팝업 — 앱 2.0.1) 기계 검사: 모양 · 그림 경로·크기(500KB)·비율(4:5 또는 1:1) · 언어 · 글(빈 값·300자) · 공개 문구(요금·무료 낱말 금지)
// + 같은 파일의 `banners`(상점 「스페셜」 칸 맨 위 그림 배너 — 앱 2.0.1 T5.2a): 달 모양·중복 · 그림 경로·크기·비율(4:1 ±2%) · 맡는 언어마다 화면 읽기 설명(alt) · 요금·무료 낱말 금지
// 앱 해석기(practice-app lib/popups.ts)보다 늘 엄격하게 — 앱은 모양이 틀린 줄을 조용히 버리므로, 틀린 줄은 여기서 게시 전에 막는다
// 그림 속 글자는 기계가 못 읽는다 — 올리기 전 클로드가 눈으로(이름 바뀌기 전 '캐릭터' · 요금·무료 없음)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const LANGS = ['ko', 'en', 'es', 'de'];
const PRICING = /무료|공짜|유료|요금|할인|\bfree\b|\bprice|discount|gratis|precio|descuento|kostenlos|preis|rabatt|[₩$€]/i; // 앱 lib/characterItems PRICING_WORDS와 같다
const ID = /^[a-z0-9-]{1,48}$/;
const AUTO_ID = /^special-(open|last)-\d{4}-(0[1-9]|1[0-2])$/; // 앱의 자동 팝업 id(스페셜 열림·마지막 날) — 이 모양만 자동 줄로 읽힌다
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/; // 배너의 달(앱 lib/specialBanner와 같다)
const IMG = /^popups\/[a-z0-9-]+-v\d+\.(png|jpg|jpeg)$/;
const TEXT_MAX = 300; // 앱 해석기와 같은 한도(JS 글자 수) — 넘으면 앱이 그 줄을 통째로 버린다
const IMG_MAX = 500 * 1024;

const sizeOf = (buf) => {
  if (buf.length >= 24 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const m = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xc3) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  return null;
};

/** 문제 목록(빈 배열 = 통과). 파일 읽기는 주입 — 아래 '검사기 자체' 시험이 가짜 파일로 잰다 */
function checkPopups(json, fs) {
  const popups = json?.popups;
  if (!Array.isArray(popups)) return ['popups 배열이 아님'];
  const errs = [];
  const ids = new Set();
  for (const p of popups) {
    const id = p?.id;
    if (typeof id !== 'string' || !ID.test(id)) { errs.push(`id 모양: ${JSON.stringify(id)}`); continue; }
    if (ids.has(id)) errs.push(`${id}: id 중복(앱은 첫 줄만 쓴다)`);
    ids.add(id);
    if (/^special-(open|last)-/.test(id) && !AUTO_ID.test(id)) errs.push(`${id}: 자동 팝업 id는 special-open-YYYY-MM · special-last-YYYY-MM 모양만(아니면 앱이 보통 팝업으로 읽는다)`);
    if (typeof p.from !== 'string' || !DATE.test(p.from) || typeof p.until !== 'string' || !DATE.test(p.until) || p.from > p.until) errs.push(`${id}: from/until(YYYY-MM-DD · from ≤ until)`);
    if (!['all', 'members'].includes(p.audience)) errs.push(`${id}: audience`);
    if (!['store.special', 'notices', 'instagram', 'none'].includes(p.action)) errs.push(`${id}: action`);
    if (!p.image && !p.title) errs.push(`${id}: 그림이나 제목 하나는`);
    for (const [k, path] of Object.entries(p.image ?? {})) {
      if (![...LANGS, 'all'].includes(k)) { errs.push(`${id}: 그림 언어 ${k}`); continue; }
      if (typeof path !== 'string' || !IMG.test(path)) { errs.push(`${id}: 그림 경로 ${path} (popups/…-vN.png — 고칠 땐 새 이름)`); continue; }
      if (!fs.exists(path)) { errs.push(`${id}: 그림 파일 없음 ${path}`); continue; }
      if (fs.size(path) > IMG_MAX) errs.push(`${id}: 500KB 넘음 ${path}`);
      const s = sizeOf(fs.read(path));
      if (!s) errs.push(`${id}: 그림 크기를 못 읽음 ${path}`);
      else if (!(Math.abs(s.h / s.w - 1.25) < 0.02 || Math.abs(s.h / s.w - 1) < 0.02)) errs.push(`${id}: 비율 4:5 또는 1:1 (${s.w}×${s.h})`);
      for (const l of k === 'all' ? LANGS : [k]) if (!(typeof p.alt?.[l] === 'string' && p.alt[l].trim())) errs.push(`${id}: 화면 읽기 설명 alt.${l}`);
    }
    for (const field of ['title', 'body', 'alt']) {
      for (const [l, s] of Object.entries(p[field] ?? {})) {
        if (!LANGS.includes(l)) errs.push(`${id}: ${field} 언어 ${l}`);
        if (typeof s !== 'string' || !s.trim() || s.length > TEXT_MAX) errs.push(`${id}: ${field}.${l} 빈 글 또는 ${TEXT_MAX}자 넘음(앱은 그 줄을 통째로 버린다)`);
        else if (PRICING.test(s)) errs.push(`${id}: ${field}.${l}에 요금·무료 낱말 — 공개 문구 금지`);
      }
    }
  }
  return errs;
}

/**
 * 스페셜 칸 배너(popups.json의 `banners`) — 문제 목록(빈 배열 = 통과). `banners` 열쇠는 없어도 된다(있으면 배열).
 * 앱 해석기(practice-app lib/specialBanner.ts)보다 늘 엄격하게 — 앱은 틀린 줄을 조용히 버리고(→ 제목형), 설명 없는 그림은 안 띄우므로 틀린 줄은 여기서 게시 전에 막는다.
 * 그림 속 글자는 기계가 못 읽는다 — 올리기 전 눈으로(요금·무료 없음 · 캐릭터 이름 바뀌기 전 '캐릭터').
 */
function checkBanners(json, fs) {
  const banners = json?.banners;
  if (banners === undefined) return [];
  if (!Array.isArray(banners)) return ['banners가 배열이 아님'];
  const errs = [];
  const months = new Set();
  for (const b of banners) {
    const month = b?.month;
    if (typeof month !== 'string' || !MONTH.test(month)) { errs.push(`banner month 모양(YYYY-MM · 01~12): ${JSON.stringify(month)}`); continue; }
    const id = `banner ${month}`;
    if (months.has(month)) errs.push(`${id}: 달 중복(앱은 첫 줄만 쓴다)`);
    months.add(month);
    const image = b.image;
    if (typeof image !== 'object' || image === null || Array.isArray(image) || Object.keys(image).length === 0) { errs.push(`${id}: 그림 칸(image)이 없거나 비었다`); continue; }
    const covered = new Set();
    for (const [k, path] of Object.entries(image)) {
      if (![...LANGS, 'all'].includes(k)) { errs.push(`${id}: 그림 언어 ${k}`); continue; }
      for (const l of k === 'all' ? LANGS : [k]) covered.add(l);
      if (typeof path !== 'string' || !IMG.test(path)) { errs.push(`${id}: 그림 경로 ${path} (popups/…-vN.png — 고칠 땐 새 이름)`); continue; }
      if (!fs.exists(path)) { errs.push(`${id}: 그림 파일 없음 ${path}`); continue; }
      if (fs.size(path) > IMG_MAX) errs.push(`${id}: 500KB 넘음 ${path}`);
      const s = sizeOf(fs.read(path));
      if (!s) errs.push(`${id}: 그림 크기를 못 읽음 ${path}`);
      else if (Math.abs(s.w / s.h - 4) / 4 > 0.02) errs.push(`${id}: 비율 4:1(±2%) (${s.w}×${s.h}) ${path}`);
    }
    const alt = b.alt;
    const altObj = typeof alt === 'object' && alt !== null && !Array.isArray(alt) ? alt : {};
    for (const l of covered) if (!(typeof altObj[l] === 'string' && altObj[l].trim())) errs.push(`${id}: 화면 읽기 설명 alt.${l}`);
    for (const [l, s] of Object.entries(altObj)) {
      if (!LANGS.includes(l)) { errs.push(`${id}: alt 언어 ${l}`); continue; }
      if (typeof s !== 'string' || !s.trim() || s.length > TEXT_MAX) errs.push(`${id}: alt.${l} 빈 글 또는 ${TEXT_MAX}자 넘음(앱은 그 줄을 통째로 버린다)`);
      else if (PRICING.test(s)) errs.push(`${id}: alt.${l}에 요금·무료 낱말 — 공개 문구 금지`);
    }
  }
  return errs;
}

const realFs = {
  exists: (p) => existsSync(new URL(p, root)),
  size: (p) => statSync(new URL(p, root)).size,
  read: (p) => readFileSync(new URL(p, root)),
};

test('popups.json — 모양·그림·문구', () => {
  const json = JSON.parse(readFileSync(new URL('popups.json', root), 'utf8'));
  assert.deepEqual(checkPopups(json, realFs), []);
  assert.deepEqual(checkBanners(json, realFs), []); // 스페셜 칸 배너(banners 열쇠 — 앱 2.0.1 T5.2a)
});

test('검사기 자체 — 잘못된 줄을 잡는다(목록이 비어 있어도 위 시험이 빈 시험이 되지 않게)', () => {
  const png = (w, h, bytes = 24) => {
    const b = Buffer.alloc(bytes);
    b[0] = 0x89;
    b.write('PNG', 1, 'ascii');
    b.writeUInt32BE(w, 16);
    b.writeUInt32BE(h, 20);
    return b;
  };
  const files = {
    'popups/ok-v1.png': png(1080, 1350),
    'popups/sq-v1.png': png(1000, 1000),
    'popups/tall-v1.png': png(100, 300),
    'popups/big-v1.png': png(1080, 1350, IMG_MAX + 1),
  };
  const fake = { exists: (p) => p in files, size: (p) => files[p].length, read: (p) => files[p] };
  const ok = { id: 'ok', from: '2026-10-24', until: '2026-11-07', audience: 'all', image: { all: 'popups/ok-v1.png' }, alt: { ko: '가을', en: 'Autumn', es: 'Otoño', de: 'Herbst' }, action: 'store.special' };
  assert.deepEqual(checkPopups({ popups: [ok] }, fake), []);
  assert.deepEqual(checkPopups({ popups: [{ ...ok, id: 'sq', image: { all: 'popups/sq-v1.png' } }] }, fake), []); // 1:1도 된다
  assert.deepEqual(checkPopups({ popups: [{ ...ok, id: 'special-open-2026-11' }] }, fake), []); // 정확한 자동 id
  assert.deepEqual(checkPopups({ popups: [{ ...ok, id: 'special-sale' }] }, fake), []); // 자동 모양이 아닌 special- 은 보통 팝업
  const cases = [
    [{ ...ok, id: 'BAD ID' }, /id 모양/],
    [{ ...ok, id: 'special-open-2026-1' }, /자동 팝업 id/],
    [{ ...ok, id: 'special-last-2026-13' }, /자동 팝업 id/],
    [{ ...ok, from: '2026-11-08' }, /from\/until/],
    [{ ...ok, until: '2026/11/07' }, /from\/until/],
    [{ ...ok, audience: 'vip' }, /audience/],
    [{ ...ok, action: 'web' }, /action/],
    [{ ...ok, image: undefined, alt: undefined }, /그림이나 제목/],
    [{ ...ok, image: { fr: 'popups/ok-v1.png' } }, /그림 언어 fr/],
    [{ ...ok, image: { all: 'http://evil/x.png' } }, /그림 경로/],
    [{ ...ok, image: { all: 'popups/none-v1.png' } }, /파일 없음/],
    [{ ...ok, image: { all: 'popups/big-v1.png' } }, /500KB/],
    [{ ...ok, image: { all: 'popups/tall-v1.png' } }, /비율/],
    [{ ...ok, alt: { ko: '가을' } }, /alt\.en/],
    [{ ...ok, title: { ko: '무료 선물' } }, /요금/],
    [{ ...ok, title: { en: 'Free gift' } }, /요금/],
    [{ ...ok, body: { ko: '₩3,000' } }, /요금/],
    [{ ...ok, title: { ko: '   ' } }, /빈 글/],
    [{ ...ok, body: { ko: 'x'.repeat(TEXT_MAX + 1) } }, /300자/],
    [{ ...ok, title: { fr: 'Titre' } }, /title 언어 fr/],
  ];
  for (const [p, re] of cases) assert.match(checkPopups({ popups: [p] }, fake).join('\n'), re, JSON.stringify(p));
  assert.deepEqual(checkPopups({ popups: [{ ...ok, body: { ko: 'x'.repeat(TEXT_MAX) } }] }, fake), []); // 300자는 된다
  assert.match(checkPopups({ popups: [ok, ok] }, fake).join('\n'), /중복/);
  assert.match(checkPopups({}, fake).join('\n'), /배열/);
});

test('검사기 자체(배너) — 잘못된 줄을 잡는다(실제 popups.json에 banners가 없어도 위 시험이 빈 시험이 되지 않게)', () => {
  const png = (w, h, bytes = 24) => {
    const b = Buffer.alloc(bytes);
    b[0] = 0x89;
    b.write('PNG', 1, 'ascii');
    b.writeUInt32BE(w, 16);
    b.writeUInt32BE(h, 20);
    return b;
  };
  const files = {
    'popups/ban-v1.png': png(1200, 300), // 4:1 정확히
    'popups/edge-hi-v1.png': png(1200, 294), // 4.0816 — 4:1에서 +2.04% → 바깥
    'popups/edge-ok-v1.png': png(1200, 297), // 4.0404 — +1.01% → 안
    'popups/edge-lo-v1.png': png(1200, 306), // 3.9216 — -1.96% → 안
    'popups/edge-lo2-v1.png': png(1200, 308), // 3.896 — -2.6% → 바깥
    'popups/sq-v1.png': png(1000, 1000),
    'popups/tall-v1.png': png(1080, 1350),
    'popups/big-v1.png': png(1200, 300, IMG_MAX + 1),
    'popups/ko-v1.png': png(1200, 300),
    'popups/en-v1.png': png(1200, 300),
  };
  const fake = { exists: (p) => p in files, size: (p) => files[p].length, read: (p) => files[p] };
  const ALT = { ko: '가을 스페셜', en: 'Autumn special', es: 'Especial de otoño', de: 'Herbst-Special' };
  const ok = { month: '2026-11', image: { all: 'popups/ban-v1.png' }, alt: ALT };
  const run = (...banners) => checkBanners({ popups: [], banners }, fake);

  // 통과하는 것
  assert.deepEqual(checkBanners({ popups: [] }, fake), []); // banners 열쇠는 없어도 된다
  assert.deepEqual(checkBanners({ popups: [], banners: [] }, fake), []);
  assert.deepEqual(run(ok), []);
  assert.deepEqual(run({ ...ok, image: { ko: 'popups/ko-v1.png', en: 'popups/en-v1.png' }, alt: { ko: '가', en: 'a' } }), []); // 맡는 언어만 설명이 있으면 된다
  assert.deepEqual(run({ ...ok, image: { ko: 'popups/ko-v1.png', all: 'popups/ban-v1.png' } }), []); // ko 그림 + 나머지는 all — 네 언어 설명
  assert.deepEqual(run(ok, { ...ok, month: '2026-12' }), []); // 다른 달은 여럿
  assert.deepEqual(run({ ...ok, image: { all: 'popups/edge-ok-v1.png' } }), []); // 비율 ±2% 안(+1%)
  assert.deepEqual(run({ ...ok, image: { all: 'popups/edge-lo-v1.png' } }), []); // 비율 ±2% 안(-1.96%)
  assert.deepEqual(run({ ...ok, alt: { ...ALT, ko: 'x'.repeat(TEXT_MAX) } }), []); // 300자는 된다

  // 잡아야 하는 것
  const cases = [
    [{ month: '2026-13' }, /month/],
    [{ month: '2026-00' }, /month/],
    [{ month: '2026-1' }, /month/],
    [{ month: '2026-11-01' }, /month/],
    [{ month: 202611 }, /month/],
    [{ month: undefined }, /month/],
    [{ image: undefined }, /그림 칸/],
    [{ image: {} }, /그림 칸/],
    [{ image: 'popups/ban-v1.png' }, /그림 칸/],
    [{ image: { fr: 'popups/ban-v1.png' } }, /그림 언어 fr/],
    [{ image: { all: 'http://evil/x.png' } }, /그림 경로/],
    [{ image: { all: 'popups/ban.png' } }, /그림 경로/],
    [{ image: { all: 'popups/none-v1.png' } }, /파일 없음/],
    [{ image: { all: 'popups/big-v1.png' } }, /500KB/],
    [{ image: { all: 'popups/sq-v1.png' } }, /비율 4:1/],
    [{ image: { all: 'popups/tall-v1.png' } }, /비율 4:1/],
    [{ image: { all: 'popups/edge-hi-v1.png' } }, /비율 4:1/],
    [{ image: { all: 'popups/edge-lo2-v1.png' } }, /비율 4:1/],
    [{ alt: undefined }, /alt\.ko/],
    [{ alt: { ko: '가', en: 'a', es: 'e' } }, /alt\.de/], // all 그림은 네 언어 설명이 다 있어야
    [{ image: { ko: 'popups/ko-v1.png' }, alt: { en: 'a' } }, /alt\.ko/], // ko 그림인데 ko 설명이 없다
    [{ alt: { ...ALT, ko: '' } }, /alt\.ko/],
    [{ alt: { ...ALT, en: '   ' } }, /alt\.en/],
    [{ alt: { ...ALT, de: 'x'.repeat(TEXT_MAX + 1) } }, /300자/],
    [{ alt: { ...ALT, es: 5 } }, /alt\.es/],
    [{ alt: { ...ALT, fr: 'Titre' } }, /alt 언어 fr/],
    [{ alt: { ...ALT, ko: '무료 선물' } }, /요금/],
    [{ alt: { ...ALT, en: 'Free gift' } }, /요금/],
    [{ alt: { ...ALT, es: 'Precio especial' } }, /요금/],
    [{ alt: { ...ALT, de: 'Jetzt 3€' } }, /요금/],
  ];
  for (const [over, re] of cases) assert.match(run({ ...ok, ...over }).join('\n'), re, JSON.stringify(over));
  assert.match(run(ok, ok).join('\n'), /달 중복/);
  assert.match(checkBanners({ popups: [], banners: 'x' }, fake).join('\n'), /배열/);
  assert.match(checkBanners({ popups: [], banners: { month: '2026-11' } }, fake).join('\n'), /배열/);
  assert.match(run(null).join('\n'), /month/);
});
