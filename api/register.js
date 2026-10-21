// Registra los comandos "/" desde el navegador, sin instalar nada:
//   https://TU-PROYECTO.vercel.app/api/register?key=TU_TICK_SECRET&guild=ID_DEL_SERVIDOR
// Sin "guild" se registran en todos los servidores (puede tardar hasta una hora en aparecer).
import { commands } from '../lib/commands.js';

export async function GET(request) {
  const url = new URL(request.url);
  if (!process.env.TICK_SECRET || url.searchParams.get('key') !== process.env.TICK_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }
  const guild = url.searchParams.get('guild');
  if (guild && !/^\d+$/.test(guild)) return new Response('El ID del servidor solo lleva números.', { status: 400 });

  const app = process.env.DISCORD_APP_ID;
  const res = await fetch(
    `https://discord.com/api/v10/applications/${app}${guild ? `/guilds/${guild}` : ''}/commands`,
    {
      method: 'PUT',
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
    },
  );
  if (!res.ok) return new Response(`❌ Error ${res.status}: ${await res.text()}`, { status: 500 });
  const data = await res.json();
  return new Response(
    `✅ ${data.length} comandos registrados ${guild ? 'en tu servidor' : 'globalmente'}:\n` +
      data.map((c) => '  /' + c.name).join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
