-- Kon Planner: esquema de base de datos (PostgreSQL / Supabase)
-- Pega todo este archivo en el SQL Editor de Supabase y presiona "Run".

create table if not exists guild_config (
  guild_id           text primary key,
  timezone           text not null default 'America/Santiago',
  admin_role_id      text,
  default_channel_id text,
  summary_channel_id text,                 -- resumen diario: canal (null = desactivado)
  summary_time       text,                 -- resumen diario: hora "HH:mm" en la zona del servidor
  summary_mentions   jsonb,                -- resumen diario: a quién menciona
  summary_last_date  text                  -- último día enviado ("yyyy-MM-dd"), evita duplicados
);

create table if not exists events (
  id          serial primary key,
  guild_id    text not null,
  name        text not null,
  name_key    text not null,               -- nombre en minúsculas, para búsquedas
  description text,
  starts_at   timestamptz,                 -- inicio del evento (opcional)
  created_by  text,
  created_at  timestamptz not null default now(),
  unique (guild_id, name_key)
);

create table if not exists mention_groups (
  id       serial primary key,
  guild_id text not null,
  name     text not null,
  name_key text not null,
  members  jsonb not null default '{"users":[],"roles":[]}',
  unique (guild_id, name_key)
);

create table if not exists alarms (
  id             serial primary key,
  guild_id       text not null,
  event_id       int  not null references events(id) on delete cascade,
  channel_id     text not null,
  message        text not null,
  mentions       jsonb not null default '{}',
  fire_at        timestamptz not null,     -- próxima vez que suena (UTC)
  offset_minutes int,                      -- si no es null: minutos antes del inicio del evento
  repeat         text not null default 'none'
                 check (repeat in ('none','daily','weekly','monthly')),
  repeat_every   int  not null default 1,      -- cada cuántos días/semanas/meses
  run_days       int  not null default 1,      -- días seguidos que suena en cada ciclo (con every)
  repeat_anchor  timestamptz,                  -- primer día del ciclo (para run_days)
  repeat_until   timestamptz,                -- si no es null: deja de repetirse después de esta fecha
  in_schedule    boolean not null default true, -- aparece en /schedule y en el resumen diario
  via_dm         boolean not null default false, -- se envía por mensaje privado a cada persona mencionada
  status         text not null default 'pending'
                 check (status in ('pending','sending','sent','paused','failed','missed')),
  fail_count     int not null default 0,
  last_attempt   timestamptz,
  sent_at        timestamptz,
  last_error     text,
  created_by     text,
  created_at     timestamptz not null default now()
);

-- Plantillas (versión 3): tipos de evento con sus avisos guardados.
create table if not exists templates (
  id         serial primary key,
  guild_id   text not null,
  name       text not null,
  name_key   text not null,
  reminders  jsonb not null,               -- [{ "offset": 15, "mentions": {...} }, ...] (offset en minutos antes)
  message    text,                         -- mensaje del aviso a la hora (null = por defecto)
  channel_id text,                         -- canal (null = canal por defecto)
  created_at timestamptz not null default now(),
  unique (guild_id, name_key)
);

-- Repeticiones de una plantilla: el bot crea los horarios de los próximos días automáticamente.
create table if not exists plans (
  id                 serial primary key,
  guild_id           text not null,
  template_id        int not null references templates(id) on delete cascade,
  channel_id         text not null,
  anchor             timestamptz not null,  -- primer horario
  repeat             text not null,         -- daily | weekly | monthly
  repeat_every       int not null default 1,
  run_days           int not null default 1,
  repeat_until       timestamptz,
  materialized_until timestamptz,           -- último horario ya creado
  active             boolean not null default true,
  created_by         text,
  created_at         timestamptz not null default now()
);

-- Historial de horarios de cada plantilla (para detectar cada cuánto se repiten).
create table if not exists plan_history (
  template_id int not null references templates(id) on delete cascade,
  starts_at   timestamptz not null,
  primary key (template_id, starts_at)
);

-- Días saltados de una plantilla (para que las repeticiones no los vuelvan a crear).
create table if not exists plan_skips (
  template_id int  not null references templates(id) on delete cascade,
  day         text not null,               -- "yyyy-MM-dd" en la zona del servidor
  time        text not null default '',    -- "HH:mm", o '' = todo el día
  primary key (template_id, day, time)
);

-- Recordatorios personales (/remind me).
create table if not exists reminders (
  id         serial primary key,
  guild_id   text not null,
  user_id    text not null,
  channel_id text not null,                -- canal donde se pidió (se usa si no se puede por privado)
  text       text not null,
  fire_at    timestamptz not null,
  via_dm     boolean not null default true,
  locale     text,
  status     text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  created_at timestamptz not null default now()
);
create index if not exists reminders_due_idx on reminders (status, fire_at);

-- Columnas agregadas en versiones posteriores (no borran nada; se pueden ejecutar varias veces).
alter table alarms add column if not exists repeat_every int not null default 1;
alter table alarms add column if not exists repeat_until timestamptz;
alter table alarms add column if not exists in_schedule boolean not null default true;
alter table alarms add column if not exists run_days int not null default 1;
alter table alarms add column if not exists repeat_anchor timestamptz;
alter table guild_config add column if not exists summary_channel_id text;
alter table guild_config add column if not exists summary_time text;
alter table guild_config add column if not exists summary_mentions jsonb;
alter table guild_config add column if not exists summary_last_date text;
alter table events add column if not exists template_id int references templates(id) on delete set null;
alter table events add column if not exists plan_id int references plans(id) on delete set null;
alter table alarms add column if not exists message_id text;
alter table alarms add column if not exists via_dm boolean not null default false;
alter table events add column if not exists all_day boolean not null default false;  -- todo el día (sin hora)
alter table plans add column if not exists all_day boolean not null default false;
alter table plans add column if not exists alarm_time text;                           -- "HH:mm" (horarios de todo el día)
alter table templates add column if not exists dm boolean not null default false;     -- avisos por mensaje privado
alter table guild_config add column if not exists live_channel_id text;
alter table guild_config add column if not exists live_message_id text;
alter table guild_config add column if not exists live_day text;
create index if not exists events_template_idx on events (template_id, starts_at);

create index if not exists alarms_due_idx   on alarms (status, fire_at);
create index if not exists alarms_event_idx on alarms (event_id);
create index if not exists alarms_guild_idx on alarms (guild_id);

-- Las tablas solo las usa el bot con su conexión directa.
-- Activar RLS sin políticas bloquea el acceso público de la API de Supabase.
alter table guild_config   enable row level security;
alter table events         enable row level security;
alter table mention_groups enable row level security;
alter table alarms         enable row level security;
alter table templates      enable row level security;
alter table plans          enable row level security;
alter table plan_history   enable row level security;
alter table plan_skips     enable row level security;
alter table reminders      enable row level security;
