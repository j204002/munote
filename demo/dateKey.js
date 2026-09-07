const pad = (n) => String(n).padStart(2, '0');

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function weekdayOf(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function dateKeyOfInstant(iso, timeZone, dayStartHour = 0) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(new Date(iso));
    const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
    const key = `${get('year')}-${get('month')}-${get('day')}`;
    const hour = Number(get('hour')) % 24;
    return hour < dayStartHour ? addDays(key, -1) : key;
  } catch {
    // Fallback when Intl rejects unknown timeZone: use runtime's local date
    const ms = Date.parse(iso) - dayStartHour * 3_600_000;
    const dt = new Date(ms);
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  }
}

export function todayKey(dayStartHour, now = new Date(), tz = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  return dateKeyOfInstant(now.toISOString(), tz, dayStartHour);
}
