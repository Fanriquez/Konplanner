import { UserError } from './errors.js';
import { t } from './i18n.js';

export const NO_MENTIONS = { everyone: false, here: false, users: [], roles: [], group: null };

/**
 * Interpreta el texto del campo "mentions":
 *   everyone | here | none | @usuario @rol ... | group:Nombre | group:"Nombre con espacios"
 * Se pueden combinar: "@here @Ana group:Staff"
 */
export function parseMentions(input) {
  if (!input || !input.trim()) return { ...NO_MENTIONS, users: [], roles: [] };
  const s = input.trim();
  if (/^(none|ninguno|nadie|sin|nessuno|keine|niemand)$/i.test(s)) return { ...NO_MENTIONS, users: [], roles: [] };

  const v = { everyone: false, here: false, users: [], roles: [], group: null };
  if (/(^|\s)@?(everyone|todos|tutti|alle)\b/i.test(s)) v.everyone = true;
  if (/(^|\s)@?here\b/i.test(s)) v.here = true;
  for (const m of s.matchAll(/<@!?(\d+)>/g)) v.users.push(m[1]);
  for (const m of s.matchAll(/<@&(\d+)>/g)) v.roles.push(m[1]);
  const g = s.match(/(?:group|grupo|gruppo|gruppe):\s*(?:"([^"]+)"|(\S+))/i);
  if (g) v.group = (g[1] || g[2]).trim();

  v.users = [...new Set(v.users)];
  v.roles = [...new Set(v.roles)];

  if (!v.everyone && !v.here && !v.users.length && !v.roles.length && !v.group) {
    throw new UserError('bad_mentions');
  }
  return v;
}

/** Extrae solo usuarios y roles (para los grupos). */
export function parseMembers(input) {
  const users = [...new Set([...String(input).matchAll(/<@!?(\d+)>/g)].map((m) => m[1]))];
  const roles = [...new Set([...String(input).matchAll(/<@&(\d+)>/g)].map((m) => m[1]))];
  return { users, roles };
}

export function describeMentions(L, v = {}) {
  const parts = [];
  if (v.everyone) parts.push('@everyone');
  if (v.here) parts.push('@here');
  for (const u of v.users || []) parts.push(`<@${u}>`);
  for (const r of v.roles || []) parts.push(`<@&${r}>`);
  if (v.group) parts.push(t(L, 'mention_group', { name: v.group }));
  return parts.length ? parts.join(' ') : t(L, 'mentions_none');
}

/**
 * Arma la línea de menciones del mensaje y el allowed_mentions que garantiza
 * que el bot solo notifique a quienes la alarma indica.
 * groupMembers: { users, roles } del grupo (o null si no hay o no existe).
 */
export function buildMentionLine(v = {}, groupMembers = null) {
  const users = [...new Set([...(v.users || []), ...(groupMembers?.users || [])])].slice(0, 100);
  const roles = [...new Set([...(v.roles || []), ...(groupMembers?.roles || [])])].slice(0, 100);
  const tokens = [];
  if (v.everyone) tokens.push('@everyone');
  if (v.here) tokens.push('@here');
  tokens.push(...users.map((u) => `<@${u}>`), ...roles.map((r) => `<@&${r}>`));
  return {
    line: tokens.join(' '),
    allowed: { parse: v.everyone || v.here ? ['everyone'] : [], users, roles },
  };
}
