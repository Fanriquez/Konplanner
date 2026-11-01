import { DateTime } from 'luxon';
import { db, getConfig } from './db.js';
import { DEFAULT_TZ, ts } from './time.js';
import { buildSchedule, dayRange } from './schedule.js';
import { DiscordError, editMessage, sendMessage } from './discord.js';
import { COLOR } from './render.js';

const LIVE_DAYS = 7;

/**
 * Cronograma fijado: un solo mensaje con los próximos 7 días que el bot edita cuando algo cambia.
 * Si el mensaje ya no existe (alguien lo borró), publica uno nuevo.
 */
export async function refreshLive(guildId, now = new Date()) {
  const cfg = await getConfig(guildId);
  if (!cfg.live_channel_id) return false;
  const tz = cfg.timezone || DEFAULT_TZ;
  const { from, to } = dayRange(tz, LIVE_DAYS, now);
  const lines = await buildSchedule(guildId, tz, from, to);
  const payload = {
    embeds: [{
      description: `${lines.length ? lines.join('\n') : '—'}\n\n🔄 ${ts(now, 'R')}`.slice(0, 4000),
      color: COLOR,
    }],
    allowed_mentions: { parse: [] },
  };

  let messageId = cfg.live_message_id;
  if (messageId) {
    try {
      await editMessage(cfg.live_channel_id, messageId, payload);
    } catch (e) {
      if (!(e instanceof DiscordError && e.status === 404)) throw e;
      messageId = null; // lo borraron: se publica de nuevo
    }
  }
  if (!messageId) messageId = (await sendMessage(cfg.live_channel_id, payload)).id;

  await db()`
    update guild_config set live_message_id = ${messageId},
      live_day = ${DateTime.fromJSDate(now, { zone: tz }).toISODate()}
    where guild_id = ${guildId}`;
  return true;
}

/** Actualiza los cronogramas fijados de los servidores con cambios, y de todos al cambiar de día. */
export async function refreshLiveSchedules(changedGuilds, now = new Date()) {
  const configs = await db()`select guild_id, timezone, live_day from guild_config where live_channel_id is not null`;
  let refreshed = 0;
  for (const c of configs) {
    const today = DateTime.fromJSDate(now, { zone: c.timezone || DEFAULT_TZ }).toISODate();
    if (!changedGuilds.has(c.guild_id) && c.live_day === today) continue;
    try {
      if (await refreshLive(c.guild_id, now)) refreshed++;
    } catch (e) {
      console.error(`Cronograma fijado de ${c.guild_id} falló:`, e.message);
    }
  }
  return refreshed;
}
