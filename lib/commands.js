// Definición de los comandos "/" que se registran en Discord (api/register.js o scripts/register.js).
// Las descripciones van en inglés con traducción al español, italiano y alemán: Discord muestra la del idioma de cada usuario.
const SUB = 1, STRING = 3, INTEGER = 4, CHANNEL = 7, ROLE = 8;
const TEXT_CHANNELS = [0, 5]; // texto y anuncios

/** Descripción en inglés + español, italiano y alemán. */
const d = (en, es, it, de) => ({
  description: en, description_localizations: { 'es-ES': es, 'es-419': es, it, de },
});
/** Nombre de una opción de lista en inglés + español, italiano y alemán. */
const c = (en, es, it, de, value) => ({ name: en, name_localizations: { 'es-ES': es, 'es-419': es, it, de }, value });

const eventOpt = (en = 'Event name', es = 'Nombre del evento', it = "Nome dell'evento", de = 'Name des Events') => ({
  type: STRING, name: 'event', ...d(en, es, it, de), required: true, autocomplete: true,
});
const idOpt = {
  type: INTEGER, name: 'id', ...d('Alarm (type the event name or the number)', 'Alarma (escribe el nombre del evento o el número)', 'Allarme (scrivi il nome dell\'evento o il numero)', 'Alarm (Eventname oder Nummer eingeben)'),
  required: true, min_value: 1, autocomplete: true,
};
const dateOpt = { type: STRING, name: 'date', ...d('Date: 2026-10-25, 25/10/2026, today or tomorrow', 'Fecha: 2026-10-25, 25/10/2026, hoy o mañana', 'Data: 2026-10-25, 25/10/2026, oggi o domani', 'Datum: 2026-10-25, 25/10/2026, heute oder morgen') };
const timeOpt = { type: STRING, name: 'time', ...d('Time in 24 h format, e.g. 20:30', 'Hora en formato 24 h, ej. 20:30', 'Ora in formato 24 h, es. 20:30', 'Uhrzeit im 24-h-Format, z. B. 20:30') };
const beforeOpt = {
  type: STRING, name: 'before',
  ...d('Before the event starts: 1d, 2h, 30m, 1h30m or 0 (at start)', 'Antes del inicio del evento: 1d, 2h, 30m, 1h30m o 0 (al inicio)', 'Prima dell\'inizio: 1d, 2h, 30m, 1h30m o 0 (all\'inizio)', 'Vor dem Start: 1d, 2h, 30m, 1h30m oder 0 (zum Start)'),
};
const channelOpt = { type: CHANNEL, name: 'channel', ...d('Channel to post in', 'Canal donde se enviará', 'Canale in cui pubblicare', 'Kanal zum Posten'), channel_types: TEXT_CHANNELS };
const mentionsOpt = {
  type: STRING, name: 'mentions',
  ...d('everyone, here, none, @users @roles or group:Name', 'everyone, here, none, @usuarios @roles o group:Nombre', 'everyone, here, none, @utenti @ruoli o group:Nome', 'everyone, here, none, @Nutzer @Rollen oder group:Name'),
};
const repeatOpt = {
  type: STRING, name: 'repeat', ...d('Repeat (only for alarms with date and time)', 'Repetición (solo para alarmas con fecha y hora)', 'Ripetizione (solo per allarmi con data e ora)', 'Wiederholung (nur für Alarme mit Datum und Uhrzeit)'),
  choices: [
    c('Does not repeat', 'No se repite', 'Non si ripete', 'Keine Wiederholung', 'none'),
    c('Daily', 'Diaria', 'Giornaliera', 'Täglich', 'daily'),
    c('Weekly', 'Semanal', 'Settimanale', 'Wöchentlich', 'weekly'),
    c('Monthly', 'Mensual', 'Mensile', 'Monatlich', 'monthly'),
  ],
};
const everyOpt = {
  type: INTEGER, name: 'every',
  ...d('Repeat every N days/weeks/months (e.g. 2 = every 2 days)', 'Cada cuántos días/semanas/meses se repite (ej. 2 = cada 2 días)', 'Ripeti ogni N giorni/settimane/mesi (es. 2 = ogni 2 giorni)', 'Alle N Tage/Wochen/Monate wiederholen (z. B. 2 = alle 2 Tage)'),
  min_value: 1, max_value: 30,
};
const daysInRowOpt = {
  type: INTEGER, name: 'days', min_value: 1, max_value: 30,
  ...d('Days in a row it goes off each cycle (use with every), e.g. 7', 'Días seguidos que suena en cada ciclo (con every), ej. 7', 'Giorni di fila in cui suona a ogni ciclo (con every), es. 7', 'Tage am Stück pro Zyklus (mit every), z. B. 7'),
};
const untilOpt = {
  type: STRING, name: 'until',
  ...d('Last day it repeats, e.g. 2026-12-15 (or "never" to remove)', 'Último día en que se repite, ej. 2026-12-15 (o "nunca" para quitarlo)', 'Ultimo giorno di ripetizione, es. 2026-12-15 (o "mai" per rimuovere)', 'Letzter Wiederholungstag, z. B. 2026-12-15 (oder "nie" zum Entfernen)'),
};

// Yes / No como lista (más claro que True / False). Valores: 'yes' | 'no'.
const yesNo = [c('Yes', 'Sí', 'Sì', 'Ja', 'yes'), c('No', 'No', 'No', 'Nein', 'no')];

const scheduleOpt = {
  type: STRING, name: 'schedule', choices: yesNo,
  ...d('Show it in /schedule and the daily summary (default: yes)', 'Mostrarla en /schedule y en el resumen diario (por defecto: sí)', 'Mostrarlo in /schedule e nel riepilogo giornaliero (predefinito: sì)', 'In /schedule und der täglichen Übersicht zeigen (Standard: ja)'),
};

const guildOnly = { contexts: [0], integration_types: [0] };

export const commands = [
  {
    name: 'event', ...d('Manage events', 'Gestiona eventos', 'Gestisci gli eventi', 'Events verwalten'), ...guildOnly,
    options: [
      {
        type: SUB, name: 'create', ...d('Create an event', 'Crea un evento', 'Crea un evento', 'Event erstellen'),
        options: [
          { type: STRING, name: 'name', ...d('Event name', 'Nombre del evento', 'Nome dell\'evento', 'Name des Events'), required: true, max_length: 80 },
          dateOpt, timeOpt,
          { type: STRING, name: 'description', ...d('Description', 'Descripción', 'Descrizione', 'Beschreibung'), max_length: 500 },
        ],
      },
      { type: SUB, name: 'list', ...d('List the server events', 'Lista los eventos del servidor', 'Elenca gli eventi del server', 'Events des Servers auflisten') },
      { type: SUB, name: 'view', ...d('Show an event and its alarms', 'Muestra un evento y sus alarmas', 'Mostra un evento e i suoi allarmi', 'Ein Event und seine Alarme anzeigen'), options: [eventOpt()] },
      {
        type: SUB, name: 'edit', ...d('Edit an event (relative alarms move with it)', 'Edita un evento (las alarmas relativas se mueven solas)', 'Modifica un evento (gli allarmi relativi si spostano)', 'Event bearbeiten (relative Alarme verschieben sich mit)'),
        options: [
          eventOpt('Event to edit', 'Evento a editar', 'Evento da modificare', 'Zu bearbeitendes Event'),
          { type: STRING, name: 'new_name', ...d('New name', 'Nuevo nombre', 'Nuovo nome', 'Neuer Name'), max_length: 80 },
          dateOpt, timeOpt,
          { type: STRING, name: 'description', ...d('New description', 'Nueva descripción', 'Nuova descrizione', 'Neue Beschreibung'), max_length: 500 },
        ],
      },
      { type: SUB, name: 'delete', ...d('Delete an event and all its alarms', 'Borra un evento y todas sus alarmas', 'Elimina un evento e tutti i suoi allarmi', 'Event und alle seine Alarme löschen'), options: [eventOpt()] },
    ],
  },
  {
    name: 'alarm', ...d('Manage event alarms', 'Gestiona las alarmas de los eventos', 'Gestisci gli allarmi degli eventi', 'Event-Alarme verwalten'), ...guildOnly,
    options: [
      {
        type: SUB, name: 'add', ...d('Add an alarm to an event', 'Agrega una alarma a un evento', 'Aggiungi un allarme a un evento', 'Einem Event einen Alarm hinzufügen'),
        options: [
          eventOpt(),
          {
            type: STRING, name: 'message',
            ...d('Message (supports {event}, {start}, {time_left} and \\n)', 'Mensaje (acepta {event}, {start}, {time_left} y \\n)', 'Messaggio (accetta {event}, {start}, {time_left} e \\n)', 'Nachricht (unterstützt {event}, {start}, {time_left} und \\n)'),
            required: true, max_length: 1500,
          },
          beforeOpt, dateOpt, timeOpt, channelOpt, mentionsOpt, repeatOpt, everyOpt, daysInRowOpt, untilOpt, scheduleOpt,
        ],
      },
      {
        type: SUB, name: 'list', ...d('List alarms (of an event, or upcoming on the server)', 'Lista alarmas (de un evento o las próximas del servidor)', 'Elenca gli allarmi (di un evento o i prossimi del server)', 'Alarme auflisten (eines Events oder die nächsten des Servers)'),
        options: [{ ...eventOpt('Event (optional)', 'Evento (opcional)', 'Evento (facoltativo)', 'Event (optional)'), required: false }],
      },
      {
        type: SUB, name: 'edit', ...d('Edit an alarm', 'Edita una alarma', 'Modifica un allarme', 'Alarm bearbeiten'),
        options: [
          idOpt,
          { type: STRING, name: 'message', ...d('New message', 'Nuevo mensaje', 'Nuovo messaggio', 'Neue Nachricht'), max_length: 1500 },
          beforeOpt, dateOpt, timeOpt, channelOpt, mentionsOpt, repeatOpt, everyOpt, daysInRowOpt, untilOpt, scheduleOpt,
        ],
      },
      { type: SUB, name: 'delete', ...d('Delete an alarm', 'Borra una alarma', 'Elimina un allarme', 'Alarm löschen'), options: [idOpt] },
      {
        type: SUB, name: 'test', ...d('Send the alarm now as a test (pings no one)', 'Envía la alarma ahora como prueba (sin notificar a nadie)', 'Invia ora l\'allarme come test (senza notificare)', 'Alarm jetzt als Test senden (ohne Benachrichtigung)'),
        options: [idOpt],
      },
      { type: SUB, name: 'pause', ...d('Pause an alarm', 'Pausa una alarma', 'Metti in pausa un allarme', 'Alarm pausieren'), options: [idOpt] },
      { type: SUB, name: 'resume', ...d('Resume a paused alarm', 'Reanuda una alarma pausada', 'Riprendi un allarme in pausa', 'Pausierten Alarm fortsetzen'), options: [idOpt] },
    ],
  },
  {
    name: 'group', ...d('Reusable mention groups', 'Grupos de menciones reutilizables', 'Gruppi di menzioni riutilizzabili', 'Wiederverwendbare Erwähnungsgruppen'), ...guildOnly,
    options: [
      {
        type: SUB, name: 'create', ...d('Create or replace a group', 'Crea o reemplaza un grupo', 'Crea o sostituisci un gruppo', 'Gruppe erstellen oder ersetzen'),
        options: [
          { type: STRING, name: 'name', ...d('Group name, e.g. Staff', 'Nombre del grupo, ej. Staff', 'Nome del gruppo, es. Staff', 'Gruppenname, z. B. Staff'), required: true, max_length: 40 },
          { type: STRING, name: 'members', ...d('Users and roles: @Ana @Pedro @Moderators', 'Usuarios y roles: @Ana @Pedro @Moderadores', 'Utenti e ruoli: @Ana @Pedro @Moderatori', 'Nutzer und Rollen: @Ana @Pedro @Moderatoren'), required: true },
        ],
      },
      { type: SUB, name: 'list', ...d('List the groups', 'Lista los grupos', 'Elenca i gruppi', 'Gruppen auflisten') },
      {
        type: SUB, name: 'delete', ...d('Delete a group', 'Borra un grupo', 'Elimina un gruppo', 'Gruppe löschen'),
        options: [{ type: STRING, name: 'name', ...d('Group name', 'Nombre del grupo', 'Nome del gruppo', 'Gruppenname'), required: true, autocomplete: true }],
      },
    ],
  },
  {
    name: 'agenda', ...d('Upcoming alarms on the server', 'Próximas alarmas del servidor', 'Prossimi allarmi del server', 'Nächste Alarme des Servers'), ...guildOnly,
    options: [
      {
        type: INTEGER, name: 'days', ...d('How many days ahead (default 7)', 'Cuántos días hacia adelante (por defecto 7)', 'Quanti giorni in avanti (predefinito 7)', 'Wie viele Tage voraus (Standard 7)'),
        min_value: 1, max_value: 60,
      },
    ],
  },
  {
    name: 'config', ...d('Kon Planner settings', 'Configuración de Kon Planner', 'Impostazioni di Kon Planner', 'Kon Planner Einstellungen'), ...guildOnly,
    options: [
      { type: SUB, name: 'view', ...d('Show current settings', 'Muestra la configuración actual', 'Mostra le impostazioni attuali', 'Aktuelle Einstellungen anzeigen') },
      {
        type: SUB, name: 'timezone', ...d('Server time zone', 'Zona horaria del servidor', 'Fuso orario del server', 'Zeitzone des Servers'),
        options: [{ type: STRING, name: 'value', ...d('e.g. UTC or America/Santiago', 'Ej. UTC o America/Santiago', 'es. UTC o Europe/Rome', 'z. B. UTC oder Europe/Berlin'), required: true, autocomplete: true }],
      },
      {
        type: SUB, name: 'admin-role', ...d('Role that can create and edit events and alarms', 'Rol que puede crear y editar eventos y alarmas', 'Ruolo che può creare e modificare eventi e allarmi', 'Rolle, die Events und Alarme erstellen und bearbeiten darf'),
        options: [{ type: ROLE, name: 'role', ...d('Organizer role', 'Rol organizador', 'Ruolo organizzatore', 'Organisator-Rolle'), required: true }],
      },
      {
        type: SUB, name: 'daily-summary',
        ...d('Post every day the list of that day\'s events', 'Publica cada día la lista de eventos de ese día', 'Pubblica ogni giorno l\'elenco degli eventi del giorno', 'Postet jeden Tag die Liste der Events des Tages'),
        options: [
          { ...channelOpt, required: true },
          { ...timeOpt, ...d('Time of the summary (server time zone), e.g. 09:00', 'Hora del resumen (zona del servidor), ej. 09:00', 'Ora del riepilogo (fuso del server), es. 09:00', 'Uhrzeit der Übersicht (Serverzeitzone), z. B. 09:00'), required: true },
          { ...mentionsOpt, ...d('Who to mention: @role, here, everyone or none', 'A quién mencionar: @rol, here, everyone o none', 'Chi menzionare: @ruolo, here, everyone o none', 'Wen erwähnen: @Rolle, here, everyone oder none') },
        ],
      },
      {
        type: SUB, name: 'daily-summary-off',
        ...d('Turn off the daily summary', 'Desactiva el resumen diario', 'Disattiva il riepilogo giornaliero', 'Tägliche Übersicht ausschalten'),
      },
      {
        type: SUB, name: 'default-channel', ...d('Default channel for alarms', 'Canal por defecto para las alarmas', 'Canale predefinito per gli allarmi', 'Standardkanal für Alarme'),
        options: [{ ...channelOpt, required: true }],
      },
    ],
  },
  {
    name: 'schedule',
    ...d('Schedule by day: events and alarms', 'Cronograma por día: eventos y alarmas', 'Programma per giorno: eventi e allarmi', 'Zeitplan pro Tag: Events und Alarme'),
    ...guildOnly,
    options: [
      {
        type: INTEGER, name: 'days', min_value: 1, max_value: 31,
        ...d('How many days, starting today (default 7)', 'Cuántos días desde hoy (por defecto 7)', 'Quanti giorni da oggi (predefinito 7)', 'Wie viele Tage ab heute (Standard 7)'),
      },
      {
        type: STRING, name: 'public', choices: yesNo,
        ...d('Post it in the channel for everyone (default: only you)', 'Publicarlo en el canal para todos (por defecto: solo tú)', 'Pubblicalo nel canale per tutti (predefinito: solo tu)', 'Für alle im Kanal posten (Standard: nur du)'),
      },
    ],
  },
  { name: 'now', ...d('Current date and time in the server time zone', 'Fecha y hora actual en la zona del servidor', 'Data e ora attuali nel fuso del server', 'Aktuelles Datum und Uhrzeit in der Serverzeitzone'), ...guildOnly },
  { name: 'help', ...d('How to use Kon Planner', 'Cómo usar Kon Planner', 'Come usare Kon Planner', 'So nutzt du Kon Planner'), ...guildOnly },
];
