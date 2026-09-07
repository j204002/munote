// demo/screens/friends.js — 친구 화면(연습실·배회·오늘 카드·반응·시트). FriendsScreen.tsx·PracticeRoom.tsx 이식.
// 좌표: SIZE=390 고정(다른 화면과 같은 pt 기준)에서 계산 후 calc(N * var(--pt))로 그린다(측정 불필요).
import { seedOf, initialSlots, nextTarget, facing, scaleFor, drawOrder, MIN_GAP } from '../wander.js';
import { toggleReaction, openSheet, myPose, todayMinutes } from '../state.js';
import { POSE_OF_INSTRUMENT, EMOJI } from '../data.js';
import { tabbar, esc, gate, sheet, asset } from '../ui.js';

const SIZE = 390;
const MUNI_W = 60;
const MUNI_H = 80;
const PLAY_SIZE = { play_piano: { w: 77, h: 72 }, play_strings: { w: 57, h: 78 }, play_winds: { w: 61, h: 78 }, play_vocal: { w: 45, h: 80 } };
const LYING_SIZE = { w: 90, h: 47 };
const WALK_SPEED_PT_PER_SEC = 28;
const BOB_PT = 3;
const BOB_STEP_MS = 260;
const REST_MIN_MS = 2000;
const REST_MAX_MS = 6000;
const REACTIONS = ['clap', 'fire', 'note'];
const REACTION_EMOJI = { clap: '👏', fire: '🔥', note: '🎵' };
const ADD_SIZE = 26; // AddFriendButton.tsx

const BOUNDS = { left: 16, right: SIZE - 16 - MUNI_W, top: Math.round(SIZE * 0.62) - MUNI_H, bottom: Math.round(SIZE * 0.86) - MUNI_H };

const isLying = (pose) => pose === 'lying_awake' || pose === 'lying_asleep';
const sizeOfPose = (pose) => (isLying(pose) ? LYING_SIZE : PLAY_SIZE[pose]);
const spriteForDir = (dir) => (dir === 'left' ? 'side_left' : dir === 'right' ? 'side_right' : dir === 'back' ? 'side_back' : 'front_neutral');

// 걷는 무니의 현재 위치·페이즈 — 재렌더에도 살아남게 모듈 전역에 둔다(reflection.js의 memoText와 같은 이유).
let walkerState = new Map();
let raf = null;

function roomPoseOf(s, id) {
  if (id === 'me') {
    const p = myPose(s);
    return p === 'walk' ? null : p;
  }
  const f = s.friends.find((x) => x.id === id);
  if (!f || f.pose === 'walk') return null;
  if (f.pose === 'play') return POSE_OF_INSTRUMENT[f.instrument];
  return f.pose; // lying_awake | lying_asleep
}

function computeStagePosed(posedIds, poseOf) {
  const usable = SIZE - 32;
  const gap = 8;
  const sizeOfId = (id) => sizeOfPose(poseOf(id));
  const widest = posedIds.reduce((m, id) => Math.max(m, sizeOfId(id).w), 0);
  const tallest = posedIds.reduce((m, id) => Math.max(m, sizeOfId(id).h), 0);
  let fit = 1;
  let cols = 1;
  for (const f of [1, 0.9, 0.8, 0.7, 0.6, 0.5]) {
    fit = f;
    cols = Math.max(1, Math.floor(usable / (widest * f + gap)));
    if (Math.ceil(posedIds.length / cols) <= 2) break;
  }
  const pitch = Math.round(tallest * fit + 6);
  const out = {};
  posedIds.forEach((id, i) => {
    const row = Math.floor(i / cols);
    const rowStart = row * cols;
    const rowCount = Math.min(cols, posedIds.length - rowStart);
    const cellW = usable / rowCount;
    const { w, h } = sizeOfId(id);
    const cx = 16 + cellW * (i - rowStart + 0.5);
    const footY = Math.round(SIZE * 0.84) - row * pitch;
    out[id] = { x: Math.round(cx - w / 2), y: Math.round(footY - h * fit - (h - h * fit) / 2) };
  });
  return { slots: out, fit };
}

function computeRoom(s) {
  const allIds = ['me', ...s.friends.map((f) => f.id)];
  const poseOf = (id) => roomPoseOf(s, id);
  const posedIds = allIds.filter((id) => poseOf(id) !== null);
  const walkerIds = allIds.filter((id) => poseOf(id) === null);
  const { slots: stagePosed, fit } = computeStagePosed(posedIds, poseOf);
  const initWalkerSlots = initialSlots(walkerIds.length, BOUNDS, seedOf(walkerIds.join('|')));
  return { allIds, poseOf, posedIds, walkerIds, stagePosed, fit, initWalkerSlots };
}

// initialSlots(앱 포트)는 걷는 무니끼리만 44pt를 지킨다 — 정지 상자와 겹칠 수 있다(QA 발견, wander.js는 안
// 건드림). bounds 격자에서 안 겹치는 가장 가까운 자리로 대체(못 찾으면 원래 자리 — 포트와 같은 "최선").
const boxesOverlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

function dodgePosed(slots, room) {
  const posed = room.posedIds.map((id) => ({ ...room.stagePosed[id], ...sizeOfPose(room.poseOf(id)) }));
  const out = [];
  slots.forEach((slot) => {
    const free = (p) => !posed.some((b) => boxesOverlap(p.x, p.y, MUNI_W, MUNI_H, b.x, b.y, b.w, b.h)) && out.every((o) => Math.hypot(o.x - p.x, o.y - p.y) >= MIN_GAP);
    if (free(slot)) {
      out.push(slot);
      return;
    }
    let best = slot;
    let bestDist = Infinity;
    for (let y = BOUNDS.top; y <= BOUNDS.bottom; y += 10) {
      for (let x = BOUNDS.left; x <= BOUNDS.right; x += 10) {
        if (!free({ x, y })) continue;
        const d = Math.hypot(x - slot.x, y - slot.y);
        if (d < bestDist) {
          bestDist = d;
          best = { x, y };
        }
      }
    }
    out.push(best);
  });
  return out;
}

const randRest = (now) => now + REST_MIN_MS + Math.random() * (REST_MAX_MS - REST_MIN_MS);
const newWalker = (id, slot, now) => ({ x: slot.x, y: slot.y, dir: 'front', phase: 'rest', restUntil: now + 400 + (seedOf(id) % 1500), seed: seedOf(id) });

function walkerPos(room, id) {
  const w = walkerState.get(id);
  if (w) return { x: w.x, y: w.y, dir: w.phase === 'walking' ? w.dir : 'front' };
  const i = room.walkerIds.indexOf(id);
  const slot = dodgePosed(room.initWalkerSlots, room)[i];
  return { x: slot.x, y: slot.y, dir: 'front' };
}

function feetYOf(room, id) {
  const pose = room.poseOf(id);
  if (pose !== null) return room.stagePosed[id].y + sizeOfPose(pose).h;
  return walkerPos(room, id).y + MUNI_H;
}

function nameOf(s, id) {
  return id === 'me' ? s.me.name : s.friends.find((f) => f.id === id).name;
}

function muniHtml(room, s, t, id, z) {
  const pose = room.poseOf(id);
  const isMe = id === 'me';
  const name = nameOf(s, id);
  const meMark = isMe ? '<span class="md-muni-mark" aria-hidden="true"></span>' : '';
  if (pose === null) {
    const pos = walkerPos(room, id);
    const sprite = spriteForDir(pos.dir);
    const scale = scaleFor(pos.y, BOUNDS);
    return `<button type="button" class="md-muni md-muni-walk${isMe ? ' me' : ''}" data-friend="${id}" data-sprite="${sprite}" style="z-index:${z};transform:translate(calc(${pos.x} * var(--pt)),calc(${pos.y} * var(--pt))) scale(${scale});" aria-label="${esc(name)}">
      ${meMark}
      <img src="${asset(`muni/${sprite}.png`)}" alt="" loading="lazy">
      <span class="md-muni-name">${esc(name)}</span>
    </button>`;
  }
  const slot = room.stagePosed[id];
  const size = sizeOfPose(pose);
  const scale = scaleFor(slot.y, BOUNDS) * room.fit;
  const stateKey = isLying(pose) ? (pose === 'lying_asleep' ? 'friends.a11y.asleep' : 'friends.a11y.lying') : 'friends.a11y.playing';
  const label = `${name} · ${t(stateKey)}`;
  return `<button type="button" class="md-muni md-muni-posed${isMe ? ' me' : ''}" data-friend="${id}" style="left:calc(${slot.x} * var(--pt));top:calc(${slot.y} * var(--pt));width:calc(${size.w} * var(--pt));z-index:${z};transform:scale(${scale});" aria-label="${esc(label)}">
    ${meMark}
    <img src="${asset(`muni/${pose}.png`)}" style="width:calc(${size.w} * var(--pt));height:calc(${size.h} * var(--pt));" alt="" loading="lazy">
    <span class="md-muni-name">${esc(name)}</span>
  </button>`;
}

function roomHtml(s, t) {
  const room = computeRoom(s);
  const order = drawOrder(room.allIds.map((id) => ({ id, feetY: feetYOf(room, id) })));
  const munis = order.map((id, i) => muniHtml(room, s, t, id, i + 1)).join('');
  return `<div class="md-room" style="background-image:url('${asset('room.png')}')">${munis}</div>`;
}

function reactionPillsHtml(f, t, variant) {
  return REACTIONS.map((k) => {
    const on = f.mine === k;
    const n = f.reactions[k] ?? 0;
    const word = t(`friends.react.${k}`);
    const label = n > 0 ? `${word} ${n}` : word;
    const text = variant === 'labelled' ? `${REACTION_EMOJI[k]} ${word}${n > 0 ? ` ${n}` : ''}` : `${REACTION_EMOJI[k]}${n > 0 ? ` ${n}` : ''}`;
    return `<button type="button" class="md-react-pill${variant === 'labelled' ? ' labelled' : ''}${on ? ' on' : ''}" data-react="${f.id}:${k}" aria-pressed="${on}" aria-label="${esc(label)}">${esc(text)}</button>`;
  }).join('');
}

function cardRowHtml(f, s, t) {
  const summary = `${t('reflection.minutes', { min: f.today.practiceMin })} · ${t('friends.feed.streak', { n: f.today.streak })} · ${t('friends.feed.weekDays', { n: f.today.weekDays })}`;
  return `<div class="md-friend-card">
    <button type="button" class="md-friend-card-main" data-friend="${f.id}">
      <img class="md-friend-card-muni" src="${asset('muni/front_neutral.png')}" alt="" loading="lazy">
      <span class="md-friend-card-tx">
        <span class="md-friend-card-name-row">
          <span class="md-friend-card-name">${esc(f.name)}</span>
          <span class="md-friend-card-emoji" aria-label="${esc(t(`instrument.${f.instrument}`))}">${EMOJI[f.instrument]}</span>
        </span>
        <span class="md-friend-card-sum">${esc(summary)}</span>
      </span>
    </button>
    <span class="md-friend-card-react">${reactionPillsHtml(f, t, 'compact')}</span>
  </div>`;
}

function feedHtml(s, t) {
  const todays = s.friends.filter((f) => f.today);
  if (todays.length === 0) return `<p class="md-friends-quiet">${esc(t('friends.quiet'))}</p>`;
  return `<p class="md-feed-label">${esc(t('friends.feed.label', { n: todays.length }))}</p>${todays.map((f) => cardRowHtml(f, s, t)).join('')}`;
}

function summaryGridHtml(t, today) {
  const cell = (v, label) => `<div class="md-sum-cell"><p class="md-sum-v">${v == null ? '–' : esc(v)}</p><p class="md-sum-l">${esc(label)}</p></div>`;
  return `<div class="md-sum-grid">
    ${cell(today ? t('reflection.minutes', { min: today.practiceMin }) : null, t('friends.feed.today'))}
    ${cell(today ? t('friends.feed.days', { n: today.streak }) : null, t('friends.feed.streakLabel'))}
    ${cell(today ? t('friends.feed.days', { n: today.weekDays }) : null, t('friends.feed.weekLabel'))}
  </div>`;
}

function friendSheetHtml(f, t) {
  const body = `<div class="md-sheet-friend">
    <img class="md-sheet-muni" src="${asset('muni/front_neutral.png')}" alt="" loading="lazy">
    <p class="md-sheet-name">${esc(f.name)}<span class="md-sheet-inst">${esc(t(`instrument.${f.instrument}`))}</span></p>
    ${summaryGridHtml(t, f.today)}
    <div class="md-sheet-react">${reactionPillsHtml(f, t, 'labelled')}</div>
    <div class="md-sheet-links">
      <button type="button" class="md-sheet-link" ${gate(t)}>${esc(t('friends.detail.remove'))}</button>
      <span class="md-sheet-dot"> · </span>
      <button type="button" class="md-sheet-link" ${gate(t)}>${esc(t('friends.detail.report'))}</button>
      <span class="md-sheet-dot"> · </span>
      <button type="button" class="md-sheet-link" ${gate(t)}>${esc(t('friends.detail.block'))}</button>
    </div>
  </div>`;
  return sheet(body, { label: f.name });
}

function meSheetHtml(s, t) {
  const min = todayMinutes(s);
  const body = `<div class="md-sheet-friend">
    <img class="md-sheet-muni" src="${asset('muni/front_neutral.png')}" alt="" loading="lazy">
    <p class="md-sheet-name">${esc(s.me.name)}<span class="md-sheet-inst">${esc(t(`instrument.${s.me.instrument}`))}</span></p>
    <div class="md-sum-grid"><div class="md-sum-cell"><p class="md-sum-v">${esc(t('reflection.minutes', { min }))}</p><p class="md-sum-l">${esc(t('friends.feed.today'))}</p></div></div>
  </div>`;
  return sheet(body, { label: s.me.name });
}

function sheetHtmlOf(s, t) {
  if (!s.sheet || s.sheet.kind !== 'friend') return '';
  if (s.sheet.id === 'me') return meSheetHtml(s, t);
  const f = s.friends.find((x) => x.id === s.sheet.id);
  return f ? friendSheetHtml(f, t) : '';
}

export const render = (s, t) => `<div class="screen md-friends">
    <div class="md-friends-header">
      <div class="md-friends-slot"></div>
      <p class="md-friends-title" role="heading">${esc(t('friends.title'))}</p>
      <button type="button" class="md-add-friend" aria-label="${esc(t('friends.addA11y'))}" ${gate(t, 'demo.addInApp')}><img src="${asset('add-friend.png')}" alt="" style="width:calc(${ADD_SIZE} * var(--pt));height:calc(${ADD_SIZE} * var(--pt));" loading="lazy"></button>
    </div>
    ${roomHtml(s, t)}
    <div class="md-body scroll"><div class="md-friends-feed">${feedHtml(s, t)}</div></div>
    ${tabbar(t, 'friends')}
    ${sheetHtmlOf(s, t)}
  </div>`;

export function rewire(root, ctx) {
  root.querySelectorAll('[data-react]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [id, kind] = btn.dataset.react.split(':');
      ctx.update((s) => toggleReaction(s, id, kind));
    });
  });
  root.querySelectorAll('[data-friend]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ctx.update((s) => openSheet(s, { kind: 'friend', id: btn.dataset.friend }));
    });
  });
}

export function bind(root, ctx) {
  walkerState = new Map();
  const s0 = ctx.store.get();
  const room0 = computeRoom(s0);
  const seeded0 = dodgePosed(room0.initWalkerSlots, room0);
  const now0 = performance.now();
  room0.walkerIds.forEach((id, i) => walkerState.set(id, newWalker(id, seeded0[i], now0)));
  rewire(root, ctx);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    return () => {
      walkerState = new Map();
    };
  }

  const otherSlotsFor = (room, excludeId) => {
    const out = room.posedIds.map((id) => room.stagePosed[id]);
    for (const id of room.walkerIds) {
      if (id === excludeId) continue;
      const w = walkerState.get(id);
      out.push(w ? { x: w.x, y: w.y } : room.initWalkerSlots[room.walkerIds.indexOf(id)]);
    }
    return out;
  };

  const step = (now) => {
    const s = ctx.store.get();
    const room = computeRoom(s);

    for (const id of room.walkerIds) {
      let w = walkerState.get(id);
      if (!w) {
        w = newWalker(id, room.initWalkerSlots[room.walkerIds.indexOf(id)], now);
        walkerState.set(id, w);
      }
      if (w.phase === 'rest') {
        if (now >= w.restUntil) {
          w.seed = (w.seed + 0x9e3779b9) >>> 0;
          const target = nextTarget({ x: w.x, y: w.y }, BOUNDS, otherSlotsFor(room, id), w.seed);
          const d = Math.hypot(target.x - w.x, target.y - w.y);
          if (d < 1) {
            w.restUntil = randRest(now);
          } else {
            w.dir = facing({ x: w.x, y: w.y }, target);
            w.phase = 'walking';
            w.from = { x: w.x, y: w.y };
            w.to = target;
            w.start = now;
            w.dur = Math.max(600, (d / WALK_SPEED_PT_PER_SEC) * 1000);
          }
        }
      } else {
        const frac = Math.min(1, (now - w.start) / w.dur);
        w.x = w.from.x + (w.to.x - w.from.x) * frac;
        w.y = w.from.y + (w.to.y - w.from.y) * frac;
        if (frac >= 1) {
          w.phase = 'rest';
          w.restUntil = randRest(now);
        }
      }
      const bobT = w.phase === 'walking' ? (now - w.start) % (BOB_STEP_MS * 2) : 0;
      const bob = w.phase === 'walking' ? (-BOB_PT * (1 - Math.cos((bobT / (BOB_STEP_MS * 2)) * Math.PI * 2))) / 2 : 0;
      const el = root.querySelector(`[data-friend="${id}"].md-muni-walk`);
      if (el) {
        const sprite = spriteForDir(w.phase === 'walking' ? w.dir : 'front');
        if (el.dataset.sprite !== sprite) {
          el.dataset.sprite = sprite;
          const img = el.querySelector('img');
          if (img) img.src = asset(`muni/${sprite}.png`);
        }
        el.style.transform = `translate(calc(${w.x} * var(--pt)),calc(${w.y + bob} * var(--pt))) scale(${scaleFor(w.y, BOUNDS)})`;
      }
    }

    const order = drawOrder(room.allIds.map((id) => ({ id, feetY: feetYOf(room, id) })));
    order.forEach((id, i) => {
      const el = root.querySelector(`[data-friend="${id}"]`);
      if (el) el.style.zIndex = String(i + 1);
    });

    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    walkerState = new Map();
  };
}
