// Textos del bot en inglés, español, italiano y alemán.
// Cada persona ve las respuestas en el idioma de su Discord; si no está aquí, en inglés.
// {nombre} se reemplaza por el valor correspondiente.

export const LANGS = ['en', 'es', 'it', 'de'];

/** "es-419" → "es", "en-US" → "en"; otros idiomas → "en". */
export function lang(locale) {
  const base = String(locale || '').slice(0, 2).toLowerCase();
  return LANGS.includes(base) ? base : 'en';
}

export function t(L, key, vars = {}) {
  const entry = S[key];
  if (!entry) return key;
  const str = entry[L] ?? entry.en;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const S = {
  // ---------- general ----------
  unexpected: {
    en: '❌ Something went wrong. Please try again in a moment.',
    es: '❌ Ocurrió un error inesperado. Inténtalo de nuevo en un momento.',
    it: '❌ Si è verificato un errore imprevisto. Riprova tra un momento.',
    de: '❌ Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es gleich noch einmal.',
  },
  guild_only: {
    en: 'Kon Planner only works inside a server.',
    es: 'Kon Planner solo funciona dentro de un servidor.',
    it: 'Kon Planner funziona solo all\'interno di un server.',
    de: 'Kon Planner funktioniert nur auf einem Server.',
  },
  unsupported: {
    en: 'Unsupported interaction.',
    es: 'Interacción no soportada.',
    it: 'Interazione non supportata.',
    de: 'Nicht unterstützte Interaktion.',
  },
  unknown_command: {
    en: 'Unknown command. Try `/help`.',
    es: 'Comando desconocido. Prueba `/help`.',
    it: 'Comando sconosciuto. Prova `/help`.',
    de: 'Unbekannter Befehl. Versuche `/help`.',
  },
  need_manage: {
    en: 'Only people who can **manage the server** can change the settings.',
    es: 'Solo quienes pueden **gestionar el servidor** cambian la configuración.',
    it: 'Solo chi può **gestire il server** può modificare le impostazioni.',
    de: 'Nur wer den **Server verwalten** darf, kann die Einstellungen ändern.',
  },
  no_permission: {
    en: 'You don\'t have permission for this. You need "Manage Server" or the organizer role (`/config view`).',
    es: 'No tienes permiso para esto. Necesitas "Gestionar servidor" o el rol organizador (`/config view`).',
    it: 'Non hai il permesso. Ti serve "Gestisci server" o il ruolo organizzatore (`/config view`).',
    de: 'Dafür fehlt dir die Berechtigung. Du brauchst "Server verwalten" oder die Organisator-Rolle (`/config view`).',
  },
  more_lines: {
    en: '…and {n} more line(s)',
    es: '…y {n} línea(s) más',
    it: '…e altre {n} righe',
    de: '…und {n} weitere Zeile(n)',
  },
  nothing_to_change: {
    en: 'You didn\'t specify anything to change.',
    es: 'No indicaste nada que cambiar.',
    it: 'Non hai indicato nulla da modificare.',
    de: 'Du hast nichts zum Ändern angegeben.',
  },

  // ---------- fechas y horas ----------
  bad_date: {
    en: 'I didn\'t understand the date "{value}". Use 2026-10-25, 25/10/2026, today or tomorrow.',
    es: 'No entendí la fecha "{value}". Usa 2026-10-25, 25/10/2026, hoy o mañana.',
    it: 'Non ho capito la data "{value}". Usa 2026-10-25, 25/10/2026, oggi o domani.',
    de: 'Das Datum "{value}" habe ich nicht verstanden. Nutze 2026-10-25, 25/10/2026, heute oder morgen.',
  },
  missing_date: {
    en: 'The **date** is missing.',
    es: 'Falta la **fecha** (date).',
    it: 'Manca la **data** (date).',
    de: 'Das **Datum** (date) fehlt.',
  },
  bad_time: {
    en: 'I didn\'t understand the time "{value}". Use 24 h format, e.g. 20:30.',
    es: 'No entendí la hora "{value}". Usa formato 24 h, por ejemplo 20:30.',
    it: 'Non ho capito l\'ora "{value}". Usa il formato 24 h, ad es. 20:30.',
    de: 'Die Uhrzeit "{value}" habe ich nicht verstanden. Nutze das 24-h-Format, z. B. 20:30.',
  },
  missing_time: {
    en: 'The **time** is missing.',
    es: 'Falta la **hora** (time).',
    it: 'Manca l\'**ora** (time).',
    de: 'Die **Uhrzeit** (time) fehlt.',
  },
  invalid_datetime: {
    en: 'That date or time is not valid.',
    es: 'Esa fecha u hora no es válida.',
    it: 'Quella data o ora non è valida.',
    de: 'Dieses Datum oder diese Uhrzeit ist ungültig.',
  },
  offset_start: { en: 'at start', es: 'al inicio', it: 'all\'inizio', de: 'zum Start' },
  offset_before: { en: '{x} before', es: '{x} antes', it: '{x} prima', de: '{x} vorher' },
  repeat_none: { en: 'does not repeat', es: 'no se repite', it: 'non si ripete', de: 'keine Wiederholung' },
  repeat_daily: { en: 'daily', es: 'diaria', it: 'giornaliera', de: 'täglich' },
  repeat_weekly: { en: 'weekly', es: 'semanal', it: 'settimanale', de: 'wöchentlich' },
  repeat_monthly: { en: 'monthly', es: 'mensual', it: 'mensile', de: 'monatlich' },
  repeat_every_daily: { en: 'every {n} days', es: 'cada {n} días', it: 'ogni {n} giorni', de: 'alle {n} Tage' },
  repeat_every_weekly: { en: 'every {n} weeks', es: 'cada {n} semanas', it: 'ogni {n} settimane', de: 'alle {n} Wochen' },
  repeat_every_monthly: { en: 'every {n} months', es: 'cada {n} meses', it: 'ogni {n} mesi', de: 'alle {n} Monate' },
  repeat_block: {
    en: '{days} days in a row, every {n} days', es: '{days} días seguidos, cada {n} días',
    it: '{days} giorni di fila, ogni {n} giorni', de: '{days} Tage am Stück, alle {n} Tage',
  },
  days_needs_every: {
    en: '**days** needs **every** (how often the cycle starts), e.g. `every: 19 days: 7`.',
    es: '**days** necesita **every** (cada cuántos días empieza el ciclo), ej. `every: 19 days: 7`.',
    it: '**days** richiede **every** (ogni quanti giorni inizia il ciclo), es. `every: 19 days: 7`.',
    de: '**days** braucht **every** (wie oft der Zyklus beginnt), z. B. `every: 19 days: 7`.',
  },
  days_gt_every: {
    en: '**days** ({days}) can\'t be more than **every** ({every}): the cycle is days in a row + rest days.',
    es: '**days** ({days}) no puede ser mayor que **every** ({every}): el ciclo son los días seguidos + los de descanso.',
    it: '**days** ({days}) non può essere maggiore di **every** ({every}): il ciclo è giorni di fila + giorni di pausa.',
    de: '**days** ({days}) darf nicht größer als **every** ({every}) sein: der Zyklus ist Tage am Stück + Pausentage.',
  },
  until_suffix: { en: ' until {date}', es: ' hasta {date}', it: ' fino al {date}', de: ' bis {date}' },

  // ---------- menciones ----------
  mentions_none: { en: 'no mentions', es: 'sin menciones', it: 'nessuna menzione', de: 'keine Erwähnungen' },
  mention_group: { en: 'group **{name}**', es: 'grupo **{name}**', it: 'gruppo **{name}**', de: 'Gruppe **{name}**' },
  bad_mentions: {
    en: 'I didn\'t recognize any mention. Use `everyone`, `here`, `none`, mentions like @Ana @Moderators, or `group:Name`. Pick people from Discord\'s list when typing @.',
    es: 'No reconocí ninguna mención. Usa `everyone`, `here`, `none`, menciones como @Ana @Moderadores, o `group:Nombre`. Elige a las personas de la lista de Discord al escribir @.',
    it: 'Non ho riconosciuto nessuna menzione. Usa `everyone`, `here`, `none`, menzioni come @Ana @Moderatori, o `group:Nome`. Scegli le persone dalla lista di Discord quando scrivi @.',
    de: 'Ich habe keine Erwähnung erkannt. Nutze `everyone`, `here`, `none`, Erwähnungen wie @Ana @Moderatoren oder `group:Name`. Wähle Personen beim Tippen von @ aus der Discord-Liste.',
  },

  // ---------- estados ----------
  status_paused: { en: ' · ⏸️ paused', es: ' · ⏸️ pausada', it: ' · ⏸️ in pausa', de: ' · ⏸️ pausiert' },
  status_sent: { en: ' · ✅ sent', es: ' · ✅ enviada', it: ' · ✅ inviata', de: ' · ✅ gesendet' },
  status_failed: { en: ' · ❌ failed', es: ' · ❌ falló', it: ' · ❌ fallita', de: ' · ❌ fehlgeschlagen' },
  status_missed: {
    en: ' · ⚠️ not sent (too late)', es: ' · ⚠️ no enviada (atrasada)', it: ' · ⚠️ non inviata (in ritardo)', de: ' · ⚠️ nicht gesendet (zu spät)',
  },
  status_sending: { en: ' · 📤 sending', es: ' · 📤 enviando', it: ' · 📤 invio in corso', de: ' · 📤 wird gesendet' },

  // ---------- eventos ----------
  event_not_found: {
    en: 'I couldn\'t find the event **{name}**. Use `/event list` to see the events.',
    es: 'No encontré el evento **{name}**. Usa `/event list` para ver los eventos.',
    it: 'Non ho trovato l\'evento **{name}**. Usa `/event list` per vedere gli eventi.',
    de: 'Ich habe das Event **{name}** nicht gefunden. Mit `/event list` siehst du alle Events.',
  },
  name_empty: {
    en: 'The name can\'t be empty.', es: 'El nombre no puede estar vacío.', it: 'Il nome non può essere vuoto.', de: 'Der Name darf nicht leer sein.',
  },
  max_events: {
    en: 'This server reached the limit of {max} events. Delete an old one.',
    es: 'Este servidor llegó al máximo de {max} eventos. Borra alguno antiguo.',
    it: 'Questo server ha raggiunto il limite di {max} eventi. Eliminane uno vecchio.',
    de: 'Dieser Server hat das Limit von {max} Events erreicht. Lösche ein altes.',
  },
  event_exists: {
    en: 'An event called **{name}** already exists.',
    es: 'Ya existe un evento llamado **{name}**.',
    it: 'Esiste già un evento chiamato **{name}**.',
    de: 'Es gibt bereits ein Event namens **{name}**.',
  },
  event_created: {
    en: '✅ Event **{name}** created.', es: '✅ Evento **{name}** creado.', it: '✅ Evento **{name}** creato.', de: '✅ Event **{name}** erstellt.',
  },
  starts: { en: '🗓️ Starts {when}', es: '🗓️ Inicia {when}', it: '🗓️ Inizia {when}', de: '🗓️ Beginnt {when}' },
  date_passed: {
    en: '⚠️ That date has already passed.', es: '⚠️ Esa fecha ya pasó.', it: '⚠️ Quella data è già passata.', de: '⚠️ Dieses Datum ist schon vorbei.',
  },
  no_start_hint: {
    en: '🗓️ No start date (add one with `/event edit` if you want relative alarms).',
    es: '🗓️ Sin fecha de inicio (agrégala con `/event edit` si quieres alarmas relativas).',
    it: '🗓️ Nessuna data di inizio (aggiungila con `/event edit` se vuoi allarmi relativi).',
    de: '🗓️ Kein Startdatum (füge es mit `/event edit` hinzu, wenn du relative Alarme willst).',
  },
  add_alarms_hint: {
    en: 'Add alarms with `/alarm add`.', es: 'Agrégale alarmas con `/alarm add`.', it: 'Aggiungi allarmi con `/alarm add`.', de: 'Füge Alarme mit `/alarm add` hinzu.',
  },
  no_events: {
    en: 'No events yet. Create one with `/event create`.',
    es: 'No hay eventos todavía. Crea uno con `/event create`.',
    it: 'Ancora nessun evento. Creane uno con `/event create`.',
    de: 'Noch keine Events. Erstelle eins mit `/event create`.',
  },
  no_date: { en: 'no date', es: 'sin fecha', it: 'senza data', de: 'ohne Datum' },
  event_list_line: {
    en: '**{name}** — {when} · ⏰ {active} active / {total}',
    es: '**{name}** — {when} · ⏰ {active} activas / {total}',
    it: '**{name}** — {when} · ⏰ {active} attivi / {total}',
    de: '**{name}** — {when} · ⏰ {active} aktiv / {total}',
  },
  events_title: { en: '📋 Events ({n})', es: '📋 Eventos ({n})', it: '📋 Eventi ({n})', de: '📋 Events ({n})' },
  no_start_date: { en: 'No start date', es: 'Sin fecha de inicio', it: 'Nessuna data di inizio', de: 'Kein Startdatum' },
  alarms_count: { en: '**Alarms ({n})**', es: '**Alarmas ({n})**', it: '**Allarmi ({n})**', de: '**Alarme ({n})**' },
  no_alarms_hint: {
    en: 'No alarms. Add one with `/alarm add`.',
    es: 'Sin alarmas. Agrega una con `/alarm add`.',
    it: 'Nessun allarme. Aggiungine uno con `/alarm add`.',
    de: 'Keine Alarme. Füge einen mit `/alarm add` hinzu.',
  },
  event_updated: {
    en: '✅ Event **{name}** updated.', es: '✅ Evento **{name}** actualizado.', it: '✅ Evento **{name}** aggiornato.', de: '✅ Event **{name}** aktualisiert.',
  },
  moved_alarms: {
    en: '🔄 {n} relative alarm(s) moved to the new time.',
    es: '🔄 Se movieron {n} alarma(s) relativas al nuevo horario.',
    it: '🔄 {n} allarme/i relativi spostati al nuovo orario.',
    de: '🔄 {n} relative(r) Alarm(e) auf die neue Zeit verschoben.',
  },
  event_deleted: {
    en: '🗑️ Event **{name}** deleted along with {n} alarm(s).',
    es: '🗑️ Evento **{name}** borrado junto con {n} alarma(s).',
    it: '🗑️ Evento **{name}** eliminato insieme a {n} allarme/i.',
    de: '🗑️ Event **{name}** samt {n} Alarm(en) gelöscht.',
  },

  // ---------- alarmas ----------
  alarm_not_found: {
    en: 'Alarm **#{id}** doesn\'t exist on this server.',
    es: 'No existe la alarma **#{id}** en este servidor.',
    it: 'L\'allarme **#{id}** non esiste su questo server.',
    de: 'Alarm **#{id}** gibt es auf diesem Server nicht.',
  },
  until_after: {
    en: 'The next alarm ({fire}) is after the end date ({until}).',
    es: 'La próxima alarma ({fire}) queda después de la fecha de término ({until}).',
    it: 'Il prossimo allarme ({fire}) è dopo la data di fine ({until}).',
    de: 'Der nächste Alarm ({fire}) liegt nach dem Enddatum ({until}).',
  },
  before_and_abs: {
    en: 'Use **before** (relative to the event) *or* **date/time** (exact date), not both.',
    es: 'Usa **before** (relativo al evento) *o* **date/time** (fecha exacta), no ambos.',
    it: 'Usa **before** (relativo all\'evento) *oppure* **date/time** (data esatta), non entrambi.',
    de: 'Nutze **before** (relativ zum Event) *oder* **date/time** (genaues Datum), nicht beides.',
  },
  no_start: {
    en: 'The event **{name}** has no start date. Add it with `/event edit` or use date and time.',
    es: 'El evento **{name}** no tiene fecha de inicio. Agrégala con `/event edit` o usa date y time.',
    it: 'L\'evento **{name}** non ha una data di inizio. Aggiungila con `/event edit` o usa date e time.',
    de: 'Das Event **{name}** hat kein Startdatum. Füge es mit `/event edit` hinzu oder nutze date und time.',
  },
  bad_offset: {
    en: 'I didn\'t understand "{value}". Examples: 1d, 2h, 30m, 1h30m, 0.',
    es: 'No entendí "{value}". Ejemplos: 1d, 2h, 30m, 1h30m, 0.',
    it: 'Non ho capito "{value}". Esempi: 1d, 2h, 30m, 1h30m, 0.',
    de: '"{value}" habe ich nicht verstanden. Beispiele: 1d, 2h, 30m, 1h30m, 0.',
  },
  max_offset: {
    en: 'The maximum is 365 days before.', es: 'El máximo es 365 días antes.', it: 'Il massimo è 365 giorni prima.', de: 'Maximal 365 Tage vorher.',
  },
  past_before: {
    en: 'With that "before" the alarm would be in the past ({when}).',
    es: 'Con ese "before" la alarma quedaría en el pasado ({when}).',
    it: 'Con quel "before" l\'allarme sarebbe nel passato ({when}).',
    de: 'Mit diesem "before" läge der Alarm in der Vergangenheit ({when}).',
  },
  past: {
    en: 'That date and time has already passed ({when}).',
    es: 'Esa fecha y hora ya pasó ({when}).',
    it: 'Quella data e ora è già passata ({when}).',
    de: 'Dieses Datum und diese Uhrzeit sind schon vorbei ({when}).',
  },
  until_needs_repeat: {
    en: '**until** only works for repeating alarms (repeat or every).',
    es: '**until** solo sirve para alarmas que se repiten (repeat o every).',
    it: '**until** funziona solo per allarmi che si ripetono (repeat o every).',
    de: '**until** funktioniert nur bei wiederholten Alarmen (repeat oder every).',
  },
  message_empty: {
    en: 'The message can\'t be empty.', es: 'El mensaje no puede estar vacío.', it: 'Il messaggio non può essere vuoto.', de: 'Die Nachricht darf nicht leer sein.',
  },
  when_missing: {
    en: 'Say when it should go off: **before** (e.g. 1h before the event) or **date** + **time**.',
    es: 'Indica cuándo debe sonar: **before** (ej. 1h antes del evento) o **date** + **time**.',
    it: 'Indica quando deve suonare: **before** (es. 1h prima dell\'evento) o **date** + **time**.',
    de: 'Gib an, wann er auslösen soll: **before** (z. B. 1h vor dem Event) oder **date** + **time**.',
  },
  relative_no_repeat: {
    en: 'Alarms relative to the event don\'t repeat. To repeat, use date and time.',
    es: 'Las alarmas relativas al evento no se repiten. Para repetir, usa date y time.',
    it: 'Gli allarmi relativi all\'evento non si ripetono. Per ripetere, usa date e time.',
    de: 'Relative Alarme wiederholen sich nicht. Zum Wiederholen nutze date und time.',
  },
  max_alarms: {
    en: 'This server reached the limit of {max} active alarms.',
    es: 'Este servidor llegó al máximo de {max} alarmas activas.',
    it: 'Questo server ha raggiunto il limite di {max} allarmi attivi.',
    de: 'Dieser Server hat das Limit von {max} aktiven Alarmen erreicht.',
  },
  first_moved: {
    en: 'ℹ️ The first date had already passed, so it was set to the next repetition.',
    es: 'ℹ️ La primera fecha ya había pasado, así que quedó en la siguiente repetición.',
    it: 'ℹ️ La prima data era già passata, quindi è stata spostata alla ripetizione successiva.',
    de: 'ℹ️ Das erste Datum war schon vorbei, daher wurde die nächste Wiederholung gesetzt.',
  },
  group_missing: {
    en: '⚠️ The group **{name}** doesn\'t exist yet. Create it with `/group create`.',
    es: '⚠️ El grupo **{name}** no existe todavía. Créalo con `/group create`.',
    it: '⚠️ Il gruppo **{name}** non esiste ancora. Crealo con `/group create`.',
    de: '⚠️ Die Gruppe **{name}** gibt es noch nicht. Erstelle sie mit `/group create`.',
  },
  alarm_created: {
    en: '✅ Alarm **#{id}** created for **{event}**',
    es: '✅ Alarma **#{id}** creada para **{event}**',
    it: '✅ Allarme **#{id}** creato per **{event}**',
    de: '✅ Alarm **#{id}** für **{event}** erstellt',
  },
  event_no_alarms: {
    en: '**{name}** has no alarms.', es: '**{name}** no tiene alarmas.', it: '**{name}** non ha allarmi.', de: '**{name}** hat keine Alarme.',
  },
  alarms_of: { en: '⏰ Alarms for {name}', es: '⏰ Alarmas de {name}', it: '⏰ Allarmi di {name}', de: '⏰ Alarme für {name}' },
  no_active_alarms: { en: 'No active alarms.', es: 'No hay alarmas activas.', it: 'Nessun allarme attivo.', de: 'Keine aktiven Alarme.' },
  upcoming_alarms: { en: '⏰ Upcoming alarms', es: '⏰ Próximas alarmas', it: '⏰ Prossimi allarmi', de: '⏰ Nächste Alarme' },
  alarm_sending: {
    en: 'That alarm is being sent right now. Try again in a minute.',
    es: 'Esa alarma se está enviando justo ahora. Intenta en un minuto.',
    it: 'Quell\'allarme è in invio proprio ora. Riprova tra un minuto.',
    de: 'Dieser Alarm wird gerade gesendet. Versuche es in einer Minute erneut.',
  },
  alarm_updated: {
    en: '✏️ Alarm **#{id}** updated ({event})',
    es: '✏️ Alarma **#{id}** actualizada ({event})',
    it: '✏️ Allarme **#{id}** aggiornato ({event})',
    de: '✏️ Alarm **#{id}** aktualisiert ({event})',
  },
  alarm_deleted: {
    en: '🗑️ Alarm **#{id}** deleted.', es: '🗑️ Alarma **#{id}** borrada.', it: '🗑️ Allarme **#{id}** eliminato.', de: '🗑️ Alarm **#{id}** gelöscht.',
  },
  send_failed: {
    en: 'I couldn\'t post in {channel} (error {status}). Check that the bot can view the channel, send messages and embed links.',
    es: 'No pude enviar en {channel} (error {status}). Revisa que el bot pueda ver el canal, enviar mensajes e insertar enlaces.',
    it: 'Non sono riuscito a scrivere in {channel} (errore {status}). Controlla che il bot possa vedere il canale, inviare messaggi e incorporare link.',
    de: 'Ich konnte nicht in {channel} posten (Fehler {status}). Prüfe, ob der Bot den Kanal sehen, Nachrichten senden und Links einbetten darf.',
  },
  test_sent: {
    en: '🧪 Test of alarm **#{id}** sent to {channel}. Mentions are shown but don\'t ping anyone.',
    es: '🧪 Prueba de la alarma **#{id}** enviada a {channel}. Las menciones se muestran pero no notifican.',
    it: '🧪 Test dell\'allarme **#{id}** inviato in {channel}. Le menzioni sono visibili ma non notificano nessuno.',
    de: '🧪 Test von Alarm **#{id}** an {channel} gesendet. Erwähnungen werden angezeigt, benachrichtigen aber niemanden.',
  },
  test_title: { en: '🧪 [TEST] ', es: '🧪 [PRUEBA] ', it: '🧪 [TEST] ', de: '🧪 [TEST] ' },
  test_footer: {
    en: 'Kon Planner · test: mentions don\'t ping',
    es: 'Kon Planner · prueba: las menciones no notifican',
    it: 'Kon Planner · test: le menzioni non notificano',
    de: 'Kon Planner · Test: Erwähnungen benachrichtigen nicht',
  },
  not_active: {
    en: 'Alarm **#{id}** is not active{status}.', es: 'La alarma **#{id}** no está activa{status}.',
    it: 'L\'allarme **#{id}** non è attivo{status}.', de: 'Alarm **#{id}** ist nicht aktiv{status}.',
  },
  paused: {
    en: '⏸️ Alarm **#{id}** paused. Resume it with `/alarm resume`.',
    es: '⏸️ Alarma **#{id}** pausada. Reanúdala con `/alarm resume`.',
    it: '⏸️ Allarme **#{id}** in pausa. Riprendilo con `/alarm resume`.',
    de: '⏸️ Alarm **#{id}** pausiert. Setze ihn mit `/alarm resume` fort.',
  },
  not_paused: {
    en: 'Alarm **#{id}** is not paused.', es: 'La alarma **#{id}** no está pausada.',
    it: 'L\'allarme **#{id}** non è in pausa.', de: 'Alarm **#{id}** ist nicht pausiert.',
  },
  resume_past: {
    en: 'The time of alarm **#{id}** has passed. Change it with `/alarm edit` and then resume it.',
    es: 'La hora de la alarma **#{id}** ya pasó. Cámbiala con `/alarm edit` y luego reanúdala.',
    it: 'L\'ora dell\'allarme **#{id}** è già passata. Cambiala con `/alarm edit` e poi riprendilo.',
    de: 'Die Zeit von Alarm **#{id}** ist vorbei. Ändere sie mit `/alarm edit` und setze ihn dann fort.',
  },
  resumed: {
    en: '▶️ Alarm **#{id}** resumed. It will go off {when}.',
    es: '▶️ Alarma **#{id}** reanudada. Sonará {when}.',
    it: '▶️ Allarme **#{id}** ripreso. Suonerà {when}.',
    de: '▶️ Alarm **#{id}** fortgesetzt. Er löst aus am {when}.',
  },

  // ---------- grupos ----------
  group_bad_name: {
    en: 'Use only letters, numbers, spaces, hyphens or dots in the name.',
    es: 'Usa solo letras, números, espacios, guiones o puntos en el nombre.',
    it: 'Usa solo lettere, numeri, spazi, trattini o punti nel nome.',
    de: 'Nutze im Namen nur Buchstaben, Zahlen, Leerzeichen, Bindestriche oder Punkte.',
  },
  group_need_members: {
    en: 'Mention at least one user or role, e.g.: @Ana @Moderators',
    es: 'Menciona al menos un usuario o rol, por ejemplo: @Ana @Moderadores',
    it: 'Menziona almeno un utente o ruolo, ad es.: @Ana @Moderatori',
    de: 'Erwähne mindestens einen Nutzer oder eine Rolle, z. B.: @Ana @Moderatoren',
  },
  max_groups: {
    en: 'Maximum {max} groups per server.', es: 'Máximo {max} grupos por servidor.',
    it: 'Massimo {max} gruppi per server.', de: 'Maximal {max} Gruppen pro Server.',
  },
  group_created: { en: '✅ Group created', es: '✅ Grupo creado', it: '✅ Gruppo creato', de: '✅ Gruppe erstellt' },
  group_replaced: { en: '♻️ Group replaced', es: '♻️ Grupo reemplazado', it: '♻️ Gruppo sostituito', de: '♻️ Gruppe ersetzt' },
  group_usage: {
    en: 'Use it in alarms with `mentions: {usage}`.', es: 'Úsalo en las alarmas con `mentions: {usage}`.',
    it: 'Usalo negli allarmi con `mentions: {usage}`.', de: 'Nutze sie in Alarmen mit `mentions: {usage}`.',
  },
  no_groups: {
    en: 'No groups. Create one with `/group create`.', es: 'No hay grupos. Crea uno con `/group create`.',
    it: 'Nessun gruppo. Creane uno con `/group create`.', de: 'Keine Gruppen. Erstelle eine mit `/group create`.',
  },
  groups_title: { en: '👥 Mention groups', es: '👥 Grupos de menciones', it: '👥 Gruppi di menzioni', de: '👥 Erwähnungsgruppen' },
  group_not_found: {
    en: 'The group **{name}** doesn\'t exist.', es: 'No existe el grupo **{name}**.',
    it: 'Il gruppo **{name}** non esiste.', de: 'Die Gruppe **{name}** gibt es nicht.',
  },
  group_deleted: {
    en: '🗑️ Group **{name}** deleted. Alarms that used it will no longer mention its members.',
    es: '🗑️ Grupo **{name}** borrado. Las alarmas que lo usaban ya no mencionarán a sus miembros.',
    it: '🗑️ Gruppo **{name}** eliminato. Gli allarmi che lo usavano non menzioneranno più i suoi membri.',
    de: '🗑️ Gruppe **{name}** gelöscht. Alarme, die sie nutzten, erwähnen ihre Mitglieder nicht mehr.',
  },

  // ---------- agenda y config ----------
  agenda_empty: {
    en: 'No alarms in the next {days} days.', es: 'No hay alarmas en los próximos {days} días.',
    it: 'Nessun allarme nei prossimi {days} giorni.', de: 'Keine Alarme in den nächsten {days} Tagen.',
  },
  agenda_title: {
    en: '📅 Agenda — next {days} days', es: '📅 Agenda — próximos {days} días',
    it: '📅 Agenda — prossimi {days} giorni', de: '📅 Agenda — nächste {days} Tage',
  },
  config_title: {
    en: '⚙️ Kon Planner settings', es: '⚙️ Configuración de Kon Planner', it: '⚙️ Impostazioni di Kon Planner', de: '⚙️ Kon Planner Einstellungen',
  },
  cfg_tz: { en: '🌎 Time zone: **{tz}**', es: '🌎 Zona horaria: **{tz}**', it: '🌎 Fuso orario: **{tz}**', de: '🌎 Zeitzone: **{tz}**' },
  cfg_role: { en: '🛡️ Organizer role: {role}', es: '🛡️ Rol organizador: {role}', it: '🛡️ Ruolo organizzatore: {role}', de: '🛡️ Organisator-Rolle: {role}' },
  cfg_role_none: {
    en: 'not set (only people who can manage the server)', es: 'no definido (solo quienes pueden gestionar el servidor)',
    it: 'non impostato (solo chi può gestire il server)', de: 'nicht gesetzt (nur wer den Server verwalten darf)',
  },
  cfg_channel: { en: '📢 Default channel: {channel}', es: '📢 Canal por defecto: {channel}', it: '📢 Canale predefinito: {channel}', de: '📢 Standardkanal: {channel}' },
  cfg_channel_none: {
    en: 'the channel where the command is used', es: 'el canal donde se usa el comando',
    it: 'il canale in cui si usa il comando', de: 'der Kanal, in dem der Befehl genutzt wird',
  },
  bad_tz: {
    en: '"{tz}" is not a valid time zone. Example: UTC or America/Santiago',
    es: '"{tz}" no es una zona horaria válida. Ejemplo: UTC o America/Santiago',
    it: '"{tz}" non è un fuso orario valido. Esempio: UTC o Europe/Rome',
    de: '"{tz}" ist keine gültige Zeitzone. Beispiel: UTC oder Europe/Berlin',
  },
  tz_set: {
    en: '🌎 Time zone: **{tz}**.\nDates you type from now on are read in that zone; existing alarms don\'t change.',
    es: '🌎 Zona horaria: **{tz}**.\nLas fechas que escribas desde ahora se interpretan en esa zona; las alarmas existentes no cambian.',
    it: '🌎 Fuso orario: **{tz}**.\nLe date che scrivi da ora sono interpretate in quel fuso; gli allarmi esistenti non cambiano.',
    de: '🌎 Zeitzone: **{tz}**.\nDaten, die du ab jetzt eingibst, gelten in dieser Zone; bestehende Alarme ändern sich nicht.',
  },
  role_set: {
    en: '🛡️ The role {role} can now create and edit events, alarms and groups.',
    es: '🛡️ El rol {role} ahora puede crear y editar eventos, alarmas y grupos.',
    it: '🛡️ Il ruolo {role} ora può creare e modificare eventi, allarmi e gruppi.',
    de: '🛡️ Die Rolle {role} kann jetzt Events, Alarme und Gruppen erstellen und bearbeiten.',
  },
  channel_set: {
    en: '📢 Default channel: {channel}.', es: '📢 Canal por defecto: {channel}.', it: '📢 Canale predefinito: {channel}.', de: '📢 Standardkanal: {channel}.',
  },
  now_server: {
    en: '🕒 Now on the server (**{tz}**): **{time}**', es: '🕒 Ahora en el servidor (**{tz}**): **{time}**',
    it: '🕒 Ora sul server (**{tz}**): **{time}**', de: '🕒 Jetzt auf dem Server (**{tz}**): **{time}**',
  },
  now_yours: { en: '🏠 Your time: {time}', es: '🏠 Tu hora: {time}', it: '🏠 La tua ora: {time}', de: '🏠 Deine Zeit: {time}' },
  now_hint: {
    en: 'Type date and time in server time. E.g.: `{example}` = {rel}',
    es: 'Escribe date y time en la hora del servidor. Ej.: `{example}` = {rel}',
    it: 'Scrivi date e time nell\'ora del server. Es.: `{example}` = {rel}',
    de: 'Gib date und time in Serverzeit ein. Z. B.: `{example}` = {rel}',
  },

  // ---------- cronograma y resumen diario ----------
  hidden_from_schedule: {
    en: '🙈 hidden from /schedule and the daily summary', es: '🙈 oculta en /schedule y en el resumen diario',
    it: '🙈 nascosto in /schedule e nel riepilogo giornaliero', de: '🙈 in /schedule und der täglichen Übersicht ausgeblendet',
  },
  schedule_title: {
    en: '🗓️ Schedule — {days} day(s)', es: '🗓️ Cronograma — {days} día(s)', it: '🗓️ Programma — {days} giorno/i', de: '🗓️ Zeitplan — {days} Tag(e)',
  },
  schedule_empty: {
    en: 'Nothing scheduled in the next {days} day(s).', es: 'No hay nada programado en los próximos {days} día(s).',
    it: 'Niente in programma nei prossimi {days} giorno/i.', de: 'Nichts geplant in den nächsten {days} Tag(en).',
  },
  schedule_posted: {
    en: '🗓️ Schedule posted in {channel}.', es: '🗓️ Cronograma publicado en {channel}.',
    it: '🗓️ Programma pubblicato in {channel}.', de: '🗓️ Zeitplan in {channel} gepostet.',
  },
  public_needs_organizer: {
    en: 'Only organizers can post the schedule for everyone. Leave out `public` to see it yourself.',
    es: 'Solo los organizadores pueden publicar el cronograma para todos. Quita `public` para verlo tú.',
    it: 'Solo gli organizzatori possono pubblicare il programma per tutti. Togli `public` per vederlo tu.',
    de: 'Nur Organisatoren können den Zeitplan für alle posten. Lass `public` weg, um ihn selbst zu sehen.',
  },
  summary_set: {
    en: '📅 Daily summary on: every day at **{time}** ({tz}) in {channel} · {mentions}.\nDays without events post nothing.',
    es: '📅 Resumen diario activado: todos los días a las **{time}** ({tz}) en {channel} · {mentions}.\nLos días sin eventos no se publica nada.',
    it: '📅 Riepilogo giornaliero attivo: ogni giorno alle **{time}** ({tz}) in {channel} · {mentions}.\nNei giorni senza eventi non viene pubblicato nulla.',
    de: '📅 Tägliche Übersicht aktiv: jeden Tag um **{time}** ({tz}) in {channel} · {mentions}.\nAn Tagen ohne Events wird nichts gepostet.',
  },
  summary_off: {
    en: '📅 Daily summary turned off.', es: '📅 Resumen diario desactivado.',
    it: '📅 Riepilogo giornaliero disattivato.', de: '📅 Tägliche Übersicht ausgeschaltet.',
  },
  summary_not_set: {
    en: 'The daily summary is not on.', es: 'El resumen diario no está activado.',
    it: 'Il riepilogo giornaliero non è attivo.', de: 'Die tägliche Übersicht ist nicht aktiv.',
  },
  cfg_summary: { en: '📅 Daily summary: {value}', es: '📅 Resumen diario: {value}', it: '📅 Riepilogo giornaliero: {value}', de: '📅 Tägliche Übersicht: {value}' },
  cfg_summary_none: { en: 'off', es: 'desactivado', it: 'disattivato', de: 'aus' },

  // ---------- ayuda ----------
  help_title: { en: '🦁 Kon Planner — help', es: '🦁 Kon Planner — ayuda', it: '🦁 Kon Planner — aiuto', de: '🦁 Kon Planner — Hilfe' },
  help_body: {
    en: [
      '**1. Create an event**',
      '`/event create name: Scrim date: 2026-10-25 time: 20:30`',
      '',
      '**2. Add alarms**',
      '• Relative to the event: `/alarm add event: Scrim before: 1h message: One hour left! mentions: everyone`',
      '• Exact date: `/alarm add event: Scrim date: 2026-10-24 time: 18:00 message: Scrim is tomorrow`',
      '• Repeating: add `repeat: Weekly` (or `every: 2` for every 2 days; `until: 2026-12-15` to stop)',
      '',
      '**Mentions:** `everyone`, `here`, `none`, @users, @roles or `group:Name`',
      '**Variables:** `{event}` `{start}` `{time_left}` `{description}` · `\\n` = new line',
      '',
      '**Current server time:** `/now`',
      '**View:** `/schedule`, `/agenda`, `/event view`, `/alarm list`',
      '**Daily summary:** `/config daily-summary channel: #general time: 09:00`',
      '**Manage:** `/alarm edit`, `/alarm test`, `/alarm pause`, `/alarm resume`, `/alarm delete`',
      '**Groups:** `/group create name: Staff members: @Ana @Moderators`',
      '**Settings:** `/config timezone`, `/config admin-role`, `/config default-channel`',
    ].join('\n'),
    es: [
      '**1. Crea un evento**',
      '`/event create name: Scrim date: 2026-10-25 time: 20:30`',
      '',
      '**2. Agrégale alarmas**',
      '• Relativa al evento: `/alarm add event: Scrim before: 1h message: ¡Falta una hora! mentions: everyone`',
      '• Fecha exacta: `/alarm add event: Scrim date: 2026-10-24 time: 18:00 message: Mañana es el scrim`',
      '• Repetitiva: agrega `repeat: Semanal` (o `every: 2` para cada 2 días; `until: 2026-12-15` para terminar)',
      '',
      '**Menciones:** `everyone`, `here`, `none`, @usuarios, @roles o `group:Nombre`',
      '**Variables:** `{event}` `{start}` `{time_left}` `{description}` · `\\n` = salto de línea',
      '',
      '**Hora actual del servidor:** `/now`',
      '**Ver:** `/schedule`, `/agenda`, `/event view`, `/alarm list`',
      '**Resumen diario:** `/config daily-summary channel: #general time: 09:00`',
      '**Gestionar:** `/alarm edit`, `/alarm test`, `/alarm pause`, `/alarm resume`, `/alarm delete`',
      '**Grupos:** `/group create name: Staff members: @Ana @Moderadores`',
      '**Config:** `/config timezone`, `/config admin-role`, `/config default-channel`',
    ].join('\n'),
    it: [
      '**1. Crea un evento**',
      '`/event create name: Scrim date: 2026-10-25 time: 20:30`',
      '',
      '**2. Aggiungi allarmi**',
      '• Relativo all\'evento: `/alarm add event: Scrim before: 1h message: Manca un\'ora! mentions: everyone`',
      '• Data esatta: `/alarm add event: Scrim date: 2026-10-24 time: 18:00 message: Domani c\'è lo scrim`',
      '• Ripetuto: aggiungi `repeat: Settimanale` (o `every: 2` per ogni 2 giorni; `until: 2026-12-15` per terminare)',
      '',
      '**Menzioni:** `everyone`, `here`, `none`, @utenti, @ruoli o `group:Nome`',
      '**Variabili:** `{event}` `{start}` `{time_left}` `{description}` · `\\n` = a capo',
      '',
      '**Ora attuale del server:** `/now`',
      '**Vedi:** `/schedule`, `/agenda`, `/event view`, `/alarm list`',
      '**Riepilogo giornaliero:** `/config daily-summary channel: #general time: 09:00`',
      '**Gestisci:** `/alarm edit`, `/alarm test`, `/alarm pause`, `/alarm resume`, `/alarm delete`',
      '**Gruppi:** `/group create name: Staff members: @Ana @Moderatori`',
      '**Impostazioni:** `/config timezone`, `/config admin-role`, `/config default-channel`',
    ].join('\n'),
    de: [
      '**1. Erstelle ein Event**',
      '`/event create name: Scrim date: 2026-10-25 time: 20:30`',
      '',
      '**2. Füge Alarme hinzu**',
      '• Relativ zum Event: `/alarm add event: Scrim before: 1h message: Noch eine Stunde! mentions: everyone`',
      '• Genaues Datum: `/alarm add event: Scrim date: 2026-10-24 time: 18:00 message: Morgen ist Scrim`',
      '• Wiederholt: füge `repeat: Wöchentlich` hinzu (oder `every: 2` für alle 2 Tage; `until: 2026-12-15` zum Beenden)',
      '',
      '**Erwähnungen:** `everyone`, `here`, `none`, @Nutzer, @Rollen oder `group:Name`',
      '**Variablen:** `{event}` `{start}` `{time_left}` `{description}` · `\\n` = neue Zeile',
      '',
      '**Aktuelle Serverzeit:** `/now`',
      '**Ansehen:** `/schedule`, `/agenda`, `/event view`, `/alarm list`',
      '**Tägliche Übersicht:** `/config daily-summary channel: #general time: 09:00`',
      '**Verwalten:** `/alarm edit`, `/alarm test`, `/alarm pause`, `/alarm resume`, `/alarm delete`',
      '**Gruppen:** `/group create name: Staff members: @Ana @Moderatoren`',
      '**Einstellungen:** `/config timezone`, `/config admin-role`, `/config default-channel`',
    ].join('\n'),
  },
};
