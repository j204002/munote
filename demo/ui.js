// demo/ui.js — 공용 조각. HTML 문자열만 만든다(이벤트는 각 화면 bind에서).
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const tabbar = (t, active) => `<nav class="md-tabbar" aria-label="tabs">${['home', 'records', 'friends'].map((k) => `<button type="button" data-go="${k}" ${active === k ? 'aria-current="page"' : ''}>${esc(t(`tabs.${k}`))}</button>`).join('')}</nav>`;
export const pill = (label, { selected = false, has = false, data = '' } = {}) => `<button type="button" class="md-pill${selected ? ' selected' : ''}${has ? ' has' : ''}" ${data}>${esc(label)}</button>`;
// label: 시트 role="dialog"의 접근 가능한 이름(aria-label) — 친구 이름·"MU:note의 한마디"(내 시트)·
// 설정 항목 라벨처럼 시트마다 무엇을 여는지 스크린리더에 알려준다. tabindex="-1"은 시트 안에 포커스를
// 받을 버튼이 하나도 없을 때(내 무니 시트) demo.js가 시트 자체로 포커스를 옮길 수 있게 해준다.
export const sheet = (bodyHtml, { label } = {}) => `<div class="md-sheet-overlay" data-close-sheet><div class="md-sheet" role="dialog" aria-modal="true" aria-label="${esc(label ?? '')}" tabindex="-1"><div class="md-grab"></div>${bodyHtml}</div></div>`;
export const gate = (t, key = 'demo.inApp') => `data-gate="${key}"`; // 막힌 동작에 붙이면 demo.js가 토스트로 처리
export const asset = (name) => new URL(`./assets/${name}`, import.meta.url).href; // 페이지 경로와 무관하게 항상 demo/assets 기준
