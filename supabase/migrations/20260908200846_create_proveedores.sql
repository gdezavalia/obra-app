-- Proveedores: entidad a nivel aplicación (no por obra), para poder
-- reutilizar el mismo proveedor entre distintas obras de una arquitecta
-- y dejar de depender de texto libre en cada gasto.
create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  arquitecta_id uuid not null references auth.users (id) default auth.uid(),
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (arquitecta_id, nombre)
);

alter table public.proveedores enable row level security;

create policy "arquitecta ve sus proveedores"
  on public.proveedores for select
  using (arquitecta_id = auth.uid());

create policy "arquitecta crea sus proveedores"
  on public.proveedores for insert
  with check (arquitecta_id = auth.uid());

create policy "arquitecta actualiza sus proveedores"
  on public.proveedores for update
  using (arquitecta_id = auth.uid())
  with check (arquitecta_id = auth.uid());

create policy "arquitecta borra sus proveedores"
  on public.proveedores for delete
  using (arquitecta_id = auth.uid());

-- Vínculo estructurado del gasto al proveedor. La columna de texto libre
-- "proveedor" se mantiene para no perder el histórico ya cargado (San
-- Lorenzo tiene 121 gastos con nombres sin normalizar) — no se fusiona
-- automáticamente contra proveedores nuevos.
alter table public.gastos
  add column proveedor_id uuid references public.proveedores (id) on delete set null;

create index gastos_proveedor_id_idx on public.gastos (proveedor_id);
