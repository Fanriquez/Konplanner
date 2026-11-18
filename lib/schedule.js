import { DateTime } from 'luxon';
import { db } from './db.js';
import { nextForAlarm, ts, utcTime } from './time.js';

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
    select e.id, coalesce(t.name, e.name) as name, e.starts_at, e.all_day
    from events e left join templates t on t.id = e.template_id
    where e.guild_id = ${guildId} and e.starts_at >= ${from} and e.starts_at < ${to}`;
  const alarms = await sql`
    select a.*, coalesce(t.name, e.name) as event_name
    from alarms a join events e on e.id = a.event_id left join templates t on t.id = e.template_id
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

  for (const e of events) {
    const s = slot(new Date(e.starts_at), e.id, e.name);
    s.start = new Date(e.starts_at);
    s.allDay = e.all_day;
  }

  for (const a of alarms) {
    const times = [];
    if (a.sent_at && new Date(a.sent_at) >= from && new Date(a.sent_at) < to) times.push(new Date(a.sent_at));
    if (a.status === 'pending') {
      const until = a.repeat_until ? new Date(a.repeat_until) : null;
      let at = new Date(a.fire_at);
      for (let k = 0; at && k < MAX_PER_ALARM; k++) {
        if (at >= to || (until && at > until)) break;
        if (at >= from) times.push(at);
        at = a.repeat === 'none' ? null : nextForAlarm(a, tz, at);
      }
    }
    for (const at of times) slot(at, a.event_id, a.event_name).alarms.push(at);
  }

  const lines = [];
  for (const k of [...days.keys()].sort()) {
    // El día va escrito (no como timestamp de Discord) para que no cambie de fecha según la zona de quien lo mira.
    const day = DateTime.fromISO(k, { zone: tz }).setLocale('en').toFormat('cccc dd/LL');
    lines.push('', `**📅 ${day}** (${tz})`);
    const items = [...days.get(k).values()]
      .map((ev) => ({ ...ev, alarms: ev.alarms.sort((x, y) => x - y) }))
      .sort((x, y) => (x.start || x.alarms[0]) - (y.start || y.alarms[0]));
    for (const ev of items) {
      // Hora UTC (igual para todos) y entre paréntesis la hora local de quien lo mira.
      const when = (at) => `${utcTime(at)} (${ts(at, 't')})`;
      const alarmsText = ev.alarms.length ? ` · ⏰ ${ev.alarms.map(when).join(', ')}` : '';
      // Sin hora (todo el día o por confirmar): 📌 y arriba del día.
      const startText = ev.allDay ? '📌 ' : ev.start ? `${when(ev.start)} ` : '';
      lines.push(`• ${startText}**${ev.name}**${alarmsText}`);
    }
  }
  return lines.slice(1); // sin la línea vacía inicial
}

/** Inicio del día de hoy y de dentro de `days` días, en la zona del servidor. */
export function dayRange(tz, days, now = new Date()) {
  const start = DateTime.fromJSDate(now, { zone: tz }).startOf('day');
  return { from: start.toJSDate(), to: start.plus({ days }).toJSDate() };
}
