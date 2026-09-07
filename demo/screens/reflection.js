// demo/screens/reflection.js — 회고 화면. ReflectionScreen.tsx의 레이아웃·크기를 --pt 스케일로 그대로 옮긴다.
// 앱과 달리: 곡은 PIECES 4개 고정(추가/보관 없음), 유형은 다중선택, 메모는 텍스트 하나(목록 아님), to-do 없음.
import { saveReflection } from '../state.js';
import { PIECES, TYPES } from '../data.js';
import { esc } from '../ui.js';

// REFLECTION_TYPE_ROWS(practice-app/lib/practiceTypes.ts)에서 ensemble(데모 TYPES에 없음)만 뺀 2줄 구성.
const TYPE_ROWS = [
  ['scale', 'technique', 'sightReading', 'section'],
  ['runThrough', 'memorization', 'detail'],
];

// state.js의 saveReflection과 동일한 floor(최소 1분) 규칙 — export되어 있지 않아 그대로 옮겨 씀.
const minsOf = (sec) => (sec > 0 ? Math.max(1, Math.floor(sec / 60)) : 0);

// 화면 로컬 상태(스토어를 거치지 않음): 메모는 재렌더로 커서가 튀는 걸 막기 위해,
// pending/revealed/타이머는 저장→한마디 fade-in→홈 전환의 진행 상태를 들고 있기 위해 모듈 변수로 둔다.
let memoOpen = false;
let memoText = '';
let pending = null; // null | { coach: string } | { short: true }
let revealed = false;
let fadeTimer = null;
let homeTimer = null;

function resetLocal() {
  memoOpen = false;
  memoText = '';
  pending = null;
  revealed = false;
  clearTimeout(fadeTimer);
  clearTimeout(homeTimer);
  fadeTimer = null;
  homeTimer = null;
}

// 순수 헬퍼(테스트 대상) — fade-in 클래스는 render()에서 필요할 때 문자열에 덧붙인다.
export function coachCardHtml(t, text) {
  return `<div class="md-coach-card" data-coach><p class="md-coach-label">${esc(t('reflection.coachLabel'))}</p><p class="md-coach-text">”${esc(text)}”</p></div>`;
}

// 순수 헬퍼(테스트 대상) — 저장 직후 상태에서 방금 저장된 세션을 반환.
// 같은 dateKey 내 다중 세션을 지원하므로 find() 대신 at(-1)을 사용.
export function justSavedSession(next) {
  return next.sessions.at(-1);
}

export const render = (s, t) => {
  const f = s.focus;
  const minutes = minsOf(f.elapsedSec);
  const elapsed = minsOf(f.wallSec ?? f.elapsedSec);
  const showCoach = minutes >= 20;
  const disabledAttr = pending ? ' disabled' : '';

  let noteHtml = '';
  if (showCoach && pending && pending.coach) {
    let card = coachCardHtml(t, pending.coach);
    if (revealed) card = card.replace('md-coach-card', 'md-coach-card md-fade-in');
    noteHtml = card;
  } else if (!showCoach) {
    noteHtml = `<p class="md-reflection-shortnote">${esc(t('reflection.shortNote'))}</p>`;
  }
  const sectionAfterCoach = showCoach && pending && pending.coach ? ' after-coach' : '';

  const pieceChips = PIECES.map((p) => {
    const selected = s.draft.pieces.includes(p);
    return `<button type="button" class="md-piece-chip${selected ? ' selected' : ''}" data-piece="${esc(p)}" aria-pressed="${selected}"${disabledAttr}>${esc(p)}</button>`;
  }).join('');

  const typeRows = TYPE_ROWS.map((row) => `<div class="md-type-row">${row.map((key) => {
    const selected = s.draft.types.includes(key);
    return `<button type="button" class="md-type-chip${selected ? ' selected' : ''}" data-type="${esc(key)}" aria-pressed="${selected}"${disabledAttr}>${esc(t(`practiceType.${key}`))}</button>`;
  }).join('')}</div>`).join('');

  const memoBlock = memoOpen
    ? `<p class="md-reflection-section">${esc(t('reflection.memosSection'))}</p>
      <textarea class="md-reflection-textarea" data-memo placeholder="${esc(t('reflection.memoAddPlaceholder'))}"${disabledAttr}>${esc(memoText)}</textarea>`
    : `<button type="button" class="md-memo-toggle" data-memo-toggle${disabledAttr}>+ ${esc(t('reflection.memosSection'))}</button>`;

  return `<div class="screen md-reflection">
    <div class="md-reflection-content">
      <p class="md-reflection-h1">${esc(t('reflection.title'))}</p>
      <div class="md-reflection-head">
        <p class="md-reflection-big">${esc(t('reflection.minutes', { min: minutes }))}</p>
        <div class="md-reflection-metacol">
          <p class="md-reflection-meta">${esc(t('reflection.metaLine1', { elapsed, focus: f.focusPct }))}</p>
          <p class="md-reflection-meta">${esc(t('reflection.metaLine2', { pause: f.pauseCount }))}</p>
        </div>
      </div>
      ${noteHtml}
      <p class="md-reflection-section${sectionAfterCoach}">${esc(t('reflection.piecesSection'))}</p>
      <div class="md-reflection-chipwrap">${pieceChips}</div>
      <p class="md-reflection-section">${esc(t('reflection.typesSection'))}</p>
      ${typeRows}
      ${memoBlock}
      <button type="button" class="md-reflection-done" data-save${disabledAttr}>${esc(t('reflection.done'))}</button>
    </div>
  </div>`;
};

// bind: 회고 화면에 들어올 때마다 로컬 상태를 깨끗이 하고, 나갈 때(cleanup)도 정리한다(타이머 포함).
export function bind(root, ctx) {
  resetLocal();
  rewire(root, ctx);
  return () => resetLocal();
}

export function rewire(root, ctx) {
  root.querySelectorAll('[data-piece]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (pending) return;
      const name = btn.dataset.piece;
      ctx.update((s) => {
        const has = s.draft.pieces.includes(name);
        return { ...s, draft: { ...s.draft, pieces: has ? s.draft.pieces.filter((x) => x !== name) : [...s.draft.pieces, name] } };
      });
    });
  });
  root.querySelectorAll('[data-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (pending) return;
      const key = btn.dataset.type;
      ctx.update((s) => {
        const has = s.draft.types.includes(key);
        return { ...s, draft: { ...s.draft, types: has ? s.draft.types.filter((x) => x !== key) : [...s.draft.types, key] } };
      });
    });
  });
  root.querySelector('[data-memo-toggle]')?.addEventListener('click', () => {
    if (pending) return;
    memoOpen = true;
    ctx.update((s) => s); // 재렌더만 유도 — draft.memo는 저장 시점에 반영(커서 유지)
  });
  root.querySelector('[data-memo]')?.addEventListener('input', (e) => {
    memoText = e.target.value; // 스토어를 거치지 않는다 — 매 키 입력마다 전체 재렌더되면 커서가 튄다
  });
  root.querySelector('[data-save]')?.addEventListener('click', () => {
    if (pending) return; // 연속 탭 가드 — 세션을 두 번 만들지 않는다
    const s = ctx.store.get();
    const draft = { ...s.draft, memo: memoText };
    const next = saveReflection({ ...s, draft }, s.lang);
    const saved = justSavedSession(next);
    const coach = saved?.coach;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (coach) {
      pending = { coach };
      revealed = reduced; // 동작 축소 선호 시 지연 없이 바로 보임
      ctx.update((x) => x);
      const fadeDelay = reduced ? 0 : 1000;
      fadeTimer = setTimeout(() => {
        revealed = true;
        root.querySelector('[data-coach]')?.classList.add('md-fade-in');
      }, fadeDelay);
      homeTimer = setTimeout(() => ctx.update(() => next), fadeDelay + 1600);
    } else {
      pending = { short: true };
      ctx.update((x) => x);
      homeTimer = setTimeout(() => ctx.update(() => next), 1200);
    }
  });
}
