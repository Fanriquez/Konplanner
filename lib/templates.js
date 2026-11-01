import { DateTime } from 'luxon';
import { db } from './db.js';
import { DEFAULT_TZ, nextOccurrence } from './time.js';

export const DEFAULT_REMINDERS = '15m none, 0 everyone';
export const DEFAULT_START_MESSAGE = '🚨 {event}';
const BEFORE_MESSAGE = '⏰ {event} · {time_left}';
const HORIZON_DAYS = 8; // las repeticiones crean los horarios de los próximos 8 días
const CLEANUP_DAYS = 2; // los horarios de plantilla se borran 2 días después de pasar

/** Nombre único de un horario: "Monkey Rallies · 29/10 03:00" (en la zona del servidor). */
export function occurrenceName(template, startsAt, tz) {
  return `${template.name} · ${DateTime.fromJSDate(startsAt, { zone: tz }).toFormat('dd/LL HH:mm')}`;
}

/**
 * Crea un horario de una plantilla: el evento y sus avisos (ocultos del cronograma, donde ya se ve el evento).
 * Devuelve { status: 'created' | 'exists' | 'past', event? }.
 */
export async function createOccurrence({ guildId, template, startsAt, channelId, planId = null, userId = null, tz }) {
  const sql = db();
  if (startsAt <= new Date()) return { status: 'past' };
  const name = occurrenceName(template, startsAt, tz);
  const [event] = await sql`
    insert into events (guild_id, name, name_key, starts_at, created_by, template_id, plan_id)
    values (${guildId}, ${name}, ${name.toLowerCase()}, ${startsAt}, ${userId}, ${template.id}, ${planId})
    on conflict (guild_id, name_key) do nothing
    returning *`;
  if (!event) return { status: 'exists' };

  for (const r of template.reminders) {
    const fireAt = new Date(startsAt.getTime() - r.offset * 60000);
    if (fireAt <= new Date()) continue; // ese aviso ya pasó
    const message = r.offset > 0 ? BEFORE_MESSAGE : template.message || DEFAULT_START_MESSAGE;
    await sql`
      insert into alarms (guild_id, event_id, channel_id, message, mentions, fire_at, offset_minutes, in_schedule, created_by)
      values (${guildId}, ${event.id}, ${channelId}, ${message}, ${sql.json(r.mentions)}, ${fireAt}, ${r.offset}, false, ${userId})`;
  }
  await sql`
    insert into plan_history (template_id, starts_at) values (${template.id}, ${startsAt})
    on conflict do nothing`;
  return { status: 'created', event };
}

/**
 * Crea los horarios de los próximos días de las repeticiones activas (todas, o solo `onlyPlanId`).
 * Devuelve { created, guilds } (servidores con cambios, para actualizar su cronograma fijado).
 */
export async function materializePlans(now = new Date(), onlyPlanId = null) {
  const sql = db();
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 86400000);
  const plans = await sql`
    select p.*, t.name, t.reminders, t.message, coalesce(c.timezone, ${DEFAULT_TZ}) as tz
    from plans p join templates t on t.id = p.template_id
    left join guild_config c on c.guild_id = p.guild_id
    where p.active and (p.materialized_until is null or p.materialized_until < ${horizon})
      and (${onlyPlanId}::int is null or p.id = ${onlyPlanId})`;
  let created = 0;
  const guilds = new Set();
  for (const p of plans) {
    const template = { id: p.template_id, name: p.name, reminders: p.reminders, message: p.message };
    const until = p.repeat_until ? new Date(p.repeat_until) : null;
    const next = (after) => nextOccurrence(after, p.repeat, p.tz, after, p.repeat_every, p.run_days, p.anchor);
    let at = p.materialized_until ? next(new Date(p.materialized_until)) : new Date(p.anchor);
    if (at && at <= now) at = nextOccurrence(p.anchor, p.repeat, p.tz, now, p.repeat_every, p.run_days, p.anchor);
    let last = p.materialized_until;
    while (at && at < horizon && (!until || at <= until)) {
      const r = await createOccurrence({ guildId: p.guild_id, template, startsAt: at, channelId: p.channel_id, planId: p.id, userId: p.created_by, tz: p.tz });
      if (r.status === 'created') {
        created++;
        guilds.add(p.guild_id);
      }
      last = at;
      at = next(at);
    }
    const finished = !at || (until && at > until);
    await sql`update plans set materialized_until = ${last}, active = ${!finished} where id = ${p.id}`;
  }
  return { created, guilds };
}

/** Borra los horarios de plantilla que ya pasaron (el historial queda en plan_history). */
export async function cleanupOccurrences() {
  const rows = await db()`
    delete from events
    where template_id is not null and starts_at < now() - make_interval(days => ${CLEANUP_DAYS})
    returning guild_id`;
  return new Set(rows.map((r) => r.guild_id));
}
