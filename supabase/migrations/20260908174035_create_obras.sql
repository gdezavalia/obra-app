-- Obra: entidad raíz del dominio. Una arquitecta ve solo las suyas (RF-07).
create table public.obras (
  id uuid primary key default gen_random_uuid(),
  arquitecta_id uuid not null references auth.users (id) default auth.uid(),

  nombre text not null,
  cliente text,
  direccion text,
  fecha_inicio date,
  fecha_fin_estimada date,

  pct_honorarios numeric(5, 2),
  moneda_base text not null default 'ARS',
  cotizacion_inicial_usd numeric,

  -- Validación "esta obra usa N niveles de EDT" (dominio.md 5.2): se aplica
  -- en la app al crear/importar paquetes, no como constraint de esquema.
  profundidad_edt integer,

  -- Índice de reajuste (CAC, ICC-INDEC, ...): texto libre por ahora.
  -- La redeterminación automática por índice queda fuera de Fase 1
  -- (pregunta abierta bloqueante en el PRD sobre qué índice y de dónde sale).
  indice_reajuste text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.obras enable row level security;

create policy "arquitecta ve sus obras"
  on public.obras for select
  using (arquitecta_id = auth.uid());

create policy "arquitecta crea sus obras"
  on public.obras for insert
  with check (arquitecta_id = auth.uid());

create policy "arquitecta actualiza sus obras"
  on public.obras for update
  using (arquitecta_id = auth.uid())
  with check (arquitecta_id = auth.uid());

create policy "arquitecta borra sus obras"
  on public.obras for delete
  using (arquitecta_id = auth.uid());
