const API = 'https://discord.com/api/v10';

export class DiscordError extends Error {
  constructor(status, body) {
    super(`Discord ${status}: ${body}`);
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function discordFetch(path, { method = 'GET', body, auth = true } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(API + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const info = await res.json().catch(() => ({}));
      await sleep(Math.min((info.retry_after || 1) * 1000, 5000));
      continue;
    }
    if (!res.ok) throw new DiscordError(res.status, await res.text());
    return res.status === 204 ? null : res.json();
  }
  throw new DiscordError(429, 'demasiadas solicitudes');
}

export function sendMessage(channelId, payload) {
  return discordFetch(`/channels/${channelId}/messages`, { method: 'POST', body: payload });
}

/** Reemplaza la respuesta "pensando…" de un comando por la respuesta final. */
export function editOriginal(token, payload, appId = process.env.DISCORD_APP_ID) {
  return discordFetch(`/webhooks/${appId}/${token}/messages/@original`, {
    method: 'PATCH',
    body: payload,
    auth: false,
  });
}
