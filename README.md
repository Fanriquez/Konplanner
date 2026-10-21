# 🦁 Kon Planner

Bot de Discord para planificar **eventos** con **varias alarmas** cada uno. Cada alarma puede mencionar a `@everyone`, `@here`, usuarios o roles específicos, o un **grupo** guardado, y enviar el mensaje que quieras.

Funciona 100% gratis con **Vercel + Supabase + cron-job.org**, sin tener tu PC encendido.

---

## Qué incluye

| Función | Detalle |
|---|---|
| Eventos | Con nombre, descripción y fecha/hora de inicio (opcional) |
| Alarmas por evento | Todas las que quieras, cada una con su canal, mensaje y menciones |
| Alarmas relativas | "1 día antes", "2h antes", "al inicio". Si mueves el evento, se mueven solas |
| Alarmas con fecha exacta | Cualquier día y hora, con repetición diaria, semanal o mensual |
| Menciones | `everyone`, `here`, `none`, @usuarios, @roles, `group:Nombre` (combinables) |
| Grupos de menciones | Ej. grupo **Staff** = @Ana @Pedro @Moderadores |
| Hora local automática | Cada usuario ve las fechas en su propia zona horaria |
| Variables | `{event}`, `{start}`, `{time_left}`, `{description}` y `\n` para saltos de línea |
| Agenda | `/agenda` muestra las próximas alarmas del servidor |
| Prueba | `/alarm test` envía la alarma al instante sin notificar a nadie |
| Permisos | Solo quien gestiona el servidor o el rol organizador crea y edita |

### Ejemplo de alarma enviada

> @everyone
> **⏰ Evento 1**
> ¡Falta una hora para Evento 1! en 1 hora
> 🗓️ Inicio: sábado, 25 de octubre de 2026 20:30 · en 1 hora
> *Kon Planner*

---

## Cómo funciona

```
Usuario escribe /alarm add ──► Discord ──► Vercel (/api/interactions) ──► Supabase (guarda)

cron-job.org (cada 1 min) ──► Vercel (/api/tick) ──► Supabase (¿alarmas vencidas?)
                                                  └─► Discord (publica el mensaje)
```

- **Vercel** responde los comandos `/` y envía las alarmas.
- **Supabase** guarda eventos, alarmas, grupos y configuración.
- **cron-job.org** "despierta" al bot cada minuto. Precisión: alrededor de 1 minuto.

---

## Instalación paso a paso

Necesitas cuentas gratuitas en Discord Developer Portal, GitHub, Vercel, Supabase y cron-job.org, y **Node.js 20 o superior** en tu PC (solo para registrar los comandos una vez).

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
3. Presiona **Connect** (arriba) → **Transaction pooler** y copia la cadena de conexión (puerto **6543**). Reemplaza `[YOUR-PASSWORD]` por la clave de tu proyecto. Esa es tu `DATABASE_URL`.

### 3. Subir el código a GitHub

1. Crea un repositorio nuevo (puede ser privado).
2. Sube todos los archivos de esta carpeta **excepto** `.env` y `node_modules`.

### 4. Desplegar en Vercel

1. En <https://vercel.com> → **Add New → Project** → importa el repositorio. Framework: **Other**.
2. En **Environment Variables** agrega:

   | Variable | Valor |
   |---|---|
   | `DISCORD_APP_ID` | Application ID |
   | `DISCORD_PUBLIC_KEY` | Public Key |
   | `DISCORD_BOT_TOKEN` | Token del bot |
   | `DATABASE_URL` | Cadena de Supabase (puerto 6543) |
   | `TICK_SECRET` | Una clave larga inventada por ti, ej. `kon-8f3k2-x9q7-lmn4` |

3. Presiona **Deploy**. Al terminar, abre `https://TU-PROYECTO.vercel.app/api/interactions`: debe decir *"Kon Planner está funcionando 🦁"*.

> `vercel.json` ejecuta el bot en São Paulo (`gru1`), cerca de la base de datos. Si elegiste otra región en Supabase, cambia ese valor por la región de Vercel más cercana.

### 5. Conectar Discord con Vercel

En el Developer Portal → **General Information** → **Interactions Endpoint URL**, pega:

```
https://TU-PROYECTO.vercel.app/api/interactions
```

Guarda. Discord verifica la URL en ese momento; si da error, revisa que `DISCORD_PUBLIC_KEY` esté bien y vuelve a desplegar.

### 6. Registrar los comandos `/`

En tu PC, dentro de la carpeta del proyecto:

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
```

Completa `.env` con tus datos. Para que los comandos aparezcan al instante, pon también `DISCORD_GUILD_ID` (clic derecho en tu servidor → **Copiar ID del servidor**; necesitas activar el *Modo desarrollador* en Ajustes → Avanzado). Luego:

```bash
npm run register
```

Repite este paso solo si cambias `lib/commands.js`.

### 7. Activar el reloj en cron-job.org

1. En <https://cron-job.org> → **Create cronjob**.
2. URL: `https://TU-PROYECTO.vercel.app/api/tick?key=TU_TICK_SECRET`
3. Frecuencia: **cada 1 minuto**. Guarda.

Para comprobarlo, abre esa URL en el navegador: debe responder `{"ok":true,"sent":0,...}`.

### 8. Probar

```
/config timezone value: America/Santiago
/event create name: Prueba date: hoy time: 23:00
/alarm add event: Prueba before: 0 message: ¡Funciona! mentions: none
/alarm test id: 1
```

---

## Guía de comandos

### Eventos
| Comando | Ejemplo |
|---|---|
| `/event create` | `name: Torneo date: 2026-10-25 time: 20:30 description: Final de temporada` |
| `/event list` | Lista eventos y cuántas alarmas tiene cada uno |
| `/event view` | `event: Torneo` muestra el evento y todas sus alarmas |
| `/event edit` | `event: Torneo time: 21:00` (las alarmas relativas se mueven solas) |
| `/event delete` | `event: Torneo` borra el evento y sus alarmas |

Fechas aceptadas: `2026-10-25`, `25/10/2026`, `25-10-26`, `hoy`, `mañana`, `pasado mañana`. Horas en formato 24 h: `20:30`, `9:05`, `20h`.

### Alarmas
| Comando | Ejemplo |
|---|---|
| `/alarm add` relativa | `event: Torneo before: 1d message: ¡Mañana es {event}! mentions: everyone` |
| `/alarm add` exacta | `event: Torneo date: 24/10/2026 time: 18:00 message: Inscripciones cerradas mentions: group:Staff` |
| `/alarm add` repetitiva | `event: Reunión date: hoy time: 19:00 message: Reunión semanal repeat: Semanal mentions: @Equipo` |
| `/alarm list` | Sin evento: próximas del servidor. Con evento: todas las de ese evento |
| `/alarm edit` | `id: 3 before: 30m` · `id: 3 mentions: here` · `id: 3 channel: #general` |
| `/alarm test` | `id: 3` envía una prueba al canal sin notificar a nadie |
| `/alarm pause` / `resume` | `id: 3` |
| `/alarm delete` | `id: 3` |

- **before** acepta `1d`, `2h`, `30m`, `1h30m`, `90` (minutos) o `0` (al inicio).
- Usa **before** *o* **date + time**, no ambos.
- Si no indicas canal, se usa el canal por defecto o el canal donde escribiste el comando.

### Menciones
| Valor | Resultado |
|---|---|
| `everyone` | @everyone |
| `here` | @here (solo conectados) |
| `@Ana @Moderadores` | Usuarios y roles específicos |
| `group:Staff` o `group:"Equipo Rojo"` | Los miembros del grupo |
| `none` | Sin menciones |

Se pueden combinar: `here group:Staff @Pedro`.

### Grupos
| Comando | Ejemplo |
|---|---|
| `/group create` | `name: Staff members: @Ana @Pedro @Moderadores` (si ya existe, lo reemplaza) |
| `/group list` | Muestra los grupos y sus miembros |
| `/group delete` | `name: Staff` |

### Otros
| Comando | Uso |
|---|---|
| `/agenda` | Próximas alarmas (`days: 14` para ver más días) |
| `/config view` | Configuración actual |
| `/config timezone` | Zona horaria del servidor (por defecto `America/Santiago`) |
| `/config admin-role` | Rol que puede crear y editar |
| `/config default-channel` | Canal por defecto de las alarmas |
| `/help` | Resumen de uso |

Todas las respuestas del bot a comandos son privadas (solo las ve quien escribió el comando) y nunca notifican a nadie.

---

## Detalles técnicos

```
api/interactions.js   Recibe los comandos de Discord (verifica la firma)
api/tick.js           Envía las alarmas vencidas (lo llama cron-job.org)
lib/handlers.js       Lógica de cada comando
lib/tick.js           Envío, repeticiones y reintentos
lib/commands.js       Definición de los comandos "/"
lib/time.js           Fechas, zonas horarias y "before"
lib/mentions.js       Interpretación de menciones
lib/render.js         Formato del mensaje y variables
lib/db.js             Conexión a la base de datos
scripts/register.js   Registra los comandos en Discord
schema.sql            Tablas de la base de datos
```

**Comportamiento de las alarmas**
- Un mismo minuto nunca envía una alarma dos veces, aunque cron-job.org llame dos veces.
- Si Discord falla, se reintenta hasta 3 veces (un intento por minuto). Si el canal no existe o el bot no tiene permisos, queda marcada como **falló**; arréglala con `/alarm edit` (por ejemplo cambiando el canal).
- Si una alarma única lleva más de 6 horas atrasada (por ejemplo, porque el reloj estuvo caído), no se envía y queda como **no enviada**. Las repetitivas saltan a la siguiente fecha.
- Las repeticiones respetan la hora local, incluido el cambio de horario de Chile.

**Límites por servidor:** 100 eventos, 300 alarmas activas y 50 grupos (ajustables en `lib/handlers.js`).

---

## Notas sobre los planes gratuitos

- **Vercel Hobby** es para uso personal y no comercial. Si algún día cobras por el bot, tendrás que pasar a un plan pago o a otro hosting.
- **Supabase** pausa los proyectos gratuitos inactivos; como el bot consulta la base cada minuto, debería mantenerse activo, pero revisa el panel de vez en cuando.
- Las condiciones de estos servicios cambian; revisa sus límites actuales antes de depender del bot para algo crítico.

---

## Próxima versión (ideas)

- Botones de asistencia (✅ Voy / ❔ Tal vez / ❌ No voy) y mención solo a quienes confirmaron (`mentions: attendees`).
- Duplicar eventos como plantilla.
- Repeticiones avanzadas (días específicos, fecha de término).
- Canal de registro y creación automática del evento nativo de Discord.
