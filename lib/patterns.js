import { DateTime } from 'luxon';

const DAY = 86400000;
const MAX_CYCLE = 30; // every acepta hasta 30 días

/** Número de día (sin horario de verano de por medio) de una fecha en la zona `tz`. */
const dayIndex = (dt) => Math.round(Date.UTC(dt.year, dt.month - 1, dt.day) / DAY);
const fromIndex = (idx, tz, hour, minute) => {
  const d = new Date(idx * DAY);
  return DateTime.fromObject(
    { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour, minute }, { zone: tz },
  );
};

/** Período más corto que se repite en `diffs`, o null. Cada N días: 3 fechas. Ciclos más largos: un ciclo completo y 2 pasos más. */
function findPeriod(diffs) {
  for (let p = 1; p <= diffs.length; p++) {
    if (diffs.length < (p === 1 ? 2 : p + 2)) break;
    if (diffs.every((d, i) => i < p || d === diffs[i - p])) return p;
  }
  return null;
}

/**
 * Busca cada cuánto se repiten unos horarios. Agrupa por hora del día (las horas que caen
 * siempre los mismos días van juntas, ej. 03:00 y 18:00) y para cada grupo devuelve:
 *   { times: ['03:00', '18:00'], kind, cycle, runDays, offsets, weekdays, dates, plans }
 * kind: 'every' (cada N días) | 'block' (N días seguidos cada C días) | 'weekdays' (días fijos
 * de la semana) | 'cycle' (otro ciclo de C días). `plans` son las repeticiones sugeridas:
 * [{ start: DateTime (próximo horario), every, days }] — una por cada hora y día del ciclo.
 * Los grupos sin patrón claro (o con menos de 3 fechas) llevan kind: null.
 */
export function detectPatterns(dates, tz, now = new Date()) {
  const byTime = new Map();
  for (const d of [...new Set(dates.map((x) => new Date(x).getTime()))].sort((a, b) => a - b)) {
    const dt = DateTime.fromMillis(d, { zone: tz });
    const key = dt.toFormat('HH:mm');
    if (!byTime.has(key)) byTime.set(key, []);
    byTime.get(key).push(dayIndex(dt));
  }
  // Une las horas que caen exactamente los mismos días.
  const groups = new Map();
  for (const [time, days] of byTime) {
    const k = days.join(',');
    if (!groups.has(k)) groups.set(k, { times: [], days });
    groups.get(k).times.push(time);
  }

  const today = dayIndex(DateTime.fromJSDate(now, { zone: tz }));
  const result = [];
  for (const { times, days } of groups.values()) {
    const base = { times: times.sort(), dates: days.length, kind: null, plans: [] };
    const diffs = days.slice(1).map((d, i) => d - days[i]);
    const p = days.length >= 3 ? findPeriod(diffs) : null;
    const cycle = p ? diffs.slice(0, p).reduce((a, b) => a + b, 0) : 0;
    if (!p || cycle > MAX_CYCLE) {
      result.push(base);
      continue;
    }
    // Empieza el ciclo después del descanso más largo (para que un bloque quede como 0,1,2…).
    const cyc = diffs.slice(0, p);
    const startAt = (cyc.indexOf(Math.max(...cyc)) + 1) % p;
    const rotated = [...cyc.slice(startAt), ...cyc.slice(0, startAt)];
    const first = days[startAt];
    const offsets = [0];
    for (const d of rotated.slice(0, -1)) offsets.push(offsets.at(-1) + d);

    let kind = 'cycle';
    let runDays = 1;
    if (p === 1) kind = 'every';
    else if (offsets.every((o, i) => o === i)) [kind, runDays] = ['block', offsets.length];
    else if (cycle === 7) kind = 'weekdays';

    // Próximo horario de cada día del ciclo (hoy o después).
    const nextIdx = (o) => first + o + Math.max(0, Math.ceil((today - first - o) / cycle)) * cycle;
    const plans = [];
    for (const time of base.times) {
      const [h, m] = time.split(':').map(Number);
      if (kind === 'block') plans.push({ start: fromIndex(nextBlockStart(first, cycle, runDays, today), tz, h, m), every: cycle, days: runDays });
      else for (const o of offsets) plans.push({ start: fromIndex(nextIdx(o), tz, h, m), every: cycle, days: 1 });
    }
    result.push({
      ...base, kind, cycle, runDays, offsets,
      weekdays: kind === 'weekdays' ? offsets.map((o) => fromIndex(first + o, tz, 0, 0).weekday) : null,
      plans: plans.sort((a, b) => a.start - b.start),
    });
  }
  return result;
}

/** Inicio del bloque en curso (si todavía quedan días hoy o después) o del siguiente. */
function nextBlockStart(first, cycle, runDays, today) {
  const k = Math.max(0, Math.floor((today - first) / cycle));
  const start = first + k * cycle;
  return start + runDays - 1 >= today ? start : start + cycle;
}
