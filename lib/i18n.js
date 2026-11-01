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
    en: 'I didn\'t understand the date "{value}". Use 2026-11-04, today, tomorrow, a weekday (wednesday) or +3.',
    es: 'No entendí la fecha "{value}". Usa 2026-11-04, hoy, mañana, un día de la semana (miércoles) o +3.',
    it: 'Non ho capito la data "{value}". Usa 2026-11-04, oggi, domani, un giorno della settimana (mercoledì) o +3.',
    de: 'Das Datum "{value}" habe ich nicht verstanden. Nutze 2026-11-04, heute, morgen, einen Wochentag (Mittwoch) oder +3.',
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

  // ---------- plantillas, repeticiones y cronograma fijado ----------
  template_not_found: {
    en: 'The event type **{name}** doesn\'t exist. See them with `/template list`.',
    es: 'No existe el tipo de evento **{name}**. Míralos con `/template list`.',
    it: 'Il tipo di evento **{name}** non esiste. Vedili con `/template list`.',
    de: 'Den Event-Typ **{name}** gibt es nicht. Sieh sie dir mit `/template list` an.',
  },
  bad_reminders: {
    en: 'I didn\'t understand the reminders. Example: `15m none, 0 everyone` (time before + who, separated by commas, max 5).',
    es: 'No entendí los avisos. Ejemplo: `15m none, 0 everyone` (tiempo antes + a quién, separados por comas, máximo 5).',
    it: 'Non ho capito gli avvisi. Esempio: `15m none, 0 everyone` (tempo prima + chi, separati da virgole, massimo 5).',
    de: 'Die Erinnerungen habe ich nicht verstanden. Beispiel: `15m none, 0 everyone` (Zeit vorher + wer, mit Kommas getrennt, max. 5).',
  },
  max_templates: {
    en: 'Maximum {max} event types per server.', es: 'Máximo {max} tipos de evento por servidor.',
    it: 'Massimo {max} tipi di evento per server.', de: 'Maximal {max} Event-Typen pro Server.',
  },
  template_saved: {
    en: '🧩 Event type **{name}** saved.', es: '🧩 Tipo de evento **{name}** guardado.',
    it: '🧩 Tipo di evento **{name}** salvato.', de: '🧩 Event-Typ **{name}** gespeichert.',
  },
  template_updated: {
    en: '🧩 Event type **{name}** updated · {n} upcoming time(s) updated too.',
    es: '🧩 Tipo de evento **{name}** actualizado · también se actualizaron {n} horario(s) próximos.',
    it: '🧩 Tipo di evento **{name}** aggiornato · aggiornati anche {n} orario/i futuri.',
    de: '🧩 Event-Typ **{name}** aktualisiert · auch {n} kommende(r) Termin(e) aktualisiert.',
  },
  template_imported: {
    en: '📚 {n} past time(s) with that name added to its history.', es: '📚 Se agregaron al historial {n} horario(s) anteriores con ese nombre.',
    it: '📚 Aggiunti allo storico {n} orario/i precedenti con quel nome.', de: '📚 {n} frühere(r) Termin(e) mit diesem Namen zum Verlauf hinzugefügt.',
  },
  template_hint: {
    en: 'Schedule it with: `/plan template: {name} date: 2026-11-02 times: 03:00 18:00`',
    es: 'Prográmalo con: `/plan template: {name} date: 2026-11-02 times: 03:00 18:00`',
    it: 'Programmalo con: `/plan template: {name} date: 2026-11-02 times: 03:00 18:00`',
    de: 'Plane ihn mit: `/plan template: {name} date: 2026-11-02 times: 03:00 18:00`',
  },
  no_templates: {
    en: 'No event types yet. Create one with `/template create`.', es: 'No hay tipos de evento. Crea uno con `/template create`.',
    it: 'Nessun tipo di evento. Creane uno con `/template create`.', de: 'Noch keine Event-Typen. Erstelle einen mit `/template create`.',
  },
  templates_title: { en: '🧩 Event types', es: '🧩 Tipos de evento', it: '🧩 Tipi di evento', de: '🧩 Event-Typen' },
  template_deleted: {
    en: '🗑️ Event type **{name}** deleted, along with {n} upcoming time(s) and its repeating schedules.',
    es: '🗑️ Tipo de evento **{name}** borrado, junto con {n} horario(s) próximos y sus repeticiones.',
    it: '🗑️ Tipo di evento **{name}** eliminato, insieme a {n} orario/i futuri e alle sue ripetizioni.',
    de: '🗑️ Event-Typ **{name}** gelöscht, samt {n} kommenden Termin(en) und seinen Wiederholungen.',
  },
  info_history: { en: '📚 Last {n} times:', es: '📚 Últimas {n} veces:', it: '📚 Ultime {n} volte:', de: '📚 Letzte {n} Termine:' },
  info_no_history: {
    en: '📚 No history yet: schedule it a few times with `/plan` and I\'ll find out how often it repeats.',
    es: '📚 Todavía no hay historial: prográmalo algunas veces con `/plan` y descubriré cada cuánto se repite.',
    it: '📚 Ancora nessuno storico: programmalo qualche volta con `/plan` e scoprirò ogni quanto si ripete.',
    de: '📚 Noch kein Verlauf: plane ihn ein paar Mal mit `/plan` und ich finde heraus, wie oft er sich wiederholt.',
  },
  pattern_found: {
    en: '🔍 **{times}** UTC: {what}. To automate it:', es: '🔍 **{times}** UTC: {what}. Para automatizarlo:',
    it: '🔍 **{times}** UTC: {what}. Per automatizzarlo:', de: '🔍 **{times}** UTC: {what}. Zum Automatisieren:',
  },
  pattern_none: {
    en: '🔍 **{times}** UTC: no clear pattern yet ({n} time(s)). I need a few more.',
    es: '🔍 **{times}** UTC: todavía no hay un patrón claro ({n} vez/veces). Necesito algunas más.',
    it: '🔍 **{times}** UTC: ancora nessuno schema chiaro ({n} volta/e). Me ne servono altre.',
    de: '🔍 **{times}** UTC: noch kein klares Muster ({n} Mal). Ich brauche noch ein paar.',
  },
  pattern_daily: { en: 'every day', es: 'todos los días', it: 'ogni giorno', de: 'jeden Tag' },
  pattern_weekly: { en: 'every week, same day', es: 'cada semana, el mismo día', it: 'ogni settimana, stesso giorno', de: 'jede Woche, gleicher Tag' },
  pattern_every: { en: 'every {n} days', es: 'cada {n} días', it: 'ogni {n} giorni', de: 'alle {n} Tage' },
  pattern_block: {
    en: '{days} days in a row, every {n} days', es: '{days} días seguidos, cada {n} días',
    it: '{days} giorni di fila, ogni {n} giorni', de: '{days} Tage am Stück, alle {n} Tage',
  },
  pattern_weekdays: { en: 'every week on {days}', es: 'cada semana: {days}', it: 'ogni settimana: {days}', de: 'jede Woche: {days}' },
  pattern_cycle: {
    en: '{count} days in a cycle of {n} days', es: '{count} días en un ciclo de {n} días',
    it: '{count} giorni in un ciclo di {n} giorni', de: '{count} Tage in einem Zyklus von {n} Tagen',
  },
  active_plans: { en: '🔁 Repeating ({n}):', es: '🔁 Repeticiones ({n}):', it: '🔁 Ripetizioni ({n}):', de: '🔁 Wiederholungen ({n}):' },
  bad_times: {
    en: 'Write at least one time, e.g. `times: 03:00 18:00`.', es: 'Escribe al menos un horario, ej. `times: 03:00 18:00`.',
    it: 'Scrivi almeno un orario, es. `times: 03:00 18:00`.', de: 'Gib mindestens eine Uhrzeit an, z. B. `times: 03:00 18:00`.',
  },
  too_many_times: {
    en: 'Maximum {max} times per command.', es: 'Máximo {max} horarios por comando.',
    it: 'Massimo {max} orari per comando.', de: 'Maximal {max} Uhrzeiten pro Befehl.',
  },
  occ_created: { en: '✅ **{name}** · {when}', es: '✅ **{name}** · {when}', it: '✅ **{name}** · {when}', de: '✅ **{name}** · {when}' },
  occ_exists: {
    en: '↩️ **{name}** · {when} — was already scheduled', es: '↩️ **{name}** · {when} — ya estaba programado',
    it: '↩️ **{name}** · {when} — era già programmato', de: '↩️ **{name}** · {when} — war schon geplant',
  },
  occ_past: {
    en: '⏭️ **{name}** · {when} — already passed, skipped', es: '⏭️ **{name}** · {when} — ya pasó, se omitió',
    it: '⏭️ **{name}** · {when} — già passato, saltato', de: '⏭️ **{name}** · {when} — schon vorbei, übersprungen',
  },
  plan_hint: {
    en: 'Looks like it repeats with a pattern:', es: 'Parece que se repite con un patrón:',
    it: 'Sembra che si ripeta con uno schema:', de: 'Sieht aus, als wiederhole es sich nach einem Muster:',
  },
  plan_repeat_created: {
    en: '🔁 {line} · {n} time(s) created', es: '🔁 {line} · {n} horario(s) creados',
    it: '🔁 {line} · {n} orario/i creati', de: '🔁 {line} · {n} Termin(e) erstellt',
  },
  plan_repeat_note: {
    en: 'I create the times for the next 8 days automatically. See them with `/plans list`; stop with `/plans stop`.',
    es: 'Creo los horarios de los próximos 8 días automáticamente. Míralos con `/plans list`; detenlos con `/plans stop`.',
    it: 'Creo automaticamente gli orari dei prossimi 8 giorni. Vedili con `/plans list`; fermali con `/plans stop`.',
    de: 'Ich erstelle die Termine der nächsten 8 Tage automatisch. Ansehen mit `/plans list`, beenden mit `/plans stop`.',
  },
  no_plans: {
    en: 'No repeating schedules. Use `/plan` with `repeat` or `every`.', es: 'No hay repeticiones. Usa `/plan` con `repeat` o `every`.',
    it: 'Nessuna ripetizione. Usa `/plan` con `repeat` o `every`.', de: 'Keine Wiederholungen. Nutze `/plan` mit `repeat` oder `every`.',
  },
  plan_skipped: {
    en: '⏭️ **{name}** skipped on {date} ({times}) · {n} scheduled time(s) deleted. Repeats won\'t create it.',
    es: '⏭️ **{name}** saltado el {date} ({times}) · se borraron {n} horario(s) programados. Las repeticiones no lo crearán.',
    it: '⏭️ **{name}** saltato il {date} ({times}) · eliminati {n} orario/i programmati. Le ripetizioni non lo creeranno.',
    de: '⏭️ **{name}** am {date} übersprungen ({times}) · {n} geplante(r) Termin(e) gelöscht. Wiederholungen erstellen ihn nicht.',
  },
  all_day: { en: 'whole day', es: 'todo el día', it: 'tutto il giorno', de: 'ganzer Tag' },
  plans_title: { en: '🔁 Repeating schedules', es: '🔁 Horarios que se repiten', it: '🔁 Orari che si ripetono', de: '🔁 Wiederkehrende Zeitpläne' },
  plan_not_found: {
    en: 'Repeating schedule **#{id}** doesn\'t exist.', es: 'No existe la repetición **#{id}**.',
    it: 'La ripetizione **#{id}** non esiste.', de: 'Wiederholung **#{id}** gibt es nicht.',
  },
  plan_stopped: {
    en: '⏹️ Repeating schedule **#{id}** stopped; {n} upcoming time(s) deleted.',
    es: '⏹️ Repetición **#{id}** detenida; se borraron {n} horario(s) próximos.',
    it: '⏹️ Ripetizione **#{id}** fermata; eliminati {n} orario/i futuri.',
    de: '⏹️ Wiederholung **#{id}** beendet; {n} kommende(r) Termin(e) gelöscht.',
  },
  live_set: {
    en: '📌 Schedule posted in {channel}. **Pin it** (right click → Pin Message): I\'ll keep it updated.',
    es: '📌 Cronograma publicado en {channel}. **Fíjalo** (clic derecho → Fijar mensaje): yo lo mantengo actualizado.',
    it: '📌 Programma pubblicato in {channel}. **Fissalo** (clic destro → Fissa messaggio): lo terrò aggiornato.',
    de: '📌 Zeitplan in {channel} gepostet. **Hefte ihn an** (Rechtsklick → Nachricht anheften): ich halte ihn aktuell.',
  },
  live_off: {
    en: '📌 The pinned schedule will no longer update.', es: '📌 El cronograma fijado ya no se actualizará.',
    it: '📌 Il programma fissato non verrà più aggiornato.', de: '📌 Der angeheftete Zeitplan wird nicht mehr aktualisiert.',
  },
  live_not_set: {
    en: 'The pinned schedule is not on.', es: 'El cronograma fijado no está activado.',
    it: 'Il programma fissato non è attivo.', de: 'Der angeheftete Zeitplan ist nicht aktiv.',
  },
  cfg_live: { en: '📌 Pinned schedule: {value}', es: '📌 Cronograma fijado: {value}', it: '📌 Programma fissato: {value}', de: '📌 Angehefteter Zeitplan: {value}' },

  // ---------- botones, panel y asistente ----------
  ui_automate: { en: 'Automate', es: 'Automatizar', it: 'Automatizza', de: 'Automatisieren' },
  ui_no_thanks: { en: 'No, thanks', es: 'No, gracias', it: 'No, grazie', de: 'Nein, danke' },
  ui_yes_delete: { en: '🗑️ Yes, delete', es: '🗑️ Sí, borrar', it: '🗑️ Sì, elimina', de: '🗑️ Ja, löschen' },
  ui_cancel: { en: 'Cancel', es: 'Cancelar', it: 'Annulla', de: 'Abbrechen' },
  ui_cancelled: { en: 'Cancelled, nothing changed.', es: 'Cancelado, no se cambió nada.', it: 'Annullato, non è cambiato nulla.', de: 'Abgebrochen, nichts geändert.' },
  confirm_td: {
    en: 'Delete the event type **{value}**, its upcoming times and its repeats?', es: '¿Borrar el tipo de evento **{value}**, sus próximos horarios y sus repeticiones?',
    it: 'Eliminare il tipo di evento **{value}**, i suoi prossimi orari e le ripetizioni?', de: 'Event-Typ **{value}**, seine kommenden Termine und Wiederholungen löschen?',
  },
  confirm_ps: {
    en: 'Stop repeat **#{value}** and delete its upcoming times?', es: '¿Detener la repetición **#{value}** y borrar sus próximos horarios?',
    it: 'Fermare la ripetizione **#{value}** ed eliminare i prossimi orari?', de: 'Wiederholung **#{value}** beenden und kommende Termine löschen?',
  },
  confirm_ed: {
    en: 'Delete the event **{value}** and all its alarms?', es: '¿Borrar el evento **{value}** y todas sus alarmas?',
    it: "Eliminare l'evento **{value}** e tutti i suoi allarmi?", de: 'Event **{value}** und alle seine Alarme löschen?',
  },
  confirm_ad: { en: 'Delete alarm **#{value}**?', es: '¿Borrar la alarma **#{value}**?', it: "Eliminare l'allarme **#{value}**?", de: 'Alarm **#{value}** löschen?' },
  pattern_gone: {
    en: 'That pattern changed in the meantime. Check `/template info`.', es: 'Ese patrón cambió mientras tanto. Revisa `/template info`.',
    it: 'Quello schema è cambiato nel frattempo. Controlla `/template info`.', de: 'Dieses Muster hat sich inzwischen geändert. Prüfe `/template info`.',
  },
  ui_continue: { en: 'Continue ➜', es: 'Continuar ➜', it: 'Continua ➜', de: 'Weiter ➜' },
  ui_pick_template: { en: 'Event type…', es: 'Tipo de evento…', it: 'Tipo di evento…', de: 'Event-Typ…' },
  ui_pick_day: { en: 'Day…', es: 'Día…', it: 'Giorno…', de: 'Tag…' },
  ui_pick_repeat: { en: 'Does it repeat?', es: '¿Se repite?', it: 'Si ripete?', de: 'Wiederholt es sich?' },
  ui_rep_none: { en: 'Does not repeat', es: 'No se repite', it: 'Non si ripete', de: 'Keine Wiederholung' },
  ui_rep_d1: { en: 'Every day', es: 'Todos los días', it: 'Ogni giorno', de: 'Jeden Tag' },
  ui_rep_d2: { en: 'Every 2 days', es: 'Cada 2 días', it: 'Ogni 2 giorni', de: 'Alle 2 Tage' },
  ui_rep_d3: { en: 'Every 3 days', es: 'Cada 3 días', it: 'Ogni 3 giorni', de: 'Alle 3 Tage' },
  ui_rep_w1: { en: 'Every week', es: 'Cada semana', it: 'Ogni settimana', de: 'Jede Woche' },
  ui_rep_w2: { en: 'Every 2 weeks', es: 'Cada 2 semanas', it: 'Ogni 2 settimane', de: 'Alle 2 Wochen' },
  ui_today: { en: 'today', es: 'hoy', it: 'oggi', de: 'heute' },
  ui_plan_intro: {
    en: '➕ **Schedule**: pick the event type, the day and whether it repeats, then press **Continue** to write the times.',
    es: '➕ **Programar**: elige el tipo de evento, el día y si se repite; luego presiona **Continuar** para escribir los horarios.',
    it: "➕ **Programma**: scegli il tipo di evento, il giorno e se si ripete; poi premi **Continua** per scrivere gli orari.",
    de: '➕ **Planen**: wähle Event-Typ, Tag und ob es sich wiederholt, dann drücke **Weiter**, um die Uhrzeiten einzugeben.',
  },
  ui_plan_title: { en: 'Schedule', es: 'Programar', it: 'Programma', de: 'Planen' },
  ui_times_label: { en: 'Times (server time zone)', es: 'Horarios (zona del servidor)', it: 'Orari (fuso del server)', de: 'Uhrzeiten (Serverzeitzone)' },
  ui_until_label: { en: 'Until (optional, if it repeats)', es: 'Hasta (opcional, si se repite)', it: 'Fino a (facoltativo, se si ripete)', de: 'Bis (optional, bei Wiederholung)' },
  ui_plan_more: { en: '➕ Schedule another', es: '➕ Programar otro', it: '➕ Programma un altro', de: '➕ Weiteres planen' },
  ui_no_templates_yet: {
    en: 'There are no event types yet. Create the first one:', es: 'Todavía no hay tipos de evento. Crea el primero:',
    it: 'Non ci sono ancora tipi di evento. Crea il primo:', de: 'Noch keine Event-Typen. Erstelle den ersten:',
  },
  ui_new_template: { en: '➕ New / edit event type', es: '➕ Nuevo / editar tipo de evento', it: '➕ Nuovo / modifica tipo di evento', de: '➕ Event-Typ neu / bearbeiten' },
  ui_tpl_modal_title: { en: 'Event type', es: 'Tipo de evento', it: 'Tipo di evento', de: 'Event-Typ' },
  ui_tpl_name: { en: 'Name (same name = edit it)', es: 'Nombre (mismo nombre = editarlo)', it: 'Nome (stesso nome = modificalo)', de: 'Name (gleicher Name = bearbeiten)' },
  ui_tpl_reminders: { en: 'Reminders (time before + who)', es: 'Avisos (tiempo antes + a quién)', it: 'Avvisi (tempo prima + chi)', de: 'Erinnerungen (Zeit vorher + wer)' },
  ui_tpl_message: { en: 'Message at start time (optional)', es: 'Mensaje a la hora (opcional)', it: "Messaggio all'ora (facoltativo)", de: 'Nachricht zur Startzeit (optional)' },
  ui_view_template: {
    en: 'See details and how often it repeats…', es: 'Ver detalle y cada cuánto se repite…',
    it: 'Vedi dettagli e ogni quanto si ripete…', de: 'Details und Wiederholung ansehen…',
  },
  ui_back: { en: '⬅️ Back', es: '⬅️ Volver', it: '⬅️ Indietro', de: '⬅️ Zurück' },
  ui_skip_intro: {
    en: '⏭️ **Skip a day**: pick the event type and the day.', es: '⏭️ **Saltar un día**: elige el tipo de evento y el día.',
    it: '⏭️ **Salta un giorno**: scegli il tipo di evento e il giorno.', de: '⏭️ **Tag überspringen**: wähle Event-Typ und Tag.',
  },
  ui_skip_all: { en: '⏭️ Skip the whole day', es: '⏭️ Saltar todo el día', it: '⏭️ Salta tutto il giorno', de: '⏭️ Ganzen Tag überspringen' },
  ui_skip_some: { en: '🕒 Only some times…', es: '🕒 Solo algunos horarios…', it: '🕒 Solo alcuni orari…', de: '🕒 Nur einige Uhrzeiten…' },
  ui_skip_title: { en: 'Skip times', es: 'Saltar horarios', it: 'Salta orari', de: 'Uhrzeiten überspringen' },
  ui_skip_times_label: { en: 'Times to skip, e.g. 18:00', es: 'Horarios a saltar, ej. 18:00', it: 'Orari da saltare, es. 18:00', de: 'Zu überspringende Zeiten, z. B. 18:00' },
  panel_posted: {
    en: '🦁 Panel posted. **Pin it** (right click → Pin Message) so organizers always have it at hand.',
    es: '🦁 Panel publicado. **Fíjalo** (clic derecho → Fijar mensaje) para que los organizadores lo tengan siempre a mano.',
    it: '🦁 Pannello pubblicato. **Fissalo** (clic destro → Fissa messaggio) così gli organizzatori lo hanno sempre a portata di mano.',
    de: '🦁 Panel gepostet. **Hefte es an** (Rechtsklick → Nachricht anheften), damit Organisatoren es immer griffbereit haben.',
  },
  setup_1_tz: {
    en: '⚙️ **Setup 1/6 · Time zone**\nDates are typed in the server time zone. Now: **{tz}**.\nIf your team is in several countries, UTC is recommended.',
    es: '⚙️ **Configuración 1/6 · Zona horaria**\nLas fechas se escriben en la zona del servidor. Ahora: **{tz}**.\nSi tu equipo está en varios países, se recomienda UTC.',
    it: '⚙️ **Configurazione 1/6 · Fuso orario**\nLe date si scrivono nel fuso del server. Ora: **{tz}**.\nSe la tua squadra è in più paesi, si consiglia UTC.',
    de: '⚙️ **Einrichtung 1/6 · Zeitzone**\nDaten werden in der Serverzeitzone eingegeben. Jetzt: **{tz}**.\nWenn dein Team in mehreren Ländern ist, wird UTC empfohlen.',
  },
  setup_use_utc: { en: 'Use UTC', es: 'Usar UTC', it: 'Usa UTC', de: 'UTC verwenden' },
  setup_keep: { en: 'Keep {tz}', es: 'Mantener {tz}', it: 'Mantieni {tz}', de: '{tz} behalten' },
  setup_2_role: {
    en: '**2/6 · Organizers**\nWhich role can create and edit events? (People with "Manage Server" always can.)\nTo let that role see the organizer commands: Server Settings → Integrations → Kon Planner.',
    es: '**2/6 · Organizadores**\n¿Qué rol puede crear y editar eventos? (Quienes pueden "Gestionar servidor" siempre pueden.)\nPara que ese rol vea los comandos de organizador: Ajustes del servidor → Integraciones → Kon Planner.',
    it: '**2/6 · Organizzatori**\nQuale ruolo può creare e modificare eventi? (Chi può "Gestire il server" può sempre.)\nPer far vedere a quel ruolo i comandi da organizzatore: Impostazioni server → Integrazioni → Kon Planner.',
    de: '**2/6 · Organisatoren**\nWelche Rolle darf Events erstellen und bearbeiten? (Wer "Server verwalten" darf, kann es immer.)\nDamit diese Rolle die Organisator-Befehle sieht: Servereinstellungen → Integrationen → Kon Planner.',
  },
  setup_pick_role: { en: 'Choose a role', es: 'Elige un rol', it: 'Scegli un ruolo', de: 'Rolle wählen' },
  setup_skip: { en: 'Skip ➜', es: 'Saltar ➜', it: 'Salta ➜', de: 'Überspringen ➜' },
  setup_3_alerts: {
    en: '**3/6 · Alerts channel**\nWhere are reminders posted by default? The bot needs: View channel, Send messages and Embed links.',
    es: '**3/6 · Canal de avisos**\n¿Dónde se publican los avisos por defecto? El bot necesita: Ver canal, Enviar mensajes e Insertar enlaces.',
    it: '**3/6 · Canale degli avvisi**\nDove vengono pubblicati gli avvisi per impostazione predefinita? Il bot ha bisogno di: Vedere il canale, Inviare messaggi e Incorporare link.',
    de: '**3/6 · Kanal für Erinnerungen**\nWo werden Erinnerungen standardmäßig gepostet? Der Bot braucht: Kanal ansehen, Nachrichten senden und Links einbetten.',
  },
  setup_pick_channel: { en: 'Choose a channel', es: 'Elige un canal', it: 'Scegli un canale', de: 'Kanal wählen' },
  setup_4_live: {
    en: '**4/6 · Pinned schedule**\nChannel for a 7-day schedule that updates itself (you pin it once).',
    es: '**4/6 · Cronograma fijado**\nCanal para un cronograma de 7 días que se actualiza solo (lo fijas una vez).',
    it: '**4/6 · Programma fissato**\nCanale per un programma di 7 giorni che si aggiorna da solo (lo fissi una volta).',
    de: '**4/6 · Angehefteter Zeitplan**\nKanal für einen 7-Tage-Zeitplan, der sich selbst aktualisiert (du heftest ihn einmal an).',
  },
  setup_5_summary: {
    en: '**5/6 · Daily summary**\nChannel where the bot posts each day\'s events.', es: '**5/6 · Resumen diario**\nCanal donde el bot publica los eventos de cada día.',
    it: '**5/6 · Riepilogo giornaliero**\nCanale dove il bot pubblica gli eventi di ogni giorno.', de: '**5/6 · Tägliche Übersicht**\nKanal, in dem der Bot die Events des Tages postet.',
  },
  setup_5_time: {
    en: '**5/6 · Daily summary** in {channel}\nAt what time?', es: '**5/6 · Resumen diario** en {channel}\n¿A qué hora?',
    it: '**5/6 · Riepilogo giornaliero** in {channel}\nA che ora?', de: '**5/6 · Tägliche Übersicht** in {channel}\nUm wie viel Uhr?',
  },
  setup_pick_time: { en: 'Choose a time', es: 'Elige una hora', it: "Scegli un'ora", de: 'Uhrzeit wählen' },
  setup_6_templates: {
    en: '**6/6 · Event types**\nSave each type of event once (e.g. Trap, Monkey Rallies) with its reminders. Default: 15 min before without ping and @everyone at the start.\n{list}',
    es: '**6/6 · Tipos de evento**\nGuarda cada tipo de evento una vez (ej. Trap, Monkey Rallies) con sus avisos. Por defecto: 15 min antes sin mención y @everyone a la hora.\n{list}',
    it: "**6/6 · Tipi di evento**\nSalva ogni tipo di evento una volta (es. Trap, Monkey Rallies) con i suoi avvisi. Predefinito: 15 min prima senza menzione e @everyone all'inizio.\n{list}",
    de: '**6/6 · Event-Typen**\nSpeichere jeden Event-Typ einmal (z. B. Trap, Monkey Rallies) mit seinen Erinnerungen. Standard: 15 Min. vorher ohne Erwähnung und @everyone zum Start.\n{list}',
  },
  setup_templates_none: { en: '*None yet.*', es: '*Todavía ninguno.*', it: '*Ancora nessuno.*', de: '*Noch keine.*' },
  setup_add_template: { en: '➕ Add event type', es: '➕ Agregar tipo de evento', it: '➕ Aggiungi tipo di evento', de: '➕ Event-Typ hinzufügen' },
  setup_finish: { en: '✅ Finish', es: '✅ Terminar', it: '✅ Fine', de: '✅ Fertig' },
  setup_done: {
    en: '✅ **Kon Planner is ready.**\n• Post the button panel in your organizers\' channel with `/panel` and pin it.\n• Schedule with the panel or `/plan`.\n• Change anything later with `/setup` or `/config`.',
    es: '✅ **Kon Planner está listo.**\n• Publica el panel de botones en el canal de organizadores con `/panel` y fíjalo.\n• Programa con el panel o con `/plan`.\n• Cambia lo que quieras después con `/setup` o `/config`.',
    it: "✅ **Kon Planner è pronto.**\n• Pubblica il pannello di pulsanti nel canale degli organizzatori con `/panel` e fissalo.\n• Programma con il pannello o con `/plan`.\n• Cambia ciò che vuoi in seguito con `/setup` o `/config`.",
    de: '✅ **Kon Planner ist bereit.**\n• Poste das Button-Panel im Organisator-Kanal mit `/panel` und hefte es an.\n• Plane mit dem Panel oder mit `/plan`.\n• Ändere später alles mit `/setup` oder `/config`.',
  },

  // ---------- recordatorios personales ----------
  reminder_set: {
    en: '⏰ Reminder **#{id}** set: **{text}**\n🕒 {when}\n{where}',
    es: '⏰ Recordatorio **#{id}** listo: **{text}**\n🕒 {when}\n{where}',
    it: '⏰ Promemoria **#{id}** impostato: **{text}**\n🕒 {when}\n{where}',
    de: '⏰ Erinnerung **#{id}** gesetzt: **{text}**\n🕒 {when}\n{where}',
  },
  reminder_where_dm: {
    en: '📩 By private message (if your DMs are closed, I\'ll mention you in {channel}).',
    es: '📩 Por mensaje privado (si los tienes cerrados, te menciono en {channel}).',
    it: '📩 In privato (se hai i messaggi privati chiusi, ti menziono in {channel}).',
    de: '📩 Per Privatnachricht (wenn deine DMs geschlossen sind, erwähne ich dich in {channel}).',
  },
  reminder_where_here: { en: '📢 In {channel}, mentioning you.', es: '📢 En {channel}, mencionándote.', it: '📢 In {channel}, menzionandoti.', de: '📢 In {channel}, mit Erwähnung.' },
  reminder_need_when: {
    en: 'Say when: `in: 8h` (in how long) or `at: 18:00` (at a time).', es: 'Indica cuándo: `in: 8h` (en cuánto tiempo) o `at: 18:00` (a una hora).',
    it: 'Indica quando: `in: 8h` (tra quanto) o `at: 18:00` (a che ora).', de: 'Gib an, wann: `in: 8h` (in wie lange) oder `at: 18:00` (zu einer Uhrzeit).',
  },
  reminder_bad_in: {
    en: 'I didn\'t understand "{value}". Examples: 8h, 2h30m, 45m, 1d.', es: 'No entendí "{value}". Ejemplos: 8h, 2h30m, 45m, 1d.',
    it: 'Non ho capito "{value}". Esempi: 8h, 2h30m, 45m, 1d.', de: '"{value}" habe ich nicht verstanden. Beispiele: 8h, 2h30m, 45m, 1d.',
  },
  reminder_too_far: {
    en: 'Maximum {days} days ahead.', es: 'Máximo {days} días hacia adelante.', it: 'Massimo {days} giorni in avanti.', de: 'Maximal {days} Tage im Voraus.',
  },
  max_reminders: {
    en: 'You already have {max} pending reminders. Cancel one with `/remind cancel`.', es: 'Ya tienes {max} recordatorios pendientes. Cancela uno con `/remind cancel`.',
    it: 'Hai già {max} promemoria in attesa. Annullane uno con `/remind cancel`.', de: 'Du hast schon {max} offene Erinnerungen. Lösche eine mit `/remind cancel`.',
  },
  reminders_title: { en: '⏰ Your reminders', es: '⏰ Tus recordatorios', it: '⏰ I tuoi promemoria', de: '⏰ Deine Erinnerungen' },
  no_reminders: {
    en: 'You have no pending reminders. Create one with `/remind me`.', es: 'No tienes recordatorios pendientes. Crea uno con `/remind me`.',
    it: 'Non hai promemoria in attesa. Creane uno con `/remind me`.', de: 'Du hast keine offenen Erinnerungen. Erstelle eine mit `/remind me`.',
  },
  reminder_not_found: {
    en: 'You have no pending reminder **#{id}**.', es: 'No tienes un recordatorio pendiente **#{id}**.',
    it: 'Non hai un promemoria in attesa **#{id}**.', de: 'Du hast keine offene Erinnerung **#{id}**.',
  },
  reminder_cancelled: { en: '🗑️ Reminder **#{id}** cancelled.', es: '🗑️ Recordatorio **#{id}** cancelado.', it: '🗑️ Promemoria **#{id}** annullato.', de: '🗑️ Erinnerung **#{id}** gelöscht.' },
  reminder_footer: {
    en: 'Reminder you set {when} · Kon Planner', es: 'Recordatorio que pediste {when} · Kon Planner',
    it: 'Promemoria che hai impostato {when} · Kon Planner', de: 'Erinnerung, die du {when} gesetzt hast · Kon Planner',
  },
  reminder_dm_closed: {
    en: 'I couldn\'t send it privately: to get reminders by DM, allow direct messages from server members.',
    es: 'No pude enviártelo por privado: para recibirlos así, permite mensajes directos de miembros del servidor.',
    it: 'Non ho potuto inviartelo in privato: per riceverli così, consenti i messaggi diretti dai membri del server.',
    de: 'Ich konnte es nicht privat senden: um Erinnerungen per DM zu bekommen, erlaube Direktnachrichten von Servermitgliedern.',
  },
  ui_remind_title: { en: 'Remind me', es: 'Recordarme', it: 'Ricordami', de: 'Erinnere mich' },
  ui_remind_in: { en: 'In how long? (8h, 2h30m, 45m, 1d)', es: '¿En cuánto tiempo? (8h, 2h30m, 45m, 1d)', it: 'Tra quanto? (8h, 2h30m, 45m, 1d)', de: 'In wie lange? (8h, 2h30m, 45m, 1d)' },
  ui_remind_text: { en: 'What should I remind you?', es: '¿Qué te recuerdo?', it: 'Cosa ti ricordo?', de: 'Woran soll ich dich erinnern?' },

  // ---------- ayuda ----------
  help_title: { en: '🦁 Kon Planner — help', es: '🦁 Kon Planner — ayuda', it: '🦁 Kon Planner — aiuto', de: '🦁 Kon Planner — Hilfe' },
  help_body: {
    en: [
      '**🦁 Easiest:** `/setup` (first time) and `/panel` (buttons, no commands)',
      '**⚡ Quick way:** save an event type once and schedule it with one command',
      '`/template create name: Trap` → `/plan template: Trap date: 2026-11-02 times: 16:00`',
      '`/template info name: Trap` → history and how often it repeats',
      '',
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
      '**Current server time:** `/now` · **Personal reminder:** `/remind me text: Shield in: 8h`',
      '**View:** `/schedule`, `/agenda`, `/event view`, `/alarm list`',
      '**Daily summary:** `/config daily-summary channel: #general time: 09:00` · **Pinned schedule:** `/config live-schedule channel: #schedule`',
      '**Manage:** `/alarm edit`, `/alarm test`, `/alarm pause`, `/alarm resume`, `/alarm delete`',
      '**Groups:** `/group create name: Staff members: @Ana @Moderators`',
      '**Settings:** `/config timezone`, `/config admin-role`, `/config default-channel`',
    ].join('\n'),
    es: [
      '**🦁 Lo más fácil:** `/setup` (la primera vez) y `/panel` (botones, sin comandos)',
      '**⚡ Forma rápida:** guarda un tipo de evento una vez y prográmalo con un comando',
      '`/template create name: Trap` → `/plan template: Trap date: 2026-11-02 times: 16:00`',
      '`/template info name: Trap` → historial y cada cuánto se repite',
      '',
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
      '**Hora actual del servidor:** `/now` · **Recordatorio personal:** `/remind me text: Escudo in: 8h`',
      '**Ver:** `/schedule`, `/agenda`, `/event view`, `/alarm list`',
      '**Resumen diario:** `/config daily-summary channel: #general time: 09:00` · **Cronograma fijado:** `/config live-schedule channel: #schedule`',
      '**Gestionar:** `/alarm edit`, `/alarm test`, `/alarm pause`, `/alarm resume`, `/alarm delete`',
      '**Grupos:** `/group create name: Staff members: @Ana @Moderadores`',
      '**Config:** `/config timezone`, `/config admin-role`, `/config default-channel`',
    ].join('\n'),
    it: [
      '**🦁 Più semplice:** `/setup` (la prima volta) e `/panel` (pulsanti, senza comandi)',
      '**⚡ Modo rapido:** salva un tipo di evento una volta e programmalo con un comando',
      '`/template create name: Trap` → `/plan template: Trap date: 2026-11-02 times: 16:00`',
      '`/template info name: Trap` → storico e ogni quanto si ripete',
      '',
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
      '**Ora attuale del server:** `/now` · **Promemoria personale:** `/remind me text: Scudo in: 8h`',
      '**Vedi:** `/schedule`, `/agenda`, `/event view`, `/alarm list`',
      '**Riepilogo giornaliero:** `/config daily-summary channel: #general time: 09:00` · **Programma fissato:** `/config live-schedule channel: #schedule`',
      '**Gestisci:** `/alarm edit`, `/alarm test`, `/alarm pause`, `/alarm resume`, `/alarm delete`',
      '**Gruppi:** `/group create name: Staff members: @Ana @Moderatori`',
      '**Impostazioni:** `/config timezone`, `/config admin-role`, `/config default-channel`',
    ].join('\n'),
    de: [
      '**🦁 Am einfachsten:** `/setup` (beim ersten Mal) und `/panel` (Buttons, ohne Befehle)',
      '**⚡ Schnell:** speichere einen Event-Typ einmal und plane ihn mit einem Befehl',
      '`/template create name: Trap` → `/plan template: Trap date: 2026-11-02 times: 16:00`',
      '`/template info name: Trap` → Verlauf und wie oft es sich wiederholt',
      '',
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
      '**Aktuelle Serverzeit:** `/now` · **Persönliche Erinnerung:** `/remind me text: Schild in: 8h`',
      '**Ansehen:** `/schedule`, `/agenda`, `/event view`, `/alarm list`',
      '**Tägliche Übersicht:** `/config daily-summary channel: #general time: 09:00` · **Angehefteter Zeitplan:** `/config live-schedule channel: #schedule`',
      '**Verwalten:** `/alarm edit`, `/alarm test`, `/alarm pause`, `/alarm resume`, `/alarm delete`',
      '**Gruppen:** `/group create name: Staff members: @Ana @Moderatoren`',
      '**Einstellungen:** `/config timezone`, `/config admin-role`, `/config default-channel`',
    ].join('\n'),
  },
};
