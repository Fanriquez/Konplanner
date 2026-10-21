-- Kon Planner: esquema de base de datos (PostgreSQL / Supabase)
-- Pega todo este archivo en el SQL Editor de Supabase y presiona "Run".

create table if not exists guild_config (
  guild_id           text primary key,
  timezone           text not null default 'America/Santiago',
  admin_role_id      text,
  default_channel_id text
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
  status         text not null default 'pending'
                 check (status in ('pending','sending','sent','paused','failed','missed')),
  fail_count     int not null default 0,
  last_attempt   timestamptz,
  sent_at        timestamptz,
  last_error     text,
  created_by     text,
  created_at     timestamptz not null default now()
);

create index if not exists alarms_due_idx   on alarms (status, fire_at);
create index if not exists alarms_event_idx on alarms (event_id);
create index if not exists alarms_guild_idx on alarms (guild_id);

-- Las tablas solo las usa el bot con su conexión directa.
-- Activar RLS sin políticas bloquea el acceso público de la API de Supabase.
alter table guild_config   enable row level security;
alter table events         enable row level security;
alter table mention_groups enable row level security;
alter table alarms         enable row level security;
