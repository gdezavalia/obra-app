import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { construirTablaMaestra } from "@/lib/reporte";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const CATEGORIAS: Record<string, string> = {
  mano_de_obra: "Mano de obra",
  materiales: "Materiales",
  honorarios: "Honorarios",
};

const TIPOS: Record<string, string> = {
  trabajo: "Trabajo",
  materiales: "Materiales",
  mixto: "Mixto",
};

function money(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default async function DetalleItemPage({
  params,
}: {
  params: Promise<{ obraId: string; paqueteId: string }>;
}) {
  const { obraId, paqueteId } = await params;
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre, moneda_base")
    .eq("id", obraId)
    .single();

  if (!obra) notFound();

  const [{ data: paquetes }, { data: revisionesRaw }, { data: gastosObra }, { data: gastosItem }] =
    await Promise.all([
      supabase
        .from("paquetes")
        .select("id, parent_id, codigo, nombre, tipo, presupuesto_base, moneda")
        .eq("obra_id", obraId),
      supabase
        .from("revisiones_presupuesto")
        .select(
          "id, paquete_id, monto_anterior, monto_nuevo, estado, paquetes!inner(obra_id)",
        )
        .eq("paquetes.obra_id", obraId),
      supabase.from("gastos").select("paquete_id, monto").eq("obra_id", obraId),
      supabase
        .from("gastos")
        .select(
          "id, fecha, categoria, descripcion, proveedor, monto, moneda, proveedores(nombre)",
        )
        .eq("obra_id", obraId)
        .eq("paquete_id", paqueteId)
        .order("fecha", { ascending: false })
        .limit(10),
    ]);

  const paquete = paquetes?.find((p) => p.id === paqueteId);
  if (!paquete) notFound();

  const revisiones = (revisionesRaw ?? []).map((r) => ({
    id: r.id,
    paquete_id: r.paquete_id,
    monto_anterior: r.monto_anterior,
    monto_nuevo: r.monto_nuevo,
    estado: r.estado,
  }));

  const gastoPorPaquete = new Map<string, number>();
  for (const g of gastosObra ?? []) {
    if (!g.paquete_id) continue;
    gastoPorPaquete.set(g.paquete_id, (gastoPorPaquete.get(g.paquete_id) ?? 0) + g.monto);
  }

  const tablaMaestra = construirTablaMaestra(paquetes ?? [], gastoPorPaquete, revisiones);
  const fila = tablaMaestra.find((f) => f.id === paqueteId);

  const { count: totalGastosItem } = await supabase
    .from("gastos")
    .select("id", { count: "exact", head: true })
    .eq("obra_id", obraId)
    .eq("paquete_id", paqueteId);

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-8">
      <p className="mb-1 text-sm text-muted">
        <Link href={`/obras/${obraId}/paquetes`} className="hover:underline">
          ← Paquetes
        </Link>
      </p>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {paquete.codigo} · {paquete.nombre}
          </h1>
          <p className="text-sm text-muted">
            {TIPOS[paquete.tipo] ?? paquete.tipo}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/obras/${obraId}/paquetes/${paqueteId}/revisiones`}
            className={buttonVariants("secondary", "sm")}
          >
            Adicionales
          </Link>
          <Link
            href={`/obras/${obraId}/paquetes/${paqueteId}/editar`}
            className={buttonVariants("secondary", "sm")}
          >
            Editar
          </Link>
        </div>
      </div>

      {fila && (
        <>
          <div className="mb-3 grid grid-cols-4 gap-3">
            <Card>
              <p className="text-xs text-muted">Vigente</p>
              <p className="text-lg font-semibold text-foreground">
                ${money(fila.vigente)}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-muted">Ejecutado</p>
              <p className="text-lg font-semibold text-foreground">
                ${money(fila.ejecutado)}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-muted">Desvío</p>
              <p
                className={
                  fila.desvio > 0
                    ? "text-lg font-semibold text-danger"
                    : "text-lg font-semibold text-foreground"
                }
              >
                ${money(fila.desvio)}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-muted">Avance</p>
              {fila.pct != null ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                    <div
                      className={fila.pct > 100 ? "h-full bg-danger" : "h-full bg-accent"}
                      style={{ width: `${Math.min(100, fila.pct)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {fila.pct.toFixed(0)}%
                  </span>
                </div>
              ) : (
                <p className="text-lg text-muted">—</p>
              )}
            </Card>
          </div>
          {fila.nivel === 0 && (
            <p className="mb-8 text-xs text-muted">
              Incluye sub-ítems, si tiene.
            </p>
          )}
        </>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Gastos de este ítem
        </h2>
        <Link
          href={`/obras/${obraId}/gastos?paquete=${paqueteId}`}
          className="text-sm text-accent hover:underline"
        >
          Ver todos {totalGastosItem ? `(${totalGastosItem})` : ""}
        </Link>
      </div>

      {!gastosItem || gastosItem.length === 0 ? (
        <p className="text-sm text-muted">
          Todavía no hay gastos imputados directamente a este ítem.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-6 font-medium">Fecha</th>
              <th className="py-2 pr-6 font-medium">Categoría</th>
              <th className="py-2 pr-6 font-medium">Descripción</th>
              <th className="py-2 pr-6 font-medium">Proveedor</th>
              <th className="py-2 font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {gastosItem.map((g) => {
              const proveedorVinculado = Array.isArray(g.proveedores)
                ? g.proveedores[0]
                : g.proveedores;
              const proveedor = proveedorVinculado?.nombre ?? g.proveedor;
              return (
                <tr key={g.id} className="border-b border-border/60">
                  <td className="py-2 pr-6 whitespace-nowrap">{g.fecha}</td>
                  <td className="py-2 pr-6 text-muted">
                    {CATEGORIAS[g.categoria] ?? g.categoria}
                  </td>
                  <td className="py-2 pr-6">{g.descripcion ?? "—"}</td>
                  <td className="py-2 pr-6 text-muted">{proveedor ?? "—"}</td>
                  <td className="py-2 whitespace-nowrap">
                    ${money(g.monto)} {g.moneda}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
