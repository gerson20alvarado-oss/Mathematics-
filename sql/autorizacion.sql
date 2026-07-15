-- =============================================================
-- autorizacion.sql — capa de autorización de usuarios.
--
-- Archivo independiente de schema.sql (no lo modifica ni lo
-- reemplaza): agrega la tabla `usuarios` y las funciones necesarias
-- para aprobar/rechazar cuentas y, en el futuro, un panel de
-- administración — sin tocar `progreso_items` ni sus políticas.
--
-- Cómo usarlo: pega y ejecuta este archivo completo en el editor
-- SQL de tu proyecto de Supabase, después de haber ejecutado
-- schema.sql.
--
-- Diseño de identidad: la clave primaria de TODO el sistema de
-- usuarios es `user_id` (= auth.users.id, el id que asigna Supabase
-- Auth). Nunca cambia, es único y es el mismo id que ya usa
-- `progreso_items.user_id`. El nombre de GitHub, el nombre visible y
-- el avatar son sólo datos de perfil para mostrar en la interfaz —
-- nunca se usan como identificador de nada.
-- =============================================================

create table if not exists usuarios (
  user_id           uuid        primary key references auth.users(id) on delete cascade,

  -- Perfil (sólo para mostrar en la interfaz, nunca como identificador)
  nombre_visible    text,
  usuario_github    text,
  avatar_url        text,

  -- Autorización
  rol               text        not null default 'alumno' check (rol in ('alumno', 'admin')),
  activo            boolean     not null default false,

  -- Auditoría de aprobación (listo para el panel de administración futuro)
  aprobado_por      uuid        references auth.users(id),
  aprobado_en       timestamptz,
  notas_admin       text,

  -- Válvula de escape para necesidades futuras que no ameriten una
  -- migración de esquema (ej. preferencias de administración, flags
  -- experimentales por usuario, etc.) — se puede leer/escribir sin
  -- nunca tener que hacer ALTER TABLE.
  metadata          jsonb       not null default '{}'::jsonb,

  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

create index if not exists idx_usuarios_rol_activo on usuarios(rol, activo);

-- Mantiene actualizado_en al día en cualquier UPDATE (igual que en progreso_items)
create or replace function usuarios_set_actualizado_en()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_usuarios_actualizado_en on usuarios;
create trigger trg_usuarios_actualizado_en
before update on usuarios
for each row execute function usuarios_set_actualizado_en();

-- -------------------------------------------------------------
-- Función auxiliar: ¿el usuario dado es administrador activo?
-- SECURITY DEFINER + marcada STABLE para poder usarla dentro de
-- políticas RLS sin recursión ni problemas de permisos.
-- -------------------------------------------------------------
create or replace function es_admin(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from usuarios
    where user_id = p_user_id and rol = 'admin' and activo = true
  );
$$;

-- -------------------------------------------------------------
-- Row Level Security: nadie escribe directamente esta tabla desde
-- el cliente (ni siquiera su propia fila) — toda escritura pasa por
-- las funciones SECURITY DEFINER de abajo, que son las únicas que
-- pueden decidir `rol`/`activo`. Esto evita que cualquier usuario
-- se autoapruebe o se autoasigne el rol de administrador.
-- -------------------------------------------------------------
alter table usuarios enable row level security;

drop policy if exists "usuarios_leen_su_fila_o_admin_lee_todas" on usuarios;
create policy "usuarios_leen_su_fila_o_admin_lee_todas" on usuarios
  for select using (auth.uid() = user_id or es_admin(auth.uid()));

-- Deliberadamente NO hay políticas de insert/update/delete: la tabla
-- sólo se modifica a través de las funciones SECURITY DEFINER, que
-- corren con sus propios permisos y validan todo internamente.

-- -------------------------------------------------------------
-- registrar_o_actualizar_usuario_actual()
--
-- Se llama justo después de iniciar sesión con GitHub. Si el
-- usuario (auth.uid()) no existe todavía en `usuarios`, lo crea con
-- rol='alumno' y activo=false — SALVO que sea el primer usuario que
-- se registra jamás en esta instalación, en cuyo caso queda
-- rol='admin' y activo=true automáticamente (ver nota de bootstrap
-- del primer administrador, más abajo). Si ya existe, sólo refresca
-- nombre/avatar (nunca activo/rol).
-- -------------------------------------------------------------
create or replace function registrar_o_actualizar_usuario_actual(
  p_nombre_visible text,
  p_usuario_github text,
  p_avatar_url text
)
returns usuarios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_es_primero boolean;
  v_fila usuarios;
begin
  if v_uid is null then
    raise exception 'No hay sesión activa.';
  end if;

  -- Bloqueo transaccional: evita una carrera si, por coincidencia,
  -- dos personas inician sesión por primera vez al mismo tiempo en
  -- una instalación recién creada (sólo importa en ese instante único
  -- de la vida de cada instalación).
  perform pg_advisory_xact_lock(hashtext('usuarios_bootstrap_primer_admin'));

  select not exists (select 1 from usuarios) into v_es_primero;

  insert into usuarios (user_id, nombre_visible, usuario_github, avatar_url, rol, activo)
  values (
    v_uid,
    p_nombre_visible,
    p_usuario_github,
    p_avatar_url,
    case when v_es_primero then 'admin' else 'alumno' end,
    v_es_primero
  )
  on conflict (user_id) do update
    set nombre_visible = excluded.nombre_visible,
        usuario_github = excluded.usuario_github,
        avatar_url     = excluded.avatar_url
  returning * into v_fila;

  return v_fila;
end;
$$;

grant execute on function registrar_o_actualizar_usuario_actual(text, text, text) to authenticated;
grant execute on function es_admin(uuid) to authenticated;

-- -------------------------------------------------------------
-- admin_actualizar_usuario()
--
-- No se usa todavía (el panel de administración se implementará
-- más adelante), pero se deja lista desde ahora: sólo un admin activo
-- puede aprobar/rechazar cuentas o cambiar roles, y la validación
-- ocurre en el servidor, no en el cliente.
-- -------------------------------------------------------------
create or replace function admin_actualizar_usuario(
  p_user_id uuid,
  p_activo boolean,
  p_rol text,
  p_notas_admin text default null
)
returns usuarios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila usuarios;
begin
  if not es_admin(auth.uid()) then
    raise exception 'No autorizado: se requiere rol de administrador.';
  end if;
  if p_rol not in ('alumno', 'admin') then
    raise exception 'Rol inválido: %', p_rol;
  end if;

  update usuarios
    set activo = p_activo,
        rol = p_rol,
        notas_admin = coalesce(p_notas_admin, notas_admin),
        aprobado_por = auth.uid(),
        aprobado_en = now()
    where user_id = p_user_id
    returning * into v_fila;

  if v_fila is null then
    raise exception 'Usuario no encontrado: %', p_user_id;
  end if;

  return v_fila;
end;
$$;

grant execute on function admin_actualizar_usuario(uuid, boolean, text, text) to authenticated;
