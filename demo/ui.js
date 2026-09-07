// demo/ui.js — 공용 조각. HTML 문자열만 만든다(이벤트는 각 화면 bind에서).
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const tabbar = (t, active) => `<nav class="md-tabbar" aria-label="tabs">${['home', 'records', 'friends'].map((k) => `<button type="button" data-go="${k}" ${active === k ? 'aria-current="page"' : ''}>${esc(t(`tabs.${k}`))}</button>`).join('')}</nav>`;
export const pill = (label, { selected = false, has = false, data = '' } = {}) => `<button type="button" class="md-pill${selected ? ' selected' : ''}${has ? ' has' : ''}" ${data}>${esc(label)}</button>`;
export const sheet = (bodyHtml) => `<div class="md-sheet-overlay" data-close-sheet><div class="md-sheet" role="dialog" aria-modal="true"><div class="md-grab"></div>${bodyHtml}</div></div>`;
export const gate = (t, key = 'demo.inApp') => `data-gate="${key}"`; // 막힌 동작에 붙이면 demo.js가 토스트로 처리
