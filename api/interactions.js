// Endpoint que Discord llama cada vez que alguien usa un comando "/".
// Configúralo en el Developer Portal como "Interactions Endpoint URL":
//   https://TU-PROYECTO.vercel.app/api/interactions
import { verifyKey } from 'discord-interactions';
import { waitUntil } from '@vercel/functions';
import { autocomplete, handleCommand } from '../lib/handlers.js';
import { UserError } from '../lib/errors.js';
import { editOriginal } from '../lib/discord.js';

const PING = 1, COMMAND = 2, AUTOCOMPLETE = 4;
const EPHEMERAL = 64;

const json = (body) => Response.json(body);

async function runCommand(interaction) {
  let reply;
  try {
    reply = await handleCommand(interaction);
  } catch (e) {
    if (e instanceof UserError) {
      reply = { content: `❌ ${e.message}` };
    } else {
      console.error(e);
      reply = { content: '❌ Ocurrió un error inesperado. Inténtalo de nuevo en un momento.' };
    }
  }
  // Las respuestas a comandos nunca notifican a nadie.
  await editOriginal(interaction.token, { ...reply, allowed_mentions: { parse: [] } }).catch((e) =>
    console.error('No se pudo responder al comando:', e.message),
  );
}

export async function POST(request) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.text();

  const valid =
    signature && timestamp && (await verifyKey(body, signature, timestamp, process.env.DISCORD_PUBLIC_KEY));
  if (!valid) return new Response('invalid request signature', { status: 401 });

  const interaction = JSON.parse(body);

  if (interaction.type === PING) return json({ type: 1 });

  if (interaction.type === AUTOCOMPLETE) {
    const choices = await autocomplete(interaction).catch(() => []);
    return json({ type: 8, data: { choices } });
  }

  if (interaction.type === COMMAND) {
    if (!interaction.guild_id) {
      return json({ type: 4, data: { content: 'Kon Planner solo funciona dentro de un servidor.', flags: EPHEMERAL } });
    }
    // Discord exige respuesta en 3 segundos: respondemos "pensando…" y terminamos el trabajo en segundo plano.
    waitUntil(runCommand(interaction));
    return json({ type: 5, data: { flags: EPHEMERAL } });
  }

  return json({ type: 4, data: { content: 'Interacción no soportada.', flags: EPHEMERAL } });
}

export function GET() {
  return new Response('Kon Planner está funcionando 🦁');
}
