// demo/screens/home.js — 임시 최소: 헤더 + 시작 버튼 (+ 공용 탭바)
import { startFocus } from '../state.js';
import { tabbar, esc } from '../ui.js';

export const render = (s, t) => `<div class="screen screen-ph"><div class="md-body"><button type="button" class="md-btn-primary" data-start>${esc(t('home.start'))}</button></div>${tabbar(t, 'home')}</div>`;

export const bind = (root, ctx) => {
  root.querySelector('[data-start]')?.addEventListener('click', () => ctx.update(startFocus));
};
