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
  let lastScreen = null;
  let lastLang = null;
  let toastTimer = null;
  let sheetKeydownHandler = null;
  function render(s) {
    const scr = SCREENS[s.screen];
    // 같은 화면·같은 언어로 다시 그려지는 경우에만 patch()로 텍스트만 갱신해볼 수 있다(예: 집중모드 매초 틱).
    // 언어가 바뀐 직후의 첫 render는 reload()가 T를 이미 새 언어로 바꿔놓고 호출하므로, lastLang이 아직
    // 예전 언어라 여기서 걸러진다 — patch는 텍스트 몇 군데만 갱신하므로 나머지(고정 문구) 재번역을 놓친다.
    const canTryPatch = lastScreen === s.screen && lastLang === T.lang && typeof scr.patch === 'function';
    const patched = canTryPatch && scr.patch(mount, s, T.t);
    if (!patched) {
      mount.innerHTML = scr.render(s, T.t);
      if (lastScreen !== s.screen) {
        cleanup?.();
        cleanup = scr.bind(mount, ctx) ?? null;
      } else {
        scr.rewire?.(mount, ctx);
      }
      mount.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => ctx.update((x) => go(x, b.dataset.go))));
      mount.querySelectorAll('[data-gate]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); ctx.update((x) => showToast(x, b.dataset.gate)); }));
      mount.querySelectorAll('[data-close-sheet]').forEach((o) => o.addEventListener('click', (e) => { if (e.target === o) ctx.update((x) => ({ ...x, sheet: null })); }));
    }
    // patched 경로에서는 DOM 노드가 그대로라 위 리스너들도 그대로 유효하다 — 다시 걸면 같은 노드에 중복으로 쌓인다.
    lastScreen = s.screen;
    lastLang = T.lang;
    if (s.toast) {
      toastEl.innerHTML = `${T.t(s.toast)}<a href="https://apps.apple.com/app/id6800597794" target="_blank" rel="noopener">${T.t('demo.appStore')}</a>`;
      toastEl.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toastEl.classList.remove('on'); store.set({ ...store.get(), toast: null }); }, 2000);
    }
    // 시트가 열려 있는 동안만 Escape로 닫는 document 리스너를 하나 유지한다(시트 없으면 바로 뗀다).
    if (s.sheet) {
      if (!sheetKeydownHandler) {
        sheetKeydownHandler = (e) => { if (e.key === 'Escape') ctx.update((x) => ({ ...x, sheet: null })); };
        document.addEventListener('keydown', sheetKeydownHandler);
      }
      const sheetEl = mount.querySelector('.md-sheet');
      // 내 무니 시트처럼 안에 버튼이 하나도 없으면(포커스 받을 대상 없음) 시트 컨테이너 자체로
      // 포커스를 옮긴다(ui.js의 sheet()가 tabindex="-1"을 준 이유) — 이름 없는 모달로 남지 않게.
      if (sheetEl && !sheetEl.contains(document.activeElement)) (sheetEl.querySelector('button') ?? sheetEl).focus();
    } else if (sheetKeydownHandler) {
      document.removeEventListener('keydown', sheetKeydownHandler);
      sheetKeydownHandler = null;
    }
  }
  store.subscribe((s) => { if (s.lang !== T.lang) { ctx.reload(s.lang); return; } render(s); });
  render(store.get());
  window.__munoteDemo = { store };
}
