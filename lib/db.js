import postgres from 'postgres';
import { DEFAULT_TZ } from './time.js';

let sql;

export function db() {
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      prepare: false, // necesario con el pooler de Supabase (modo transacción)
      max: 1,
      idle_timeout: 20,
      ssl: process.env.DATABASE_SSL === 'false' ? false : 'require',
    });
  }
  return sql;
}

export async function getConfig(guildId) {
  const [cfg] = await db()`select * from guild_config where guild_id = ${guildId}`;
  return cfg || { guild_id: guildId, timezone: DEFAULT_TZ, admin_role_id: null, default_channel_id: null };
}

export async function loadGroupMembers(guildId, name) {
  if (!name) return null;
  const [g] = await db()`
    select members from mention_groups
    where guild_id = ${guildId} and name_key = ${name.trim().toLowerCase()}`;
  return g ? g.members : null;
}
