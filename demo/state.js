// demo/state.js — 순수 전이. DOM 없음. 화면은 여기 함수만 호출한다.
import { ME, buildSessions, FRIENDS, COACH, FOCUS_TIMELINE, SKIP_TO, POSE_OF_INSTRUMENT, PIECES } from './data.js';
import { todayKey as calcToday, addDays, weekdayOf } from './dateKey.js';

export function createStore(now = new Date()) {
  const tk = calcToday(ME.dayStartHour, now);
  let state = {
    lang: 'ko', screen: 'home', me: { ...ME }, todayKey: tk, now,
    sessions: buildSessions(tk), friends: FRIENDS.map((f) => ({ ...f, reactions: { ...f.reactions } })),
    focus: { running: false, phase: 'idle', elapsedSec: 0, focusPct: 0, phaseIdx: 0, phaseSec: 0, paused: false, pauseCount: 0 },
    draft: { pieces: [], types: [], memo: '' }, toast: null, sheet: null, calendarMonth: tk.slice(0, 7), selectedDay: tk,
    // selectedDay 기본값 = 오늘: 앱은 null(미선택)로 시작하지만(CalendarScreen.tsx), 체험판은 기록 탭에
    // 처음 들어와도 오늘 하루 상세가 바로 보이게 한다(브리프 지시) — 링(선택 테두리)이 곧 "오늘 표시" 역할을 겸한다.
  };
  const subs = new Set();
  return {
    get: () => state,
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    set: (next) => { state = next; subs.forEach((fn) => fn(state)); },
  };
}
// ── 집중모드 ────────────────────────────────────────────
export const startFocus = (s) => ({ ...s, screen: 'focus', focus: { running: true, phase: 'sounding', elapsedSec: 0, focusPct: 0, phaseIdx: 0, phaseSec: 0, paused: false, pauseCount: 0, soundingSec: 0, wallSec: 0, skipped: false } });
export function tickFocus(s, d = 1) {
  const f = s.focus; if (!f.running || f.paused) return s;
  let { phaseIdx, phaseSec, elapsedSec, soundingSec, wallSec } = f;
  phaseSec += d; wallSec += d;
  const cur = FOCUS_TIMELINE[phaseIdx];
  if (cur.state === 'sounding') { elapsedSec += d; soundingSec += d; }
  if (phaseSec >= cur.sec) { phaseIdx = (phaseIdx + 1) % FOCUS_TIMELINE.length; phaseSec = 0; }
  const phase = FOCUS_TIMELINE[phaseIdx].state;
  const focusPct = wallSec ? Math.round((soundingSec / wallSec) * 100) : 0;
  return { ...s, focus: { ...f, phaseIdx, phaseSec, elapsedSec, soundingSec, wallSec, phase, focusPct } };
}
export const stopFocus = (s) => ({ ...s, focus: { ...s.focus, paused: true, phase: 'paused', pauseCount: s.focus.pauseCount + 1 } });
export const resumeFocus = (s) => ({ ...s, focus: { ...s.focus, paused: false, phase: FOCUS_TIMELINE[s.focus.phaseIdx].state } });
export const skipFocus = (s) => ({ ...s, focus: { ...s.focus, elapsedSec: SKIP_TO.elapsedSec, soundingSec: SKIP_TO.elapsedSec, wallSec: SKIP_TO.wallSec, focusPct: SKIP_TO.focusPct, skipped: true } });
export function endFocus(s) {
  const prev = s.sessions.filter((x) => x.dateKey === s.todayKey).at(-1) ?? s.sessions.filter((x) => x.dateKey < s.todayKey).at(-1);
  return { ...s, screen: 'reflection', focus: { ...s.focus, running: false, phase: 'ended' }, draft: { pieces: prev ? [...prev.pieces] : [PIECES[0]], types: prev ? [...prev.types] : [], memo: '' } };
}
const minsOf = (sec) => (sec > 0 ? Math.max(1, Math.floor(sec / 60)) : 0);
// 항목마다 soundingSec·wallSec이 "전부" 있으면 초 단위로 합산해 집중도를 낸다(더 정밀함 — 방문자가
// skip 뒤 틱을 더 흘려도 화면마다 다른 %로 갈리지 않는다, 코덱스 리뷰 2026-09-07 2차 High-1). 하나라도
// 없으면(고정 대본 세션은 분 단위만 가지고 있다) 전부 분×60으로 취급한다 — 한 목록 안에서 초 단위와
// 분 단위를 섞어 쓰지 않는다(섞으면 초 단위 항목의 정밀도가 분 단위 항목 탓에 의미 없어진다).
export function focusPctOf(items) {
  const hasSec = items.length > 0 && items.every((x) => typeof x.soundingSec === 'number' && typeof x.wallSec === 'number');
  let sounding = 0;
  let wall = 0;
  for (const x of items) {
    if (hasSec) { sounding += x.soundingSec; wall += x.wallSec; } else { sounding += (x.practiceMin ?? 0) * 60; wall += (x.elapsedMin ?? 0) * 60; }
  }
  return wall > 0 ? Math.round((sounding / wall) * 100) : 0;
}
export function saveReflection(s, lang) {
  // floor(min 1): 무음구간이 섞인 자연 진행(예: 60틱→48초)도 최소 1분으로 잡힌다. 19m31s → 19분(floor로), 20분이 넘지 않는다.
  const practiceMin = minsOf(s.focus.elapsedSec);
  const elapsedMin = Math.max(practiceMin, minsOf(s.focus.wallSec ?? s.focus.elapsedSec));
  const coach = practiceMin >= 20 ? (s.focus.skipped ? COACH[lang].skip : COACH[lang].natural.replace('{min}', String(practiceMin))) : undefined;
  const hm = `${String(s.now.getHours()).padStart(2, '0')}:${String(s.now.getMinutes()).padStart(2, '0')}`;
  // soundingSec·wallSec을 그대로 저장해둔다 — practiceMin·elapsedMin은 화면 표시(분)용으로 남기고,
  // 집중도는 이후(회고 카드·기록 화면 세션 줄·일 합계) 전부 이 두 값을 focusPctOf로 다시 계산해
  // 같은 뿌리에서 나오게 한다(다른 곳에서 분 단위로 재계산하면서 갈리던 88↔89 드리프트의 근본 원인 제거).
  const soundingSec = s.focus.soundingSec ?? s.focus.elapsedSec;
  const wallSec = s.focus.wallSec ?? s.focus.elapsedSec;
  const session = { id: `today-${s.sessions.length}`, dateKey: s.todayKey, startHm: hm, practiceMin, elapsedMin, focusPct: focusPctOf([{ soundingSec, wallSec }]), soundingSec, wallSec, pieces: [...s.draft.pieces], types: [...s.draft.types], memo: s.draft.memo || undefined, coach };
  return { ...s, screen: 'home', sessions: [...s.sessions, session], focus: { ...s.focus, running: false, phase: 'idle' } };
}
// ── 친구 ────────────────────────────────────────────────
export function toggleReaction(s, friendId, kind) {
  return { ...s, friends: s.friends.map((f) => {
    if (f.id !== friendId) return f;
    const r = { ...f.reactions };
    if (f.mine) r[f.mine] -= 1;
    const mine = f.mine === kind ? null : kind;
    if (mine) r[mine] += 1;
    return { ...f, reactions: r, mine };
  }) };
}
// ── 설정 ────────────────────────────────────────────────
export const setInstrument = (s, instrument) => ({ ...s, me: { ...s.me, instrument } });
export const setGoal = (s, goalMin) => ({ ...s, me: { ...s.me, goalMin: Math.max(0, Math.min(240, goalMin)) } });
// 하루 시작 시각을 바꾸면 "오늘"의 날짜 키(todayKey)가 바뀐다 — 고정 대본(buildSessions)은 이전
// todayKey를 기준으로 D-n 상대 오프셋을 계산해뒀던 것이라, todayKey만 바꾸고 sessions는 그대로 두면
// 대본이 하루 밀려 배지·달력 연속성이 깨진다(코덱스 리뷰 2026-09-07 High). 그래서 새 todayKey로 대본을
// 다시 만들되, 이번 체험에서 방문자가 실제로 저장한 세션(saveReflection이 매기는 `today-` 접두 id)은
// 대본이 아니므로 그대로 이어 붙인다. calendarMonth·selectedDay가 "이전 오늘"을 가리키고 있었을
// 때만 새 오늘로 옮긴다 — 방문자가 다른 달/날짜를 보고 있었다면 그 선택은 건드리지 않는다.
export const setDayStart = (s, h) => {
  const oldTodayKey = s.todayKey;
  const tk = calcToday(h, s.now);
  const liveSessions = s.sessions.filter((x) => x.id.startsWith('today-'));
  const sessions = [...buildSessions(tk), ...liveSessions];
  const selectedDay = s.selectedDay === oldTodayKey ? tk : s.selectedDay;
  const calendarMonth = s.calendarMonth === oldTodayKey.slice(0, 7) ? tk.slice(0, 7) : s.calendarMonth;
  return { ...s, me: { ...s.me, dayStartHour: h }, todayKey: tk, sessions, selectedDay, calendarMonth };
};
export const setWeekStart = (s, mon) => ({ ...s, me: { ...s.me, weekStartMon: mon } });
export const setLang = (s, lang) => ({ ...s, lang });
export const go = (s, screen) => ({ ...s, screen, sheet: null });
export const showToast = (s, key) => ({ ...s, toast: key });
export const openSheet = (s, sheet) => ({ ...s, sheet });
export const closeSheet = (s) => ({ ...s, sheet: null });
// ── 기록(달력) ──────────────────────────────────────────
// 월 이동 시 선택 날짜 초기화 — 앱의 moveMonth와 동일(선택은 이전 달 소속이라 무의미해짐).
export const setCalendarMonth = (s, ym) => ({ ...s, calendarMonth: ym, selectedDay: null });
// 같은 날을 다시 탭하면 선택 해제(토글) — 앱의 setSelected(isSelected ? null : d)와 동일.
export const selectDay = (s, key) => ({ ...s, selectedDay: key === s.selectedDay ? null : key });
// ── 파생 ────────────────────────────────────────────────
export const sessionsOf = (s, key) => s.sessions.filter((x) => x.dateKey === key);
export const todayMinutes = (s) => sessionsOf(s, s.todayKey).reduce((a, x) => a + x.practiceMin, 0);
export const practicedToday = (s) => sessionsOf(s, s.todayKey).length > 0;
export const myPose = (s) => (practicedToday(s) ? POSE_OF_INSTRUMENT[s.me.instrument] : 'walk');
export const coachTextOf = (session, lang) => session.coach ?? (session.coachKey ? COACH[lang].past[Number(session.coachKey.slice(4))] : undefined);
const minutesByDay = (s) => s.sessions.reduce((m, x) => ({ ...m, [x.dateKey]: (m[x.dateKey] ?? 0) + x.practiceMin }), {});
export function homeBadge(s) { // 앱 homeBadge의 스트릭·이번 주 규칙(20분/일). 과거의 오늘·복귀는 대본상 발생하지 않음
  const by = minutesByDay(s); const ok = (k) => (by[k] ?? 0) >= 20;
  let count = 0; let k = ok(s.todayKey) ? s.todayKey : addDays(s.todayKey, -1);
  while (ok(k)) { count += 1; k = addDays(k, -1); }
  if (count > 0) return { kind: 'streak', count };
  const wd = weekdayOf(s.todayKey); const start = addDays(s.todayKey, -((wd - (s.me.weekStartMon ? 1 : 0) + 7) % 7));
  let days = 0; for (let i = 0; i < 7; i += 1) if (ok(addDays(start, i))) days += 1;
  return days ? { kind: 'weekDays', count: days } : { kind: null, count: 0 };
}
export function monthCells(s, ym) {
  const by = minutesByDay(s); const [y, m] = ym.split('-').map(Number); const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => { const key = `${ym}-${String(i + 1).padStart(2, '0')}`; const min = by[key] ?? 0; return { key, minutes: min, level: min === 0 ? 0 : min < 20 ? 1 : min < 60 ? 2 : min < 120 ? 3 : 4 }; });
}
