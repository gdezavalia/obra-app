-- Vincula opcionalmente un gasto a la revisión de presupuesto (adicional)
-- que lo autoriza. Necesario para la validación RF-05 #10: "gastos
-- imputados a una revisión que superan su monto aprobado".
alter table public.gastos
  add column revision_id uuid references public.revisiones_presupuesto (id) on delete set null;

create index gastos_revision_id_idx on public.gastos (revision_id);
