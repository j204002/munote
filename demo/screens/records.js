// demo/screens/records.js — 기록 화면. CalendarScreen.tsx의 레이아웃·규칙을 --pt 스케일로 그대로 옮긴다.
// 범위 밖(생략, 태스크 브리프 지시): D-day 행 · to-do 패널 본문 · 메모 패널 본문 · 전체 편집 모달.
// 대신 세션 카드 안에 곡·유형·메모·한마디를 바로 펼친다(모달 없이) — sessions 패널만 실제로 동작한다.
import { monthCells, sessionsOf, coachTextOf, setCalendarMonth, selectDay } from '../state.js';
import { weekdayOf } from '../dateKey.js';
import { EMOJI } from '../data.js';
import { tabbar, esc, gate } from '../ui.js';

// lib/i18n/language.ts LOCALE_TAGS 사본 — 월 제목의 Intl 로케일.
const LOCALE_TAG = { ko: 'ko-KR', en: 'en-US', es: 'es-ES', de: 'de-DE' };
// CalendarScreen.tsx cellShade()의 레벨별 색 사본(level 1~4). level 0은 배경과 같은 투명.
const LEVEL_FILL = ['transparent', '#D6D6D6', '#9A9A9A', '#4A4A4A', '#111111'];

function monthTitle(ym, lang) {
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat(LOCALE_TAG[lang] ?? 'ko-KR', { year: 'numeric', month: 'long' }).format(new Date(y, m - 1, 1));
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 월 첫 칸 앞 빈칸(주 시작 요일 반영) + 뒤쪽 7의 배수로 채움 → 7칸씩 묶기. CalendarScreen.tsx와 동일 규칙.
function weekGrid(cells, weekStartMon) {
  const lead = (weekdayOf(cells[0].key) - (weekStartMon ? 1 : 0) + 7) % 7;
  const flat = [...Array.from({ length: lead }, () => null), ...cells];
  while (flat.length % 7 !== 0) flat.push(null);
  const weeks = [];
  for (let i = 0; i < flat.length; i += 7) weeks.push(flat.slice(i, i + 7));
  return weeks;
}

function dayCellHtml(cell, selectedDay) {
  const day = Number(cell.key.slice(-2));
  const isSelected = cell.key === selectedDay;
  const onDark = cell.level >= 2; // 앱 dayTextOnDark 규칙: min >= 20(level 2 이상)일 때 흰 숫자
  return `<button type="button" class="md-cal-cell" data-day="${cell.key}" data-level="${cell.level}" aria-pressed="${isSelected}" aria-label="${cell.key}">
    <span class="md-cal-ring${isSelected ? ' on' : ''}">
      <span class="md-cal-dot" style="background:${LEVEL_FILL[cell.level]}">
        <span class="md-cal-daytext${onDark ? ' on-dark' : ''}">${day}</span>
      </span>
    </span>
  </button>`;
}

// lib/stats.ts daySummary()와 동일: 시간가중 집중도(Σ연습 ÷ Σ전체), 세션 단순평균 금지.
function dayTotalOf(list) {
  if (list.length === 0) return null;
  const practiceMin = list.reduce((a, x) => a + x.practiceMin, 0);
  const elapsedMin = list.reduce((a, x) => a + x.elapsedMin, 0);
  const focusPct = elapsedMin > 0 ? Math.round((practiceMin / elapsedMin) * 100) : 0;
  return { practiceMin, elapsedMin, focusPct, sessionCount: list.length };
}

function sessionCardHtml(session, t, lang, meInstrument) {
  const line = t('calendar.sessionLine', { time: session.startHm, min: session.practiceMin, focus: session.focusPct, count: session.pieces.length });
  const piecesLine = session.pieces.length ? `<p class="md-cal-session-pieces">${esc(session.pieces.join(' · '))}</p>` : '';
  const typesLine = session.types.length ? `<p class="md-cal-session-types">${esc(session.types.map((k) => t(`practiceType.${k}`)).join(' · '))}</p>` : '';
  const memoLine = session.memo ? `<p class="md-cal-session-memo">${esc(session.memo)}</p>` : '';
  const coachText = coachTextOf(session, lang);
  const coachHtml = coachText ? `<div class="md-cal-coach"><p class="md-cal-coach-label">${esc(t('reflection.coachLabel'))}</p><p class="md-cal-coach-text">"${esc(coachText)}"</p></div>` : '';
  const emoji = EMOJI[meInstrument] ?? '🎹';
  return `<div class="md-cal-session">
    <div class="md-cal-session-row">
      <p class="md-cal-session-line">${esc(line)}</p>
      <span class="md-cal-session-inst" aria-label="${esc(t(`instrument.${meInstrument}`))}">${emoji}</span>
    </div>
    ${piecesLine}${typesLine}${memoLine}${coachHtml}
    <div class="md-cal-session-foot">
      <button type="button" class="md-cal-edit-all" ${gate(t)}>${esc(t('calendar.editAll'))}</button>
    </div>
    <button type="button" class="md-cal-delete" ${gate(t)}>${esc(t('calendar.deleteSession'))}</button>
  </div>`;
}

export const render = (s, t) => {
  const { lang } = s;
  const ym = s.calendarMonth;
  const cells = monthCells(s, ym);
  const weeks = weekGrid(cells, s.me.weekStartMon);
  const weekdaysSun = Array.from({ length: 7 }, (_, i) => t(`calendar.weekdays.${i}`)); // JSON 배열은 일~토 순
  const weekdays = s.me.weekStartMon ? [...weekdaysSun.slice(1), weekdaysSun[0]] : weekdaysSun;

  const gridHtml = weeks.map((week) => `<div class="md-cal-grid-row">${week.map((cell) => (cell ? dayCellHtml(cell, s.selectedDay) : '<div class="md-cal-cell blank"></div>')).join('')}</div>`).join('');
  const legendHtml = [1, 2, 3, 4].map((lvl) => `<span class="md-cal-legend-item"><span class="md-cal-swatch" style="background:${LEVEL_FILL[lvl]}"></span><span class="md-cal-legend-text">${esc(t(`calendar.legend.l${lvl}`))}</span></span>`).join('');

  const selected = s.selectedDay;
  const daySessions = selected ? sessionsOf(s, selected) : [];
  const total = selected ? dayTotalOf(daySessions) : null;
  const hasMemo = daySessions.some((x) => x.memo);

  const totalHtml = !total ? '' : `<div class="md-cal-total">
    <p class="md-cal-total-label">${esc(t('calendar.daySummaryLabel'))}</p>
    <p class="md-cal-total-text">${esc(t('calendar.daySummary', { min: total.practiceMin, focus: total.focusPct, count: total.sessionCount }))}</p>
    <div class="md-cal-bar-track"><div class="md-cal-bar-fill" style="width:${Math.min(100, total.focusPct)}%"></div></div>
    <p class="md-cal-bar-legend">${esc(t('calendar.dayBarTotal', { min: total.elapsedMin }))}</p>
  </div>`;

  // 패널 알약: sessions만 실제로 동작(항상 선택 상태) — to do·메모·디데이는 표시만(게이트).
  // "has"(내용 있음=굵은 테두리)는 메모만 계산 가능(세션 메모 유무) — to do·디데이는 체험판에 데이터 모델이 없다.
  const panelHtml = !selected ? '' : `<div class="md-cal-panels">
    <button type="button" class="md-cal-panel-pill on" aria-pressed="true">${esc(t('calendar.panel.sessions'))}</button>
    <button type="button" class="md-cal-panel-pill" ${gate(t)} aria-pressed="false">${esc(t('calendar.panel.todo'))}</button>
    <button type="button" class="md-cal-panel-pill${hasMemo ? ' has' : ''}" ${gate(t)} aria-pressed="false">${esc(t('calendar.panel.memo'))}</button>
    <button type="button" class="md-cal-panel-pill" ${gate(t)} aria-pressed="false">${esc(t('calendar.panel.dday'))}</button>
  </div>`;

  const sessionsHtml = !selected ? '' : (daySessions.length
    ? daySessions.map((sess) => sessionCardHtml(sess, t, lang, s.me.instrument)).join('')
    : `<p class="md-cal-empty">${esc(t('calendar.emptyDay'))}</p>`);

  return `<div class="screen md-records">
    <div class="md-body scroll">
      <div class="md-cal-content">
        <div class="md-cal-title-row">
          <button type="button" class="md-cal-nav" data-month="-1">‹</button>
          <p class="md-cal-title">${esc(monthTitle(ym, lang))}</p>
          <button type="button" class="md-cal-nav" data-month="1">›</button>
        </div>
        <div class="md-cal-week-row">${weekdays.map((w) => `<p class="md-cal-weekday">${esc(w)}</p>`).join('')}</div>
        <div>${gridHtml}</div>
        <div class="md-cal-legend-row">
          <span class="md-cal-legend"><span class="md-cal-legend-text">${esc(t('calendar.legendLabel'))}</span>${legendHtml}</span>
        </div>
        ${totalHtml}
        ${panelHtml}
        ${sessionsHtml}
      </div>
    </div>
    ${tabbar(t, 'records')}
  </div>`;
};

export const rewire = (root, ctx) => {
  root.querySelectorAll('[data-month]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const delta = Number(btn.dataset.month);
      ctx.update((s) => setCalendarMonth(s, shiftMonth(s.calendarMonth, delta)));
    });
  });
  root.querySelectorAll('[data-day]').forEach((btn) => {
    btn.addEventListener('click', () => ctx.update((s) => selectDay(s, btn.dataset.day)));
  });
};

export const bind = (root, ctx) => {
  rewire(root, ctx);
  return null;
};
