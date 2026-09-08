import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { correrValidaciones } from "@/lib/validaciones";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

function money(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default async function ObraPage({
  params,
}: {
  params: Promise<{ obraId: string }>;
}) {
  const { obraId } = await params;
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre, cliente, direccion, moneda_base, pct_honorarios")
    .eq("id", obraId)
    .single();

  if (!obra) notFound();

  const [{ data: paquetes }, { count: cantPaquetes }, { data: gastos }, { data: revisionesRaw }] =
    await Promise.all([
      supabase
        .from("paquetes")
        .select("id, codigo, nombre, presupuesto_base")
        .eq("obra_id", obraId),
      supabase
        .from("paquetes")
        .select("id", { count: "exact", head: true })
        .eq("obra_id", obraId),
      supabase
        .from("gastos")
        .select(
          "id, fecha, categoria, monto, proveedor, paquete_id, revision_id, link_factura, link_comprobante_pago",
        )
        .eq("obra_id", obraId),
      supabase
        .from("revisiones_presupuesto")
        .select(
          "id, paquete_id, fecha, monto_anterior, monto_nuevo, estado, paquetes!inner(obra_id)",
        )
        .eq("paquetes.obra_id", obraId),
    ]);

  const revisiones = (revisionesRaw ?? []).map((r) => ({
    id: r.id,
    paquete_id: r.paquete_id,
    fecha: r.fecha,
    monto_anterior: r.monto_anterior,
    monto_nuevo: r.monto_nuevo,
    estado: r.estado,
  }));

  const totalGastado = (gastos ?? []).reduce((acc, g) => acc + g.monto, 0);
  const puntosDeAtencion = correrValidaciones(
    gastos ?? [],
    paquetes ?? [],
    revisiones,
    obra.pct_honorarios,
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-foreground">{obra.nombre}</h1>
      <p className="mb-6 text-sm text-muted">
        {obra.cliente} {obra.direccion && `· ${obra.direccion}`}
      </p>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-muted">Invertido a la fecha</p>
          <p className="text-lg font-semibold text-foreground">
            ${money(totalGastado)} {obra.moneda_base}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Paquetes</p>
          <p className="text-lg font-semibold text-foreground">
            {cantPaquetes ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Puntos de atención</p>
          <p
            className={
              puntosDeAtencion.length > 0
                ? "text-lg font-semibold text-warning"
                : "text-lg font-semibold text-foreground"
            }
          >
            {puntosDeAtencion.length}
          </p>
        </Card>
      </div>

      <Link href={`/obras/${obraId}/reportes`} className={buttonVariants()}>
        Generar reporte semanal
      </Link>
    </div>
  );
}
