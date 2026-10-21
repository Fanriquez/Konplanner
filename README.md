# 🦁 Kon Planner

Bot de Discord para planificar **eventos** con **varias alarmas** cada uno. Cada alarma puede mencionar a `@everyone`, `@here`, usuarios o roles específicos, o un **grupo** guardado, y enviar el mensaje que quieras.

Funciona 100% gratis con **Vercel + Supabase + cron-job.org**, sin tener tu PC encendido. Habla **inglés, español, italiano y alemán**.

---

## Qué incluye

| Función | Detalle |
|---|---|
| Eventos | Con nombre, descripción y fecha/hora de inicio (opcional) |
| Alarmas por evento | Todas las que quieras, cada una con su canal, mensaje y menciones |
| Alarmas relativas | "1 día antes", "2h antes", "al inicio". Si mueves el evento, se mueven solas |
| Alarmas con fecha exacta | Cualquier día y hora |
| Repeticiones | Diaria, semanal, mensual, cada N días (`every`), bloques de días seguidos (`days`) y fecha de término (`until`) |
| Menciones | `everyone`, `here`, `none`, @usuarios, @roles, `group:Nombre` (combinables) |
| Grupos de menciones | Ej. grupo **Staff** = @Ana @Pedro @Moderadores |
| Hora local automática | Cada usuario ve las fechas en su propia zona horaria |
| Cronograma | `/schedule` muestra eventos y alarmas agrupados por día; se puede publicar para todos |
| Resumen diario | Cada día a la hora elegida publica el cronograma del día |
| 4 idiomas | Comandos y respuestas en el idioma de Discord de cada persona (inglés, español, italiano, alemán) |
| Variables | `{event}`, `{start}`, `{time_left}`, `{description}` y `\n` para saltos de línea |
| Prueba | `/alarm test` envía la alarma al instante sin notificar a nadie |
| Permisos | Solo quien gestiona el servidor o el rol organizador crea y edita |

### Ejemplo de alarma enviada

> @everyone
> **⏰ Scrim**
> ¡Falta una hora! en 1 hora
> 🗓️ sábado, 25 de octubre de 2026 20:30 · en 1 hora
> *Kon Planner*

---

## Cómo funciona

```
Usuario escribe /alarm add ──► Discord ──► Vercel (/api/interactions) ──► Supabase (guarda)

cron-job.org (cada 1 min) ──► Vercel (/api/tick) ──► Supabase (¿alarmas o resumen pendientes?)
                                                  └─► Discord (publica el mensaje)
```

- **Vercel** responde los comandos `/`, envía las alarmas y el resumen diario.
- **Supabase** guarda eventos, alarmas, grupos y configuración.
- **cron-job.org** "despierta" al bot cada minuto. Precisión: alrededor de 1 minuto.

---

## Instalación paso a paso

Necesitas cuentas gratuitas en Discord Developer Portal, GitHub, Vercel, Supabase y cron-job.org. **No hace falta instalar nada en tu PC.**

### 1. Crear el bot en Discord

1. Entra a <https://discord.com/developers/applications> → **New Application** → nómbrala `Kon Planner`.
2. En **General Information** copia el **Application ID** y la **Public Key**.
3. En **Bot** presiona **Reset Token** y copia el token. *No lo compartas con nadie.*
4. Invita el bot a tu servidor abriendo esta URL (cambia `TU_APP_ID`):

   ```
   https://discord.com/oauth2/authorize?client_id=TU_APP_ID&scope=bot+applications.commands&permissions=150528
   ```

   Esos permisos son: ver canales, enviar mensajes, insertar enlaces y mencionar @everyone.

### 2. Crear la base de datos en Supabase

1. Entra a <https://supabase.com> → **New project**. Elige la región **South America (São Paulo)**.
2. Abre **SQL Editor**, pega todo el contenido de `schema.sql` y presiona **Run**.
3. Presiona **Connect** (arriba) → **Transaction pooler** y copia la cadena de conexión (termina en `:6543/postgres`). Reemplaza `[YOUR-PASSWORD]` (incluidos los corchetes) por la contraseña de la base de datos. Esa es tu `DATABASE_URL`.

> Usa una contraseña solo con letras y números: símbolos como `@ # / ? %` rompen la cadena. Si no la recuerdas: **Project Settings → Database → Reset database password**.

### 3. Subir el código a GitHub

1. Crea un repositorio nuevo (puede ser privado).
2. Sube todos los archivos **excepto** `.env` y `node_modules`, respetando las carpetas `api/`, `lib/` y `scripts/`.

> Si al subir por la web se desordenan las carpetas: crea cada carpeta con **Add file → Create new file** escribiendo `api/leeme.txt` (la `/` crea la carpeta), entra a ella y sube ahí sus archivos con **Upload files**.

### 4. Desplegar en Vercel

1. En <https://vercel.com> → **Add New → Project** → importa el repositorio. Framework: **Other**.
2. En **Environment Variables** agrega (Key = nombre, Value = tu dato):

   | Variable | Valor |
   |---|---|
   | `DISCORD_APP_ID` | Application ID |
   | `DISCORD_PUBLIC_KEY` | Public Key |
   | `DISCORD_BOT_TOKEN` | Token del bot |
   | `DATABASE_URL` | Cadena de Supabase (puerto 6543) |
   | `TICK_SECRET` | Una clave larga inventada por ti, ej. `kon-8f3k2-x9q7-lmn4` |

3. Presiona **Deploy**. Al terminar, abre `https://TU-PROYECTO.vercel.app/api/interactions`: debe decir *"Kon Planner está funcionando 🦁"*.

> Si agregas o cambias variables después, ve a **Deployments → ⋯ → Redeploy** para que se apliquen.
>
> `vercel.json` ejecuta el bot en São Paulo (`gru1`), cerca de la base de datos. Si elegiste otra región en Supabase, cambia ese valor por la región de Vercel más cercana.

### 5. Conectar Discord con Vercel

En el Developer Portal → **General Information** → **Interactions Endpoint URL**, pega:

```
https://TU-PROYECTO.vercel.app/api/interactions
```

Guarda. Discord verifica la URL en ese momento; si da error, revisa que `DISCORD_PUBLIC_KEY` esté bien y vuelve a desplegar.

### 6. Registrar los comandos `/` (desde el navegador)

Copia el ID de tu servidor: en Discord, **Ajustes de usuario → Avanzado → Modo desarrollador**, luego clic derecho en el ícono del servidor → **Copiar ID del servidor**. Abre:

```
https://TU-PROYECTO.vercel.app/api/register?key=TU_TICK_SECRET&guild=ID_DEL_SERVIDOR
```

Debe responder `✅ 8 comandos registrados en tu servidor`. Sin `&guild=...` se registran en todos los servidores, pero pueden tardar hasta una hora en aparecer.

Repite este paso cada vez que cambies `lib/commands.js` (al actualizar el bot) y una vez por cada servidor nuevo.

> Alternativa con Node.js 20+: `npm install`, copia `.env.example` como `.env`, complétalo y ejecuta `npm run register`.

### 7. Activar el reloj en cron-job.org

1. En <https://cron-job.org> → **Create cronjob**.
2. URL: `https://TU-PROYECTO.vercel.app/api/tick?key=TU_TICK_SECRET`
3. Frecuencia: **cada 1 minuto**. Guarda.

Para comprobarlo, abre esa URL en el navegador: debe responder `{"ok":true,"sent":0,...}`.

### 8. Probar

```
/config timezone value: UTC
/event create name: Prueba date: today time: 23:00
/alarm add event: Prueba before: 0 message: It works! mentions: none
/alarm test id: 1
```

---

## Actualizar el bot

1. Si la versión nueva cambia la base de datos, pega en Supabase → **SQL Editor** las líneas `alter table ...` del final de `schema.sql` y presiona **Run** (no borran nada; se pueden ejecutar varias veces).
2. Sube a GitHub los archivos cambiados (en la carpeta correcta). Vercel se actualiza solo.
3. Vuelve a registrar los comandos (paso 6).

---

## Guía de comandos

Escribe las fechas y horas en la **zona del servidor** (`/now` la muestra). Todos ven las fechas convertidas a su propia hora.

### Para todos
| Comando | Uso |
|---|---|
| `/schedule` | Cronograma por día: eventos y alarmas (`days: 14` para más días) |
| `/agenda` | Próximas alarmas (`days: 14` para más días) |
| `/event list` · `/event view` | Eventos y sus alarmas |
| `/now` | Fecha y hora actual del servidor |
| `/help` | Resumen de uso |

### Eventos
| Comando | Ejemplo |
|---|---|
| `/event create` | `name: Torneo date: 2026-10-25 time: 20:30 description: Final de temporada` |
| `/event edit` | `event: Torneo time: 21:00` (las alarmas relativas se mueven solas) |
| `/event delete` | `event: Torneo` borra el evento y sus alarmas |

Fechas aceptadas: `2026-10-25` o `25/10/2026` (mismo día), `25-10-26`, y `today`/`tomorrow` en los 4 idiomas (`hoy`, `mañana`, `oggi`, `domani`, `heute`, `morgen`…). Horas en formato 24 h: `20:30`, `9:05`, `20h`.

### Alarmas
| Comando | Ejemplo |
|---|---|
| `/alarm add` relativa | `event: Torneo before: 1d message: ¡Mañana es {event}! mentions: everyone` |
| `/alarm add` exacta | `event: Torneo date: 24/10/2026 time: 18:00 message: Inscripciones cerradas mentions: group:Staff` |
| `/alarm add` semanal | `event: Reunión date: today time: 19:00 repeat: Weekly message: Reunión semanal mentions: @Equipo` |
| `/alarm add` cada 2 días hasta una fecha | `event: Entreno date: 2026-10-22 time: 22:00 every: 2 until: 2026-12-15 message: ¡Entreno!` |
| `/alarm add` bloques de días | `event: Torneo date: 2026-11-01 time: 20:00 every: 19 days: 7 message: ¡Torneo hoy!` |
| `/alarm list` | Sin evento: próximas del servidor. Con evento: todas las de ese evento |
| `/alarm edit` | `id: 3 before: 30m` · `id: 3 mentions: here` · `id: 3 until: never` · `id: 3 schedule: No` |
| `/alarm test` | `id: 3` envía una prueba al canal sin notificar a nadie |
| `/alarm pause` / `resume` / `delete` | `id: 3` |

- **before** acepta `1d`, `2h`, `30m`, `1h30m`, `90` (minutos) o `0` (al inicio). Usa **before** *o* **date + time**, no ambos.
- **repeat**: `Daily`, `Weekly`, `Monthly` (Discord lo muestra en el idioma de cada persona).
- **every**: cada cuántos días se repite (`every: 2` = un día sí, uno no). Con `repeat: Weekly` o `Monthly`, cada cuántas semanas o meses.
- **days**: días seguidos por ciclo, junto con **every**. `every: 19 days: 7` = 7 días seguidos y 12 de descanso.
- **until**: último día en que se repite (`never` / `nunca` para quitarlo).
- **schedule**: `No` oculta la alarma de `/schedule` y del resumen diario (sigue sonando). Útil para un recordatorio de 5 minutos antes.
- En `id`, escribe el nombre del evento y Discord sugiere sus alarmas.
- Si no indicas canal, se usa el canal por defecto o el canal donde escribiste el comando.

### Menciones
| Valor | Resultado |
|---|---|
| `everyone` | @everyone |
| `here` | @here (solo conectados) |
| `@Ana @Moderadores` | Usuarios y roles específicos (elígelos de la lista de Discord al escribir @) |
| `group:Staff` o `group:"Equipo Rojo"` | Los miembros del grupo |
| `none` | Sin menciones |

Se pueden combinar: `here group:Staff @Pedro`.

### Grupos
| Comando | Ejemplo |
|---|---|
| `/group create` | `name: Staff members: @Ana @Pedro @Moderadores` (si ya existe, lo reemplaza) |
| `/group list` | Muestra los grupos y sus miembros |
| `/group delete` | `name: Staff` |

### Configuración (quienes pueden gestionar el servidor)
| Comando | Uso |
|---|---|
| `/config view` | Configuración actual |
| `/config timezone` | Zona horaria en la que se escriben las fechas (por defecto `America/Santiago`) |
| `/config admin-role` | Rol que puede crear y editar |
| `/config default-channel` | Canal por defecto de las alarmas |
| `/config daily-summary` | `channel: #anuncios time: 09:00 mentions: @Jugadores` publica cada día el cronograma del día (`mentions` opcional; los días sin eventos no publica nada) |
| `/config daily-summary-off` | Desactiva el resumen diario |
| `/schedule public: Yes` | Publica el cronograma en el canal para todos (organizadores) |

Las respuestas del bot a comandos son privadas (solo las ve quien escribió el comando) y nunca notifican a nadie.

---

## Detalles técnicos

```
api/interactions.js   Recibe los comandos de Discord (verifica la firma)
api/tick.js           Envía alarmas vencidas y el resumen diario (lo llama cron-job.org)
api/register.js       Registra los comandos "/" desde el navegador
lib/handlers.js       Lógica de cada comando
lib/commands.js       Definición de los comandos "/" (con traducciones)
lib/i18n.js           Textos del bot en inglés, español, italiano y alemán
lib/tick.js           Envío, repeticiones, reintentos y resumen diario
lib/schedule.js       Arma el cronograma por día
lib/time.js           Fechas, zonas horarias, "before" y repeticiones
lib/mentions.js       Interpretación de menciones
lib/render.js         Formato del mensaje de alarma y variables
lib/discord.js        Llamadas a la API de Discord
lib/db.js             Conexión a la base de datos
scripts/register.js   Registra los comandos desde un PC (alternativa)
schema.sql            Tablas de la base de datos (y "alter table" para actualizar)
```

**Idiomas**
- Cada persona ve los comandos y las respuestas en el idioma de su Discord; si no es inglés, español, italiano o alemán, en inglés.
- Los mensajes que se publican en el canal (alarmas, cronograma público, resumen diario) no llevan textos fijos de idioma: solo lo que escribes tú y fechas que Discord traduce.
- Para cambiar o agregar textos, edita `lib/i18n.js` y las descripciones en `lib/commands.js`.

**Comportamiento de las alarmas**
- Un mismo minuto nunca envía una alarma dos veces, aunque cron-job.org llame dos veces.
- Si Discord falla, se reintenta hasta 3 veces (un intento por minuto). Si el canal no existe o el bot no tiene permisos, queda marcada como **falló**; arréglala con `/alarm edit` (por ejemplo cambiando el canal).
- Si una alarma única lleva más de 6 horas atrasada (por ejemplo, porque el reloj estuvo caído), no se envía y queda como **no enviada**. Las repetitivas saltan a la siguiente fecha.
- Las repeticiones respetan la hora local de la zona del servidor, incluidos los cambios de horario.
- El resumen diario se envía una sola vez por día; si el reloj estuvo caído más de 3 horas después de la hora elegida, ese día se omite.

**Límites por servidor:** 100 eventos, 300 alarmas activas y 50 grupos (ajustables en `lib/handlers.js`).

---

## Notas sobre los planes gratuitos

- **Vercel Hobby** es para uso personal y no comercial. Si algún día cobras por el bot, tendrás que pasar a un plan pago o a otro hosting.
- **Supabase** pausa los proyectos gratuitos inactivos; como el bot consulta la base cada minuto, debería mantenerse activo, pero revisa el panel de vez en cuando.
- Las condiciones de estos servicios cambian; revisa sus límites actuales antes de depender del bot para algo crítico.

---

## Ideas para próximas versiones

- Cumpleaños con la zona horaria de cada persona.
- Botones de asistencia (✅ Voy / ❔ Tal vez / ❌ No voy) y mención solo a quienes confirmaron.
- Duplicar eventos como plantilla.
- Creación automática del evento nativo de Discord.
