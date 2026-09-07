// demo/data.js — 고정 대본. 랜덤 없음(새로고침마다 같은 화면). 스펙 §4.
import { addDays } from './dateKey.js';

export const ME = { name: '무니', instrument: 'piano', goalMin: 60, dayStartHour: 4, weekStartMon: false };
export const PIECES = ['쇼팽 발라드 1번', '베토벤 소나타', '바흐 평균율', '하농'];
export const TYPES = ['section', 'runThrough', 'technique', 'memorization', 'scale', 'detail', 'sightReading'];
export const POSE_OF_INSTRUMENT = { piano: 'play_piano', strings: 'play_strings', winds: 'play_winds', vocal: 'play_vocal' };
export const EMOJI = { piano: '🎹', strings: '🎻', winds: '🎷', vocal: '🎤' };
export const FOCUS_TIMELINE = [{ state: 'sounding', sec: 12 }, { state: 'grace', sec: 4 }];
// wallSec은 focusPct에서 역산하지 않고 고정값으로 둔다(fix round: 89%가 저장·회고·기록 세 화면
// 어디서도 갈리지 않게) — 1512/1700 = 88.9…% → round 89%, records.js 세션 표기(25/28)도 round 89%.
export const SKIP_TO = { elapsedSec: 25 * 60 + 12, wallSec: 1700, focusPct: 89 };

// D-n → 세션 대본. D-20~D-1 중 15일 연습(비운 날: D-19·D-16·D-13·D-11·D-9), D-8~D-1은 매일.
// elapsedMin = round(practiceMin / (focusPct/100)) — practiceMin·focusPct는 창업자 확인 스프레드(71~94)를 그대로 유지,
// elapsedMin만 이 식으로 역산해 "총 시간(=연습+무음)"이 두 표기(집중도 %)와 항상 같은 뿌리에서 나오게 한다(fix round 1).
const SCRIPT = [
  [20, ['19:10', 41, 48, 86, ['쇼팽 발라드 1번'], ['section'], '3페이지 왼손 다시', 'past0']],
  [18, ['20:05', 33, 42, 79, ['하농', '쇼팽 발라드 1번'], ['scale', 'section']]],
  [17, ['18:40', 55, 61, 90, ['베토벤 소나타'], ['runThrough', 'detail'], null, 'past1']],
  [15, ['19:30', 24, 32, 74, ['바흐 평균율'], ['sightReading']]],
  [14, ['21:00', 48, 55, 88, ['쇼팽 발라드 1번', '베토벤 소나타'], ['section', 'memorization'], '템포 100까지']],
  [12, ['19:15', 30, 37, 81, ['하농', '바흐 평균율'], ['scale', 'technique']]],
  [10, ['18:50', 62, 67, 92, ['베토벤 소나타'], ['runThrough'], null, 'past2']],
  [8, ['19:20', 37, 44, 84, ['쇼팽 발라드 1번'], ['section']]],
  [7, ['20:10', 29, 38, 77, ['하농'], ['scale', 'technique']]],
  [6, ['19:05', 45, 51, 89, ['베토벤 소나타', '쇼팽 발라드 1번'], ['detail', 'section'], null, 'past0']],
  [5, ['18:30', 52, 57, 91, ['쇼팽 발라드 1번'], ['runThrough'], '내일 레슨']],
  [4, ['21:20', 22, 31, 71, ['바흐 평균율'], ['sightReading']]],
  [3, ['19:00', 58, 62, 94, ['베토벤 소나타'], ['section', 'memorization'], null, 'past1']],
  [2, ['19:40', 35, 42, 83, ['하농', '베토벤 소나타'], ['scale', 'detail']]],
  [1, ['20:00', 43, 49, 87, ['쇼팽 발라드 1번'], ['runThrough'], null, 'past2']],
];

export function buildSessions(todayKey) {
  return SCRIPT.map(([dMinus, [startHm, practiceMin, elapsedMin, focusPct, pieces, types, memo, coach]], i) => ({
    id: `s${i}`, dateKey: addDays(todayKey, -dMinus), startHm, practiceMin, elapsedMin, focusPct, pieces, types,
    memo: memo ?? undefined, coachKey: coach ?? undefined,
  }));
}

export const FRIENDS = [
  { id: 'f1', name: '지우', instrument: 'piano', pose: 'play', today: { practiceMin: 30, streak: 2, weekDays: 2 }, reactions: { clap: 1, fire: 0, note: 0 }, mine: null },
  { id: 'f2', name: '하람', instrument: 'winds', pose: 'play', today: { practiceMin: 45, streak: 5, weekDays: 4 }, reactions: { clap: 0, fire: 0, note: 0 }, mine: null },
  { id: 'f3', name: '세인', instrument: 'strings', pose: 'play', today: { practiceMin: 55, streak: 12, weekDays: 5 }, reactions: { clap: 0, fire: 2, note: 0 }, mine: null },
  { id: 'f4', name: '윤서', instrument: 'vocal', pose: 'play', today: { practiceMin: 38, streak: 3, weekDays: 3 }, reactions: { clap: 0, fire: 0, note: 1 }, mine: null },
  { id: 'f5', name: '도윤', instrument: 'strings', pose: 'lying_awake', reactions: { clap: 0, fire: 0, note: 0 }, mine: null },
  { id: 'f6', name: '민재', instrument: 'piano', pose: 'lying_asleep', reactions: { clap: 0, fire: 0, note: 0 }, mine: null },
  { id: 'f7', name: '서연', instrument: 'winds', pose: 'walk', reactions: { clap: 0, fire: 0, note: 0 }, mine: null },
];

export const COACH = {
  ko: { skip: '오늘은 25분을 한 번에 이어서 연주했어요. 자리를 뜨지 않고 끝까지 갔네요.', natural: '오늘 연습은 {min}분이었어요. 무음 없이 이어진 구간이 길었어요.',
    past: ['이번 주에 4일 연습했어요. 같은 곡을 이어서 다듬고 있네요.', '43분을 한 자리에서 연주했어요. 저녁 시간대에 집중이 잘 되는 편이네요.', '3일 연속으로 같은 시간대에 앉았어요. 리듬이 잡히고 있어요.'] },
  en: { skip: 'You played for 25 minutes in one stretch today. You stayed at the bench until the end.', natural: "Today’s practice was {min} minutes. The stretches without silence were long.",
    past: ['You practiced on 4 days this week. You keep polishing the same piece.', 'You played 43 minutes in one sitting. Evenings seem to be when you focus well.', 'You sat down at the same hour 3 days in a row. A rhythm is forming.'] },
  es: { skip: 'Hoy tocaste 25 minutos de una sola vez. Te quedaste en el banco hasta el final.', natural: 'La práctica de hoy fue de {min} minutos. Los tramos sin silencio fueron largos.',
    past: ['Practicaste 4 días esta semana. Sigues puliendo la misma obra.', 'Tocaste 43 minutos de una sentada. Por la tarde parece que te concentras bien.', 'Te sentaste a la misma hora 3 días seguidos. Se está formando un ritmo.'] },
  de: { skip: 'Heute hast du 25 Minuten am Stück gespielt. Du bist bis zum Ende sitzen geblieben.', natural: 'Heute waren es {min} Minuten Übung. Die Abschnitte ohne Stille waren lang.',
    past: ['Du hast diese Woche an 4 Tagen geübt. Du feilst weiter am selben Stück.', 'Du hast 43 Minuten in einem Zug gespielt. Abends scheinst du dich gut zu konzentrieren.', 'Du hast dich 3 Tage in Folge zur selben Stunde hingesetzt. Ein Rhythmus entsteht.'] },
};
