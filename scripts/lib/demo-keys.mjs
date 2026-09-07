// munote-landing/scripts/lib/demo-keys.mjs
// 체험판(demo/)이 실제로 쓰는 번역 키를 소스에서 기계적으로 모은다. `demo/tests/keys.test.mjs`(번역
// 누락 검사)와 `scripts/project-locale.mjs`(앱 번역 leaf-key 허용목록)가 이 모듈 하나를 같이 써서,
// "체험판이 쓰는 키" 정의가 두 곳에서 따로 놀며 어긋나는 일(허용목록 드리프트)을 구조적으로 막는다.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEMO = join(HERE, '..', '..', 'demo');

export function sourceFiles() {
  return [
    join(DEMO, 'ui.js'),
    join(DEMO, 'demo.js'),
    ...readdirSync(join(DEMO, 'screens')).filter((f) => f.endsWith('.js')).map((f) => join(DEMO, 'screens', f)),
  ];
}

// 정규식으로 정적 추출이 안 되는 키 계열(런타임 삼항식·변수 조합 등)만 사람이 한 번 확인해 등록한다.
// '*'로 끝나는 항목은 접두사(그 아래 전부 유지) — instrument.piano/strings/winds/vocal 처럼 실행 시점
// 값에 따라 어떤 키가 쓰일지 정적으로 알 수 없는 것들. 여기 없는 새 키가 필요해지면 keys.test.mjs가
// "누락된 키"로 잡는다(추가를 깜빡해도 조용히 새지 않는다 — project-locale.mjs가 지워버릴 뿐).
export const KNOWN_DYNAMIC_FAMILIES = [
  'focus.state.*', 'instrument.*', 'practiceType.*',
  'settings.notifHour*', 'settings.dayStartHour*', 'settings.weekStart*',
  'tabs.*', 'calendar.legend.*', 'friends.react.*', 'friends.a11y.*',
  'home.streak_*', 'home.weekDays_*', 'calendar.sessionLine_*', 'calendar.daySummary_*',
  'duration.*',
];
// 리터럴이지만(배열 전체를 쓰거나, 삼항식 안에 바로 있어 정규식이 놓치는 것) 명시적으로 고정해두는 키.
// focus.stop/focus.resume: focus.js가 `t(f.paused ? 'focus.resume' : 'focus.stop')`처럼 변수 대입 없이
// 삼항식을 바로 t()에 넘긴다 — settings.js의 weekStartMon/Sun과 같은 함정(정적 추출 불가).
export const EXTRA_LITERAL_KEYS = ['calendar.weekdays', 'common.back', 'focus.stop', 'focus.resume'];

// --- 소스에서 t()/T.t() 호출을 정규식으로 모은다 (구 keys.test.mjs 로직 그대로 이관) ---------------
export function extractFromSource(files = sourceFiles()) {
  const literalKeys = new Set(); // 완전한 키 문자열('a.b.c')
  const dynamicPrefixes = new Set(); // 템플릿 리터럴의 ${ 앞부분('a.b.' 또는 'a.notifHour'처럼 중간에서 끊길 수 있음)

  for (const file of files) {
    const src = readFileSync(file, 'utf8');

    // t('key') / t("key") / T.t('key') — 정적 리터럴
    for (const m of src.matchAll(/\bT?\.?\bt\(\s*'([^']*)'/g)) literalKeys.add(m[1]);
    for (const m of src.matchAll(/\bT?\.?\bt\(\s*"([^"]*)"/g)) literalKeys.add(m[1]);

    // t(`prefix.${expr}`) — 동적 접두사
    for (const m of src.matchAll(/\bT?\.?\bt\(\s*`([^`]*)\$\{/g)) dynamicPrefixes.add(m[1]);

    // t(ident) / T.t(ident) — 변수로 전달된 키. 같은 파일의 `ident = ...` 대입에서
    // 점(.)이 들어간 문자열 리터럴을 번역 키 후보로 수집한다(예: friends.js의 stateKey).
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

  return { literalKeys, dynamicPrefixes };
}

// --- 체험판 leaf-key 허용목록: literal 키(+복수형 _one/_other) + 템플릿 리터럴 접두사('*' 표기로 통일)
//     + 수동 계열(KNOWN_DYNAMIC_FAMILIES) + 배열 전체 등 예외(EXTRA_LITERAL_KEYS) --------------------
export function collectDemoKeys() {
  const { literalKeys, dynamicPrefixes } = extractFromSource();
  const out = new Set();
  for (const key of literalKeys) {
    out.add(key);
    // i18n.js의 count 기반 복수형 폴백(key_one/key_other)을 위해 항상 같이 넣어둔다 — 실제 사전에
    // 없으면 project-locale.mjs가 조용히 건너뛰고, keys.test.mjs도 존재하지 않는 항목은 검사하지 않는다.
    out.add(`${key}_one`);
    out.add(`${key}_other`);
  }
  for (const prefix of dynamicPrefixes) out.add(`${prefix}*`);
  for (const family of KNOWN_DYNAMIC_FAMILIES) out.add(family);
  for (const key of EXTRA_LITERAL_KEYS) out.add(key);
  return out;
}
