-- =============================================================
-- schema.sql — esquema de Supabase para la sincronización opcional
-- de progreso de Matemáticas Simplificadas.
--
-- Cómo usarlo:
--   1. Crea un proyecto en https://supabase.com
--   2. Pega y ejecuta este archivo completo en el editor SQL
--   3. Habilita el proveedor "GitHub" en Authentication → Providers
--   4. Copia la URL y la anon key del proyecto a js/config.js
--
-- Diseño: cada fila es UN reactivo respondido por UN usuario. La
-- clave (capitulo_clave, ejercicio_numero, item_numero) es un
-- espejo exacto de las tres llaves anidadas que ya usa el árbol de
-- progreso en LocalStorage (ver js/store.js) — no se inventa un
-- formato nuevo, sólo se replica el existente para que la fusión
-- entre LocalStorage y Supabase sea directa.
-- =============================================================

create table if not exists progreso_items (
  user_id           uuid        not null references auth.users(id) on delete cascade,
  capitulo_clave    text        not null,  -- ej. "aritmetica-capitulo-1"
  ejercicio_numero  int         not null,
  item_numero       int         not null,
  respuesta         jsonb,                 -- string ("<", "45", …) u objeto ({absoluto,relativo})
  correcta          boolean,
  revelada          boolean     not null default false,
  intentos          int         not null default 0,
  completado        boolean     not null default false,
  updated_at        timestamptz not null default now(),
  primary key (user_id, capitulo_clave, ejercicio_numero, item_numero)
);

-- El timestamp de actualización lo asigna SIEMPRE el servidor, nunca el
-- cliente — es la base de la regla "gana el más reciente" al fusionar.
create or replace function progreso_items_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_progreso_items_updated_at on progreso_items;
create trigger trg_progreso_items_updated_at
before insert or update on progreso_items
for each row execute function progreso_items_set_updated_at();

-- Row Level Security: cada usuario sólo puede leer y escribir su propio
-- progreso. Quien nunca inicia sesión nunca llega a tocar esta tabla.
alter table progreso_items enable row level security;

drop policy if exists "usuarios_leen_su_progreso" on progreso_items;
create policy "usuarios_leen_su_progreso" on progreso_items
  for select using (auth.uid() = user_id);

drop policy if exists "usuarios_insertan_su_progreso" on progreso_items;
create policy "usuarios_insertan_su_progreso" on progreso_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "usuarios_actualizan_su_progreso" on progreso_items;
create policy "usuarios_actualizan_su_progreso" on progreso_items
  for update using (auth.uid() = user_id);

create index if not exists idx_progreso_items_user on progreso_items(user_id);
