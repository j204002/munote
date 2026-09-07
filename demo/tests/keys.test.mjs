// demo/tests/keys.test.mjs — 체험판이 실제로 쓰는 번역 키가 4개 언어 파일(+demo.json)에 전부 존재하는지 확인한다.
// t('literal') / t(`prefix.${x}`) / t(identifier) / gate(t, 'literal') 네 가지 호출 형태를 소스에서 정규식으로 모은다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO = join(HERE, '..');
const LANGS = ['ko', 'en', 'es', 'de'];

const SOURCE_FILES = [
  join(DEMO, 'ui.js'),
  join(DEMO, 'demo.js'),
  ...readdirSync(join(DEMO, 'screens')).filter((f) => f.endsWith('.js')).map((f) => join(DEMO, 'screens', f)),
];

const appDicts = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(readFileSync(join(DEMO, 'i18n', l + '.json'), 'utf8'))]));
const demoDict = JSON.parse(readFileSync(join(DEMO, 'i18n', 'demo.json'), 'utf8'));
// t()가 실제로 보는 사전과 같은 모양(demo.* 도 dot path 하나로 들어오게)으로 합쳐서 검사한다.
const mergedDicts = Object.fromEntries(LANGS.map((l) => [l, { ...appDicts[l], demo: demoDict[l] }]));

// --- 1) 소스에서 t()/T.t() 호출 수집 -------------------------------------------------
const literalKeys = new Set(); // 완전한 키 문자열('a.b.c')
const dynamicPrefixes = new Set(); // 템플릿 리터럴의 ${ 앞부분 ('a.b.' 또는 'a.notifHour' 처럼 중간에서 끊길 수 있음)

for (const file of SOURCE_FILES) {
  const src = readFileSync(file, 'utf8');

  // t('key') / t("key") / T.t('key') — 정적 리터럴
  for (const m of src.matchAll(/\bT?\.?\bt\(\s*'([^']*)'/g)) literalKeys.add(m[1]);
  for (const m of src.matchAll(/\bT?\.?\bt\(\s*"([^"]*)"/g)) literalKeys.add(m[1]);

  // t(`prefix.${expr}`) — 동적 접두사
  for (const m of src.matchAll(/\bT?\.?\bt\(\s*`([^`]*)\$\{/g)) dynamicPrefixes.add(m[1]);

  // t(ident) / T.t(ident) — 변수로 전달된 키. 같은 파일의 `ident = ...` 대입에서
  // 점(.)이 들어간 문자열 리터럴을 번역 키 후보로 수집한다(예: focus.js의 stateKey).
  for (const m of src.matchAll(/\bT?\.?\bt\(\s*([A-Za-z_$][\w$]*)\s*\)/g)) {
    const ident = m[1];
    const assign = new RegExp(`\\b${ident}\\s*=[^;\\n]*`, 'g');
    for (const am of src.matchAll(assign)) {
      for (const sm of am[0].matchAll(/'([a-zA-Z][\w.]*\.[\w]+)'|"([a-zA-Z][\w.]*\.[\w]+)"/g)) {
        literalKeys.add(sm[1] ?? sm[2]);
      }
    }
  }

  // gate(t, 'key') — 두 번째 인자 없으면 기본값 'demo.inApp' (ui.js의 gate 시그니처와 동일)
  for (const m of src.matchAll(/\bgate\(\s*t\s*(?:,\s*'([^']*)')?\s*\)/g)) literalKeys.add(m[1] ?? 'demo.inApp');
}

// --- 2) 사전에서 키를 찾는 헬퍼 -------------------------------------------------------
function get(obj, path) {
  return path.split('.').reduce((o, k) => (o && typeof o === 'object' && k in o ? o[k] : undefined), obj);
}

function resolvesLiteral(dict, key) {
  const v = get(dict, key);
  if (v !== undefined) return true;
  // 복수형: key_one / key_other
  return get(dict, `${key}_one`) !== undefined && get(dict, `${key}_other`) !== undefined;
}

function resolvesPrefix(dict, prefix) {
  const lastDot = prefix.lastIndexOf('.');
  const parentPath = lastDot >= 0 ? prefix.slice(0, lastDot) : '';
  const remainder = lastDot >= 0 ? prefix.slice(lastDot + 1) : prefix;
  const obj = parentPath ? get(dict, parentPath) : dict;
  if (obj === undefined || obj === null || typeof obj !== 'object') return false;
  if (remainder === '') return Object.keys(obj).length > 0 || (Array.isArray(obj) && obj.length > 0);
  return Object.keys(obj).some((k) => k.startsWith(remainder));
}

// --- 3) 검사 -------------------------------------------------------------------------
test(`literal t() 키 ${literalKeys.size}개가 4개 언어 사전에 전부 존재`, () => {
  const missing = [];
  for (const key of literalKeys) {
    for (const lang of LANGS) {
      if (!resolvesLiteral(mergedDicts[lang], key)) missing.push(`${lang}: ${key}`);
    }
  }
  assert.deepEqual(missing, [], `누락된 키:\n${missing.join('\n')}`);
});

test(`동적 접두사 ${dynamicPrefixes.size}개(t(\`a.b.\${x}\`) 형태)가 4개 언어 사전에 대응하는 객체를 가짐`, () => {
  const missing = [];
  for (const prefix of dynamicPrefixes) {
    for (const lang of LANGS) {
      if (!resolvesPrefix(mergedDicts[lang], prefix)) missing.push(`${lang}: ${prefix}*`);
    }
  }
  assert.deepEqual(missing, [], `누락된 동적 접두사:\n${missing.join('\n')}`);
});

test('체험판이 쓰는 최상위 섹션은 4개 언어 파일이 완전히 동일한 키 집합을 가짐', () => {
  const SECTIONS = ['tabs', 'home', 'focus', 'reflection', 'calendar', 'friends', 'settings', 'instrument', 'practiceType', 'duration', 'common'];
  const flatten = (obj, prefix = '') => {
    const out = new Set();
    if (Array.isArray(obj)) { out.add(prefix.slice(0, -1) + `[len=${obj.length}]`); return out; }
    if (obj && typeof obj === 'object') { for (const [k, v] of Object.entries(obj)) for (const x of flatten(v, `${prefix}${k}.`)) out.add(x); return out; }
    out.add(prefix.slice(0, -1));
    return out;
  };
  const baseline = Object.fromEntries(SECTIONS.map((s) => [s, flatten(appDicts.ko[s])]));
  const mismatches = [];
  for (const lang of ['en', 'es', 'de']) {
    for (const section of SECTIONS) {
      const a = baseline[section];
      const b = flatten(appDicts[lang][section]);
      const missing = [...a].filter((k) => !b.has(k));
      const extra = [...b].filter((k) => !a.has(k));
      if (missing.length || extra.length) mismatches.push(`${lang}.${section}: missing=[${missing}] extra=[${extra}]`);
    }
  }
  assert.deepEqual(mismatches, [], `언어별 키 불일치:\n${mismatches.join('\n')}`);
});

test('demo.json 4개 언어가 서로 같은 키 집합을 가짐', () => {
  const keysOf = (l) => new Set(Object.keys(demoDict[l]));
  const base = keysOf('ko');
  const mismatches = [];
  for (const lang of ['en', 'es', 'de']) {
    const other = keysOf(lang);
    const missing = [...base].filter((k) => !other.has(k));
    const extra = [...other].filter((k) => !base.has(k));
    if (missing.length || extra.length) mismatches.push(`${lang}: missing=[${missing}] extra=[${extra}]`);
  }
  assert.deepEqual(mismatches, [], `demo.json 언어 불일치:\n${mismatches.join('\n')}`);
});
