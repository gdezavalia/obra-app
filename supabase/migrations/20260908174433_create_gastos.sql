-- Gasto: un gasto se imputa a un paquete hoja y solo a uno, sin
-- prorrateo (regla 6.7 del PRD). paquete_id nullable para soportar más
-- adelante la bandeja de sin imputar (RF-09, P1) sin migrar el esquema.
create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  paquete_id uuid references public.paquetes (id) on delete set null,

  fecha date not null,
  categoria text not null check (categoria in ('mano_de_obra', 'materiales', 'honorarios')),

  descripcion text,
  proveedor text,
  pagado_por text check (pagado_por in ('cliente', 'arquitecta')),
  forma_pago text,

  monto numeric not null,
  moneda text not null default 'ARS',
  -- Cotización del día congelada al cargar el gasto (regla 6.6): el
  -- histórico en USD nunca se recalcula.
  cotizacion_usd_dia numeric,

  link_factura text,
  link_comprobante_pago text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gastos_obra_id_idx on public.gastos (obra_id);
create index gastos_paquete_id_idx on public.gastos (paquete_id);

alter table public.gastos enable row level security;

create policy "arquitecta ve gastos de sus obras"
  on public.gastos for select
  using (
    exists (
      select 1 from public.obras
      where obras.id = gastos.obra_id
        and obras.arquitecta_id = auth.uid()
    )
  );

create policy "arquitecta crea gastos en sus obras"
  on public.gastos for insert
  with check (
    exists (
      select 1 from public.obras
      where obras.id = gastos.obra_id
        and obras.arquitecta_id = auth.uid()
    )
  );

create policy "arquitecta actualiza gastos de sus obras"
  on public.gastos for update
  using (
    exists (
      select 1 from public.obras
      where obras.id = gastos.obra_id
        and obras.arquitecta_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.obras
      where obras.id = gastos.obra_id
        and obras.arquitecta_id = auth.uid()
    )
  );

create policy "arquitecta borra gastos de sus obras"
  on public.gastos for delete
  using (
    exists (
      select 1 from public.obras
      where obras.id = gastos.obra_id
        and obras.arquitecta_id = auth.uid()
    )
  );
