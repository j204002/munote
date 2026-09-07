export function makeT(lang, appDict, demoDict) {
  const get = (obj, path) => path.split('.').reduce((o, k) => (o && k in o ? o[k] : undefined), obj);
  const fill = (s, vars) => String(s).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars && k in vars ? String(vars[k]) : ''));
  const t = (key, vars) => {
    if (key.startsWith('demo.')) return fill(demoDict[key.slice(5)] ?? key, vars);
    let v = get(appDict, key);
    if (v === undefined && vars && 'count' in vars) v = get(appDict, `${key}_${vars.count === 1 ? 'one' : 'other'}`);
    return v === undefined ? key : fill(v, vars);
  };
  return { t, lang };
}
export async function loadLocale(lang) {
  const base = new URL('./i18n/', import.meta.url);
  const [app, demo] = await Promise.all([fetch(new URL(`${lang}.json`, base)).then((r) => r.json()), fetch(new URL('demo.json', base)).then((r) => r.json())]);
  return makeT(lang, app, demo[lang]);
}
