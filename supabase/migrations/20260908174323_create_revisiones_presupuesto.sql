-- Revisión de presupuesto: unifica adicionales y redeterminaciones
-- (dominio.md sección 3). En Fase 1 solo se construye el flujo de
-- motivo='adicional'; 'redeterminacion' queda modelada pero sin motor de
-- propuesta por índice (pregunta abierta bloqueante en el PRD).
create table public.revisiones_presupuesto (
  id uuid primary key default gen_random_uuid(),
  paquete_id uuid not null references public.paquetes (id) on delete cascade,

  fecha date not null,
  motivo text not null check (motivo in ('adicional', 'redeterminacion', 'ajuste')),

  monto_anterior numeric,
  monto_nuevo numeric,
  indice_aplicado text,

  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobado', 'rechazado', 'ejecutado')),
  fecha_aprobacion date,

  notas text,
  documento text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index revisiones_presupuesto_paquete_id_idx
  on public.revisiones_presupuesto (paquete_id);

alter table public.revisiones_presupuesto enable row level security;

create policy "arquitecta ve revisiones de sus obras"
  on public.revisiones_presupuesto for select
  using (
    exists (
      select 1 from public.paquetes
      join public.obras on obras.id = paquetes.obra_id
      where paquetes.id = revisiones_presupuesto.paquete_id
        and obras.arquitecta_id = auth.uid()
    )
  );

create policy "arquitecta crea revisiones en sus obras"
  on public.revisiones_presupuesto for insert
  with check (
    exists (
      select 1 from public.paquetes
      join public.obras on obras.id = paquetes.obra_id
      where paquetes.id = revisiones_presupuesto.paquete_id
        and obras.arquitecta_id = auth.uid()
    )
  );

create policy "arquitecta actualiza revisiones de sus obras"
  on public.revisiones_presupuesto for update
  using (
    exists (
      select 1 from public.paquetes
      join public.obras on obras.id = paquetes.obra_id
      where paquetes.id = revisiones_presupuesto.paquete_id
        and obras.arquitecta_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.paquetes
      join public.obras on obras.id = paquetes.obra_id
      where paquetes.id = revisiones_presupuesto.paquete_id
        and obras.arquitecta_id = auth.uid()
    )
  );

create policy "arquitecta borra revisiones de sus obras"
  on public.revisiones_presupuesto for delete
  using (
    exists (
      select 1 from public.paquetes
      join public.obras on obras.id = paquetes.obra_id
      where paquetes.id = revisiones_presupuesto.paquete_id
        and obras.arquitecta_id = auth.uid()
    )
  );
