// Definición de los comandos "/" que se registran en Discord (scripts/register.js).
const SUB = 1, STRING = 3, INTEGER = 4, CHANNEL = 7, ROLE = 8;
const TEXT_CHANNELS = [0, 5]; // texto y anuncios

const eventOpt = (description = 'Nombre del evento') => ({
  type: STRING, name: 'event', description, required: true, autocomplete: true,
});
const idOpt = { type: INTEGER, name: 'id', description: 'Alarma (escribe el nombre del evento o el número)', required: true, min_value: 1, autocomplete: true };
const dateOpt = { type: STRING, name: 'date', description: 'Fecha: 2026-10-25, 25/10/2026, hoy o mañana' };
const timeOpt = { type: STRING, name: 'time', description: 'Hora en formato 24 h, ej. 20:30' };
const beforeOpt = { type: STRING, name: 'before', description: 'Relativo al inicio del evento: 1d, 2h, 30m, 1h30m o 0 (al inicio)' };
const channelOpt = { type: CHANNEL, name: 'channel', description: 'Canal donde se enviará', channel_types: TEXT_CHANNELS };
const mentionsOpt = { type: STRING, name: 'mentions', description: 'everyone, here, none, @usuarios @roles o group:Nombre' };
const repeatOpt = {
  type: STRING, name: 'repeat', description: 'Repetición (solo para alarmas con fecha y hora)',
  choices: [
    { name: 'No se repite', value: 'none' },
    { name: 'Diaria', value: 'daily' },
    { name: 'Semanal', value: 'weekly' },
    { name: 'Mensual', value: 'monthly' },
  ],
};

const everyOpt = {
  type: INTEGER, name: 'every', description: 'Cada cuántos días/semanas/meses se repite (ej. 2 = cada 2 días)', min_value: 1, max_value: 30,
};

const untilOpt = {
  type: STRING, name: 'until', description: 'Último día en que se repite, ej. 2026-12-15 (o "nunca" para quitarlo)',
};

const guildOnly = { contexts: [0], integration_types: [0] };

export const commands = [
  {
    name: 'event', description: 'Gestiona eventos', ...guildOnly,
    options: [
      {
        type: SUB, name: 'create', description: 'Crea un evento',
        options: [
          { type: STRING, name: 'name', description: 'Nombre del evento', required: true, max_length: 80 },
          dateOpt, timeOpt,
          { type: STRING, name: 'description', description: 'Descripción', max_length: 500 },
        ],
      },
      { type: SUB, name: 'list', description: 'Lista los eventos del servidor' },
      { type: SUB, name: 'view', description: 'Muestra un evento y sus alarmas', options: [eventOpt()] },
      {
        type: SUB, name: 'edit', description: 'Edita un evento (las alarmas relativas se mueven solas)',
        options: [
          eventOpt('Evento a editar'),
          { type: STRING, name: 'new_name', description: 'Nuevo nombre', max_length: 80 },
          dateOpt, timeOpt,
          { type: STRING, name: 'description', description: 'Nueva descripción', max_length: 500 },
        ],
      },
      { type: SUB, name: 'delete', description: 'Borra un evento y todas sus alarmas', options: [eventOpt()] },
    ],
  },
  {
    name: 'alarm', description: 'Gestiona las alarmas de los eventos', ...guildOnly,
    options: [
      {
        type: SUB, name: 'add', description: 'Agrega una alarma a un evento',
        options: [
          eventOpt(),
          { type: STRING, name: 'message', description: 'Mensaje (acepta {event}, {start}, {time_left} y \\n)', required: true, max_length: 1500 },
          beforeOpt, dateOpt, timeOpt, channelOpt, mentionsOpt, repeatOpt, everyOpt, untilOpt,
        ],
      },
      {
        type: SUB, name: 'list', description: 'Lista alarmas (de un evento o las próximas del servidor)',
        options: [{ ...eventOpt('Evento (opcional)'), required: false }],
      },
      {
        type: SUB, name: 'edit', description: 'Edita una alarma',
        options: [
          idOpt,
          { type: STRING, name: 'message', description: 'Nuevo mensaje', max_length: 1500 },
          beforeOpt, dateOpt, timeOpt, channelOpt, mentionsOpt, repeatOpt, everyOpt, untilOpt,
        ],
      },
      { type: SUB, name: 'delete', description: 'Borra una alarma', options: [idOpt] },
      { type: SUB, name: 'test', description: 'Envía la alarma ahora como prueba (sin notificar a nadie)', options: [idOpt] },
      { type: SUB, name: 'pause', description: 'Pausa una alarma', options: [idOpt] },
      { type: SUB, name: 'resume', description: 'Reanuda una alarma pausada', options: [idOpt] },
    ],
  },
  {
    name: 'group', description: 'Grupos de menciones reutilizables', ...guildOnly,
    options: [
      {
        type: SUB, name: 'create', description: 'Crea o reemplaza un grupo',
        options: [
          { type: STRING, name: 'name', description: 'Nombre del grupo, ej. Staff', required: true, max_length: 40 },
          { type: STRING, name: 'members', description: 'Usuarios y roles: @Ana @Pedro @Moderadores', required: true },
        ],
      },
      { type: SUB, name: 'list', description: 'Lista los grupos' },
      {
        type: SUB, name: 'delete', description: 'Borra un grupo',
        options: [{ type: STRING, name: 'name', description: 'Nombre del grupo', required: true, autocomplete: true }],
      },
    ],
  },
  {
    name: 'agenda', description: 'Próximas alarmas del servidor', ...guildOnly,
    options: [{ type: INTEGER, name: 'days', description: 'Cuántos días hacia adelante (por defecto 7)', min_value: 1, max_value: 60 }],
  },
  {
    name: 'config', description: 'Configuración de Kon Planner', ...guildOnly,
    options: [
      { type: SUB, name: 'view', description: 'Muestra la configuración actual' },
      {
        type: SUB, name: 'timezone', description: 'Zona horaria del servidor',
        options: [{ type: STRING, name: 'value', description: 'Ej. America/Santiago', required: true, autocomplete: true }],
      },
      {
        type: SUB, name: 'admin-role', description: 'Rol que puede crear y editar eventos y alarmas',
        options: [{ type: ROLE, name: 'role', description: 'Rol organizador', required: true }],
      },
      {
        type: SUB, name: 'default-channel', description: 'Canal por defecto para las alarmas',
        options: [{ ...channelOpt, required: true }],
      },
    ],
  },
  { name: 'help', description: 'Cómo usar Kon Planner', ...guildOnly },
];
