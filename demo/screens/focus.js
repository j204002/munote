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
export function rewire(root, ctx) {
  root.querySelector('[data-stop]')?.addEventListener('click', () => ctx.update((s) => (s.focus.paused ? resumeFocus(s) : stopFocus(s))));
  root.querySelector('[data-end]')?.addEventListener('click', () => ctx.update(endFocus));
  root.querySelector('[data-skip]')?.addEventListener('click', () => ctx.update(skipFocus));
}
