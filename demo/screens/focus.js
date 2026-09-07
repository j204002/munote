// demo/screens/focus.js — 집중모드 화면. FocusScreen.tsx의 레이아웃·크기를 --pt 스케일로 그대로 옮긴다.
// 소리를 듣지 않는 체험판이므로 판정 로직은 없다 — 화면은 오직 state.js의 대본(FOCUS_TIMELINE)만 보여준다.
import { stopFocus, resumeFocus, skipFocus, endFocus, tickFocus } from '../state.js';
import { esc } from '../ui.js';

const fmt = (sec) => {
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

const SYMBOL_OF_PHASE = { sounding: '●', grace: '◌', paused: '○' };

export const render = (s, t) => {
  const f = s.focus;
  const symbol = SYMBOL_OF_PHASE[f.phase] ?? '●';
  const wallSec = f.wallSec ?? f.elapsedSec;
  return `<div class="screen md-focus">
    <div class="md-focus-content">
      <p class="md-focus-state">${symbol} ${esc(t(`focus.state.${f.phase}`))}</p>
      <p class="md-focus-instrument">${esc(t(`instrument.${s.me.instrument}`))}</p>
      <p class="md-focus-timer">${fmt(f.elapsedSec)}</p>
      <p class="md-focus-sub">${esc(t('focus.meta', { elapsed: fmt(wallSec), count: f.pauseCount }))}</p>
      <p class="md-focus-mic">${esc(t('demo.noMic'))}</p>
      <p class="md-focus-noise">${esc(t('focus.noiseHint'))}</p>
      <button type="button" class="md-skip" data-skip>${esc(t('demo.skip'))}</button>
      <div class="md-focus-controls">
        <button type="button" class="md-stop-btn" data-stop>${esc(t(f.paused ? 'focus.resume' : 'focus.stop'))}</button>
        <button type="button" class="md-end-btn" data-end>${esc(t('focus.end'))}</button>
      </div>
    </div>
  </div>`;
};

// bind: 화면에 처음 들어올 때 한 번 — 1초 틱 타이머를 설치하고 버튼을 연결한다.
export function bind(root, ctx) {
  const id = setInterval(() => ctx.update((s) => tickFocus(s)), 1000);
  rewire(root, ctx);
  return () => clearInterval(id);
}

// rewire: 같은 화면에서 다시 그려질 때마다(매초 틱 포함) 버튼 이벤트만 새로 건다.
// patch()가 대신 처리하는 매초 틱 경로에서는 더 이상 호출되지 않는다 — DOM 노드가 그대로라 리스너도 그대로 유효하다.
export function rewire(root, ctx) {
  root.querySelector('[data-stop]')?.addEventListener('click', () => ctx.update((s) => (s.focus.paused ? resumeFocus(s) : stopFocus(s))));
  root.querySelector('[data-end]')?.addEventListener('click', () => ctx.update(endFocus));
  root.querySelector('[data-skip]')?.addEventListener('click', () => ctx.update(skipFocus));
}

// patch: 같은 화면(집중모드)에 같은 언어로 다시 그려질 때(매초 틱 포함) innerHTML을 통째로 갈아엎지 않고
// 텍스트만 바꾼다 — 매초 DOM 노드를 새로 만들면 Stop 버튼에 준 키보드 포커스가 매번 날아간다(버그 C).
// 구조가 바뀌는 상태(시트·토스트 등)는 이 화면에 없으므로 항상 이 다섯 노드만 갱신하면 충분하다.
// 노드가 하나라도 없으면(예: 화면이 완전히 새로 만들어져야 하는 경우) false를 반환해 demo.js가 통째로 다시 그리게 한다.
export function patch(root, s, t) {
  const f = s.focus;
  const stateEl = root.querySelector('.md-focus-state');
  const timerEl = root.querySelector('.md-focus-timer');
  const subEl = root.querySelector('.md-focus-sub');
  const stopBtn = root.querySelector('[data-stop]');
  if (!stateEl || !timerEl || !subEl || !stopBtn) return false;
  const symbol = SYMBOL_OF_PHASE[f.phase] ?? '●';
  stateEl.textContent = `${symbol} ${t(`focus.state.${f.phase}`)}`;
  stateEl.className = `md-focus-state md-phase-${f.phase}`;
  timerEl.textContent = fmt(f.elapsedSec);
  const wallSec = f.wallSec ?? f.elapsedSec;
  subEl.textContent = t('focus.meta', { elapsed: fmt(wallSec), count: f.pauseCount });
  stopBtn.textContent = t(f.paused ? 'focus.resume' : 'focus.stop');
  return true;
}
