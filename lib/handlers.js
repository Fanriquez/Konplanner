import { db, getConfig, loadGroupMembers } from './db.js';
import { DateTime } from 'luxon';
import { UserError } from './errors.js';
import { lang, t } from './i18n.js';
import {
  DEFAULT_TZ, formatOffset, isValidZone, nextOccurrence, parseOffset, repeatLabel, resolveDateTime, ts,
} from './time.js';
import { describeMentions, parseMembers, parseMentions } from './mentions.js';
import { COLOR, buildAlarmPayload } from './render.js';
import { DiscordError, sendMessage } from './discord.js';
import { buildSchedule, dayRange } from './schedule.js';

const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;
const MAX_EVENTS = 100;
const MAX_ALARMS = 300;
const MAX_GROUPS = 50;
const MAX_OFFSET = 365 * 1440;

const statusLabel = (L, status) => (status === 'pending' ? '' : t(L, `status_${status}`));

// Comandos que modifican datos: requieren "Gestionar servidor" o el rol organizador.
const WRITE = new Set([
  'event create', 'event edit', 'event delete',
  'alarm add', 'alarm edit', 'alarm delete', 'alarm test', 'alarm pause', 'alarm resume',
  'group create', 'group delete',
]);
// Configuración: solo "Gestionar servidor" (para que el rol organizador no pueda auto-asignarse más poder).
const SERVER_ADMIN = new Set([
  'config timezone', 'config admin-role', 'config default-channel', 'config daily-summary', 'config daily-summary-off',
]);

// ---------- utilidades ----------

const yes = (v) => v === 'yes' || v === true;

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
const card = (L, title, description, extra = {}) => ({
  embeds: [{ title, description: fitLines(L, String(description).split('\n')), color: COLOR, ...extra }],
});

// Recorta por líneas completas para no cortar una mención o fecha de Discord a la mitad.
function fitLines(L, lines, max = 4000) {
  let out = '';
  for (let k = 0; k < lines.length; k++) {
    const next = out ? `${out}\n${lines[k]}` : lines[k];
    if (next.length > max - 40) return `${out}\n${t(L, 'more_lines', { n: lines.length - k })}`;
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
  if (!ev) throw new UserError('event_not_found', { name });
  return ev;
}

async function findAlarm(sql, guildId, id) {
  const [a] = await sql`select * from alarms where id = ${id} and guild_id = ${guildId}`;
  if (!a) throw new UserError('alarm_not_found', { id });
  return a;
}

const repeatText = (L, a) =>
  repeatLabel(L, a.repeat, a.repeat_every) + (a.repeat_until ? t(L, 'until_suffix', { date: ts(a.repeat_until, 'd') }) : '');

/** "2026-12-15" → fin de ese día (zona del servidor). "nunca" → null. */
function parseUntil(str, tz) {
  if (/^(nunca|never|none|no|mai|nie|niemals)$/i.test(String(str).trim())) return null;
  return resolveDateTime({ date: str, time: '23:59', tz });
}

function checkUntil(fireAt, until) {
  if (until && fireAt > until) {
    throw new UserError('until_after', { fire: ts(fireAt, 'f'), until: ts(until, 'd') });
  }
}

function alarmLine(L, a, eventName = null) {
  const parts = [
    `**#${a.id}**`,
    eventName ? `**${eventName}**` : null,
    `${ts(a.fire_at, 'f')} (${ts(a.fire_at, 'R')})`,
    a.offset_minutes != null ? formatOffset(L, a.offset_minutes) : null,
    `<#${a.channel_id}>`,
    describeMentions(L, a.mentions),
    a.repeat !== 'none' ? `🔁 ${repeatText(L, a)}` : null,
  ].filter(Boolean);
  const msg = clean(a.message);
  return `${parts.join(' · ')}${statusLabel(L, a.status)}\n> ${msg.length > 90 ? msg.slice(0, 87) + '…' : msg}`;
}

function alarmSummary(L, a) {
  return [
    `🕒 ${ts(a.fire_at, 'F')} (${ts(a.fire_at, 'R')})${a.offset_minutes != null ? ` — ${formatOffset(L, a.offset_minutes)}` : ''}`,
    `📢 <#${a.channel_id}>`,
    `👥 ${describeMentions(L, a.mentions)}`,
    `🔁 ${repeatText(L, a)}`,
    a.in_schedule ? null : t(L, 'hidden_from_schedule'),
  ].filter(Boolean).join('\n');
}

/**
 * Calcula cuándo suena la alarma según before (relativo) o date/time (fecha exacta).
 * Devuelve null si no se indicó ninguna de las dos.
 */
function computeTiming({ opts, ev, tz, current = null }) {
  const hasBefore = opts.before != null && String(opts.before).trim() !== '';
  const hasAbs = Boolean(opts.date || opts.time);
  if (hasBefore && hasAbs) {
    throw new UserError('before_and_abs');
  }
  if (hasBefore) {
    if (!ev.starts_at) {
      throw new UserError('no_start', { name: ev.name });
    }
    const offset = parseOffset(opts.before);
    if (offset == null) throw new UserError('bad_offset', { value: opts.before });
    if (offset > MAX_OFFSET) throw new UserError('max_offset');
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
function ensureFuture(fireAt, repeat, tz, offset, every = 1) {
  if (fireAt.getTime() > Date.now()) return { fireAt, moved: false };
  if (repeat !== 'none') return { fireAt: nextOccurrence(fireAt, repeat, tz, new Date(), every), moved: true };
  if (offset != null) {
    throw new UserError('past_before', { when: ts(fireAt, 'f') });
  }
  throw new UserError('past', { when: ts(fireAt, 'f') });
}

// ---------- eventos ----------

async function eventCreate({ L, sql, guildId, userId, cfg, opts }) {
  const name = opts.name.trim();
  if (!name) throw new UserError('name_empty');
  const [{ count }] = await sql`select count(*)::int as count from events where guild_id = ${guildId}`;
  if (count >= MAX_EVENTS) throw new UserError('max_events', { max: MAX_EVENTS });

  const startsAt = opts.date || opts.time ? resolveDateTime({ date: opts.date, time: opts.time, tz: cfg.timezone }) : null;
  let ev;
  try {
    [ev] = await sql`
      insert into events (guild_id, name, name_key, description, starts_at, created_by)
      values (${guildId}, ${name}, ${name.toLowerCase()}, ${opts.description || null}, ${startsAt}, ${userId})
      returning *`;
  } catch (e) {
    if (e.code === '23505') throw new UserError('event_exists', { name });
    throw e;
  }
  const lines = [t(L, 'event_created', { name: ev.name })];
  if (startsAt) {
    lines.push(t(L, 'starts', { when: `${ts(startsAt, 'F')} (${ts(startsAt, 'R')})` }));
    if (startsAt < new Date()) lines.push(t(L, 'date_passed'));
  } else {
    lines.push(t(L, 'no_start_hint'));
  }
  lines.push(t(L, 'add_alarms_hint'));
  return text(lines.join('\n'));
}

async function eventList({ L, sql, guildId }) {
  const rows = await sql`
    select e.*,
      count(a.id) filter (where a.status in ('pending','paused'))::int as active,
      count(a.id)::int as total
    from events e left join alarms a on a.event_id = e.id
    where e.guild_id = ${guildId}
    group by e.id
    order by e.starts_at nulls last, e.name`;
  if (!rows.length) return text(t(L, 'no_events'));
  const lines = rows.map((e) =>
    t(L, 'event_list_line', {
      name: e.name, when: e.starts_at ? ts(e.starts_at, 'f') : t(L, 'no_date'), active: e.active, total: e.total,
    }),
  );
  return card(L, t(L, 'events_title', { n: rows.length }), lines.join('\n'));
}

async function eventView({ L, sql, guildId, opts }) {
  const ev = await findEvent(sql, guildId, opts.event);
  const alarms = await sql`select * from alarms where event_id = ${ev.id} order by fire_at`;
  const head = [
    ev.description ? `${ev.description}\n` : null,
    `🗓️ ${ev.starts_at ? `${ts(ev.starts_at, 'F')} (${ts(ev.starts_at, 'R')})` : t(L, 'no_start_date')}`,
    '',
    alarms.length ? t(L, 'alarms_count', { n: alarms.length }) : t(L, 'no_alarms_hint'),
  ].filter((x) => x !== null);
  return card(L, `📌 ${ev.name}`, [...head, ...alarms.map((a) => alarmLine(L, a))].join('\n'));
}

async function eventEdit({ L, sql, guildId, cfg, opts }) {
  const ev = await findEvent(sql, guildId, opts.event);
  const newName = opts.new_name?.trim() || ev.name;
  const description = opts.description !== undefined ? opts.description : ev.description;
  let startsAt = ev.starts_at;
  if (opts.date || opts.time) {
    startsAt = resolveDateTime({ date: opts.date, time: opts.time, tz: cfg.timezone, base: ev.starts_at });
  }
  if (newName === ev.name && description === ev.description && startsAt === ev.starts_at) {
    throw new UserError('nothing_to_change');
  }

  try {
    await sql`
      update events set name = ${newName}, name_key = ${newName.toLowerCase()},
        description = ${description}, starts_at = ${startsAt}
      where id = ${ev.id}`;
  } catch (e) {
    if (e.code === '23505') throw new UserError('event_exists', { name: newName });
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

  const lines = [t(L, 'event_updated', { name: newName })];
  if (startsAt) lines.push(t(L, 'starts', { when: `${ts(startsAt, 'F')} (${ts(startsAt, 'R')})` }));
  if (moved) lines.push(t(L, 'moved_alarms', { n: moved }));
  return text(lines.join('\n'));
}

async function eventDelete({ L, sql, guildId, opts }) {
  const ev = await findEvent(sql, guildId, opts.event);
  const [{ count }] = await sql`select count(*)::int as count from alarms where event_id = ${ev.id}`;
  await sql`delete from events where id = ${ev.id}`;
  return text(t(L, 'event_deleted', { name: ev.name, n: count }));
}

// ---------- alarmas ----------

async function alarmAdd({ L, sql, i, guildId, userId, cfg, opts }) {
  const ev = await findEvent(sql, guildId, opts.event);
  const repeat = opts.repeat || (opts.every > 1 ? 'daily' : 'none');
  const every = repeat === 'none' ? 1 : opts.every || 1;
  const until = opts.until ? parseUntil(opts.until, cfg.timezone) : null;
  if (until && repeat === 'none') throw new UserError('until_needs_repeat');
  const message = opts.message.trim();
  if (!message) throw new UserError('message_empty');
  const mentions = parseMentions(opts.mentions);
  const channelId = opts.channel || cfg.default_channel_id || i.channel_id;

  const timing = computeTiming({ opts, ev, tz: cfg.timezone });
  if (!timing) throw new UserError('when_missing');
  if (timing.offset != null && repeat !== 'none') throw new UserError('relative_no_repeat');
  const { fireAt, moved } = ensureFuture(timing.fireAt, repeat, cfg.timezone, timing.offset, every);
  checkUntil(fireAt, until);

  const [{ count }] = await sql`
    select count(*)::int as count from alarms where guild_id = ${guildId} and status in ('pending','paused')`;
  if (count >= MAX_ALARMS) throw new UserError('max_alarms', { max: MAX_ALARMS });

  const [a] = await sql`
    insert into alarms (guild_id, event_id, channel_id, message, mentions, fire_at, offset_minutes, repeat, repeat_every, repeat_until, in_schedule, created_by)
    values (${guildId}, ${ev.id}, ${channelId}, ${message}, ${sql.json(mentions)}, ${fireAt},
            ${timing.offset}, ${repeat}, ${every}, ${until}, ${opts.schedule === undefined || yes(opts.schedule)}, ${userId})
    returning *`;

  const notes = [];
  if (moved) notes.push(t(L, 'first_moved'));
  if (mentions.group && !(await loadGroupMembers(guildId, mentions.group))) {
    notes.push(t(L, 'group_missing', { name: mentions.group }));
  }
  return text([t(L, 'alarm_created', { id: a.id, event: ev.name }), alarmSummary(L, a), ...notes].join('\n'));
}

async function alarmList({ L, sql, guildId, opts }) {
  if (opts.event) {
    const ev = await findEvent(sql, guildId, opts.event);
    const rows = await sql`select * from alarms where event_id = ${ev.id} order by fire_at limit 30`;
    if (!rows.length) return text(t(L, 'event_no_alarms', { name: ev.name }));
    return card(L, t(L, 'alarms_of', { name: ev.name }), rows.map((a) => alarmLine(L, a)).join('\n'));
  }
  const rows = await sql`
    select a.*, e.name as event_name from alarms a join events e on e.id = a.event_id
    where a.guild_id = ${guildId} and a.status in ('pending','paused')
    order by a.fire_at limit 25`;
  if (!rows.length) return text(t(L, 'no_active_alarms'));
  return card(L, t(L, 'upcoming_alarms'), rows.map((a) => alarmLine(L, a, a.event_name)).join('\n'));
}

async function alarmEdit({ L, sql, guildId, cfg, opts }) {
  const a = await findAlarm(sql, guildId, opts.id);
  if (a.status === 'sending') throw new UserError('alarm_sending');
  const [ev] = await sql`select * from events where id = ${a.event_id}`;

  const changes = ['message', 'before', 'date', 'time', 'channel', 'mentions', 'repeat', 'every', 'until', 'schedule'].filter(
    (k) => opts[k] !== undefined && opts[k] !== '',
  );
  if (!changes.length) throw new UserError('nothing_to_change');

  const repeat = opts.repeat ?? (opts.every > 1 && a.repeat === 'none' ? 'daily' : a.repeat);
  const every = repeat === 'none' ? 1 : opts.every ?? a.repeat_every;
  const until = repeat === 'none' ? null : opts.until ? parseUntil(opts.until, cfg.timezone) : a.repeat_until;
  const timing = computeTiming({ opts, ev, tz: cfg.timezone, current: a });
  let fireAt = timing ? timing.fireAt : new Date(a.fire_at);
  const offset = timing ? timing.offset : a.offset_minutes;
  if (offset != null && repeat !== 'none') throw new UserError('relative_no_repeat');

  let status = a.status;
  let resetFails = false;
  if (timing || repeat !== a.repeat || every !== a.repeat_every || opts.until) {
    if (status !== 'paused') {
      ({ fireAt } = ensureFuture(fireAt, repeat, cfg.timezone, offset, every));
      checkUntil(fireAt, until);
    }
    if (['sent', 'missed', 'failed'].includes(status)) status = 'pending';
    resetFails = true;
  }

  const message = opts.message?.trim() || a.message;
  const mentions = opts.mentions !== undefined ? parseMentions(opts.mentions) : a.mentions;
  const channelId = opts.channel || a.channel_id;
  if (opts.channel && a.status === 'failed') status = 'pending';

  const [updated] = await sql`
    update alarms set message = ${message}, mentions = ${sql.json(mentions)}, channel_id = ${channelId},
      fire_at = ${fireAt}, offset_minutes = ${offset}, repeat = ${repeat}, repeat_every = ${every}, repeat_until = ${until}, in_schedule = ${opts.schedule === undefined ? a.in_schedule : yes(opts.schedule)}, status = ${status},
      fail_count = ${resetFails ? 0 : a.fail_count}
    where id = ${a.id}
    returning *`;
  return text(`${t(L, 'alarm_updated', { id: a.id, event: ev.name })}\n${alarmSummary(L, updated)}${statusLabel(L, updated.status)}`);
}

async function alarmDelete({ L, sql, guildId, opts }) {
  const a = await findAlarm(sql, guildId, opts.id);
  await sql`delete from alarms where id = ${a.id}`;
  return text(t(L, 'alarm_deleted', { id: a.id }));
}

async function alarmTest({ L, sql, guildId, opts }) {
  const a = await findAlarm(sql, guildId, opts.id);
  const [ev] = await sql`select * from events where id = ${a.event_id}`;
  const groupMembers = await loadGroupMembers(guildId, a.mentions?.group);
  try {
    await sendMessage(a.channel_id, buildAlarmPayload({ alarm: a, event: ev, groupMembers, test: true, L }));
  } catch (e) {
    if (e instanceof DiscordError) {
      throw new UserError('send_failed', { channel: `<#${a.channel_id}>`, status: e.status });
    }
    throw e;
  }
  return text(t(L, 'test_sent', { id: a.id, channel: `<#${a.channel_id}>` }));
}

async function alarmPause({ L, sql, guildId, opts }) {
  const a = await findAlarm(sql, guildId, opts.id);
  if (a.status !== 'pending') throw new UserError('not_active', { id: a.id, status: statusLabel(L, a.status) });
  await sql`update alarms set status = 'paused' where id = ${a.id}`;
  return text(t(L, 'paused', { id: a.id }));
}

async function alarmResume({ L, sql, guildId, cfg, opts }) {
  const a = await findAlarm(sql, guildId, opts.id);
  if (a.status !== 'paused') throw new UserError('not_paused', { id: a.id });
  let fireAt = new Date(a.fire_at);
  if (fireAt <= new Date()) {
    if (a.repeat === 'none') {
      throw new UserError('resume_past', { id: a.id });
    }
    fireAt = nextOccurrence(fireAt, a.repeat, cfg.timezone, new Date(), a.repeat_every);
  }
  checkUntil(fireAt, a.repeat_until);
  await sql`update alarms set status = 'pending', fire_at = ${fireAt}, fail_count = 0 where id = ${a.id}`;
  return text(t(L, 'resumed', { id: a.id, when: `${ts(fireAt, 'F')} (${ts(fireAt, 'R')})` }));
}

// ---------- grupos ----------

async function groupCreate({ L, sql, guildId, opts }) {
  const name = opts.name.trim();
  if (!/^[\p{L}\p{N} _.-]+$/u.test(name)) throw new UserError('group_bad_name');
  const members = parseMembers(opts.members);
  if (!members.users.length && !members.roles.length) throw new UserError('group_need_members');
  const [{ count }] = await sql`select count(*)::int as count from mention_groups where guild_id = ${guildId}`;
  if (count >= MAX_GROUPS) throw new UserError('max_groups', { max: MAX_GROUPS });
  const [row] = await sql`
    insert into mention_groups (guild_id, name, name_key, members)
    values (${guildId}, ${name}, ${name.toLowerCase()}, ${sql.json(members)})
    on conflict (guild_id, name_key) do update set name = excluded.name, members = excluded.members
    returning (xmax = 0) as inserted`;
  const usage = name.includes(' ') ? `group:"${name}"` : `group:${name}`;
  return text(
    `${t(L, row.inserted ? 'group_created' : 'group_replaced')}: **${name}** → ${describeMentions(L, members)}\n${t(L, 'group_usage', { usage })}`,
  );
}

async function groupList({ L, sql, guildId }) {
  const rows = await sql`select * from mention_groups where guild_id = ${guildId} order by name_key`;
  if (!rows.length) return text(t(L, 'no_groups'));
  return card(L, t(L, 'groups_title'), rows.map((g) => `**${g.name}** → ${describeMentions(L, g.members)}`).join('\n'));
}

async function groupDelete({ L, sql, guildId, opts }) {
  const res = await sql`
    delete from mention_groups where guild_id = ${guildId} and name_key = ${opts.name.trim().toLowerCase()}`;
  if (!res.count) throw new UserError('group_not_found', { name: opts.name });
  return text(t(L, 'group_deleted', { name: opts.name }));
}

// ---------- agenda, config y ayuda ----------

async function agenda({ L, sql, guildId, opts }) {
  const days = opts.days || 7;
  const rows = await sql`
    select a.*, e.name as event_name from alarms a join events e on e.id = a.event_id
    where a.guild_id = ${guildId} and a.status = 'pending'
      and a.fire_at <= now() + make_interval(days => ${days}::int)
    order by a.fire_at limit 25`;
  if (!rows.length) return text(t(L, 'agenda_empty', { days }));
  return card(L, t(L, 'agenda_title', { days }), rows.map((a) => alarmLine(L, a, a.event_name)).join('\n'));
}

async function configView({ L, cfg }) {
  return card(L, t(L, 'config_title'), [
    t(L, 'cfg_tz', { tz: cfg.timezone }),
    t(L, 'cfg_role', { role: cfg.admin_role_id ? `<@&${cfg.admin_role_id}>` : t(L, 'cfg_role_none') }),
    t(L, 'cfg_channel', { channel: cfg.default_channel_id ? `<#${cfg.default_channel_id}>` : t(L, 'cfg_channel_none') }),
    t(L, 'cfg_summary', {
      value: cfg.summary_channel_id
        ? `<#${cfg.summary_channel_id}> · ${cfg.summary_time} · ${describeMentions(L, cfg.summary_mentions || {})}`
        : t(L, 'cfg_summary_none'),
    }),
  ].join('\n'));
}

async function configTimezone({ L, sql, guildId, opts }) {
  const tz = opts.value.trim();
  if (!isValidZone(tz)) throw new UserError('bad_tz', { tz });
  await sql`
    insert into guild_config (guild_id, timezone) values (${guildId}, ${tz})
    on conflict (guild_id) do update set timezone = excluded.timezone`;
  return text(t(L, 'tz_set', { tz }));
}

async function configAdminRole({ L, sql, guildId, opts }) {
  await sql`
    insert into guild_config (guild_id, timezone, admin_role_id) values (${guildId}, ${DEFAULT_TZ}, ${opts.role})
    on conflict (guild_id) do update set admin_role_id = excluded.admin_role_id`;
  return text(t(L, 'role_set', { role: `<@&${opts.role}>` }));
}

async function configDefaultChannel({ L, sql, guildId, opts }) {
  await sql`
    insert into guild_config (guild_id, timezone, default_channel_id) values (${guildId}, ${DEFAULT_TZ}, ${opts.channel})
    on conflict (guild_id) do update set default_channel_id = excluded.default_channel_id`;
  return text(t(L, 'channel_set', { channel: `<#${opts.channel}>` }));
}

async function configDailySummary({ L, sql, guildId, cfg, opts }) {
  // Valida la hora y la deja como "HH:mm".
  const at = DateTime.fromJSDate(resolveDateTime({ date: 'today', time: opts.time, tz: cfg.timezone }), { zone: cfg.timezone });
  const time = at.toFormat('HH:mm');
  const mentions = opts.mentions ? parseMentions(opts.mentions) : {};
  // Si la hora de hoy ya pasó, empieza mañana (no se envía de golpe al configurarlo).
  const lastDate = at.toJSDate() <= new Date() ? at.toISODate() : null;
  await sql`
    insert into guild_config (guild_id, timezone, summary_channel_id, summary_time, summary_mentions, summary_last_date)
    values (${guildId}, ${cfg.timezone}, ${opts.channel}, ${time}, ${sql.json(mentions)}, ${lastDate})
    on conflict (guild_id) do update set summary_channel_id = excluded.summary_channel_id,
      summary_time = excluded.summary_time, summary_mentions = excluded.summary_mentions,
      summary_last_date = excluded.summary_last_date`;
  return text(t(L, 'summary_set', {
    channel: `<#${opts.channel}>`, time, tz: cfg.timezone, mentions: describeMentions(L, mentions),
  }));
}

async function configDailySummaryOff({ L, sql, guildId, cfg }) {
  if (!cfg.summary_channel_id) throw new UserError('summary_not_set');
  await sql`update guild_config set summary_channel_id = null where guild_id = ${guildId}`;
  return text(t(L, 'summary_off'));
}

async function schedule({ L, i, sql, guildId, cfg, opts }) {
  const days = opts.days || 7;
  const isPublic = yes(opts.public);
  if (isPublic && !isOrganizer(i, cfg)) throw new UserError('public_needs_organizer');
  const { from, to } = dayRange(cfg.timezone, days);
  const lines = await buildSchedule(guildId, cfg.timezone, from, to);
  if (!lines.length) return text(t(L, 'schedule_empty', { days }));
  if (!isPublic) return card(L, t(L, 'schedule_title', { days }), lines.join('\n'));
  // Versión pública: sin título fijo (lo ve todo el canal) y sin notificar a nadie.
  try {
    await sendMessage(i.channel_id, {
      embeds: [{ description: fitLines(L, lines), color: COLOR }],
      allowed_mentions: { parse: [] },
    });
  } catch (e) {
    if (e instanceof DiscordError) throw new UserError('send_failed', { channel: `<#${i.channel_id}>`, status: e.status });
    throw e;
  }
  return text(t(L, 'schedule_posted', { channel: `<#${i.channel_id}>` }));
}

async function now({ L, cfg }) {
  const current = DateTime.now().setZone(cfg.timezone);
  const next = current.plus({ hours: 1 }).startOf('hour');
  return text([
    t(L, 'now_server', { tz: cfg.timezone, time: current.toFormat('yyyy-MM-dd HH:mm') }),
    t(L, 'now_yours', { time: ts(current.toJSDate(), 'F') }),
    '',
    t(L, 'now_hint', { example: `date: ${next.toFormat('yyyy-MM-dd')} time: ${next.toFormat('HH:mm')}`, rel: ts(next.toJSDate(), 'R') }),
  ].join('\n'));
}

async function help({ L }) {
  return card(L, t(L, 'help_title'), t(L, 'help_body'));
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
  'config daily-summary': configDailySummary,
  'config daily-summary-off': configDailySummaryOff,
  schedule,
  now,
  help,
};

export async function handleCommand(i) {
  const { sub, opts } = getOptions(i.data);
  const key = sub ? `${i.data.name} ${sub}` : i.data.name;
  const handler = HANDLERS[key];
  if (!handler) throw new UserError('unknown_command');

  const cfg = await getConfig(i.guild_id);
  if (SERVER_ADMIN.has(key) && !canManageServer(i)) {
    throw new UserError('need_manage');
  }
  if (WRITE.has(key) && !isOrganizer(i, cfg)) {
    throw new UserError('no_permission');
  }
  return handler({ L: lang(i.locale), i, cfg, opts, sql: db(), guildId: i.guild_id, userId: i.member?.user?.id });
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
    const L = lang(i.locale);
    const rows = await db()`
      select a.id, a.fire_at, a.status, a.repeat, a.repeat_every, a.offset_minutes, e.name
      from alarms a join events e on e.id = a.event_id
      where a.guild_id = ${i.guild_id} and (a.id::text like ${q + '%'} or e.name_key like ${like})
      order by a.status not in ('pending','paused'), a.fire_at limit 25`;
    return rows.map((a) => {
      const when = DateTime.fromJSDate(new Date(a.fire_at), { zone: tz }).setLocale(L).toFormat('d LLL HH:mm');
      const extra = a.offset_minutes != null ? formatOffset(L, a.offset_minutes) : a.repeat !== 'none' ? repeatLabel(L, a.repeat, a.repeat_every) : '';
      const label = [`#${a.id}`, a.name, when, extra].filter(Boolean).join(' · ') + statusLabel(L, a.status);
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
