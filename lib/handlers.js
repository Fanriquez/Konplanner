import { db, getConfig, loadGroupMembers } from './db.js';
import { DateTime } from 'luxon';
import { UserError } from './errors.js';
import {
  DEFAULT_TZ, REPEAT_LABEL, formatOffset, isValidZone, nextOccurrence, parseOffset, resolveDateTime, ts,
} from './time.js';
import { describeMentions, parseMembers, parseMentions } from './mentions.js';
import { COLOR, buildAlarmPayload } from './render.js';
import { DiscordError, sendMessage } from './discord.js';

const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;
const MAX_EVENTS = 100;
const MAX_ALARMS = 300;
const MAX_GROUPS = 50;
const MAX_OFFSET = 365 * 1440;

const STATUS_LABEL = {
  pending: '',
  paused: ' · ⏸️ pausada',
  sent: ' · ✅ enviada',
  failed: ' · ❌ falló',
  missed: ' · ⚠️ no enviada (atrasada)',
  sending: ' · 📤 enviando',
};

// Comandos que modifican datos: requieren "Gestionar servidor" o el rol organizador.
const WRITE = new Set([
  'event create', 'event edit', 'event delete',
  'alarm add', 'alarm edit', 'alarm delete', 'alarm test', 'alarm pause', 'alarm resume',
  'group create', 'group delete',
]);
// Configuración: solo "Gestionar servidor" (para que el rol organizador no pueda auto-asignarse más poder).
const SERVER_ADMIN = new Set(['config timezone', 'config admin-role', 'config default-channel']);

// ---------- utilidades ----------

function getOptions(data) {
  let sub = null;
  let list = data.options || [];
  if (list[0]?.type === 1) {
    sub = list[0].name;
    list = list[0].options || [];
  }
  const opts = {};
  for (const o of list) opts[o.name] = o.value;
  return { sub, opts };
}

function canManageServer(i) {
  const p = BigInt(i.member?.permissions || '0');
  return (p & ADMINISTRATOR) !== 0n || (p & MANAGE_GUILD) !== 0n;
}

function isOrganizer(i, cfg) {
  return canManageServer(i) || Boolean(cfg.admin_role_id && i.member?.roles?.includes(cfg.admin_role_id));
}

const text = (content) => ({ content });
const card = (title, description, extra = {}) => ({
  embeds: [{ title, description: fitLines(String(description).split('\n')), color: COLOR, ...extra }],
});

// Recorta por líneas completas para no cortar una mención o fecha de Discord a la mitad.
function fitLines(lines, max = 4000) {
  let out = '';
  for (let k = 0; k < lines.length; k++) {
    const next = out ? `${out}\n${lines[k]}` : lines[k];
    if (next.length > max - 40) return `${out}\n…y ${lines.length - k} línea(s) más`;
    out = next;
  }
  return out;
}

function clean(str) {
  return String(str || '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
}

async function findEvent(sql, guildId, name) {
  const [ev] = await sql`
    select * from events where guild_id = ${guildId} and name_key = ${String(name).trim().toLowerCase()}`;
  if (!ev) throw new UserError(`No encontré el evento **${name}**. Usa \`/event list\` para ver los eventos.`);
  return ev;
}

async function findAlarm(sql, guildId, id) {
  const [a] = await sql`select * from alarms where id = ${id} and guild_id = ${guildId}`;
  if (!a) throw new UserError(`No existe la alarma **#${id}** en este servidor.`);
  return a;
}

function alarmLine(a, eventName = null) {
  const parts = [
    `**#${a.id}**`,
    eventName ? `**${eventName}**` : null,
    `${ts(a.fire_at, 'f')} (${ts(a.fire_at, 'R')})`,
    a.offset_minutes != null ? formatOffset(a.offset_minutes) : null,
    `<#${a.channel_id}>`,
    describeMentions(a.mentions),
    a.repeat !== 'none' ? `🔁 ${REPEAT_LABEL[a.repeat]}` : null,
  ].filter(Boolean);
  const msg = clean(a.message);
  return `${parts.join(' · ')}${STATUS_LABEL[a.status] || ''}\n> ${msg.length > 90 ? msg.slice(0, 87) + '…' : msg}`;
}

function alarmSummary(a) {
  return [
    `🕒 ${ts(a.fire_at, 'F')} (${ts(a.fire_at, 'R')})${a.offset_minutes != null ? ` — ${formatOffset(a.offset_minutes)} del inicio` : ''}`,
    `📢 <#${a.channel_id}>`,
    `👥 ${describeMentions(a.mentions)}`,
    `🔁 ${REPEAT_LABEL[a.repeat]}`,
  ].join('\n');
}

/**
 * Calcula cuándo suena la alarma según before (relativo) o date/time (fecha exacta).
 * Devuelve null si no se indicó ninguna de las dos.
 */
function computeTiming({ opts, ev, tz, current = null }) {
  const hasBefore = opts.before != null && String(opts.before).trim() !== '';
  const hasAbs = Boolean(opts.date || opts.time);
  if (hasBefore && hasAbs) {
    throw new UserError('Usa **before** (relativo al evento) *o* **date/time** (fecha exacta), no ambos.');
  }
  if (hasBefore) {
    if (!ev.starts_at) {
      throw new UserError(`El evento **${ev.name}** no tiene fecha de inicio. Agrégala con \`/event edit\` o usa date y time.`);
    }
    const offset = parseOffset(opts.before);
    if (offset == null) throw new UserError(`No entendí "${opts.before}". Ejemplos: 1d, 2h, 30m, 1h30m, 0.`);
    if (offset > MAX_OFFSET) throw new UserError('El máximo es 365 días antes.');
    return { fireAt: new Date(new Date(ev.starts_at).getTime() - offset * 60000), offset };
  }
  if (hasAbs) {
    return {
      fireAt: resolveDateTime({ date: opts.date, time: opts.time, tz, base: current?.fire_at || null }),
      offset: null,
    };
  }
  return null;
}

/** Valida que la hora sea futura; si la alarma se repite, avanza a la próxima repetición. */
function ensureFuture(fireAt, repeat, tz, offset) {
  if (fireAt.getTime() > Date.now()) return { fireAt, moved: false };
  if (repeat !== 'none') return { fireAt: nextOccurrence(fireAt, repeat, tz), moved: true };
  if (offset != null) {
    throw new UserError(`Con ese "before" la alarma quedaría en el pasado (${ts(fireAt, 'f')}).`);
  }
  throw new UserError(`Esa fecha y hora ya pasó (${ts(fireAt, 'f')}).`);
}

// ---------- eventos ----------

async function eventCreate({ sql, guildId, userId, cfg, opts }) {
  const name = opts.name.trim();
  if (!name) throw new UserError('El nombre no puede estar vacío.');
  const [{ count }] = await sql`select count(*)::int as count from events where guild_id = ${guildId}`;
  if (count >= MAX_EVENTS) throw new UserError(`Este servidor llegó al máximo de ${MAX_EVENTS} eventos. Borra alguno antiguo.`);

  const startsAt = opts.date || opts.time ? resolveDateTime({ date: opts.date, time: opts.time, tz: cfg.timezone }) : null;
  let ev;
  try {
    [ev] = await sql`
      insert into events (guild_id, name, name_key, description, starts_at, created_by)
      values (${guildId}, ${name}, ${name.toLowerCase()}, ${opts.description || null}, ${startsAt}, ${userId})
      returning *`;
  } catch (e) {
    if (e.code === '23505') throw new UserError(`Ya existe un evento llamado **${name}**.`);
    throw e;
  }
  const when = startsAt
    ? `\n🗓️ Inicia ${ts(startsAt, 'F')} (${ts(startsAt, 'R')})${startsAt < new Date() ? '\n⚠️ Esa fecha ya pasó.' : ''}`
    : '\n🗓️ Sin fecha de inicio (agrégala con `/event edit` si quieres alarmas relativas).';
  return text(`✅ Evento **${ev.name}** creado.${when}\nAgrégale alarmas con \`/alarm add\`.`);
}

async function eventList({ sql, guildId }) {
  const rows = await sql`
    select e.*,
      count(a.id) filter (where a.status in ('pending','paused'))::int as active,
      count(a.id)::int as total
    from events e left join alarms a on a.event_id = e.id
    where e.guild_id = ${guildId}
    group by e.id
    order by e.starts_at nulls last, e.name`;
  if (!rows.length) return text('No hay eventos todavía. Crea uno con `/event create`.');
  const lines = rows.map(
    (e) => `**${e.name}** — ${e.starts_at ? ts(e.starts_at, 'f') : 'sin fecha'} · ⏰ ${e.active} activas / ${e.total}`,
  );
  return card(`📋 Eventos (${rows.length})`, lines.join('\n'));
}

async function eventView({ sql, guildId, opts }) {
  const ev = await findEvent(sql, guildId, opts.event);
  const alarms = await sql`select * from alarms where event_id = ${ev.id} order by fire_at`;
  const head = [
    ev.description ? `${ev.description}\n` : null,
    `🗓️ ${ev.starts_at ? `${ts(ev.starts_at, 'F')} (${ts(ev.starts_at, 'R')})` : 'Sin fecha de inicio'}`,
    '',
    alarms.length ? `**Alarmas (${alarms.length})**` : 'Sin alarmas. Agrega una con `/alarm add`.',
  ].filter((x) => x !== null);
  return card(`📌 ${ev.name}`, [...head, ...alarms.map((a) => alarmLine(a))].join('\n'));
}

async function eventEdit({ sql, guildId, cfg, opts }) {
  const ev = await findEvent(sql, guildId, opts.event);
  const newName = opts.new_name?.trim() || ev.name;
  const description = opts.description !== undefined ? opts.description : ev.description;
  let startsAt = ev.starts_at;
  if (opts.date || opts.time) {
    startsAt = resolveDateTime({ date: opts.date, time: opts.time, tz: cfg.timezone, base: ev.starts_at });
  }
  if (newName === ev.name && description === ev.description && startsAt === ev.starts_at) {
    throw new UserError('No indicaste nada que cambiar.');
  }

  try {
    await sql`
      update events set name = ${newName}, name_key = ${newName.toLowerCase()},
        description = ${description}, starts_at = ${startsAt}
      where id = ${ev.id}`;
  } catch (e) {
    if (e.code === '23505') throw new UserError(`Ya existe un evento llamado **${newName}**.`);
    throw e;
  }

  let moved = 0;
  const startChanged = startsAt && (!ev.starts_at || startsAt.getTime() !== new Date(ev.starts_at).getTime());
  if (startChanged) {
    const res = await sql`
      update alarms set
        fire_at = ${startsAt}::timestamptz - make_interval(mins => offset_minutes),
        status = case
          when status in ('sent','missed','failed')
           and ${startsAt}::timestamptz - make_interval(mins => offset_minutes) > now()
          then 'pending' else status end,
        fail_count = 0
      where event_id = ${ev.id} and offset_minutes is not null and status <> 'sending'`;
    moved = res.count;
  }

  const lines = [`✅ Evento **${newName}** actualizado.`];
  if (startsAt) lines.push(`🗓️ Inicia ${ts(startsAt, 'F')} (${ts(startsAt, 'R')})`);
  if (moved) lines.push(`🔄 Se movieron ${moved} alarma(s) relativas al nuevo horario.`);
  return text(lines.join('\n'));
}

async function eventDelete({ sql, guildId, opts }) {
  const ev = await findEvent(sql, guildId, opts.event);
  const [{ count }] = await sql`select count(*)::int as count from alarms where event_id = ${ev.id}`;
  await sql`delete from events where id = ${ev.id}`;
  return text(`🗑️ Evento **${ev.name}** borrado junto con ${count} alarma(s).`);
}

// ---------- alarmas ----------

async function alarmAdd({ sql, i, guildId, userId, cfg, opts }) {
  const ev = await findEvent(sql, guildId, opts.event);
  const repeat = opts.repeat || 'none';
  const message = opts.message.trim();
  if (!message) throw new UserError('El mensaje no puede estar vacío.');
  const mentions = parseMentions(opts.mentions);
  const channelId = opts.channel || cfg.default_channel_id || i.channel_id;

  const timing = computeTiming({ opts, ev, tz: cfg.timezone });
  if (!timing) {
    throw new UserError('Indica cuándo debe sonar: **before** (ej. 1h antes del evento) o **date** + **time**.');
  }
  if (timing.offset != null && repeat !== 'none') {
    throw new UserError('Las alarmas relativas al evento no se repiten. Para repetir, usa date y time.');
  }
  const { fireAt, moved } = ensureFuture(timing.fireAt, repeat, cfg.timezone, timing.offset);

  const [{ count }] = await sql`
    select count(*)::int as count from alarms where guild_id = ${guildId} and status in ('pending','paused')`;
  if (count >= MAX_ALARMS) throw new UserError(`Este servidor llegó al máximo de ${MAX_ALARMS} alarmas activas.`);

  const [a] = await sql`
    insert into alarms (guild_id, event_id, channel_id, message, mentions, fire_at, offset_minutes, repeat, created_by)
    values (${guildId}, ${ev.id}, ${channelId}, ${message}, ${sql.json(mentions)}, ${fireAt},
            ${timing.offset}, ${repeat}, ${userId})
    returning *`;

  const notes = [];
  if (moved) notes.push('ℹ️ La primera fecha ya había pasado, así que quedó en la siguiente repetición.');
  if (mentions.group && !(await loadGroupMembers(guildId, mentions.group))) {
    notes.push(`⚠️ El grupo **${mentions.group}** no existe todavía. Créalo con \`/group create\`.`);
  }
  return text(`✅ Alarma **#${a.id}** creada para **${ev.name}**\n${alarmSummary(a)}${notes.length ? '\n' + notes.join('\n') : ''}`);
}

async function alarmList({ sql, guildId, opts }) {
  if (opts.event) {
    const ev = await findEvent(sql, guildId, opts.event);
    const rows = await sql`select * from alarms where event_id = ${ev.id} order by fire_at limit 30`;
    if (!rows.length) return text(`**${ev.name}** no tiene alarmas.`);
    return card(`⏰ Alarmas de ${ev.name}`, rows.map((a) => alarmLine(a)).join('\n'));
  }
  const rows = await sql`
    select a.*, e.name as event_name from alarms a join events e on e.id = a.event_id
    where a.guild_id = ${guildId} and a.status in ('pending','paused')
    order by a.fire_at limit 25`;
  if (!rows.length) return text('No hay alarmas activas.');
  return card('⏰ Próximas alarmas', rows.map((a) => alarmLine(a, a.event_name)).join('\n'));
}

async function alarmEdit({ sql, guildId, cfg, opts }) {
  const a = await findAlarm(sql, guildId, opts.id);
  if (a.status === 'sending') throw new UserError('Esa alarma se está enviando justo ahora. Intenta en un minuto.');
  const [ev] = await sql`select * from events where id = ${a.event_id}`;

  const changes = ['message', 'before', 'date', 'time', 'channel', 'mentions', 'repeat'].filter(
    (k) => opts[k] !== undefined && opts[k] !== '',
  );
  if (!changes.length) throw new UserError('No indicaste nada que cambiar.');

  const repeat = opts.repeat ?? a.repeat;
  const timing = computeTiming({ opts, ev, tz: cfg.timezone, current: a });
  let fireAt = timing ? timing.fireAt : new Date(a.fire_at);
  const offset = timing ? timing.offset : a.offset_minutes;
  if (offset != null && repeat !== 'none') {
    throw new UserError('Las alarmas relativas al evento no se repiten. Para repetir, cámbiala a date y time.');
  }

  let status = a.status;
  let resetFails = false;
  if (timing || repeat !== a.repeat) {
    if (status !== 'paused') ({ fireAt } = ensureFuture(fireAt, repeat, cfg.timezone, offset));
    if (['sent', 'missed', 'failed'].includes(status)) status = 'pending';
    resetFails = true;
  }

  const message = opts.message?.trim() || a.message;
  const mentions = opts.mentions !== undefined ? parseMentions(opts.mentions) : a.mentions;
  const channelId = opts.channel || a.channel_id;
  if (opts.channel && a.status === 'failed') status = 'pending';

  const [updated] = await sql`
    update alarms set message = ${message}, mentions = ${sql.json(mentions)}, channel_id = ${channelId},
      fire_at = ${fireAt}, offset_minutes = ${offset}, repeat = ${repeat}, status = ${status},
      fail_count = ${resetFails ? 0 : a.fail_count}
    where id = ${a.id}
    returning *`;
  return text(`✏️ Alarma **#${a.id}** actualizada (${ev.name})\n${alarmSummary(updated)}${STATUS_LABEL[updated.status]}`);
}

async function alarmDelete({ sql, guildId, opts }) {
  const a = await findAlarm(sql, guildId, opts.id);
  await sql`delete from alarms where id = ${a.id}`;
  return text(`🗑️ Alarma **#${a.id}** borrada.`);
}

async function alarmTest({ sql, guildId, opts }) {
  const a = await findAlarm(sql, guildId, opts.id);
  const [ev] = await sql`select * from events where id = ${a.event_id}`;
  const groupMembers = await loadGroupMembers(guildId, a.mentions?.group);
  try {
    await sendMessage(a.channel_id, buildAlarmPayload({ alarm: a, event: ev, groupMembers, test: true }));
  } catch (e) {
    if (e instanceof DiscordError) {
      throw new UserError(
        `No pude enviar en <#${a.channel_id}> (error ${e.status}). Revisa que el bot pueda ver el canal, enviar mensajes e insertar enlaces.`,
      );
    }
    throw e;
  }
  return text(`🧪 Prueba de la alarma **#${a.id}** enviada a <#${a.channel_id}>. Las menciones se muestran pero no notifican.`);
}

async function alarmPause({ sql, guildId, opts }) {
  const a = await findAlarm(sql, guildId, opts.id);
  if (a.status !== 'pending') throw new UserError(`La alarma **#${a.id}** no está activa${STATUS_LABEL[a.status]}.`);
  await sql`update alarms set status = 'paused' where id = ${a.id}`;
  return text(`⏸️ Alarma **#${a.id}** pausada. Reanúdala con \`/alarm resume\`.`);
}

async function alarmResume({ sql, guildId, cfg, opts }) {
  const a = await findAlarm(sql, guildId, opts.id);
  if (a.status !== 'paused') throw new UserError(`La alarma **#${a.id}** no está pausada.`);
  let fireAt = new Date(a.fire_at);
  if (fireAt <= new Date()) {
    if (a.repeat === 'none') {
      throw new UserError(`La hora de la alarma **#${a.id}** ya pasó. Cámbiala con \`/alarm edit\` y luego reanúdala.`);
    }
    fireAt = nextOccurrence(fireAt, a.repeat, cfg.timezone);
  }
  await sql`update alarms set status = 'pending', fire_at = ${fireAt}, fail_count = 0 where id = ${a.id}`;
  return text(`▶️ Alarma **#${a.id}** reanudada. Sonará ${ts(fireAt, 'F')} (${ts(fireAt, 'R')}).`);
}

// ---------- grupos ----------

async function groupCreate({ sql, guildId, opts }) {
  const name = opts.name.trim();
  if (!/^[\p{L}\p{N} _.-]+$/u.test(name)) throw new UserError('Usa solo letras, números, espacios, guiones o puntos en el nombre.');
  const members = parseMembers(opts.members);
  if (!members.users.length && !members.roles.length) {
    throw new UserError('Menciona al menos un usuario o rol, por ejemplo: @Ana @Moderadores');
  }
  const [{ count }] = await sql`select count(*)::int as count from mention_groups where guild_id = ${guildId}`;
  if (count >= MAX_GROUPS) throw new UserError(`Máximo ${MAX_GROUPS} grupos por servidor.`);
  const [row] = await sql`
    insert into mention_groups (guild_id, name, name_key, members)
    values (${guildId}, ${name}, ${name.toLowerCase()}, ${sql.json(members)})
    on conflict (guild_id, name_key) do update set name = excluded.name, members = excluded.members
    returning (xmax = 0) as inserted`;
  const usage = name.includes(' ') ? `group:"${name}"` : `group:${name}`;
  return text(
    `${row.inserted ? '✅ Grupo creado' : '♻️ Grupo reemplazado'}: **${name}** → ${describeMentions(members)}\nÚsalo en las alarmas con \`mentions: ${usage}\`.`,
  );
}

async function groupList({ sql, guildId }) {
  const rows = await sql`select * from mention_groups where guild_id = ${guildId} order by name_key`;
  if (!rows.length) return text('No hay grupos. Crea uno con `/group create`.');
  return card('👥 Grupos de menciones', rows.map((g) => `**${g.name}** → ${describeMentions(g.members)}`).join('\n'));
}

async function groupDelete({ sql, guildId, opts }) {
  const res = await sql`
    delete from mention_groups where guild_id = ${guildId} and name_key = ${opts.name.trim().toLowerCase()}`;
  if (!res.count) throw new UserError(`No existe el grupo **${opts.name}**.`);
  return text(`🗑️ Grupo **${opts.name}** borrado. Las alarmas que lo usaban ya no mencionarán a sus miembros.`);
}

// ---------- agenda, config y ayuda ----------

async function agenda({ sql, guildId, opts }) {
  const days = opts.days || 7;
  const rows = await sql`
    select a.*, e.name as event_name from alarms a join events e on e.id = a.event_id
    where a.guild_id = ${guildId} and a.status = 'pending'
      and a.fire_at <= now() + make_interval(days => ${days}::int)
    order by a.fire_at limit 25`;
  if (!rows.length) return text(`No hay alarmas en los próximos ${days} días.`);
  return card(`📅 Agenda — próximos ${days} días`, rows.map((a) => alarmLine(a, a.event_name)).join('\n'));
}

async function configView({ cfg }) {
  return card('⚙️ Configuración de Kon Planner', [
    `🌎 Zona horaria: **${cfg.timezone}**`,
    `🛡️ Rol organizador: ${cfg.admin_role_id ? `<@&${cfg.admin_role_id}>` : 'no definido (solo quienes pueden gestionar el servidor)'}`,
    `📢 Canal por defecto: ${cfg.default_channel_id ? `<#${cfg.default_channel_id}>` : 'el canal donde se usa el comando'}`,
  ].join('\n'));
}

async function configTimezone({ sql, guildId, opts }) {
  const tz = opts.value.trim();
  if (!isValidZone(tz)) throw new UserError(`"${tz}" no es una zona horaria válida. Ejemplo: America/Santiago`);
  await sql`
    insert into guild_config (guild_id, timezone) values (${guildId}, ${tz})
    on conflict (guild_id) do update set timezone = excluded.timezone`;
  return text(`🌎 Zona horaria: **${tz}**.\nLas fechas que escribas desde ahora se interpretan en esa zona; las alarmas existentes no cambian.`);
}

async function configAdminRole({ sql, guildId, opts }) {
  await sql`
    insert into guild_config (guild_id, timezone, admin_role_id) values (${guildId}, ${DEFAULT_TZ}, ${opts.role})
    on conflict (guild_id) do update set admin_role_id = excluded.admin_role_id`;
  return text(`🛡️ El rol <@&${opts.role}> ahora puede crear y editar eventos, alarmas y grupos.`);
}

async function configDefaultChannel({ sql, guildId, opts }) {
  await sql`
    insert into guild_config (guild_id, timezone, default_channel_id) values (${guildId}, ${DEFAULT_TZ}, ${opts.channel})
    on conflict (guild_id) do update set default_channel_id = excluded.default_channel_id`;
  return text(`📢 Canal por defecto: <#${opts.channel}>.`);
}

async function help() {
  return card('🦁 Kon Planner — ayuda', [
    '**1. Crea un evento**',
    '`/event create name: Torneo date: 2026-10-25 time: 20:30`',
    '',
    '**2. Agrégale alarmas**',
    '• Relativa al evento: `/alarm add event: Torneo before: 1h message: ¡Falta una hora! mentions: everyone`',
    '• Fecha exacta: `/alarm add event: Torneo date: 24/10/2026 time: 18:00 message: Mañana es el torneo`',
    '• Repetitiva: agrega `repeat: Semanal`',
    '',
    '**Menciones:** `everyone`, `here`, `none`, @usuarios, @roles o `group:Nombre`',
    '**Variables:** `{event}` `{start}` `{time_left}` `{description}` · `\\n` = salto de línea',
    '',
    '**Ver:** `/agenda`, `/event view`, `/alarm list`',
    '**Gestionar:** `/alarm edit`, `/alarm test`, `/alarm pause`, `/alarm resume`, `/alarm delete`',
    '**Grupos:** `/group create name: Staff members: @Ana @Moderadores`',
    '**Config:** `/config timezone`, `/config admin-role`, `/config default-channel`',
  ].join('\n'));
}

const HANDLERS = {
  'event create': eventCreate,
  'event list': eventList,
  'event view': eventView,
  'event edit': eventEdit,
  'event delete': eventDelete,
  'alarm add': alarmAdd,
  'alarm list': alarmList,
  'alarm edit': alarmEdit,
  'alarm delete': alarmDelete,
  'alarm test': alarmTest,
  'alarm pause': alarmPause,
  'alarm resume': alarmResume,
  'group create': groupCreate,
  'group list': groupList,
  'group delete': groupDelete,
  agenda,
  'config view': configView,
  'config timezone': configTimezone,
  'config admin-role': configAdminRole,
  'config default-channel': configDefaultChannel,
  help,
};

export async function handleCommand(i) {
  const { sub, opts } = getOptions(i.data);
  const key = sub ? `${i.data.name} ${sub}` : i.data.name;
  const handler = HANDLERS[key];
  if (!handler) throw new UserError('Comando desconocido. Prueba `/help`.');

  const cfg = await getConfig(i.guild_id);
  if (SERVER_ADMIN.has(key) && !canManageServer(i)) {
    throw new UserError('Solo quienes pueden **gestionar el servidor** cambian la configuración.');
  }
  if (WRITE.has(key) && !isOrganizer(i, cfg)) {
    throw new UserError('No tienes permiso para esto. Necesitas "Gestionar servidor" o el rol organizador (`/config view`).');
  }
  return handler({ i, cfg, opts, sql: db(), guildId: i.guild_id, userId: i.member?.user?.id });
}

// ---------- autocompletado ----------

let zones = null;

export async function autocomplete(i) {
  const { sub } = getOptions(i.data);
  const list = i.data.options?.[0]?.type === 1 ? i.data.options[0].options || [] : i.data.options || [];
  const focused = list.find((o) => o.focused);
  if (!focused) return [];
  const q = String(focused.value || '').trim().toLowerCase();
  const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;

  if (focused.name === 'event') {
    const rows = await db()`
      select name from events where guild_id = ${i.guild_id} and name_key like ${like}
      order by starts_at < now(), abs(extract(epoch from starts_at - now())) nulls last, name_key limit 25`;
    return rows.map((r) => ({ name: r.name, value: r.name }));
  }
  if (focused.name === 'id') {
    const tz = (await getConfig(i.guild_id)).timezone;
    const rows = await db()`
      select a.id, a.fire_at, a.status, a.repeat, a.offset_minutes, e.name
      from alarms a join events e on e.id = a.event_id
      where a.guild_id = ${i.guild_id} and (a.id::text like ${q + '%'} or e.name_key like ${like})
      order by a.status not in ('pending','paused'), a.fire_at limit 25`;
    return rows.map((a) => {
      const when = DateTime.fromJSDate(new Date(a.fire_at), { zone: tz }).setLocale('es').toFormat('d LLL HH:mm');
      const extra = a.offset_minutes != null ? formatOffset(a.offset_minutes) : a.repeat !== 'none' ? REPEAT_LABEL[a.repeat] : '';
      const label = [`#${a.id}`, a.name, when, extra].filter(Boolean).join(' · ') + STATUS_LABEL[a.status];
      return { name: label.slice(0, 100), value: a.id };
    });
  }
  if (i.data.name === 'group' && sub === 'delete' && focused.name === 'name') {
    const rows = await db()`
      select name from mention_groups where guild_id = ${i.guild_id} and name_key like ${like} order by name_key limit 25`;
    return rows.map((r) => ({ name: r.name, value: r.name }));
  }
  if (i.data.name === 'config' && focused.name === 'value') {
    zones ??= Intl.supportedValuesOf('timeZone');
    const pool = q ? zones.filter((z) => z.toLowerCase().includes(q)) : ['America/Santiago', 'UTC', ...zones];
    return [...new Set(pool)].slice(0, 25).map((z) => ({ name: z, value: z }));
  }
  return [];
}
