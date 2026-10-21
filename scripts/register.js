// Registra (o actualiza) los comandos "/" en Discord.
// Uso: npm run register
//  - Con DISCORD_GUILD_ID en .env: se registran solo en ese servidor y aparecen al instante.
//  - Sin DISCORD_GUILD_ID: se registran en todos los servidores (puede tardar en aparecer).
import { commands } from '../lib/commands.js';

const { DISCORD_APP_ID, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID } = process.env;
if (!DISCORD_APP_ID || !DISCORD_BOT_TOKEN) {
  console.error('Faltan DISCORD_APP_ID o DISCORD_BOT_TOKEN en el archivo .env');
  process.exit(1);
}

const url = DISCORD_GUILD_ID
  ? `https://discord.com/api/v10/applications/${DISCORD_APP_ID}/guilds/${DISCORD_GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${DISCORD_APP_ID}/commands`;

const res = await fetch(url, {
  method: 'PUT',
  headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(commands),
});

if (!res.ok) {
  console.error(`Error ${res.status}:`, await res.text());
  process.exit(1);
}
const data = await res.json();
console.log(`✅ ${data.length} comandos registrados ${DISCORD_GUILD_ID ? 'en tu servidor' : 'globalmente'}:`);
console.log(data.map((c) => '  /' + c.name).join('\n'));
