// demo/screens/home.js — 홈 화면. HomeScreen.tsx의 레이아웃·크기를 --pt 스케일로 그대로 옮긴다.
import { startFocus, todayMinutes, homeBadge } from '../state.js';
import { tabbar, esc, asset } from '../ui.js';

const NUDGE_DELAY_MS = 5000;

function todayValueText(t, min) {
  return min >= 60
    ? t('duration.hourMin', { h: Math.floor(min / 60), m: min % 60 })
    : t('duration.minOnly', { m: min });
}

function badgeText(t, badge) {
  if (badge.kind === 'streak') return t('home.streak', { count: badge.count });
  if (badge.kind === 'weekDays') return t('home.weekDays', { count: badge.count });
  return null;
}

export const render = (s, t) => {
  const min = todayMinutes(s);
  const goalMin = s.me.goalMin;
  const goalPct = goalMin ? Math.min(100, Math.round((min / goalMin) * 100)) : null;
  const badge = homeBadge(s);
  const badgeLabel = badgeText(t, badge);
  return `<div class="screen md-home">
    <div class="md-home-content">
      <div class="md-home-header">
        <img class="md-wordmark" src="${asset('wordmark.png')}" alt="MU:note" loading="lazy">
        <button type="button" class="md-gear" data-go="settings" aria-label="${esc(t('tabs.settings'))}"><img src="${asset('gear.png')}" alt="" loading="lazy"></button>
      </div>
      <div class="md-home-summary-area">
        <div class="md-home-summary">
          <p class="md-today-label">${esc(t('home.todayLabel'))}</p>
          <p class="md-today-value">${esc(todayValueText(t, min))}</p>
          ${goalPct !== null ? `<div class="md-goal-row">
            <div class="md-goal-track"><div class="md-goal-fill" style="width:${goalPct}%"></div></div>
            <p class="md-goal-text">${esc(t('home.goalPct', { pct: goalPct }))}</p>
          </div>` : ''}
          ${badgeLabel !== null ? `<div class="md-home-badge"><p>${esc(badgeLabel)}</p></div>` : ''}
        </div>
      </div>
      <button type="button" class="md-btn-start" data-start>${esc(t('home.start'))}</button>
      <p class="md-no-mic">${esc(t('demo.noMic'))}</p>
    </div>
    ${tabbar(t, 'home')}
  </div>`;
};

export const bind = (root, ctx) => {
  let timer = null;
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    timer = setTimeout(() => {
      root.querySelector('.md-btn-start')?.classList.add('md-nudge');
    }, NUDGE_DELAY_MS);
  }
  rewire(root, ctx);
  return () => clearTimeout(timer);
};

export const rewire = (root, ctx) => {
  root.querySelector('[data-start]')?.addEventListener('click', () => ctx.update(startFocus));
};
