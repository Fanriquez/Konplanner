import { DateTime } from 'luxon';
import { db } from './db.js';
import { DEFAULT_TZ, nextOccurrence } from './time.js';

export const DEFAULT_REMINDERS = '15m none, 0 everyone';
export const DEFAULT_START_MESSAGE = '🚨 {event}';
export const DEFAULT_DAY_MESSAGE = '📌 {event}'; // alarma de un horario de todo el día
const BEFORE_MESSAGE = '⏰ {event} · {time_left}';
const HORIZON_DAYS = 8; // las repeticiones crean los horarios de los próximos 8 días
const CLEANUP_DAYS = 2; // los horarios de plantilla se borran 2 días después de pasar

/** Nombre único de un horario: "Monkey Rallies · 29/10 03:00", o "Register · 20/11" si es de todo el día. */
export function occurrenceName(template, startsAt, tz, allDay = false) {
  return `${template.name} · ${DateTime.fromJSDate(startsAt, { zone: tz }).toFormat(allDay ? 'dd/LL' : 'dd/LL HH:mm')}`;
}

const DAY = 86400000;

/**
 * Crea un horario de una plantilla: el evento y sus avisos (ocultos del cronograma, donde ya se ve el evento).
 * Devuelve { status: 'created' | 'exists' | 'past', event? }.
 */
export async function createOccurrence({ guildId, template, startsAt, channelId, planId = null, userId = null, tz, allDay = false, alarmTime = null }) {
  const sql = db();
  // Un horario de todo el día vale mientras no termine el día.
  if ((allDay ? startsAt.getTime() + DAY : startsAt.getTime()) <= Date.now()) return { status: 'past' };
  if (planId) {
    // Las repeticiones respetan los días saltados con /plans skip.
    const local = DateTime.fromJSDate(startsAt, { zone: tz });
    const [skip] = await sql`
      select 1 from plan_skips
      where template_id = ${template.id} and day = ${local.toISODate()} and time in ('', ${local.toFormat('HH:mm')})`;
    if (skip) return { status: 'skipped' };
  }
  const name = occurrenceName(template, startsAt, tz, allDay);
  const [event] = await sql`
    insert into events (guild_id, name, name_key, starts_at, all_day, created_by, template_id, plan_id)
    values (${guildId}, ${name}, ${name.toLowerCase()}, ${startsAt}, ${allDay}, ${userId}, ${template.id}, ${planId})
    on conflict (guild_id, name_key) do nothing
    returning *`;
  if (!event) return { status: 'exists' };

  if (allDay) {
    // Todo el día: sin avisos "antes"; solo la alarma opcional a una hora definida.
    if (alarmTime) {
      const [h, m] = alarmTime.split(':').map(Number);
      const fireAt = DateTime.fromJSDate(startsAt, { zone: tz }).set({ hour: h, minute: m }).toJSDate();
      await insertDayAlarm({ guildId, template, event, channelId, userId, fireAt });
    }
  } else {
    await insertReminders({ guildId, template, event, channelId, userId });
    await sql`
      insert into plan_history (template_id, starts_at) values (${template.id}, ${startsAt})
      on conflict do nothing`;
  }
  return { status: 'created', event };
}

/** Crea los avisos de un horario según la plantilla (salta los que ya pasaron). */
async function insertReminders({ guildId, template, event, channelId, userId }) {
  const sql = db();
  for (const r of template.reminders) {
    const fireAt = new Date(new Date(event.starts_at).getTime() - r.offset * 60000);
    if (fireAt <= new Date()) continue; // ese aviso ya pasó
    const message = r.offset > 0 ? BEFORE_MESSAGE : template.message || DEFAULT_START_MESSAGE;
    await sql`
      insert into alarms (guild_id, event_id, channel_id, message, mentions, fire_at, offset_minutes, in_schedule, via_dm, created_by)
      values (${guildId}, ${event.id}, ${channelId}, ${message}, ${sql.json(r.mentions)}, ${fireAt}, ${r.offset}, false, ${Boolean(template.dm)}, ${userId})`;
  }
}

/**
 * Alarma de un horario de todo el día, a la hora indicada. Menciona a quien menciona el aviso "a la hora"
 * de la plantilla, y sí aparece en el cronograma (ahí el evento no tiene hora).
 */
async function insertDayAlarm({ guildId, template, event, channelId, userId, fireAt }) {
  if (fireAt <= new Date()) return;
  const r = template.reminders.find((x) => x.offset === 0) || template.reminders.at(-1);
  await db()`
    insert into alarms (guild_id, event_id, channel_id, message, mentions, fire_at, in_schedule, via_dm, created_by)
    values (${guildId}, ${event.id}, ${channelId}, ${template.message || DEFAULT_DAY_MESSAGE}, ${db().json(r?.mentions || {})},
            ${fireAt}, true, ${Boolean(template.dm)}, ${userId})`;
}

/**
 * Aplica la plantilla (avisos, mensaje y canal) a sus horarios futuros ya programados.
 * Los avisos que ya salieron se dejan como están. Devuelve cuántos horarios se actualizaron.
 */
export async function applyTemplateToFuture(template, defaultChannelId) {
  const sql = db();
  const events = await sql`
    select e.*, (select channel_id from alarms where event_id = e.id order by id limit 1) as channel_id,
      (select fire_at from alarms where event_id = e.id and status = 'pending' order by id limit 1) as day_alarm_at
    from events e
    where e.template_id = ${template.id} and (e.starts_at > now() or (e.all_day and e.starts_at > now() - interval '1 day'))`;
  for (const event of events) {
    await sql`delete from alarms where event_id = ${event.id} and status in ('pending', 'paused', 'failed')`;
    const channelId = template.channel_id || event.channel_id || defaultChannelId;
    if (event.all_day) {
      // Mantiene la hora de su alarma, con el mensaje, menciones y canal nuevos.
      if (event.day_alarm_at) await insertDayAlarm({ guildId: event.guild_id, template, event, channelId, userId: event.created_by, fireAt: new Date(event.day_alarm_at) });
    } else {
      await insertReminders({ guildId: event.guild_id, template, event, channelId, userId: event.created_by });
    }
  }
  if (template.channel_id) await sql`update plans set channel_id = ${template.channel_id} where template_id = ${template.id}`;
  return events.length;
}

/**
 * Crea los horarios de los próximos días de las repeticiones activas (todas, o solo `onlyPlanId`).
 * Devuelve { created, guilds } (servidores con cambios, para actualizar su cronograma fijado).
 */
export async function materializePlans(now = new Date(), onlyPlanId = null) {
  const sql = db();
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 86400000);
  const plans = await sql`
    select p.*, t.name, t.reminders, t.message, t.dm, coalesce(c.timezone, ${DEFAULT_TZ}) as tz
    from plans p join templates t on t.id = p.template_id
    left join guild_config c on c.guild_id = p.guild_id
    where p.active and (p.materialized_until is null or p.materialized_until < ${horizon})
      and (${onlyPlanId}::int is null or p.id = ${onlyPlanId})`;
  let created = 0;
  const guilds = new Set();
  for (const p of plans) {
    const template = { id: p.template_id, name: p.name, reminders: p.reminders, message: p.message, dm: p.dm };
    const until = p.repeat_until ? new Date(p.repeat_until) : null;
    const next = (after) => nextOccurrence(after, p.repeat, p.tz, after, p.repeat_every, p.run_days, p.anchor);
    let at = p.materialized_until ? next(new Date(p.materialized_until)) : new Date(p.anchor);
    // Ya pasó: salta a la siguiente. Los de todo el día valen hasta que termina su día (hoy incluido).
    const ref = p.all_day ? new Date(now.getTime() - DAY) : now;
    if (at && at <= ref) at = nextOccurrence(p.anchor, p.repeat, p.tz, ref, p.repeat_every, p.run_days, p.anchor);
    let last = p.materialized_until;
    while (at && at < horizon && (!until || at <= until)) {
      const r = await createOccurrence({
        guildId: p.guild_id, template, startsAt: at, channelId: p.channel_id, planId: p.id, userId: p.created_by, tz: p.tz,
        allDay: p.all_day, alarmTime: p.alarm_time,
      });
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
