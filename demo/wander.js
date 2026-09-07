// demo/wander.js — muniWander.ts 전체 이식(타입만 제거). 순수 로직, DOM 없음.
// 결정적: 같은 seed → 같은 배치·같은 목적점. 완벽한 충돌 회피는 안 함 — 44pt 간격을 최선으로.

export const MIN_GAP = 44;
export const STEP_MIN = 24;
export const STEP_MAX = 120;

/** 문자열 → 32비트 정수 시드 (FNV-1a) */
export function seedOf(id) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — 작은 결정적 난수 */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const minDist = (p, others) => others.reduce((m, o) => Math.min(m, dist(p, o)), Infinity);

/** 최소 간격을 지키는 초기 배치. 못 채우면 가장 먼 후보로 채운다(최선). */
export function initialSlots(count, b, seed) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    let best = null;
    let bestD = -1;
    for (let k = 0; k < 40; k += 1) {
      const c = { x: b.left + r() * (b.right - b.left), y: b.top + r() * (b.bottom - b.top) };
      const d = minDist(c, out);
      if (d >= MIN_GAP) {
        best = c;
        break;
      }
      if (d > bestD) {
        bestD = d;
        best = c;
      }
    }
    out.push(best ?? { x: b.left, y: b.top });
  }
  return out.map((s) => ({ x: Math.round(s.x * 10) / 10, y: Math.round(s.y * 10) / 10 }));
}

/** 다음 목적점: 24~120pt 거리, 경계 안, 다른 무니와 44pt 이상(최선) */
export function nextTarget(from, b, others, seed) {
  const r = rng(seed);
  let best = null;
  let bestD = -1;
  for (let k = 0; k < 20; k += 1) {
    const ang = r() * Math.PI * 2;
    const len = STEP_MIN + r() * (STEP_MAX - STEP_MIN);
    const c = { x: clamp(from.x + Math.cos(ang) * len, b.left, b.right), y: clamp(from.y + Math.sin(ang) * len * 0.6, b.top, b.bottom) };
    // 클램프로 거리가 줄었으면 최소 거리 미달 → 후보 제외 (경계에 붙어 있을 때만 예외적으로 허용)
    if (dist(from, c) < STEP_MIN) continue;
    const d = minDist(c, others);
    if (d >= MIN_GAP) return round(c);
    if (d > bestD) {
      bestD = d;
      best = c;
    }
  }
  if (best) return round(best);
  // 경계 구석에서 후보가 전부 24pt 미만이면 안쪽으로 한 걸음
  const cx = (b.left + b.right) / 2;
  const cy = (b.top + b.bottom) / 2;
  const dx = cx - from.x;
  const dy = cy - from.y;
  const n = Math.hypot(dx, dy) || 1;
  return round({ x: from.x + (dx / n) * STEP_MIN, y: from.y + (dy / n) * STEP_MIN });
}

function round(s) {
  return { x: Math.round(s.x * 10) / 10, y: Math.round(s.y * 10) / 10 };
}

/** 이동 방향 → 스프라이트. 화면 아래(y 증가)로 오면 앞모습, 위로 가면 뒷모습. */
export function facing(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'front' : 'back';
}

/** 원근: 뒤(top) 0.8 → 앞(bottom) 1.0 */
export function scaleFor(y, b) {
  const t = b.bottom === b.top ? 1 : clamp((y - b.top) / (b.bottom - b.top), 0, 1);
  return 0.8 + 0.2 * t;
}

/**
 * 그리기 순서 — 발끝(feetY)이 위(작은 값)인 무니를 먼저 그려 앞에 있는 무니가 위 레이어가 되게 한다.
 * 걷는 무니·정지 무니를 한 목록으로 섞어 정렬한다. 같은 값이면 원래 순서 유지(안정 정렬).
 */
export function drawOrder(items) {
  return items
    .map((it, i) => ({ ...it, i }))
    .sort((a, b) => a.feetY - b.feetY || a.i - b.i)
    .map((it) => it.id);
}
