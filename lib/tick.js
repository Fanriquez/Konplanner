import { db } from './db.js';
import { DEFAULT_TZ, nextForAlarm } from './time.js';
import { COLOR, buildAlarmPayload } from './render.js';
import { deleteMessage, sendMessage } from './discord.js';
import { cleanupOccurrences, materializePlans } from './templates.js';
import { refreshLiveSchedules } from './live.js';
import { sendDueReminders } from './reminders.js';
import { DateTime } from 'luxon';
import { buildSchedule, dayRange } from './schedule.js';
import { buildMentionLine } from './mentions.js';

const LATE_LIMIT_MS = 6 * 60 * 60 * 1000; // si una alarma única lleva más de 6 h atrasada, no se envía
const BATCH = 25;

/**
 * Se ejecuta cada minuto (cron-job.org → /api/tick).
 * Toma las alarmas cuya hora llegó, las envía y programa la siguiente si se repiten.
 */
export async function runTick(now = new Date()) {
  const result = await sendDueAlarms(now);
  const { created, guilds } = await materializePlans(now);
  for (const g of await cleanupOccurrences()) guilds.add(g);
  result.planned = created;
  result.reminders = await sendDueReminders();
  result.summaries = await sendDailySummaries(now);
  result.live = await refreshLiveSchedules(guilds, now);
  return result;
}

async function sendDueAlarms(now) {
  const sql = db();

  // Si una ejecución anterior se cortó a mitad de envío, libera esas alarmas.
  await sql`
    update alarms set status = 'pending'
    where status = 'sending' and last_attempt < now() - interval '5 minutes'`;

  // Reserva las alarmas vencidas de forma atómica (evita envíos duplicados si dos ticks se cruzan).
  const due = await sql`
    update alarms set status = 'sending', last_attempt = now()
    where id in (
      select id from alarms
      where status = 'pending' and fire_at <= now()
      order by fire_at
      limit ${BATCH}
      for update skip locked
    )
    returning *`;
  if (!due.length) return { sent: 0, failed: 0, missed: 0 };

  const events = await sql`
    select e.*, t.name as template_name from events e left join templates t on t.id = e.template_id
    where e.id in ${sql([...new Set(due.map((a) => a.event_id))])}`;
  const configs = await sql`select * from guild_config where guild_id in ${sql([...new Set(due.map((a) => a.guild_id))])}`;
  const groups = await sql`select * from mention_groups where guild_id in ${sql([...new Set(due.map((a) => a.guild_id))])}`;
  const eventById = new Map(events.map((e) => [e.id, e]));
  const tzByGuild = new Map(configs.map((c) => [c.guild_id, c.timezone]));
  const groupByKey = new Map(groups.map((g) => [`${g.guild_id}:${g.name_key}`, g.members]));

  const result = { sent: 0, failed: 0, missed: 0 };

  for (const a of due) {
    const ev = eventById.get(a.event_id);
    const tz = tzByGuild.get(a.guild_id) || DEFAULT_TZ;
    const late = now.getTime() - new Date(a.fire_at).getTime() > LATE_LIMIT_MS;

    const next = a.repeat === 'none' ? null : nextForAlarm(a, tz, now);
    const ended = !next || (a.repeat_until && next > new Date(a.repeat_until)); // no hay próxima repetición

    if (late) {
      if (ended) {
        await sql`update alarms set status = 'missed' where id = ${a.id}`;
        result.missed++;
      } else {
        await sql`update alarms set status = 'pending', fire_at = ${next} where id = ${a.id}`;
      }
      continue;
    }

    try {
      const groupMembers = a.mentions?.group
        ? groupByKey.get(`${a.guild_id}:${a.mentions.group.trim().toLowerCase()}`) || null
        : null;
      const msg = await sendMessage(a.channel_id, buildAlarmPayload({ alarm: a, event: ev, groupMembers }));

      if (ended) {
        await sql`
          update alarms set status = 'sent', sent_at = now(), fail_count = 0, last_error = null, message_id = ${msg?.id ?? null}
          where id = ${a.id}`;
      } else {
        await sql`
          update alarms set status = 'pending', sent_at = now(), fail_count = 0, last_error = null,
            fire_at = ${next}, message_id = ${msg?.id ?? null}
          where id = ${a.id}`;
      }
      result.sent++;
      if (a.offset_minutes === 0 && ev.template_id) await deleteEarlyReminders(a.event_id);
    } catch (e) {
      // 403/404: sin permisos o canal borrado → no tiene sentido reintentar.
      const failCount = a.fail_count + 1;
      const permanent = e.status === 403 || e.status === 404 || failCount >= 3;
      await sql`
        update alarms set status = ${permanent ? 'failed' : 'pending'}, fail_count = ${failCount},
          last_error = ${String(e.message).slice(0, 500)}
        where id = ${a.id}`;
      console.error(`Alarma #${a.id} falló:`, e.message);
      result.failed++;
    }
  }
  return result;
}

const SUMMARY_LATE_LIMIT_MIN = 180; // si el reloj estuvo caído más de 3 h después de la hora, ese día no se envía

/** Resumen diario: a la hora configurada, publica los eventos y alarmas del día en el canal elegido. */
async function sendDailySummaries(now) {
  const sql = db();
  const configs = await sql`select * from guild_config where summary_channel_id is not null and summary_time is not null`;
  let sent = 0;
  for (const cfg of configs) {
    const tz = cfg.timezone || DEFAULT_TZ;
    const local = DateTime.fromJSDate(now, { zone: tz });
    const today = local.toISODate();
    const [h, m] = cfg.summary_time.split(':').map(Number);
    const minutesLate = local.hour * 60 + local.minute - (h * 60 + m);
    if (minutesLate < 0 || cfg.summary_last_date === today) continue;

    // Reserva el día de forma atómica (evita duplicados si dos ticks se cruzan).
    const claimed = await sql`
      update guild_config set summary_last_date = ${today}
      where guild_id = ${cfg.guild_id} and summary_last_date is distinct from ${today}
      returning guild_id`;
    if (!claimed.length || minutesLate > SUMMARY_LATE_LIMIT_MIN) continue;

    try {
      const { from, to } = dayRange(tz, 1, now);
      const lines = await buildSchedule(cfg.guild_id, tz, from, to);
      if (!lines.length) continue; // día sin eventos: no se publica nada
      const { line, allowed } = buildMentionLine(cfg.summary_mentions || {});
      await sendMessage(cfg.summary_channel_id, {
        content: line || undefined,
        embeds: [{ description: lines.join('\n').slice(0, 4000), color: COLOR }],
        allowed_mentions: allowed,
      });
      sent++;
    } catch (e) {
      // Libera el día para reintentar en el próximo minuto (hasta SUMMARY_LATE_LIMIT_MIN), por ejemplo
      // si el bot no tenía permiso en el canal y alguien lo arregla.
      await sql`update guild_config set summary_last_date = ${cfg.summary_last_date} where guild_id = ${cfg.guild_id}`;
      console.error(`Resumen diario de ${cfg.guild_id} falló:`, e.message);
    }
  }
  return sent;
}

/** Horarios de plantilla: cuando sale el aviso de la hora, borra los avisos previos (ej. el de 15 minutos antes). */
async function deleteEarlyReminders(eventId) {
  const sql = db();
  const early = await sql`
    select id, channel_id, message_id from alarms
    where event_id = ${eventId} and offset_minutes > 0 and message_id is not null`;
  for (const r of early) {
    await deleteMessage(r.channel_id, r.message_id).catch((e) => console.error(`No se pudo borrar el aviso #${r.id}:`, e.message));
    await sql`update alarms set message_id = null where id = ${r.id}`;
  }
}
