-- Paquete: árbol de profundidad arbitraria vía parent_id (dominio.md 5.2).
-- La restricción "esta obra usa N niveles" se valida en la app contra
-- obras.profundidad_edt, no en el esquema.
create table public.paquetes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  parent_id uuid references public.paquetes (id) on delete cascade,

  codigo text not null,
  nombre text not null,
  orden integer,

  tipo text not null check (tipo in ('trabajo', 'materiales', 'mixto')),
  etiquetas text[] not null default '{}',

  -- Presupuesto opcional: los materiales pueden no tener (dominio.md 3,
  -- caso Corina) o sí (caso estudio, paquetes de materiales presupuestados).
  presupuesto_base numeric,
  fecha_base date,
  moneda text,

  -- Pliego, planos, especificaciones: URLs simples por ahora (RF-01 no
  -- especifica metadata por documento; se puede migrar a tabla propia si
  -- hace falta más adelante).
  documentos text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (obra_id, codigo)
);

create index paquetes_obra_id_idx on public.paquetes (obra_id);
create index paquetes_parent_id_idx on public.paquetes (parent_id);

alter table public.paquetes enable row level security;

create policy "arquitecta ve paquetes de sus obras"
  on public.paquetes for select
  using (
    exists (
      select 1 from public.obras
      where obras.id = paquetes.obra_id
        and obras.arquitecta_id = auth.uid()
    )
  );

create policy "arquitecta crea paquetes en sus obras"
  on public.paquetes for insert
  with check (
    exists (
      select 1 from public.obras
      where obras.id = paquetes.obra_id
        and obras.arquitecta_id = auth.uid()
    )
  );

create policy "arquitecta actualiza paquetes de sus obras"
  on public.paquetes for update
  using (
    exists (
      select 1 from public.obras
      where obras.id = paquetes.obra_id
        and obras.arquitecta_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.obras
      where obras.id = paquetes.obra_id
        and obras.arquitecta_id = auth.uid()
    )
  );

create policy "arquitecta borra paquetes de sus obras"
  on public.paquetes for delete
  using (
    exists (
      select 1 from public.obras
      where obras.id = paquetes.obra_id
        and obras.arquitecta_id = auth.uid()
    )
  );
