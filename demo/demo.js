// demo/demo.js
import { loadLocale } from './i18n.js';
import { createStore, go, showToast, setLang } from './state.js';
import { esc } from './ui.js';
import * as home from './screens/home.js';
import * as focus from './screens/focus.js';
import * as reflection from './screens/reflection.js';
import * as records from './screens/records.js';
import * as friends from './screens/friends.js';
import * as settings from './screens/settings.js';

const SCREENS = { home, focus, reflection, records, friends, settings };
const root = document.getElementById('munote-demo');

if (root) {
  const lang = root.dataset.lang || 'ko';
  const store = createStore();
  store.set(setLang(store.get(), lang));
  let T = await loadLocale(lang);
  root.innerHTML = `<div class="md-phone"><span class="md-ribbon">${esc(T.t('demo.ribbon'))}</span><div class="md-screen"><div class="md-mount"></div><div class="md-toast" role="status"></div></div></div><p class="md-hint">${T.t('demo.hint')}</p>`;
  const mount = root.querySelector('.md-mount');
  const toastEl = root.querySelector('.md-toast');
  const ctx = {
    store,
    get t() { return T.t; },
    update: (fn) => store.set(fn(store.get())),
    reload: async (l) => {
      T = await loadLocale(l);
      root.querySelector('.md-ribbon').textContent = T.t('demo.ribbon');
      root.querySelector('.md-hint').innerHTML = T.t('demo.hint');
      render(store.get());
    },
  };
  let cleanup = null;
  let toastTimer = null;
  function render(s) {
    cleanup?.();
    const scr = SCREENS[s.screen];
    mount.innerHTML = scr.render(s, T.t);
    cleanup = scr.bind(mount, ctx) ?? null;
    mount.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => ctx.update((x) => go(x, b.dataset.go))));
    mount.querySelectorAll('[data-gate]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); ctx.update((x) => showToast(x, b.dataset.gate)); }));
    mount.querySelectorAll('[data-close-sheet]').forEach((o) => o.addEventListener('click', (e) => { if (e.target === o) ctx.update((x) => ({ ...x, sheet: null })); }));
    if (s.toast) {
      toastEl.innerHTML = `${T.t(s.toast)}<a href="https://apps.apple.com/app/id6800597794" target="_blank" rel="noopener">${T.t('demo.appStore')}</a>`;
      toastEl.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toastEl.classList.remove('on'); store.set({ ...store.get(), toast: null }); }, 2000);
    }
  }
  store.subscribe((s) => { if (s.lang !== T.lang) { ctx.reload(s.lang); return; } render(s); });
  render(store.get());
  window.__munoteDemo = { store };
}
