import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { correrValidaciones, type Hallazgo } from "@/lib/validaciones";
import { EmptyState } from "@/components/ui/empty-state";

const NOMBRES_REGLA: Record<number, string> = {
  1: "Monto fuera de magnitud",
  2: "Honorarios vs. gastos posteriores",
  3: "Honorarios con paquete asignado",
  4: "Presupuesto superado",
  5: "Adicional pendiente +7 días",
  6: "Mano de obra sin proveedor",
  7: "Gasto sin respaldo",
  10: "Gastos superan el adicional",
};

export default async function ValidacionesPage({
  params,
}: {
  params: Promise<{ obraId: string }>;
}) {
  const { obraId } = await params;
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre, pct_honorarios")
    .eq("id", obraId)
    .single();

  if (!obra) notFound();

  const [{ data: gastos }, { data: paquetes }, { data: revisiones }] =
    await Promise.all([
      supabase
        .from("gastos")
        .select(
          "id, fecha, categoria, monto, proveedor, paquete_id, revision_id, link_factura, link_comprobante_pago",
        )
        .eq("obra_id", obraId),
      supabase
        .from("paquetes")
        .select("id, codigo, nombre, presupuesto_base")
        .eq("obra_id", obraId),
      supabase
        .from("revisiones_presupuesto")
        .select(
          "id, paquete_id, fecha, monto_anterior, monto_nuevo, estado, paquetes!inner(obra_id)",
        )
        .eq("paquetes.obra_id", obraId),
    ]);

  const revisionesLimpias = (revisiones ?? []).map((r) => ({
    id: r.id,
    paquete_id: r.paquete_id,
    fecha: r.fecha,
    monto_anterior: r.monto_anterior,
    monto_nuevo: r.monto_nuevo,
    estado: r.estado,
  }));

  const hallazgos = correrValidaciones(
    gastos ?? [],
    paquetes ?? [],
    revisionesLimpias,
    obra.pct_honorarios,
  );

  const porRegla = new Map<number, Hallazgo[]>();
  for (const h of hallazgos) {
    const lista = porRegla.get(h.regla) ?? [];
    lista.push(h);
    porRegla.set(h.regla, lista);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <p className="mb-1 text-sm text-muted">
        <Link href={`/obras/${obraId}`} className="hover:underline">
          {obra.nombre}
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Puntos de atención
      </h1>

      {hallazgos.length === 0 && (
        <EmptyState
          titulo="No hay nada para revisar"
          descripcion="Las validaciones corren sobre los gastos, paquetes y adicionales cargados hasta ahora."
        />
      )}

      {[...porRegla.entries()].map(([regla, lista]) => (
        <div key={regla} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            {NOMBRES_REGLA[regla] ?? `Regla ${regla}`}{" "}
            <span className="font-normal text-warning">({lista.length})</span>
          </h2>
          <ul className="space-y-1">
            {lista.map((h, i) => (
              <li
                key={i}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              >
                {h.mensaje}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
