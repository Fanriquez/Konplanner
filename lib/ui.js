// Botones, menús y formularios: el panel (/panel), el asistente (/setup), las confirmaciones
// y los botones "Automatizar". Todo termina llamando a las mismas acciones que los comandos (runAction),
// así que los permisos y la lógica son exactamente los mismos.
import { DateTime } from 'luxon';
import { db, getConfig } from './db.js';
import { lang, t } from './i18n.js';
import { UserError } from './errors.js';
import { CONFIRM, automatePattern, runAction } from './handlers.js';
import { sendMessage } from './discord.js';
import { COLOR } from './render.js';
import { DEFAULT_REMINDERS } from './templates.js';

const ROW = 1, BUTTON = 2, SELECT = 3, TEXT_INPUT = 4, ROLE_SELECT = 6, CHANNEL_SELECT = 8;
const PRIMARY = 1, SECONDARY = 2, SUCCESS = 3, DANGER = 4;
const TEXT_CHANNELS = [0, 5];

const row = (...components) => ({ type: ROW, components });
const button = (custom_id, label, style = SECONDARY, disabled = false) => ({ type: BUTTON, custom_id, label: label.slice(0, 80), style, disabled });
const select = (custom_id, placeholder, options) => ({ type: SELECT, custom_id, placeholder: placeholder.slice(0, 150), options: options.slice(0, 25) });
const input = (custom_id, label, { required = false, placeholder = '', value, max = 200 } = {}) =>
  row({ type: TEXT_INPUT, custom_id, label: label.slice(0, 45), style: 1, required, placeholder: placeholder.slice(0, 100), max_length: max, ...(value ? { value } : {}) });
const modal = (custom_id, title, ...rows) => ({ modal: { custom_id, title: title.slice(0, 45), components: rows } });
const field = (i, id) => i.data.components?.flatMap((r) => r.components).find((c) => c.custom_id === id)?.value?.trim() || '';

const REPEATS = ['none', 'd1', 'd2', 'd3', 'w1', 'w2'];
const repeatOpts = {
  none: {}, d1: { repeat: 'daily' }, d2: { every: 2 }, d3: { every: 3 }, w1: { repeat: 'weekly' }, w2: { repeat: 'weekly', every: 2 },
};

async function templates(guildId) {
  return db()`select id, name from templates where guild_id = ${guildId} order by name_key limit 25`;
}

/** Próximos 14 días como opciones de menú ("lunes 02/11"), en la zona del servidor. */
function dayOptions(L, tz, selected) {
  const today = DateTime.now().setZone(tz).startOf('day');
  return Array.from({ length: 14 }, (_, k) => {
    const d = today.plus({ days: k });
    const iso = d.toISODate();
    return { label: `${d.setLocale(L).toFormat('cccc dd/LL')}${k === 0 ? ` (${t(L, 'ui_today')})` : ''}`, value: iso, default: iso === selected };
  });
}

const templateOptions = (list, selected) => list.map((x) => ({ label: x.name, value: String(x.id), default: String(x.id) === selected }));
const nameOf = async (guildId, id) => {
  const [x] = await db()`select name from templates where id = ${Number(id) || 0} and guild_id = ${guildId}`;
  if (!x) throw new UserError('template_not_found', { name: `#${id}` });
  return x.name;
};

// ---------- panel ----------

export function panelPayload() {
  // Lo ven todos, así que va en inglés con emojis (los formularios que abre salen en el idioma de cada uno).
  return {
    embeds: [{
      title: '🦁 Kon Planner',
      description: '**Organizers:** schedule, skip days and manage event types with these buttons, no commands needed.\n**Everyone:** 📅 shows the schedule in UTC and your local time · ⏰ sets a private reminder for you (e.g. shield, building).',
      color: COLOR,
    }],
    components: [row(
      button('p:plan', '➕ Plan', PRIMARY),
      button('p:skip', '⏭️ Skip day'),
      button('p:sched', '📅 Schedule', SUCCESS),
      button('p:tpl', '🧩 Event types'),
    ), row(button('rm:new', '⏰ Remind me (just you)', SUCCESS))],
    allowed_mentions: { parse: [] },
  };
}

export async function panelCommand({ L, i }) {
  await sendMessage(i.channel_id, panelPayload());
  return { content: t(L, 'panel_posted') };
}

// ---------- programar ----------

async function planForm(i, state) {
  const L = lang(i.locale);
  const cfg = await getConfig(i.guild_id);
  const list = await templates(i.guild_id);
  if (!list.length) return { content: t(L, 'ui_no_templates_yet'), components: [row(button('tp:new', t(L, 'ui_new_template'), PRIMARY))] };
  const enc = `${state.t}|${state.d}|${state.r}`;
  return {
    content: t(L, 'ui_plan_intro'),
    components: [
      row(select(`pl:t:${enc}`, t(L, 'ui_pick_template'), templateOptions(list, state.t))),
      row(select(`pl:d:${enc}`, t(L, 'ui_pick_day'), dayOptions(L, cfg.timezone, state.d))),
      row(select(`pl:r:${enc}`, t(L, 'ui_pick_repeat'), REPEATS.map((r) => ({ label: t(L, `ui_rep_${r}`), value: r, default: r === state.r })))),
      row(button(`pl:go:${enc}`, t(L, 'ui_continue'), PRIMARY, !(state.t && state.d))),
    ],
  };
}

// ---------- saltar día ----------

async function skipForm(i, state) {
  const L = lang(i.locale);
  const cfg = await getConfig(i.guild_id);
  const list = await templates(i.guild_id);
  if (!list.length) return { content: t(L, 'ui_no_templates_yet'), components: [row(button('tp:new', t(L, 'ui_new_template'), PRIMARY))] };
  const enc = `${state.t}|${state.d}`;
  const ready = Boolean(state.t && state.d);
  return {
    content: t(L, 'ui_skip_intro'),
    components: [
      row(select(`sk:t:${enc}`, t(L, 'ui_pick_template'), templateOptions(list, state.t))),
      row(select(`sk:d:${enc}`, t(L, 'ui_pick_day'), dayOptions(L, cfg.timezone, state.d))),
      row(button(`sk:all:${enc}`, t(L, 'ui_skip_all'), DANGER, !ready), button(`sk:some:${enc}`, t(L, 'ui_skip_some'), SECONDARY, !ready)),
    ],
  };
}

// ---------- tipos de evento ----------

async function templatesView(i) {
  const L = lang(i.locale);
  const list = await templates(i.guild_id);
  const reply = await runAction('template list', i, {});
  const components = [];
  if (list.length) components.push(row(select('tp:v', t(L, 'ui_view_template'), list.map((x) => ({ label: x.name, value: String(x.id) })))));
  components.push(row(button('tp:new', t(L, 'ui_new_template'), PRIMARY)));
  return { ...reply, components };
}

const templateModal = (L, id) => modal(id, t(L, 'ui_tpl_modal_title'),
  input('name', t(L, 'ui_tpl_name'), { required: true, placeholder: 'Trap', max: 40 }),
  input('reminders', t(L, 'ui_tpl_reminders'), { value: DEFAULT_REMINDERS, placeholder: DEFAULT_REMINDERS }),
  input('message', t(L, 'ui_tpl_message'), { placeholder: '🚨 {event}', max: 500 }));

const templateOptsFrom = (i) => ({ name: field(i, 'name'), reminders: field(i, 'reminders') || undefined, message: field(i, 'message') || undefined });

// ---------- asistente /setup ----------

const SUMMARY_TIMES = ['00:00', '06:00', '08:00', '09:00', '12:00', '18:00', '20:00'];

async function setupStep(i, step, error = null) {
  const L = lang(i.locale);
  const cfg = await getConfig(i.guild_id);
  const head = error ? `❌ ${error}\n\n` : '';
  const skip = (next) => button(`su:skip:${next}`, t(L, 'setup_skip'));
  const channelSelect = (id) => ({ type: CHANNEL_SELECT, custom_id: id, placeholder: t(L, 'setup_pick_channel'), channel_types: TEXT_CHANNELS });
  if (step === 'tz') {
    return {
      content: head + t(L, 'setup_1_tz', { tz: cfg.timezone }),
      components: [row(button('su:tz:utc', t(L, 'setup_use_utc'), PRIMARY), button('su:skip:role', t(L, 'setup_keep', { tz: cfg.timezone })))],
    };
  }
  if (step === 'role') {
    return {
      content: head + t(L, 'setup_2_role'),
      components: [row({ type: ROLE_SELECT, custom_id: 'su:role', placeholder: t(L, 'setup_pick_role') }), row(skip('alerts'))],
    };
  }
  if (step === 'alerts') return { content: head + t(L, 'setup_3_alerts'), components: [row(channelSelect('su:alerts')), row(skip('live'))] };
  if (step === 'live') return { content: head + t(L, 'setup_4_live'), components: [row(channelSelect('su:live')), row(skip('sum'))] };
  if (step === 'sum') return { content: head + t(L, 'setup_5_summary'), components: [row(channelSelect('su:sumch')), row(skip('tpl'))] };
  if (step.startsWith('sumtime:')) {
    const channel = step.slice(8);
    return {
      content: head + t(L, 'setup_5_time', { channel: `<#${channel}>` }),
      components: [row(select(`su:sumtime:${channel}`, t(L, 'setup_pick_time'), SUMMARY_TIMES.map((x) => ({ label: `${x} (${cfg.timezone})`, value: x })))), row(skip('tpl'))],
    };
  }
  if (step === 'tpl') {
    const list = await templates(i.guild_id);
    return {
      content: head + t(L, 'setup_6_templates', { list: list.length ? list.map((x) => `• **${x.name}**`).join('\n') : t(L, 'setup_templates_none') }),
      components: [row(button('su:tpnew', t(L, 'setup_add_template'), PRIMARY), button('su:done', t(L, 'setup_finish'), SUCCESS))],
    };
  }
  // fin
  const view = await runAction('config view', i, {});
  return { content: t(L, 'setup_done'), embeds: view.embeds, components: [] };
}

export async function setupCommand({ i }) {
  return setupStep(i, 'tz');
}

/** Ejecuta un paso del asistente y pasa al siguiente; si falla (ej. sin permiso en el canal), repite el paso con el error. */
async function setupAction(i, current, next, key, opts) {
  try {
    await runAction(key, i, opts);
  } catch (e) {
    if (e instanceof UserError) return setupStep(i, current, t(lang(i.locale), e.key, e.vars));
    throw e;
  }
  return setupStep(i, next);
}

// ---------- enrutador ----------

/**
 * Decide qué hacer con un botón, menú o formulario. Devuelve:
 *   { modal }                    → abrir un formulario (respuesta inmediata)
 *   { defer: 'new', run }        → mensaje nuevo, solo para quien hizo clic
 *   { defer: 'update', run }     → editar el mensaje donde se hizo clic
 * `run` devuelve el contenido del mensaje.
 */
export function routeComponent(i) {
  const L = lang(i.locale);
  const id = i.data.custom_id;
  const [kind, action, ...rest] = id.split(':');
  const arg = rest.join(':');
  const value = i.data.values?.[0];
  const parse = (enc) => { const [tt = '', d = '', r = 'none'] = enc.split('|'); return { t: tt, d, r }; };
  const update = (run) => ({ defer: 'update', run });
  const fresh = (run) => ({ defer: 'new', run });

  // Panel (mensaje público): cada botón abre un mensaje privado.
  if (kind === 'p') {
    if (action === 'sched') return fresh(() => runAction('schedule', i, { days: 7 }));
    if (action === 'plan') return fresh(() => organizer(i).then(() => planForm(i, { t: '', d: '', r: 'none' })));
    if (action === 'skip') return fresh(() => organizer(i).then(() => skipForm(i, { t: '', d: '' })));
    if (action === 'tpl') return fresh(() => templatesView(i));
  }
  if (kind === 'pl') {
    const s = parse(arg);
    if (action === 't') return update(() => planForm(i, { ...s, t: value }));
    if (action === 'd') return update(() => planForm(i, { ...s, d: value }));
    if (action === 'r') return update(() => planForm(i, { ...s, r: value }));
    if (action === 'go') {
      return modal(`pl:sub:${arg}`, t(L, 'ui_plan_title'),
        input('times', t(L, 'ui_times_label'), { placeholder: '03:00 18:00', max: 100 }),
        input('alarm', t(L, 'ui_alarm_label'), { placeholder: '12:00', max: 10 }),
        input('until', t(L, 'ui_until_label'), { placeholder: '2026-12-15', max: 20 }));
    }
    if (action === 'sub') {
      return update(async () => {
        const opts = { template: await nameOf(i.guild_id, s.t), date: s.d, times: field(i, 'times') || undefined, ...repeatOpts[s.r] };
        if (field(i, 'alarm') && !field(i, 'times')) opts.alarm = field(i, 'alarm');
        if (field(i, 'until') && s.r !== 'none') opts.until = field(i, 'until');
        const reply = await runAction('plan', i, opts);
        return { ...reply, components: [...(reply.components || []), row(button('p:plan', t(L, 'ui_plan_more'), PRIMARY))] };
      });
    }
  }
  if (kind === 'sk') {
    const s = parse(arg);
    if (action === 't') return update(() => skipForm(i, { ...s, t: value }));
    if (action === 'd') return update(() => skipForm(i, { ...s, d: value }));
    if (action === 'all') return update(async () => runAction('plans skip', i, { template: await nameOf(i.guild_id, s.t), date: s.d }));
    if (action === 'some') {
      return modal(`sk:sub:${arg}`, t(L, 'ui_skip_title'), input('times', t(L, 'ui_skip_times_label'), { required: true, placeholder: '18:00', max: 100 }));
    }
    if (action === 'sub') {
      return update(async () => runAction('plans skip', i, { template: await nameOf(i.guild_id, s.t), date: s.d, times: field(i, 'times') }));
    }
  }
  if (kind === 'tp') {
    if (action === 'v') {
      return update(async () => {
        const reply = await runAction('template info', i, { name: await nameOf(i.guild_id, value) });
        return { ...reply, components: [...(reply.components || []), row(button('tp:back', t(L, 'ui_back')))] };
      });
    }
    if (action === 'back') return update(() => templatesView(i));
    if (action === 'new') return templateModal(L, 'tp:sub');
    if (action === 'sub') {
      return update(async () => ({ ...(await runAction('template create', i, templateOptsFrom(i))), components: [row(button('tp:back', t(L, 'ui_back')))] }));
    }
  }
  if (kind === 'rm') {
    if (action === 'new') {
      return modal('rm:sub', t(L, 'ui_remind_title'),
        input('in', t(L, 'ui_remind_in'), { required: true, placeholder: '8h · 2h30m · 45m · 1d', max: 20 }),
        input('text', t(L, 'ui_remind_text'), { required: true, placeholder: 'Shield', max: 200 }));
    }
    // El formulario se abrió desde el panel (público): la respuesta va en un mensaje nuevo, privado.
    if (action === 'sub') return fresh(() => runAction('remind me', i, { in: field(i, 'in'), text: field(i, 'text') }));
  }
  if (kind === 'auto') {
    const [tplId, index] = [action, Number(arg)];
    return update(async () => ({ ...(await automatePattern(i, Number(tplId), index)), components: [] }));
  }
  if (kind === 'cf') {
    const [key, conf] = Object.entries(CONFIRM).find(([, c]) => c.code === action) || [];
    if (key) {
      const v = ['ps', 'ad'].includes(action) ? Number(arg) : arg;
      return update(async () => ({ ...(await runAction(key, i, { [conf.arg]: v })), components: [] }));
    }
  }
  if (kind === 'ui') {
    if (action === 'cancel') return update(async () => ({ content: t(L, 'ui_cancelled'), embeds: [], components: [] }));
    if (action === 'dismiss') return update(async () => ({ keep: true, components: [] }));
  }
  if (kind === 'su') {
    if (action === 'tz') return update(() => setupAction(i, 'tz', 'role', 'config timezone', { value: 'UTC' }));
    if (action === 'skip') return update(() => setupStep(i, arg));
    if (action === 'role') return update(() => setupAction(i, 'role', 'alerts', 'config admin-role', { role: value }));
    if (action === 'alerts') return update(() => setupAction(i, 'alerts', 'live', 'config default-channel', { channel: value }));
    if (action === 'live') return update(() => setupAction(i, 'live', 'sum', 'config live-schedule', { channel: value }));
    if (action === 'sumch') return update(() => setupStep(i, `sumtime:${value}`));
    if (action === 'sumtime') return update(() => setupAction(i, `sumtime:${arg}`, 'tpl', 'config daily-summary', { channel: arg, time: value }));
    if (action === 'tpnew') return templateModal(L, 'su:tpsub');
    if (action === 'tpsub') return update(() => setupAction(i, 'tpl', 'tpl', 'template create', templateOptsFrom(i)));
    if (action === 'done') return update(() => setupStep(i, 'done'));
  }
  return update(async () => { throw new UserError('unsupported'); });
}

/** Los formularios del panel son para organizadores (mismo permiso que /plan). */
async function organizer(i) {
  await runAction('panel check', i, {});
}
