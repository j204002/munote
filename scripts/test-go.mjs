// QR 넘김 페이지(go/index.html) 검사 — node scripts/test-go.mjs
// 인쇄물(포스터 등) QR을 찍은 폰을 스토어로 바로 보낸다: 아이폰 → App Store, 안드로이드 → Google Play, 그 밖 → 랜딩.
// 넘기기 직전에 "이 QR로 몇 명 왔나"를 한 번 센다(명함 QR과 같은 유입 표시 규칙: utm_source · utm_medium=qr · utm_campaign).
// 페이지 안의 // <pick> … // </pick> 구역 함수들을 꺼내 브라우저 없이 본다.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');
const html = read('../go/index.html');
const m = html.match(/\/\/ <pick>([\s\S]*?)\/\/ <\/pick>/);
assert.ok(m, 'go/index.html에 // <pick> … // </pick> 구역이 있어야 한다');
const { IOS, ANDROID_BASE, kindOf, utmOf, pickTarget, buildPayload } = new Function(
  `${m[1]}; return { IOS, ANDROID_BASE, kindOf, utmOf, pickTarget, buildPayload };`
)();

const Q = '?utm_source=poster&utm_medium=qr&utm_campaign=munote_poster_2026';
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneKakao: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 11.2.0',
  ipadDesktopUA: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  galaxy: 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  galaxySamsungBrowser: 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

let n = 0;
const eq = (got, want, name) => { assert.deepEqual(got, want, name); n++; };
const ok = (cond, name) => { assert.ok(cond, name); n++; };

// ── 스토어 주소는 랜딩 첫 화면 버튼과 같은 앱 ──
const index = read('../index.html');
ok(index.includes('https://apps.apple.com/app/id6800597794'), '랜딩의 App Store 주소가 바뀌었다 — go도 같이 볼 것');
ok(index.includes('https://play.google.com/store/apps/details?id=com.musu.munote'), '랜딩의 Google Play 주소가 바뀌었다 — go도 같이 볼 것');
eq(IOS, 'https://apps.apple.com/app/id6800597794', 'App Store 주소');
eq(ANDROID_BASE, 'https://play.google.com/store/apps/details?id=com.musu.munote', 'Google Play 주소');

// ── 폰 종류 ──
eq(kindOf(UA.iphone, 5), 'ios', '아이폰 사파리');
eq(kindOf(UA.iphoneKakao, 5), 'ios', '아이폰 카카오톡 안 브라우저');
eq(kindOf(UA.ipadDesktopUA, 5), 'ios', '아이패드(맥처럼 보이는 UA + 터치)');
eq(kindOf(UA.galaxy, 5), 'android', '갤럭시 크롬');
eq(kindOf(UA.galaxySamsungBrowser, 5), 'android', '갤럭시 삼성 인터넷');
eq(kindOf(UA.mac, 0), 'web', '맥');
eq(kindOf(UA.windows, 10), 'web', '터치 되는 윈도우 노트북(아이패드로 오인 금지)');
eq(kindOf('', 0), 'web', '알 수 없는 기기');

// ── 유입 표시 읽기: utm_ 네 가지만, 안전한 글자만 ──
eq(utmOf(Q), { utm_source: 'poster', utm_medium: 'qr', utm_campaign: 'munote_poster_2026' }, '포스터 표시');
eq(utmOf(Q + '&utm_content=hakwon_01&x=1'), { utm_source: 'poster', utm_medium: 'qr', utm_campaign: 'munote_poster_2026', utm_content: 'hakwon_01' }, '학원별 표시(utm_content) · 다른 값은 버림');
eq(utmOf('?utm_source=<script>&utm_medium=qr'), { utm_medium: 'qr' }, '이상한 글자가 든 값은 버린다');
eq(utmOf('?utm_source=' + 'a'.repeat(61)), {}, '너무 긴 값은 버린다');
eq(utmOf(''), {}, '표시 없음');

// ── 어디로 보내나 ──
eq(pickTarget('ios', Q), IOS, '아이폰 → App Store');
eq(
  pickTarget('android', Q),
  ANDROID_BASE + '&referrer=utm_source%3Dposter%26utm_medium%3Dqr%26utm_campaign%3Dmunote_poster_2026',
  '안드로이드 → Google Play(포스터 표시가 플레이 콘솔까지 간다)'
);
eq(pickTarget('android', ''), ANDROID_BASE, '표시 없이 온 안드로이드 → Google Play');
eq(pickTarget('web', Q), '../' + Q, '컴퓨터 → 랜딩(표시 그대로 — 랜딩이 센다)');
eq(pickTarget('web', ''), '../', '표시 없는 컴퓨터 → 랜딩');
eq(pickTarget('web', '?utm_source=poster&next=//evil.example'), '../?utm_source=poster', '랜딩으로는 utm 표시만 넘긴다');

// ── 한 번 세기: 넘기기 직전에 보내는 기록 ──
const p = buildPayload('android', Q, 'dev-1', 1700000000000);
eq(p.events.length, 1, '기록은 한 줄');
const ev = p.events[0];
eq(ev.event_type, 'qr_opened', '이벤트 이름');
eq(ev.device_id, 'dev-1', '기기 번호');
eq(ev.time, 1700000000000, '시각');
eq(ev.platform, 'QR', "랜딩 방문자(Web)·앱(iOS·Android) 어느 숫자에도 안 섞이게 따로 'QR'");
eq(ev.os_name, 'Android', '폰 종류');
eq(ev.event_properties, { utm_source: 'poster', utm_medium: 'qr', utm_campaign: 'munote_poster_2026', store: 'google_play' }, '포스터 표시 + 어느 스토어로 보냈나');
eq(buildPayload('ios', Q, 'd', 1).events[0].event_properties.store, 'app_store', '아이폰은 app_store');
eq(buildPayload('ios', Q, 'd', 1).events[0].os_name, 'iOS', '아이폰 os');
ok(typeof p.api_key === 'string' && index.includes(p.api_key), '랜딩 첫 화면과 같은 Amplitude 프로젝트');
ok(typeof ev.insert_id === 'string' && ev.insert_id.length > 0, '같은 기록이 두 번 가도 한 번만 세게 하는 번호');
ok(!JSON.stringify(p).match(/Mozilla|Safari/), '브라우저 정보 원문은 보내지 않는다');

// ── 페이지 규칙 ──
ok(/<meta name="robots" content="noindex/.test(html), '검색에 안 잡힘(noindex)');
ok(!read('../sitemap.xml').includes('/munote/go'), 'sitemap에 없음');
ok(/\[hidden\]\s*\{\s*display:\s*none\s*!important/.test(html), '숨긴 버튼이 실제로 안 보인다(a{display:block}이 hidden을 이기지 못하게)');
ok(html.includes('href="' + IOS + '"'), 'App Store 버튼(넘김이 막혔을 때)');
ok(html.includes('href="' + ANDROID_BASE + '"'), 'Google Play 버튼(넘김이 막혔을 때)');
ok(/id="moving"[^>]*hidden/.test(html), '"이동하는 중" 글은 넘길 수 있을 때만 보인다(스크립트가 꺼진 폰에서 영영 떠 있지 않게)');
ok(!/amplitude-min|cdn\.jsdelivr/.test(html), '무거운 분석 프로그램을 불러오지 않는다(넘김이 늦어진다)');
ok(!/setTimeout\(\s*go\s*,\s*1[0-9]{3}/.test(html), '1초 넘게 기다리지 않는다');
ok(!/무료/.test(html), '"무료" 문구 없음');

console.log(`go: ${n}개 통과`);
