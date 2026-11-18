import { db, getConfig, loadGroupMembers } from './db.js';
import { DateTime } from 'luxon';
import { UserError } from './errors.js';
import { lang, t } from './i18n.js';
import {
  DEFAULT_TZ, dayLabel, formatOffset, isValidZone, nextForAlarm, nextOccurrence, parseOffset, utcTime, repeatLabel, resolveDateTime, ts,
} from './time.js';
import { describeMentions, parseMembers, parseMentions } from './mentions.js';
import { COLOR, buildAlarmPayload } from './render.js';
import { DiscordError, sendMessage } from './discord.js';
import { buildSchedule, dayRange } from './schedule.js';
import { DEFAULT_REMINDERS, DEFAULT_START_MESSAGE, applyTemplateToFuture, createOccurrence, materializePlans } from './templates.js';
import { refreshLive } from './live.js';
import { detectPatterns } from './patterns.js';
import { panelCommand, setupCommand } from './ui.js';

const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;
const MAX_EVENTS = 100; // eventos creados a mano (los horarios de plantilla se limpian solos)
const MAX_TEMPLATES = 50;
const MAX_TIMES = 10;
const MAX_ALARMS = 300;
const MAX_GROUPS = 50;
const MAX_OFFSET = 365 * 1440;

const statusLabel = (L, status) => (status === 'pending' ? '' : t(L, `status_${status}`));

// Comandos que modifican datos: requieren "Gestionar servidor" o el rol organizador.
const WRITE = new Set([
  'event create', 'event edit', 'event delete',
  'alarm add', 'alarm edit', 'alarm delete', 'alarm test', 'alarm pause', 'alarm resume',
  'group create', 'group delete',
  'template create', 'template delete', 'plan', 'plans stop', 'plans skip', 'panel', 'panel check',
]);
// Comandos que cambian el cronograma: después se actualiza el cronograma fijado.
const CHANGES_SCHEDULE = new Set([...WRITE].filter((k) => !k.startsWith('panel')));
// Configuración: solo "Gestionar servidor" (para que el rol organizador no pueda auto-asignarse más poder).
const SERVER_ADMIN = new Set([
  'config timezone', 'config admin-role', 'config default-channel', 'config daily-summary', 'config daily-summary-off',
  'config live-schedule', 'config live-schedule-off', 'setup',
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

/** Cuándo es un evento: "📌 Thursday 20/11 · todo el día" o "16:00 UTC · <fecha local> (en 2 horas)". */
function whenText(L, ev, tz, style = 'F') {
  if (ev.all_day) return `📌 ${dayLabel(ev.starts_at, tz)} · ${t(L, 'no_time')}`;
  const at = new Date(ev.starts_at);
  return `${utcTime(at)} · ${ts(at, style)}${style === 'F' ? ` (${ts(at, 'R')})` : ''}`;
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
  repeatLabel(L, a.repeat, a.repeat_every, a.run_days) + (a.repeat_until ? t(L, 'until_suffix', { date: ts(a.repeat_until, 'd') }) : '');

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
    `${utcTime(a.fire_at)} · ${ts(a.fire_at, 'f')} (${ts(a.fire_at, 'R')})`,
    a.offset_minutes != null ? formatOffset(L, a.offset_minutes) : null,
    `<#${a.channel_id}>`,
    `${a.via_dm ? '📩 ' : ''}${describeMentions(L, a.mentions)}`,
    a.repeat !== 'none' ? `🔁 ${repeatText(L, a)}` : null,
  ].filter(Boolean);
  const msg = clean(a.message);
  return `${parts.join(' · ')}${statusLabel(L, a.status)}\n> ${msg.length > 90 ? msg.slice(0, 87) + '…' : msg}`;
}

function alarmSummary(L, a) {
  return [
    `🕒 ${utcTime(a.fire_at)} · ${ts(a.fire_at, 'F')} (${ts(a.fire_at, 'R')})${a.offset_minutes != null ? ` — ${formatOffset(L, a.offset_minutes)}` : ''}`,
    `📢 <#${a.channel_id}>`,
    `👥 ${describeMentions(L, a.mentions)}`,
    `🔁 ${repeatText(L, a)}`,
    a.in_schedule ? null : t(L, 'hidden_from_schedule'),
    a.via_dm ? t(L, 'alarm_via_dm') : null,
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

/** days (días seguidos) solo con every (cada cuántos días empieza el ciclo). */
function checkRunDays(runDays, repeat, every) {
  if (runDays <= 1) return;
  if (repeat !== 'daily' || every <= 1) throw new UserError('days_needs_every');
  if (runDays > every) throw new UserError('days_gt_every', { days: runDays, every });
}

/** Valida que la hora sea futura; si la alarma se repite, avanza a la próxima repetición. */
function ensureFuture(fireAt, repeat, tz, offset, every = 1, runDays = 1, anchor = null) {
  if (fireAt.getTime() > Date.now()) return { fireAt, moved: false };
  if (repeat !== 'none') return { fireAt: nextOccurrence(fireAt, repeat, tz, new Date(), every, runDays, anchor), moved: true };
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

  // Con fecha y sin hora: evento de todo el día (ej. Shutdown, "recuerden registrarse").
  const allDay = Boolean(opts.date && !opts.time);
  const startsAt = opts.date || opts.time
    ? resolveDateTime({ date: opts.date, time: allDay ? '00:00' : opts.time, tz: cfg.timezone })
    : null;
  let ev;
  try {
    [ev] = await sql`
      insert into events (guild_id, name, name_key, description, starts_at, all_day, created_by)
      values (${guildId}, ${name}, ${name.toLowerCase()}, ${opts.description || null}, ${startsAt}, ${allDay}, ${userId})
      returning *`;
  } catch (e) {
    if (e.code === '23505') throw new UserError('event_exists', { name });
    throw e;
  }
  const lines = [t(L, 'event_created', { name: ev.name })];
  if (startsAt) {
    lines.push(t(L, 'starts', { when: whenText(L, ev, cfg.timezone) }));
    const end = allDay ? DateTime.fromJSDate(startsAt, { zone: cfg.timezone }).plus({ days: 1 }).toJSDate() : startsAt;
    if (end < new Date()) lines.push(t(L, 'date_passed'));
  } else {
    lines.push(t(L, 'no_start_hint'));
  }
  lines.push(t(L, allDay ? 'all_day_alarm_hint' : 'add_alarms_hint', { name: ev.name }));
  return text(lines.join('\n'));
}

async function eventList({ L, sql, guildId, cfg }) {
  const rows = await sql`
    select e.*,
      count(a.id) filter (where a.status in ('pending','paused'))::int as active,
      count(a.id)::int as total
    from events e left join alarms a on a.event_id = e.id
    where e.guild_id = ${guildId}
      and (e.template_id is null or e.starts_at > now() or (e.all_day and e.starts_at > now() - interval '1 day'))
    group by e.id
    order by e.starts_at nulls last, e.name`;
  if (!rows.length) return text(t(L, 'no_events'));
  const lines = rows.map((e) =>
    t(L, 'event_list_line', {
      name: e.name, when: e.starts_at ? whenText(L, e, cfg.timezone, 'f') : t(L, 'no_date'), active: e.active, total: e.total,
    }),
  );
  return card(L, t(L, 'events_title', { n: rows.length }), lines.join('\n'));
}

async function eventView({ L, sql, guildId, cfg, opts }) {
  const ev = await findEvent(sql, guildId, opts.event);
  const alarms = await sql`select * from alarms where event_id = ${ev.id} order by fire_at`;
  const head = [
    ev.description ? `${ev.description}\n` : null,
    `🗓️ ${ev.starts_at ? whenText(L, ev, cfg.timezone) : t(L, 'no_start_date')}`,
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
  // Un evento de todo el día sigue siéndolo si solo cambia la fecha; con hora pasa a tener hora.
  let allDay = ev.all_day;
  if (opts.time) allDay = false;
  else if (opts.date && !ev.starts_at) allDay = true;
  if (opts.date || opts.time) {
    startsAt = resolveDateTime({ date: opts.date, time: allDay ? '00:00' : opts.time, tz: cfg.timezone, base: ev.starts_at });
  }
  if (newName === ev.name && description === ev.description && startsAt === ev.starts_at) {
    throw new UserError('nothing_to_change');
  }

  try {
    await sql`
      update events set name = ${newName}, name_key = ${newName.toLowerCase()},
        description = ${description}, starts_at = ${startsAt}, all_day = ${allDay}
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
  if (startsAt) lines.push(t(L, 'starts', { when: whenText(L, { all_day: allDay, starts_at: startsAt }, cfg.timezone) }));
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
  const runDays = opts.days || 1;
  checkRunDays(runDays, repeat, every);
  const until = opts.until ? parseUntil(opts.until, cfg.timezone) : null;
  if (until && repeat === 'none') throw new UserError('until_needs_repeat');
  const message = opts.message.trim();
  if (!message) throw new UserError('message_empty');
  const mentions = parseMentions(opts.mentions);
  const viaDm = yes(opts.dm);
  if (viaDm && !mentions.users.length && !mentions.group) throw new UserError('dm_needs_people');
  const channelId = opts.channel || cfg.default_channel_id || i.channel_id;

  const timing = computeTiming({ opts, ev, tz: cfg.timezone });
  if (!timing) throw new UserError('when_missing');
  if (timing.offset != null && repeat !== 'none') throw new UserError('relative_no_repeat');
  const anchor = repeat === 'none' ? null : timing.fireAt; // primer día del ciclo
  const { fireAt, moved } = ensureFuture(timing.fireAt, repeat, cfg.timezone, timing.offset, every, runDays, anchor);
  checkUntil(fireAt, until);

  const [{ count }] = await sql`
    select count(*)::int as count from alarms where guild_id = ${guildId} and status in ('pending','paused')`;
  if (count >= MAX_ALARMS) throw new UserError('max_alarms', { max: MAX_ALARMS });

  const [a] = await sql`
    insert into alarms (guild_id, event_id, channel_id, message, mentions, fire_at, offset_minutes, repeat, repeat_every, run_days, repeat_anchor, repeat_until, in_schedule, via_dm, created_by)
    values (${guildId}, ${ev.id}, ${channelId}, ${message}, ${sql.json(mentions)}, ${fireAt},
            ${timing.offset}, ${repeat}, ${every}, ${runDays}, ${anchor}, ${until}, ${opts.schedule === undefined || yes(opts.schedule)}, ${viaDm}, ${userId})
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

  const changes = ['message', 'before', 'date', 'time', 'channel', 'mentions', 'repeat', 'every', 'days', 'until', 'schedule', 'dm'].filter(
    (k) => opts[k] !== undefined && opts[k] !== '',
  );
  if (!changes.length) throw new UserError('nothing_to_change');

  const repeat = opts.repeat ?? (opts.every > 1 && a.repeat === 'none' ? 'daily' : a.repeat);
  const every = repeat === 'none' ? 1 : opts.every ?? a.repeat_every;
  const runDays = repeat === 'none' ? 1 : opts.days ?? a.run_days;
  checkRunDays(runDays, repeat, every);
  const until = repeat === 'none' ? null : opts.until ? parseUntil(opts.until, cfg.timezone) : a.repeat_until;
  const timing = computeTiming({ opts, ev, tz: cfg.timezone, current: a });
  let fireAt = timing ? timing.fireAt : new Date(a.fire_at);
  const offset = timing ? timing.offset : a.offset_minutes;
  if (offset != null && repeat !== 'none') throw new UserError('relative_no_repeat');

  let status = a.status;
  let resetFails = false;
  // Si cambia la fecha, el ciclo empieza de nuevo desde ella.
  const anchor = repeat === 'none' ? null : timing ? timing.fireAt : a.repeat_anchor || a.fire_at;
  if (timing || repeat !== a.repeat || every !== a.repeat_every || runDays !== a.run_days || opts.until) {
    if (status !== 'paused') {
      ({ fireAt } = ensureFuture(fireAt, repeat, cfg.timezone, offset, every, runDays, anchor));
      checkUntil(fireAt, until);
    }
    if (['sent', 'missed', 'failed'].includes(status)) status = 'pending';
    resetFails = true;
  }

  const message = opts.message?.trim() || a.message;
  const mentions = opts.mentions !== undefined ? parseMentions(opts.mentions) : a.mentions;
  const viaDm = opts.dm === undefined ? a.via_dm : yes(opts.dm);
  if (viaDm && !mentions.users?.length && !mentions.group) throw new UserError('dm_needs_people');
  const channelId = opts.channel || a.channel_id;
  if (opts.channel && a.status === 'failed') status = 'pending';

  const [updated] = await sql`
    update alarms set message = ${message}, mentions = ${sql.json(mentions)}, channel_id = ${channelId},
      fire_at = ${fireAt}, offset_minutes = ${offset}, repeat = ${repeat}, repeat_every = ${every}, run_days = ${runDays}, repeat_anchor = ${anchor}, repeat_until = ${until}, in_schedule = ${opts.schedule === undefined ? a.in_schedule : yes(opts.schedule)}, via_dm = ${viaDm}, status = ${status},
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

async function alarmTest({ L, sql, guildId, cfg, opts }) {
  const a = await findAlarm(sql, guildId, opts.id);
  const [ev] = await sql`
    select e.*, t.name as template_name from events e left join templates t on t.id = e.template_id
    where e.id = ${a.event_id}`;
  const groupMembers = await loadGroupMembers(guildId, a.mentions?.group);
  try {
    await sendMessage(a.channel_id, buildAlarmPayload({ alarm: a, event: ev, groupMembers, test: true, L, tz: cfg.timezone }));
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
    fireAt = nextForAlarm(a, cfg.timezone);
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
    t(L, 'cfg_live', { value: cfg.live_channel_id ? `<#${cfg.live_channel_id}>` : t(L, 'cfg_summary_none') }),
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

// ---------- plantillas y repeticiones ----------

async function findTemplate(sql, guildId, name) {
  const [tpl] = await sql`select * from templates where guild_id = ${guildId} and name_key = ${String(name).trim().toLowerCase()}`;
  if (!tpl) throw new UserError('template_not_found', { name });
  return tpl;
}

/** "15m none, 0 everyone" → [{ offset: 15, mentions }, { offset: 0, mentions }] (de más a menos anticipado). */
function parseReminders(str) {
  const parts = String(str || DEFAULT_REMINDERS).split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length || parts.length > 5) throw new UserError('bad_reminders');
  const list = parts.map((part) => {
    const [, when, who] = part.match(/^(\S+)\s*(.*)$/);
    const offset = parseOffset(when);
    if (offset == null || offset > MAX_OFFSET) throw new UserError('bad_reminders');
    try {
      return { offset, mentions: parseMentions(who || 'none') };
    } catch {
      throw new UserError('bad_reminders');
    }
  });
  return list.sort((a, b) => b.offset - a.offset);
}

const describeReminders = (L, rs) =>
  rs.map((r) => `⏰ ${formatOffset(L, r.offset)} → ${describeMentions(L, r.mentions)}`).join(' · ');

const planLine = (L, p) =>
  [
    `**#${p.id}**`, `**${p.name}**`, `🔁 ${repeatText(L, p)}`,
    p.all_day
      ? `📌 ${t(L, 'no_time')}${p.alarm_time ? ` · ⏰ ${p.alarm_time} UTC` : ''}`
      : `${utcTime(p.anchor)} (${ts(p.anchor, 't')})`,
    `<#${p.channel_id}>`,
  ].join(' · ');

/** Patrones detectados en el historial de una plantilla, como líneas de texto (con el comando sugerido). */
async function patternLines(L, sql, tpl, tz) {
  const history = await sql`
    select starts_at from plan_history where template_id = ${tpl.id} order by starts_at desc limit 60`;
  const groups = detectPatterns(history.map((h) => h.starts_at), tz);
  return groups.map((g, index) => {
    const times = g.times.map((x) => `${x}`).join(', ');
    if (!g.kind) return { found: false, index, text: t(L, 'pattern_none', { times, n: g.dates }) };
    let what;
    if (g.kind === 'every') what = g.cycle === 1 ? t(L, 'pattern_daily') : g.cycle === 7 ? t(L, 'pattern_weekly') : t(L, 'pattern_every', { n: g.cycle });
    else if (g.kind === 'block') what = t(L, 'pattern_block', { days: g.runDays, n: g.cycle });
    else if (g.kind === 'weekdays') what = t(L, 'pattern_weekdays', { days: g.weekdays.map((w) => DateTime.local().set({ weekday: w }).setLocale(L).toFormat('cccc')).join(', ') });
    else what = t(L, 'pattern_cycle', { n: g.cycle, count: g.offsets.length });
    // Un comando /plan por cada hora y día del ciclo.
    const cmds = g.plans.map((p) =>
      `\`/plan template: ${tpl.name} date: ${p.start.toFormat('yyyy-MM-dd')} times: ${p.start.toFormat('HH:mm')} every: ${p.every}${p.days > 1 ? ` days: ${p.days}` : ''}\``);
    return { found: true, index, times, what, text: `${t(L, 'pattern_found', { times, what })}\n${cmds.join('\n')}` };
  });
}

/** Botones "🔁 Automatizar" para los patrones encontrados (máx. 4) y, opcionalmente, "No, gracias". */
function patternButtons(L, tpl, found, dismiss = false) {
  const buttons = found.slice(0, 4).map((p) => ({
    type: 2, style: 3, custom_id: `auto:${tpl.id}:${p.index}`,
    label: `🔁 ${t(L, 'ui_automate')}: ${p.times} UTC · ${p.what}`.slice(0, 80),
  }));
  if (dismiss) buttons.push({ type: 2, style: 2, custom_id: 'ui:dismiss', label: t(L, 'ui_no_thanks') });
  return buttons.length ? [{ type: 1, components: buttons }] : [];
}

/** Botón "🔁 Automatizar": crea las repeticiones del patrón número `index` de la plantilla. */
export async function automatePattern(i, templateId, index) {
  const L = lang(i.locale);
  const sql = db();
  const cfg = await getConfig(i.guild_id);
  const [tpl] = await sql`select * from templates where id = ${templateId} and guild_id = ${i.guild_id}`;
  if (!tpl) throw new UserError('template_not_found', { name: `#${templateId}` });
  const history = await sql`
    select starts_at from plan_history where template_id = ${tpl.id} order by starts_at desc limit 60`;
  const group = detectPatterns(history.map((h) => h.starts_at), cfg.timezone)[index];
  if (!group?.kind) throw new UserError('pattern_gone');
  const lines = [];
  for (const p of group.plans) {
    const r = await runAction('plan', i, {
      template: tpl.name, date: p.start.toFormat('yyyy-MM-dd'), times: p.start.toFormat('HH:mm'),
      repeat: 'daily', every: p.every, days: p.days > 1 ? p.days : undefined,
    });
    lines.push(r.content.split('\n')[0]);
  }
  return text([...lines, t(L, 'plan_repeat_note')].join('\n'));
}

async function templateCreate({ L, i, sql, guildId, cfg, opts }) {
  const name = opts.name.trim();
  if (!/^[\p{L}\p{N} _.'-]+$/u.test(name)) throw new UserError('group_bad_name');
  const reminders = parseReminders(opts.reminders);
  const dm = opts.dm === undefined ? null : yes(opts.dm); // null = no cambiar
  const [{ count }] = await sql`select count(*)::int as count from templates where guild_id = ${guildId}`;
  const [row] = await sql`
    insert into templates (guild_id, name, name_key, reminders, message, channel_id, dm)
    values (${guildId}, ${name}, ${name.toLowerCase()}, ${sql.json(reminders)}, ${opts.message || null}, ${opts.channel || null}, ${dm ?? false})
    on conflict (guild_id, name_key) do update set name = excluded.name,
      reminders = case when ${Boolean(opts.reminders)} then excluded.reminders else templates.reminders end,
      message = coalesce(excluded.message, templates.message), channel_id = coalesce(excluded.channel_id, templates.channel_id),
      dm = coalesce(${dm}::boolean, templates.dm)
    returning *, (xmax = 0) as inserted`;
  // Por privado hace falta a quién: personas o un grupo (no roles ni everyone).
  if (row.dm && !row.reminders.some((r) => r.mentions?.users?.length || r.mentions?.group)) {
    if (row.inserted) await sql`delete from templates where id = ${row.id}`;
    else await sql`update templates set dm = false where id = ${row.id}`;
    throw new UserError('dm_needs_people');
  }
  // Al editar, los horarios ya programados toman los avisos, el mensaje y el canal nuevos.
  const updated = row.inserted ? 0 : await applyTemplateToFuture(row, cfg.default_channel_id || i.channel_id);
  if (row.inserted && count >= MAX_TEMPLATES) {
    await sql`delete from templates where id = ${row.id}`;
    throw new UserError('max_templates', { max: MAX_TEMPLATES });
  }
  // Usa como historial los eventos ya creados a mano con ese nombre (ej. "Trap Wed 16UTC" para "Trap").
  const imported = await sql`
    insert into plan_history (template_id, starts_at)
    select ${row.id}, starts_at from events
    where guild_id = ${guildId} and starts_at is not null and template_id is null
      and name_key like ${name.toLowerCase().replace(/[%_\\]/g, '\\$&') + '%'}
    on conflict do nothing
    returning starts_at`;
  return text([
    t(L, row.inserted ? 'template_saved' : 'template_updated', { name, n: updated }),
    describeReminders(L, row.reminders),
    `📢 ${row.channel_id ? `<#${row.channel_id}>` : t(L, 'cfg_channel_none')} · ${row.message || DEFAULT_START_MESSAGE}`,
    row.dm ? t(L, 'alarm_via_dm') : null,
    imported.length ? t(L, 'template_imported', { n: imported.length }) : null,
    '',
    t(L, 'template_hint', { name }),
  ].filter((x) => x !== null).join('\n'));
}

async function templateList({ L, sql, guildId }) {
  const rows = await sql`
    select t.*, count(p.id) filter (where p.active)::int as plans
    from templates t left join plans p on p.template_id = t.id
    where t.guild_id = ${guildId} group by t.id order by t.name_key`;
  if (!rows.length) return text(t(L, 'no_templates'));
  return card(L, t(L, 'templates_title'), rows.map((r) =>
    `**${r.name}** · ${describeReminders(L, r.reminders)}${r.dm ? ' · 📩' : ''}${r.plans ? ` · 🔁 ${r.plans}` : ''}`).join('\n'));
}

async function templateInfo({ L, sql, guildId, cfg, opts }) {
  const tpl = await findTemplate(sql, guildId, opts.name);
  const history = await sql`
    select starts_at from plan_history where template_id = ${tpl.id} order by starts_at desc limit 10`;
  const plans = await sql`
    select p.*, t.name from plans p join templates t on t.id = p.template_id
    where p.template_id = ${tpl.id} and p.active order by p.id`;
  const lines = [
    describeReminders(L, tpl.reminders),
    `📢 ${tpl.channel_id ? `<#${tpl.channel_id}>` : t(L, 'cfg_channel_none')} · ${tpl.message || DEFAULT_START_MESSAGE}`,
    '',
    history.length
      ? `${t(L, 'info_history', { n: history.length })}\n${history.map((h) => DateTime.fromJSDate(h.starts_at, { zone: 'utc' }).setLocale('en').toFormat('ccc dd/LL HH:mm')).reverse().join(' · ')} UTC`
      : t(L, 'info_no_history'),
  ];
  let components = [];
  if (history.length) {
    const patterns = await patternLines(L, sql, tpl, cfg.timezone);
    lines.push('', ...patterns.map((p) => p.text));
    if (!plans.length) components = patternButtons(L, tpl, patterns.filter((p) => p.found));
  }
  if (plans.length) lines.push('', t(L, 'active_plans', { n: plans.length }), ...plans.map((p) => planLine(L, p)));
  return { ...card(L, `🧩 ${tpl.name}`, lines.join('\n')), components };
}

async function templateDelete({ L, sql, guildId, opts }) {
  const tpl = await findTemplate(sql, guildId, opts.name);
  const removed = await sql`delete from events where template_id = ${tpl.id} and starts_at > now() returning id`;
  await sql`delete from templates where id = ${tpl.id}`;
  return text(t(L, 'template_deleted', { name: tpl.name, n: removed.length }));
}

async function plan({ L, i, sql, guildId, userId, cfg, opts }) {
  const tpl = await findTemplate(sql, guildId, opts.template);
  const tz = cfg.timezone;
  const times = String(opts.times || '').split(/[\s,;/&]+/).filter(Boolean);
  if (times.length > MAX_TIMES) throw new UserError('too_many_times', { max: MAX_TIMES });
  // Sin horarios: de todo el día (ej. Shutdown), con una alarma opcional a una hora.
  const allDay = !times.length;
  if (opts.alarm && !allDay) throw new UserError('alarm_only_all_day');
  const alarmTime = opts.alarm
    ? DateTime.fromJSDate(resolveDateTime({ date: opts.date, time: opts.alarm, tz }), { zone: tz }).toFormat('HH:mm')
    : null;
  const starts = allDay
    ? [resolveDateTime({ date: opts.date, time: '00:00', tz })]
    : [...new Map(times.map((time) => {
      const d = resolveDateTime({ date: opts.date, time, tz });
      return [d.getTime(), d];
    })).values()].sort((a, b) => a - b);

  const repeat = opts.repeat || (opts.every > 1 || opts.days > 1 ? 'daily' : 'none');
  const every = repeat === 'none' ? 1 : opts.every || 1;
  const runDays = repeat === 'none' ? 1 : opts.days || 1;
  checkRunDays(runDays, repeat, every);
  const until = opts.until ? parseUntil(opts.until, tz) : null;
  if (until && repeat === 'none') throw new UserError('until_needs_repeat');
  const channelId = tpl.channel_id || cfg.default_channel_id || i.channel_id;
  const when = (d) => whenText(L, { all_day: allDay, starts_at: d }, tz) + (allDay && alarmTime ? ` · ⏰ ${alarmTime} UTC` : '');

  const lines = [];
  if (!allDay) {
    // ¿Ese día ya estaba "sin hora"? Ahora que se conoce la hora, se reemplaza por el horario real.
    const days = [...new Set(starts.map((d) => DateTime.fromJSDate(d, { zone: tz }).startOf('day').toMillis()))];
    for (const ms of days) {
      const replaced = await sql`
        delete from events where template_id = ${tpl.id} and all_day and starts_at = ${new Date(ms)} returning id`;
      if (replaced.length) lines.push(t(L, 'occ_time_set', { name: tpl.name, date: dayLabel(new Date(ms), tz) }));
    }
  }
  if (repeat === 'none') {
    for (const startsAt of starts) {
      const r = await createOccurrence({ guildId, template: tpl, startsAt, channelId, userId, tz, allDay, alarmTime });
      lines.push(t(L, `occ_${r.status}`, { name: tpl.name, when: when(startsAt) }));
    }
    // Sugerencia: si ya se ve un patrón y la plantilla todavía no se repite sola.
    const [{ active }] = await sql`select count(*)::int as active from plans where template_id = ${tpl.id} and active`;
    if (!active && !allDay) {
      const found = (await patternLines(L, sql, tpl, tz)).filter((p) => p.found);
      if (found.length) {
        lines.push('', `💡 ${t(L, 'plan_hint')}`, ...found.map((p) => p.text));
        return { content: lines.join('\n'), components: patternButtons(L, tpl, found, true) };
      }
    }
  } else {
    for (const anchor of starts) {
      const [p] = await sql`
        insert into plans (guild_id, template_id, channel_id, anchor, repeat, repeat_every, run_days, repeat_until, all_day, alarm_time, created_by)
        values (${guildId}, ${tpl.id}, ${channelId}, ${anchor}, ${repeat}, ${every}, ${runDays}, ${until}, ${allDay}, ${alarmTime}, ${userId})
        returning *`;
      const { created } = await materializePlans(new Date(), p.id);
      lines.push(t(L, 'plan_repeat_created', { line: planLine(L, { ...p, name: tpl.name }), n: created }));
    }
    lines.push(t(L, 'plan_repeat_note'));
  }
  return text(lines.join('\n'));
}

async function plansSkip({ L, sql, guildId, cfg, opts }) {
  const tpl = await findTemplate(sql, guildId, opts.template);
  const tz = cfg.timezone;
  const day = DateTime.fromJSDate(resolveDateTime({ date: opts.date, time: '00:00', tz }), { zone: tz });
  const times = opts.times
    ? String(opts.times).split(/[\s,;/&]+/).filter(Boolean).map((x) =>
      DateTime.fromJSDate(resolveDateTime({ date: opts.date, time: x, tz }), { zone: tz }).toFormat('HH:mm'))
    : [''];
  for (const time of times) {
    await sql`insert into plan_skips (template_id, day, time) values (${tpl.id}, ${day.toISODate()}, ${time}) on conflict do nothing`;
  }
  // Borra los horarios ya creados de ese día (y su historial: ese día no hubo evento).
  const removed = await sql`
    delete from events
    where template_id = ${tpl.id} and (starts_at > now() or all_day)
      and starts_at >= ${day.toJSDate()} and starts_at < ${day.plus({ days: 1 }).toJSDate()}
      and (${times[0] === ''} or to_char(starts_at at time zone ${tz}, 'HH24:MI') in ${sql(times)})
    returning starts_at`;
  if (removed.length) {
    await sql`delete from plan_history where template_id = ${tpl.id} and starts_at in ${sql(removed.map((r) => r.starts_at))}`;
  }
  return text(t(L, 'plan_skipped', {
    name: tpl.name,
    date: day.setLocale('en').toFormat('cccc dd/LL'),
    times: times[0] === '' ? t(L, 'all_day') : times.map((x) => `${x}`).join(', '),
    n: removed.length,
  }));
}

async function plansList({ L, sql, guildId }) {
  const rows = await sql`
    select p.*, t.name from plans p join templates t on t.id = p.template_id
    where p.guild_id = ${guildId} and p.active order by t.name_key, p.anchor`;
  if (!rows.length) return text(t(L, 'no_plans'));
  return card(L, t(L, 'plans_title'), rows.map((p) => planLine(L, p)).join('\n'));
}

async function plansStop({ L, sql, guildId, opts }) {
  const [p] = await sql`update plans set active = false where id = ${opts.id} and guild_id = ${guildId} returning id`;
  if (!p) throw new UserError('plan_not_found', { id: opts.id });
  const removed = await sql`delete from events where plan_id = ${p.id} and starts_at > now() returning id`;
  return text(t(L, 'plan_stopped', { id: p.id, n: removed.length }));
}

async function configLiveSchedule({ L, sql, guildId, opts }) {
  await sql`
    insert into guild_config (guild_id, timezone, live_channel_id) values (${guildId}, ${DEFAULT_TZ}, ${opts.channel})
    on conflict (guild_id) do update set live_channel_id = excluded.live_channel_id, live_message_id = null`;
  try {
    await refreshLive(guildId);
  } catch (e) {
    await sql`update guild_config set live_channel_id = null where guild_id = ${guildId}`;
    if (e instanceof DiscordError) throw new UserError('send_failed', { channel: `<#${opts.channel}>`, status: e.status });
    throw e;
  }
  return text(t(L, 'live_set', { channel: `<#${opts.channel}>` }));
}

async function configLiveScheduleOff({ L, sql, guildId, cfg }) {
  if (!cfg.live_channel_id) throw new UserError('live_not_set');
  await sql`update guild_config set live_channel_id = null, live_message_id = null where guild_id = ${guildId}`;
  return text(t(L, 'live_off'));
}

// ---------- recordatorios personales ----------

const MAX_REMINDERS = 25; // activos por persona y servidor
const MAX_REMINDER_DAYS = 30;

/** Cuándo suena: `in` ("8h", "2h30m", "90" minutos, "1d") o `at` (hora, hoy o mañana si ya pasó; o con `date`). */
function reminderTime(opts, tz) {
  if (opts.in) {
    const minutes = parseOffset(opts.in);
    if (!minutes) throw new UserError('reminder_bad_in', { value: opts.in });
    if (minutes > MAX_REMINDER_DAYS * 1440) throw new UserError('reminder_too_far', { days: MAX_REMINDER_DAYS });
    return new Date(Date.now() + minutes * 60000);
  }
  if (opts.at) {
    let when = resolveDateTime({ date: opts.date || 'today', time: opts.at, tz });
    if (when <= new Date()) {
      if (opts.date) throw new UserError('past', { when: ts(when, 'f') });
      when = resolveDateTime({ date: 'tomorrow', time: opts.at, tz });
    }
    if (when - Date.now() > MAX_REMINDER_DAYS * 86400000) throw new UserError('reminder_too_far', { days: MAX_REMINDER_DAYS });
    return when;
  }
  throw new UserError('reminder_need_when');
}

async function remindMe({ L, i, sql, guildId, userId, cfg, opts }) {
  const note = String(opts.text || '').trim();
  if (!note) throw new UserError('message_empty');
  const fireAt = reminderTime(opts, cfg.timezone);
  const [{ count }] = await sql`
    select count(*)::int as count from reminders where guild_id = ${guildId} and user_id = ${userId} and status = 'pending'`;
  if (count >= MAX_REMINDERS) throw new UserError('max_reminders', { max: MAX_REMINDERS });
  const viaDm = opts.where !== 'here';
  const [r] = await sql`
    insert into reminders (guild_id, user_id, channel_id, text, fire_at, via_dm, locale)
    values (${guildId}, ${userId}, ${i.channel_id}, ${note.slice(0, 200)}, ${fireAt}, ${viaDm}, ${i.locale || null})
    returning id`;
  return text(t(L, 'reminder_set', {
    id: r.id, text: note, when: `${utcTime(fireAt)} · ${ts(fireAt, 'F')} (${ts(fireAt, 'R')})`,
    where: t(L, viaDm ? 'reminder_where_dm' : 'reminder_where_here', { channel: `<#${i.channel_id}>` }),
  }));
}

async function remindList({ L, sql, guildId, userId }) {
  const rows = await sql`
    select * from reminders where guild_id = ${guildId} and user_id = ${userId} and status = 'pending' order by fire_at`;
  if (!rows.length) return text(t(L, 'no_reminders'));
  return card(L, t(L, 'reminders_title'), rows.map((r) =>
    `**#${r.id}** · ${utcTime(r.fire_at)} · ${ts(r.fire_at, 'f')} (${ts(r.fire_at, 'R')}) · ${r.via_dm ? '📩' : `<#${r.channel_id}>`}\n> ${r.text}`).join('\n'));
}

async function remindCancel({ L, sql, guildId, userId, opts }) {
  const res = await sql`
    delete from reminders where id = ${opts.id} and guild_id = ${guildId} and user_id = ${userId} and status = 'pending'`;
  if (!res.count) throw new UserError('reminder_not_found', { id: opts.id });
  return text(t(L, 'reminder_cancelled', { id: opts.id }));
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
  'config live-schedule': configLiveSchedule,
  'config live-schedule-off': configLiveScheduleOff,
  schedule,
  'template create': templateCreate,
  'template list': templateList,
  'template info': templateInfo,
  'template delete': templateDelete,
  plan,
  'plans list': plansList,
  'plans stop': plansStop,
  'plans skip': plansSkip,
  'remind me': remindMe,
  'remind list': remindList,
  'remind cancel': remindCancel,
  panel: panelCommand,
  'panel check': async () => ({}), // solo comprueba el permiso de organizador (botones del panel)
  setup: setupCommand,
  now,
  help,
};

// Acciones que borran cosas: primero piden confirmación con un botón.
// code = clave corta para el botón (custom_id "cf:<code>:<valor>"), arg = opción que identifica qué se borra.
export const CONFIRM = {
  'template delete': { code: 'td', arg: 'name' },
  'plans stop': { code: 'ps', arg: 'id' },
  'event delete': { code: 'ed', arg: 'event' },
  'alarm delete': { code: 'ad', arg: 'id' },
};

function checkAccess(key, i, cfg) {
  if (SERVER_ADMIN.has(key) && !canManageServer(i)) throw new UserError('need_manage');
  if (WRITE.has(key) && !isOrganizer(i, cfg)) throw new UserError('no_permission');
}

export async function handleCommand(i) {
  const { sub, opts } = getOptions(i.data);
  const key = sub ? `${i.data.name} ${sub}` : i.data.name;
  const confirm = CONFIRM[key];
  if (confirm) {
    checkAccess(key, i, await getConfig(i.guild_id));
    const L = lang(i.locale);
    const value = String(opts[confirm.arg]);
    return {
      content: t(L, `confirm_${confirm.code}`, { value }),
      components: [{
        type: 1,
        components: [
          { type: 2, style: 4, custom_id: `cf:${confirm.code}:${value}`.slice(0, 100), label: t(L, 'ui_yes_delete') },
          { type: 2, style: 2, custom_id: 'ui:cancel', label: t(L, 'ui_cancel') },
        ],
      }],
    };
  }
  return runAction(key, i, opts);
}

/** Ejecuta una acción (comando, botón o formulario) con sus permisos, y actualiza el cronograma fijado. */
export async function runAction(key, i, opts) {
  const handler = HANDLERS[key];
  if (!handler) throw new UserError('unknown_command');
  const cfg = await getConfig(i.guild_id);
  checkAccess(key, i, cfg);
  const reply = await handler({ L: lang(i.locale), i, cfg, opts, sql: db(), guildId: i.guild_id, userId: i.member?.user?.id });
  if (CHANGES_SCHEDULE.has(key)) {
    await refreshLive(i.guild_id).catch((e) => console.error('No se pudo actualizar el cronograma fijado:', e.message));
  }
  return reply;
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

  if (focused.name === 'template' || (i.data.name === 'template' && focused.name === 'name' && sub !== 'create')) {
    const rows = await db()`
      select name from templates where guild_id = ${i.guild_id} and name_key like ${like} order by name_key limit 25`;
    return rows.map((r) => ({ name: r.name, value: r.name }));
  }
  if (focused.name === 'event') {
    const rows = await db()`
      select name from events where guild_id = ${i.guild_id} and name_key like ${like}
      order by starts_at < now(), abs(extract(epoch from starts_at - now())) nulls last, name_key limit 25`;
    return rows.map((r) => ({ name: r.name, value: r.name }));
  }
  if (i.data.name === 'remind' && focused.name === 'id') {
    const rows = await db()`
      select id, text, fire_at from reminders
      where guild_id = ${i.guild_id} and user_id = ${i.member?.user?.id} and status = 'pending' order by fire_at limit 25`;
    return rows.map((r) => ({ name: `#${r.id} · ${utcTime(r.fire_at)} ${DateTime.fromJSDate(r.fire_at, { zone: 'utc' }).toFormat('dd/LL')} · ${r.text}`.slice(0, 100), value: r.id }));
  }
  if (focused.name === 'id') {
    const tz = (await getConfig(i.guild_id)).timezone;
    const L = lang(i.locale);
    const rows = await db()`
      select a.id, a.fire_at, a.status, a.repeat, a.repeat_every, a.run_days, a.offset_minutes, e.name
      from alarms a join events e on e.id = a.event_id
      where a.guild_id = ${i.guild_id} and (a.id::text like ${q + '%'} or e.name_key like ${like})
      order by a.status not in ('pending','paused'), a.fire_at limit 25`;
    return rows.map((a) => {
      const when = DateTime.fromJSDate(new Date(a.fire_at), { zone: tz }).setLocale(L).toFormat('d LLL HH:mm');
      const extra = a.offset_minutes != null ? formatOffset(L, a.offset_minutes) : a.repeat !== 'none' ? repeatLabel(L, a.repeat, a.repeat_every, a.run_days) : '';
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
