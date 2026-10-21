import { db } from './db.js';
import { DEFAULT_TZ, nextOccurrence } from './time.js';
import { buildAlarmPayload } from './render.js';
import { sendMessage } from './discord.js';

const LATE_LIMIT_MS = 6 * 60 * 60 * 1000; // si una alarma única lleva más de 6 h atrasada, no se envía
const BATCH = 25;

/**
 * Se ejecuta cada minuto (cron-job.org → /api/tick).
 * Toma las alarmas cuya hora llegó, las envía y programa la siguiente si se repiten.
 */
export async function runTick(now = new Date()) {
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

  const events = await sql`select * from events where id in ${sql([...new Set(due.map((a) => a.event_id))])}`;
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

    const next = a.repeat === 'none' ? null : nextOccurrence(a.fire_at, a.repeat, tz, now, a.repeat_every);
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
      await sendMessage(a.channel_id, buildAlarmPayload({ alarm: a, event: ev, groupMembers }));

      if (ended) {
        await sql`
          update alarms set status = 'sent', sent_at = now(), fail_count = 0, last_error = null
          where id = ${a.id}`;
      } else {
        await sql`
          update alarms set status = 'pending', sent_at = now(), fail_count = 0, last_error = null,
            fire_at = ${next}
          where id = ${a.id}`;
      }
      result.sent++;
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
