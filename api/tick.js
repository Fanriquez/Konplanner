// El "reloj" del bot. cron-job.org llama a esta URL cada minuto:
//   https://TU-PROYECTO.vercel.app/api/tick?key=TU_TICK_SECRET
import { runTick } from '../lib/tick.js';

export async function GET(request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || request.headers.get('x-tick-key');
  if (!process.env.TICK_SECRET || key !== process.env.TICK_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }
  try {
    return Response.json({ ok: true, ...(await runTick()) });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export const POST = GET;
