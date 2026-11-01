// Recordatorios personales (/remind me): cada persona pide un aviso privado para sí misma.
import { db } from './db.js';
import { discordFetch, sendMessage } from './discord.js';
import { lang, t } from './i18n.js';
import { ts } from './time.js';

const BATCH = 50;

/** Envía los recordatorios vencidos: por mensaje privado o, si la persona los tiene cerrados, en el canal donde lo pidió. */
export async function sendDueReminders() {
  const sql = db();
  // Si una ejecución anterior se cortó a mitad de envío, libera esos recordatorios.
  await sql`update reminders set status = 'pending' where status = 'sending' and fire_at < now() - interval '5 minutes'`;
  const due = await sql`
    update reminders set status = 'sending'
    where id in (
      select id from reminders where status = 'pending' and fire_at <= now()
      order by fire_at limit ${BATCH} for update skip locked
    )
    returning *`;
  let sent = 0;
  for (const r of due) {
    const L = lang(r.locale);
    const body = `⏰ **${r.text}**\n-# ${t(L, 'reminder_footer', { when: ts(r.created_at, 'R') })}`;
    let ok = false;
    if (r.via_dm) {
      try {
        const dm = await discordFetch('/users/@me/channels', { method: 'POST', body: { recipient_id: r.user_id } });
        await sendMessage(dm.id, { content: body, allowed_mentions: { parse: [] } });
        ok = true;
      } catch (e) {
        console.error(`Recordatorio #${r.id}: no se pudo enviar por privado (${e.message}); se publica en el canal.`);
      }
    }
    if (!ok) {
      try {
        const note = r.via_dm ? `\n-# ${t(L, 'reminder_dm_closed')}` : '';
        await sendMessage(r.channel_id, { content: `<@${r.user_id}> ${body}${note}`, allowed_mentions: { users: [r.user_id] } });
        ok = true;
      } catch (e) {
        console.error(`Recordatorio #${r.id} falló:`, e.message);
      }
    }
    await sql`update reminders set status = ${ok ? 'sent' : 'failed'} where id = ${r.id}`;
    if (ok) sent++;
  }
  return sent;
}
