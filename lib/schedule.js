import { DateTime } from 'luxon';
import { db } from './db.js';
import { ts } from './time.js';

const UNIT = { daily: 'days', weekly: 'weeks', monthly: 'months' };
const MAX_PER_ALARM = 400; // tope de repeticiones por alarma dentro del rango

/**
 * Cronograma del servidor entre `from` y `to`, agrupado por día (en la zona del servidor).
 * Incluye los eventos que empiezan en el rango y cada vez que suena una alarma
 * (también las repeticiones futuras y las que ya sonaron dentro del rango).
 * Devuelve líneas listas para Discord, sin textos fijos de idioma: las fechas y horas
 * se muestran en la zona de cada persona gracias a los timestamps de Discord.
 */
export async function buildSchedule(guildId, tz, from, to) {
  const sql = db();
  const events = await sql`
    select id, name, starts_at from events
    where guild_id = ${guildId} and starts_at >= ${from} and starts_at < ${to}`;
  const alarms = await sql`
    select a.*, e.name as event_name from alarms a join events e on e.id = a.event_id
    where a.guild_id = ${guildId}
      and a.in_schedule
      and (a.status = 'pending' or (a.sent_at >= ${from} and a.sent_at < ${to}))`;

  // día → evento → { name, start, alarms: [fechas] }
  const days = new Map();
  const dayKey = (date) => DateTime.fromJSDate(date, { zone: tz }).toISODate();
  const slot = (date, id, name) => {
    const k = dayKey(date);
    if (!days.has(k)) days.set(k, new Map());
    const evs = days.get(k);
    if (!evs.has(id)) evs.set(id, { name, start: null, alarms: [] });
    return evs.get(id);
  };

  for (const e of events) slot(new Date(e.starts_at), e.id, e.name).start = new Date(e.starts_at);

  for (const a of alarms) {
    const times = [];
    if (a.sent_at && new Date(a.sent_at) >= from && new Date(a.sent_at) < to) times.push(new Date(a.sent_at));
    if (a.status === 'pending') {
      const base = DateTime.fromJSDate(new Date(a.fire_at), { zone: tz });
      const until = a.repeat_until ? new Date(a.repeat_until) : null;
      for (let k = 0; k < MAX_PER_ALARM; k++) {
        const at = k === 0 ? base.toJSDate() : base.plus({ [UNIT[a.repeat]]: k * (a.repeat_every || 1) }).toJSDate();
        if (at >= to || (until && at > until)) break;
        if (at >= from) times.push(at);
        if (a.repeat === 'none') break;
      }
    }
    for (const at of times) slot(at, a.event_id, a.event_name).alarms.push(at);
  }

  const lines = [];
  for (const k of [...days.keys()].sort()) {
    const dayStart = DateTime.fromISO(k, { zone: tz }).toJSDate();
    lines.push('', `**📅 ${ts(dayStart, 'D')}**`);
    const items = [...days.get(k).values()]
      .map((ev) => ({ ...ev, alarms: ev.alarms.sort((x, y) => x - y) }))
      .sort((x, y) => (x.start || x.alarms[0]) - (y.start || y.alarms[0]));
    for (const ev of items) {
      const alarmsText = ev.alarms.length ? ` · ⏰ ${ev.alarms.map((at) => ts(at, 't')).join(', ')}` : '';
      lines.push(`• ${ev.start ? `${ts(ev.start, 't')} ` : ''}**${ev.name}**${alarmsText}`);
    }
  }
  return lines.slice(1); // sin la línea vacía inicial
}

/** Inicio del día de hoy y de dentro de `days` días, en la zona del servidor. */
export function dayRange(tz, days, now = new Date()) {
  const start = DateTime.fromJSDate(now, { zone: tz }).startOf('day');
  return { from: start.toJSDate(), to: start.plus({ days }).toJSDate() };
}
