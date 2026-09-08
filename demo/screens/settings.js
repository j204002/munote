// demo/screens/settings.js — 설정 화면(A안 목록형). SettingsScreen.tsx·SettingSheet.tsx 이식.
// 범위 밖(브리프 지시로 숨김): 로그아웃 · 계정 삭제 · 문의하기 · 친구 공개 줄 · 가입하기 · 개발자 메뉴.
// 목표 스텝 편차: 앱은 ±30분(최대 12시간)이지만 브리프 지시대로 여기는 ±10분
// (state.js setGoal이 0~240분으로 클램프 — 그 값을 그대로 따른다).
// 알림 시각은 데모에 on/off 상태가 없어 항상 켜진 것으로 보고, 선택한 시각은 스토어를 거치지 않는
// 모듈 전역 값만 바꾼다(reflection.js의 memoText와 같은 이유 — 화면을 나가도 사라지지 않아도 무해함).
import { setInstrument, setGoal, setDayStart, setWeekStart, setLang, openSheet, closeSheet } from '../state.js';
import { esc, sheet, pill, asset } from '../ui.js';

const INSTRUMENTS = ['piano', 'strings', 'winds', 'vocal'];
const NOTIF_HOURS = [8, 12, 16, 19, 21];
const DAY_START_HOURS = [0, 2, 4, 6];
// lib/i18n/language.ts LANGUAGE_OPTIONS 사본 — 고정 자국어 이름(언어 설정 자체는 항상 영어 "Language").
const LANGS = [
  { code: 'ko', native: '한국어' },
  { code: 'en', native: 'English' },
  { code: 'es', native: 'Español' },
  { code: 'de', native: 'Deutsch' },
];
const GOAL_STEP = 10;

let reminderHour = 19;

// lib/legalLinks.ts legalDocUrl()과 동일 규칙: ko는 접미사 없음, 나머지는 -en/-es/-de.
const legalFile = (doc, lang) => (lang === 'ko' ? `${doc}.html` : `${doc}-${lang}.html`);

const goalText = (t, min) => (min <= 0 ? t('settings.goalNone') : t('duration.minOnly', { m: min }));

function rowHtml({ label, value, which, last = false }) {
  return `<button type="button" class="md-set-row${last ? ' last' : ''}" data-setting="${which}">
    <span class="md-set-label">${esc(label)}</span>
    <span class="md-set-right">${value !== undefined ? `<span class="md-set-value">${esc(value)}</span>` : ''}<span class="md-set-chev" aria-hidden="true">›</span></span>
  </button>`;
}

function linkRowHtml(label, href, last = false) {
  return `<a class="md-set-row${last ? ' last' : ''}" href="${esc(href)}" target="_blank" rel="noopener">
    <span class="md-set-label">${esc(label)}</span>
    <span class="md-set-right"><span class="md-set-chev" aria-hidden="true">›</span></span>
  </a>`;
}

function staticRowHtml(label, value, last = false) {
  return `<div class="md-set-row md-set-static${last ? ' last' : ''}">
    <span class="md-set-label">${esc(label)}</span>
    <span class="md-set-right"><span class="md-set-value">${esc(value)}</span></span>
  </div>`;
}

function goalRowHtml(t, goalMin) {
  return `<div class="md-set-row md-set-goal">
    <span class="md-set-label">${esc(t('settings.goalLabel'))}</span>
    <span class="md-set-stepper">
      <button type="button" class="md-set-stepbtn" data-goal="-${GOAL_STEP}" aria-label="−">−</button>
      <span class="md-set-goalvalue">${esc(goalText(t, goalMin))}</span>
      <button type="button" class="md-set-stepbtn" data-goal="+${GOAL_STEP}" aria-label="+">+</button>
    </span>
  </div>`;
}

function headerHtml(t) {
  return `<div class="md-set-header">
    <button type="button" class="md-set-back" data-go="home" aria-label="${esc(t('common.back'))}">‹</button>
    <span class="md-set-title">${esc(t('tabs.settings'))}</span>
    <span class="md-set-back-spacer" aria-hidden="true"></span>
  </div>`;
}

function accountCardHtml(t, s) {
  return `<div class="md-set-group md-set-account">
    <span class="md-set-avatar" aria-hidden="true"><img src="${asset('muni/front_neutral.png')}" alt="" loading="lazy"></span>
    <span class="md-set-account-text">
      <span class="md-set-account-name">${esc(s.me.name)}</span>
      <span class="md-set-account-sub">${esc(t('demo.demoAccount'))}</span>
    </span>
  </div>`;
}

function optPill(label, selected, opt) {
  return pill(label, { selected, data: `data-opt="${opt}" aria-pressed="${selected}"` });
}

function sheetBodyHtml(t, s) {
  const which = s.sheet.which;
  if (which === 'instrument') {
    // 앱의 악기 설명줄(settings.instrumentNote)은 체험판에서 렌더하지 않는다.
    const opts = INSTRUMENTS.map((k) => optPill(t(`instrument.${k}`), s.me.instrument === k, `instrument:${k}`)).join('');
    return `<p class="md-sheet-title">${esc(t('settings.instrumentLabel'))}</p>
      <div class="md-pill-wrap">${opts}</div>`;
  }
  if (which === 'reminder') {
    const opts = NOTIF_HOURS.map((h) => optPill(t(`settings.notifHour${h}`), reminderHour === h, `reminder:${h}`)).join('');
    return `<p class="md-sheet-title">${esc(t('settings.notifLabel'))}</p>
      <div class="md-pill-wrap">${opts}</div>
      <p class="md-set-note">${esc(t('settings.notifNote'))}</p>`;
  }
  if (which === 'calendar') {
    const dayOpts = DAY_START_HOURS.map((h) => optPill(t(`settings.dayStartHour${h}`), s.me.dayStartHour === h, `daystart:${h}`)).join('');
    const weekOpts = [false, true].map((mon) => optPill(t(mon ? 'settings.weekStartMon' : 'settings.weekStartSun'), s.me.weekStartMon === mon, `weekstart:${mon}`)).join('');
    return `<p class="md-sheet-title">${esc(t('settings.calendarRowLabel'))}</p>
      <p class="md-sheet-section">${esc(t('settings.dayStartLabel'))}</p>
      <div class="md-pill-wrap">${dayOpts}</div>
      <p class="md-set-note">${esc(t('settings.dayStartNote'))}</p>
      <p class="md-sheet-section">${esc(t('settings.weekStartLabel'))}</p>
      <div class="md-pill-wrap">${weekOpts}</div>`;
  }
  if (which === 'language') {
    const opts = LANGS.map((l) => optPill(l.native, s.lang === l.code, `language:${l.code}`)).join('');
    return `<p class="md-sheet-title">${esc(t('settings.languageSection'))}</p>
      <div class="md-pill-wrap">${opts}</div>`;
  }
  return '';
}

// 시트 role="dialog"의 접근 가능한 이름 — 각 시트 본문 맨 위 제목(md-sheet-title)과 같은 문구를 쓴다.
function sheetLabelOf(t, which) {
  if (which === 'instrument') return t('settings.instrumentLabel');
  if (which === 'reminder') return t('settings.notifLabel');
  if (which === 'calendar') return t('settings.calendarRowLabel');
  if (which === 'language') return t('settings.languageSection');
  return '';
}

export const render = (s, t) => {
  const langNative = LANGS.find((l) => l.code === s.lang)?.native ?? s.lang;
  const practiceRows = [
    rowHtml({ label: t('settings.instrumentLabel'), value: t(`instrument.${s.me.instrument}`), which: 'instrument' }),
    goalRowHtml(t, s.me.goalMin),
    rowHtml({ label: t('settings.notifLabel'), value: t(`settings.notifHour${reminderHour}`), which: 'reminder' }),
    rowHtml({
      label: t('settings.calendarRowLabel'),
      value: `${t(`settings.dayStartHour${s.me.dayStartHour}`)} · ${t(s.me.weekStartMon ? 'settings.weekStartMon' : 'settings.weekStartSun')}`,
      which: 'calendar',
      last: true,
    }),
  ].join('');

  const appRows = [
    rowHtml({ label: t('settings.languageSection'), value: langNative, which: 'language' }),
    linkRowHtml(t('settings.legalTerms'), legalFile('terms', s.lang)),
    linkRowHtml(t('settings.legalPrivacy'), legalFile('privacy', s.lang)),
    staticRowHtml(t('settings.versionLabel'), `1.2 (${t('demo.demoAccount')})`, true),
  ].join('');

  const sheetHtml = s.sheet?.kind === 'setting' ? sheet(sheetBodyHtml(t, s), { label: sheetLabelOf(t, s.sheet.which) }) : '';

  return `<div class="screen md-settings">
    <div class="md-body scroll">
      <div class="md-set-content">
        ${headerHtml(t)}
        ${accountCardHtml(t, s)}
        <p class="md-set-section">${esc(t('settings.practiceSection'))}</p>
        <div class="md-set-group">${practiceRows}</div>
        <p class="md-set-section">${esc(t('settings.appSection'))}</p>
        <div class="md-set-group">${appRows}</div>
      </div>
    </div>
    ${sheetHtml}
  </div>`;
};

export function rewire(root, ctx) {
  root.querySelectorAll('[data-setting]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const which = btn.dataset.setting;
      ctx.update((s) => openSheet(s, { kind: 'setting', which }));
    });
  });
  root.querySelectorAll('[data-goal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const delta = Number(btn.dataset.goal);
      ctx.update((s) => setGoal(s, s.me.goalMin + delta));
    });
  });
  root.querySelectorAll('[data-opt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [kind, value] = btn.dataset.opt.split(':');
      ctx.update((s) => {
        if (kind === 'instrument') return closeSheet(setInstrument(s, value));
        if (kind === 'reminder') {
          reminderHour = Number(value);
          return closeSheet(s);
        }
        if (kind === 'daystart') return closeSheet(setDayStart(s, Number(value)));
        if (kind === 'weekstart') return closeSheet(setWeekStart(s, value === 'true'));
        if (kind === 'language') return closeSheet(setLang(s, value));
        return s;
      });
    });
  });
}

export const bind = (root, ctx) => {
  rewire(root, ctx);
  return null;
};
