import { ts } from './time.js';
import { buildMentionLine } from './mentions.js';
import { t } from './i18n.js';

export const COLOR = 0xf5a623;

/**
 * Variables disponibles en los mensajes:
 *   {event} / {evento}              nombre del evento
 *   {description} / {descripcion}   descripción del evento
 *   {start} / {inicio}              fecha y hora de inicio (en la hora local de cada usuario)
 *   {time_left} / {falta}           tiempo restante ("en 2 horas")
 * Escribe \n para un salto de línea.
 */
export function renderTemplate(text, event) {
  const start = event.starts_at ? new Date(event.starts_at) : null;
  const vars = {
    event: event.name,
    evento: event.name,
    description: event.description || '',
    descripcion: event.description || '',
    start: start ? ts(start, 'F') : '—',
    inicio: start ? ts(start, 'F') : '—',
    time_left: start ? ts(start, 'R') : '',
    falta: start ? ts(start, 'R') : '',
  };
  return String(text)
    .replace(/\\n/g, '\n')
    .replace(/\{(\w+)\}/g, (m, k) => (k.toLowerCase() in vars ? vars[k.toLowerCase()] : m));
}

/**
 * Mensaje que publica el bot cuando suena una alarma. En modo prueba no notifica a nadie.
 * El mensaje lo ve todo el canal, así que no lleva textos fijos en un idioma (salvo la prueba, en el de quien la pidió).
 */
export function buildAlarmPayload({ alarm, event, groupMembers = null, test = false, L = 'en' }) {
  const { line, allowed } = buildMentionLine(alarm.mentions || {}, groupMembers);
  const fields = [];
  if (event.starts_at) {
    const start = new Date(event.starts_at);
    fields.push({ name: '🗓️', value: `${ts(start, 'F')} · ${ts(start, 'R')}` });
  }
  return {
    content: line || undefined,
    embeds: [
      {
        title: `${test ? t(L, 'test_title') : ''}⏰ ${event.name}`.slice(0, 256),
        description: renderTemplate(alarm.message, event).slice(0, 4000),
        color: test ? 0x95a5a6 : COLOR,
        fields,
        footer: { text: test ? t(L, 'test_footer') : 'Kon Planner' },
      },
    ],
    allowed_mentions: test ? { parse: [] } : allowed,
  };
}
