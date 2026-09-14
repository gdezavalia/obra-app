import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { correrValidaciones } from "@/lib/validaciones";
import { construirTablaMaestra } from "@/lib/reporte";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const CATEGORIA_LABEL: Record<string, string> = {
  mano_de_obra: "Mano de obra",
  materiales: "Materiales",
  honorarios: "Honorarios",
};

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
        .select("id, parent_id, codigo, nombre, tipo, presupuesto_base")
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

  const porCategoria = new Map<string, number>();
  for (const g of gastos ?? []) {
    porCategoria.set(g.categoria, (porCategoria.get(g.categoria) ?? 0) + g.monto);
  }

  const gastoPorPaquete = new Map<string, number>();
  for (const g of gastos ?? []) {
    if (!g.paquete_id) continue;
    gastoPorPaquete.set(g.paquete_id, (gastoPorPaquete.get(g.paquete_id) ?? 0) + g.monto);
  }

  const tablaMaestra = construirTablaMaestra(paquetes ?? [], gastoPorPaquete, revisiones);
  const raices = tablaMaestra.filter((f) => f.nivel === 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-8 py-8">
      <h1 className="text-2xl font-semibold text-foreground">{obra.nombre}</h1>
      <p className="mb-8 text-sm text-muted">
        {obra.cliente} {obra.direccion && `· ${obra.direccion}`}
      </p>

      {/* KPIs generales */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-muted">Invertido a la fecha</p>
          <p className="text-lg font-semibold text-foreground">
            ${money(totalGastado)} {obra.moneda_base}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Ítems</p>
          <p className="text-lg font-semibold text-foreground">
            {cantPaquetes ?? 0}
          </p>
        </Card>
        <Link href={`/obras/${obraId}/validaciones`}>
          <Card className="transition-colors hover:border-accent">
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
        </Link>
      </div>

      {/* Desglose por categoría */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Por categoría
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {(["mano_de_obra", "materiales", "honorarios"] as const).map((cat) => (
            <Card key={cat}>
              <p className="text-xs text-muted">{CATEGORIA_LABEL[cat]}</p>
              <p className="text-lg font-semibold text-foreground">
                ${money(porCategoria.get(cat) ?? 0)}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Avance por ítem */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Avance por ítem
          </h2>
          <Link
            href={`/obras/${obraId}/paquetes`}
            className="text-sm text-accent hover:underline"
          >
            Ver todos los ítems
          </Link>
        </div>

        {raices.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay ítems cargados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-6 pl-3 font-medium">Ítem</th>
                <th className="py-2 pr-6 font-medium">Vigente</th>
                <th className="py-2 pr-6 font-medium">Ejecutado</th>
                <th className="py-2 font-medium">Avance</th>
              </tr>
            </thead>
            <tbody>
              {raices.map((f) => (
                <tr key={f.id} className="border-b border-border/60">
                  <td className="py-2 pr-6 pl-3">
                    <Link
                      href={`/obras/${obraId}/paquetes/${f.id}`}
                      className="hover:text-accent hover:underline"
                    >
                      {f.codigo} · {f.nombre}
                    </Link>
                  </td>
                  <td className="py-2 pr-6 whitespace-nowrap text-muted">
                    ${money(f.vigente)}
                  </td>
                  <td className="py-2 pr-6 whitespace-nowrap text-muted">
                    ${money(f.ejecutado)}
                  </td>
                  <td className="py-2">
                    {f.pct != null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-border">
                          <div
                            className={f.pct > 100 ? "h-full bg-danger" : "h-full bg-accent"}
                            style={{ width: `${Math.min(100, f.pct)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted">
                          {f.pct.toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Accesos rápidos */}
      <div className="flex flex-wrap gap-2">
        <Link href={`/obras/${obraId}/reportes`} className={buttonVariants("primary", "sm")}>
          Generar reporte semanal
        </Link>
        <Link href={`/obras/${obraId}/gastos`} className={buttonVariants("secondary", "sm")}>
          Ver gastos
        </Link>
        <Link href={`/obras/${obraId}/validaciones`} className={buttonVariants("secondary", "sm")}>
          Puntos de atención
        </Link>
      </div>
    </div>
  );
}
