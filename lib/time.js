import { DateTime } from 'luxon';
import { UserError } from './errors.js';

export const DEFAULT_TZ = 'America/Santiago';

export const REPEAT_LABEL = {
  none: 'no se repite',
  daily: 'diaria',
  weekly: 'semanal',
  monthly: 'mensual',
};

export function isValidZone(tz) {
  return DateTime.now().setZone(tz).isValid;
}

// Timestamp de Discord: cada usuario lo ve en su propia zona horaria.
// Estilos: F = fecha y hora larga, f = corta, R = relativo ("en 2 horas"), t = solo hora.
export function ts(date, style = 'F') {
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return `<t:${Math.floor(ms / 1000)}:${style}>`;
}

const DATE_FORMATS = ['yyyy-MM-dd', 'd-M-yyyy', 'd/M/yyyy', 'd-M-yy', 'd/M/yy'];
const TIME_FORMATS = ['H:mm', 'H.mm', 'H'];

function parseDatePart(str, tz) {
  const s = str.trim().toLowerCase();
  const today = DateTime.now().setZone(tz).startOf('day');
  if (['hoy', 'today'].includes(s)) return today;
  if (['mañana', 'manana', 'tomorrow'].includes(s)) return today.plus({ days: 1 });
  if (['pasado mañana', 'pasado manana'].includes(s)) return today.plus({ days: 2 });
  for (const f of DATE_FORMATS) {
    const d = DateTime.fromFormat(s, f, { zone: tz });
    if (d.isValid) return d;
  }
  return null;
}

function parseTimePart(str) {
  const s = str.trim().toLowerCase().replace(/\s*(hrs?|h)$/, '');
  for (const f of TIME_FORMATS) {
    const t = DateTime.fromFormat(s, f);
    if (t.isValid) return { hour: t.hour, minute: t.minute };
  }
  return null;
}

/**
 * Convierte fecha + hora (en la zona del servidor) a Date (UTC).
 * Si falta una de las dos y hay `base`, se completa con la parte correspondiente de `base`.
 */
export function resolveDateTime({ date, time, tz, base = null }) {
  const baseDt = base ? DateTime.fromJSDate(new Date(base), { zone: tz }) : null;

  let d;
  if (date) {
    d = parseDatePart(date, tz);
    if (!d) throw new UserError(`No entendí la fecha "${date}". Usa 2026-10-25, 25/10/2026, hoy o mañana.`);
  } else if (baseDt) {
    d = baseDt;
  } else {
    throw new UserError('Falta la **fecha** (date).');
  }

  let t;
  if (time) {
    t = parseTimePart(time);
    if (!t) throw new UserError(`No entendí la hora "${time}". Usa formato 24 h, por ejemplo 20:30.`);
  } else if (baseDt) {
    t = { hour: baseDt.hour, minute: baseDt.minute };
  } else {
    throw new UserError('Falta la **hora** (time).');
  }

  const dt = DateTime.fromObject(
    { year: d.year, month: d.month, day: d.day, hour: t.hour, minute: t.minute },
    { zone: tz },
  );
  if (!dt.isValid) throw new UserError('Esa fecha u hora no es válida.');
  return dt.toJSDate();
}

/** "1d", "2h", "30m", "1h30m", "90" (minutos), "0" o "inicio" → minutos. Devuelve null si no se entiende. */
export function parseOffset(str) {
  const s = String(str).trim().toLowerCase().replace(/\s+/g, '');
  if (['0', 'inicio', 'start', 'alinicio'].includes(s)) return 0;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const m = s.match(
    /^(?:(\d+)(?:días|dias|día|dia|days|day|d))?(?:(\d+)(?:horas|hora|hrs|hr|h))?(?:(\d+)(?:minutos|minuto|mins|min|m))?$/,
  );
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

export function formatOffset(minutes) {
  if (!minutes) return 'al inicio';
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return `${parts.join(' ')} antes`;
}

/** Próxima repetición estrictamente posterior a `now`, respetando la hora local (y el cambio de horario). */
export function nextOccurrence(fireAt, repeat, tz, now = new Date()) {
  const unit = { daily: 'days', weekly: 'weeks', monthly: 'months' }[repeat];
  if (!unit) return null;
  const base = DateTime.fromJSDate(new Date(fireAt), { zone: tz });
  for (let k = 1; k < 100000; k++) {
    const next = base.plus({ [unit]: k });
    if (next.toMillis() > now.getTime()) return next.toJSDate();
  }
  return null;
}
