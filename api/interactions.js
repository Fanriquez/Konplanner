// Endpoint que Discord llama cada vez que alguien usa un comando "/", un botón, un menú o un formulario.
// Configúralo en el Developer Portal como "Interactions Endpoint URL":
//   https://TU-PROYECTO.vercel.app/api/interactions
import { verifyKey } from 'discord-interactions';
import { waitUntil } from '@vercel/functions';
import { autocomplete, handleCommand } from '../lib/handlers.js';
import { UserError } from '../lib/errors.js';
import { editOriginal, followup } from '../lib/discord.js';
import { routeComponent } from '../lib/ui.js';
import { lang, t } from '../lib/i18n.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PING = 1, COMMAND = 2, COMPONENT = 3, AUTOCOMPLETE = 4, MODAL_SUBMIT = 5;
const EPHEMERAL = 64;

const json = (body) => Response.json(body);

// Tabla o columna inexistente (42P01 / 42703): falta pegar el schema.sql actualizado en Supabase.
const errorText = (L, e) => (['42P01', '42703'].includes(e?.code) ? t(L, 'db_outdated') : t(L, 'unexpected'));

async function runCommand(interaction) {
  const L = lang(interaction.locale);
  let reply;
  try {
    reply = await handleCommand(interaction);
  } catch (e) {
    if (e instanceof UserError) {
      reply = { content: `❌ ${t(L, e.key, e.vars)}` };
    } else {
      console.error(e);
      reply = { content: errorText(L, e) };
    }
  }
  await respond(interaction, reply);
}

/** Reemplaza el "pensando…" (o el mensaje del botón) por la respuesta. Las respuestas nunca notifican a nadie. */
async function respond(interaction, reply) {
  const payload = { ...reply, allowed_mentions: { parse: [] } };
  // Si respondemos antes de que Discord registre el "pensando…", devuelve 404 (Unknown Webhook): esperamos y reintentamos.
  for (let attempt = 1; ; attempt++) {
    try {
      await editOriginal(interaction.token, payload, interaction.application_id);
      return;
    } catch (e) {
      if (e.status !== 404 || attempt >= 5) return console.error('No se pudo responder al comando:', e.message);
      await sleep(400 * attempt);
    }
  }
}

/** Botones, menús y formularios: el contenido nuevo reemplaza al anterior (salvo `keep`, que solo cambia lo indicado). */
async function runComponent(interaction, action) {
  const L = lang(interaction.locale);
  try {
    const { keep, ...reply } = await action.run();
    await respond(interaction, keep ? reply : { content: '', embeds: [], components: [], ...reply });
  } catch (e) {
    const content = e instanceof UserError ? `❌ ${t(L, e.key, e.vars)}` : errorText(L, e);
    if (!(e instanceof UserError)) console.error(e);
    // En un mensaje nuevo, el error lo reemplaza; si se editaba un formulario, se muestra aparte para no perderlo.
    if (action.defer === 'new') await respond(interaction, { content, embeds: [], components: [] });
    else await followup(interaction.token, { content }, interaction.application_id).catch((err) => console.error(err.message));
  }
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
      return json({ type: 4, data: { content: t(lang(interaction.locale), 'guild_only'), flags: EPHEMERAL } });
    }
    // Discord exige respuesta en 3 segundos: respondemos "pensando…" y terminamos el trabajo en segundo plano.
    waitUntil(runCommand(interaction));
    return json({ type: 5, data: { flags: EPHEMERAL } });
  }

  if (interaction.type === COMPONENT || interaction.type === MODAL_SUBMIT) {
    if (!interaction.guild_id) {
      return json({ type: 4, data: { content: t(lang(interaction.locale), 'guild_only'), flags: EPHEMERAL } });
    }
    const action = routeComponent(interaction);
    if (action.modal) return json({ type: 9, data: action.modal });
    waitUntil(runComponent(interaction, action));
    // 'new': mensaje nuevo privado ("pensando…"); 'update': se editará el mensaje del botón.
    return json(action.defer === 'new' ? { type: 5, data: { flags: EPHEMERAL } } : { type: 6 });
  }

  return json({ type: 4, data: { content: t(lang(interaction.locale), 'unsupported'), flags: EPHEMERAL } });
}

export function GET() {
  return new Response('Kon Planner está funcionando 🦁');
}
