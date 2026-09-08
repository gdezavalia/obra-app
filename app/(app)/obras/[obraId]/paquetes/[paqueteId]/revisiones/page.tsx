import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { BadgeEstado } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { aprobarAdicional, rechazarAdicional, ejecutarAdicional } from "./actions";

function diasDesde(fecha: string) {
  const ms = Date.now() - new Date(fecha).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default async function RevisionesPage({
  params,
}: {
  params: Promise<{ obraId: string; paqueteId: string }>;
}) {
  const { obraId, paqueteId } = await params;
  const supabase = await createClient();

  const { data: paquete } = await supabase
    .from("paquetes")
    .select("id, codigo, nombre, presupuesto_base, moneda")
    .eq("id", paqueteId)
    .single();

  if (!paquete) notFound();

  const { data: revisiones, error } = await supabase
    .from("revisiones_presupuesto")
    .select(
      "id, fecha, motivo, monto_anterior, monto_nuevo, estado, fecha_aprobacion, notas, documento",
    )
    .eq("paquete_id", paqueteId)
    .order("fecha", { ascending: false });

  const vigente =
    (paquete.presupuesto_base ?? 0) +
    (revisiones
      ?.filter((r) => r.estado === "aprobado" || r.estado === "ejecutado")
      .reduce(
        (acc, r) => acc + ((r.monto_nuevo ?? 0) - (r.monto_anterior ?? 0)),
        0,
      ) ?? 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-muted">
            <Link
              href={`/obras/${obraId}/paquetes`}
              className="hover:underline"
            >
              ← {paquete.codigo} · {paquete.nombre}
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Adicionales
          </h1>
        </div>
        <Link
          href={`/obras/${obraId}/paquetes/${paqueteId}/revisiones/nuevo`}
          className={buttonVariants("primary", "sm", "shrink-0")}
        >
          + Nuevo adicional
        </Link>
      </div>

      <Card className="mb-6 flex gap-6">
        <div>
          <p className="text-xs text-muted">Presupuesto base</p>
          <p className="font-semibold text-foreground">
            {paquete.presupuesto_base?.toLocaleString("es-AR") ?? "—"}{" "}
            {paquete.moneda}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Vigente</p>
          <p className="font-semibold text-foreground">
            {vigente.toLocaleString("es-AR")} {paquete.moneda}
          </p>
        </div>
      </Card>

      {error && (
        <p className="text-sm text-muted">
          Error al leer las revisiones ({error.message}).
        </p>
      )}

      {!error && revisiones?.length === 0 && (
        <EmptyState
          titulo="Todavía no hay adicionales cargados"
          descripcion="Un adicional queda pendiente hasta que lo apruebes o lo rechaces."
        >
          <Link
            href={`/obras/${obraId}/paquetes/${paqueteId}/revisiones/nuevo`}
            className={buttonVariants("primary", "sm")}
          >
            + Nuevo adicional
          </Link>
        </EmptyState>
      )}

      {!error && revisiones && revisiones.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-3 pr-8 pl-3 font-medium">Fecha</th>
              <th className="py-3 pr-8 font-medium">
                Monto anterior → nuevo
              </th>
              <th className="py-3 pr-8 font-medium">Estado</th>
              <th className="py-3 pr-8 font-medium">Notas</th>
              <th className="py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {revisiones.map((r) => (
              <tr key={r.id} className="border-b border-border/60">
                <td className="py-3 pr-8 pl-3 whitespace-nowrap">
                  {r.fecha}
                </td>
                <td className="py-3 pr-8 text-muted whitespace-nowrap">
                  {r.monto_anterior?.toLocaleString("es-AR") ?? "—"} →{" "}
                  {r.monto_nuevo?.toLocaleString("es-AR") ?? "—"}
                </td>
                <td className="py-3 pr-8">
                  <div className="flex items-center gap-2">
                    <BadgeEstado estado={r.estado} />
                    {r.estado === "pendiente" && diasDesde(r.fecha) > 7 && (
                      <span className="text-xs text-danger">
                        {diasDesde(r.fecha)} días
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-8 text-muted">{r.notas ?? "—"}</td>
                <td className="py-3 pr-3 text-right whitespace-nowrap">
                  {r.estado === "pendiente" && (
                    <>
                      <Link
                        href={`/obras/${obraId}/paquetes/${paqueteId}/revisiones/${r.id}/editar`}
                        className="mr-3 text-muted hover:text-foreground hover:underline"
                      >
                        Editar
                      </Link>
                      <form action={aprobarAdicional} className="inline">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="obra_id" value={obraId} />
                        <input
                          type="hidden"
                          name="paquete_id"
                          value={paqueteId}
                        />
                        <button
                          type="submit"
                          className="mr-3 text-success hover:underline"
                        >
                          Aprobar
                        </button>
                      </form>
                      <form action={rechazarAdicional} className="inline">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="obra_id" value={obraId} />
                        <input
                          type="hidden"
                          name="paquete_id"
                          value={paqueteId}
                        />
                        <button
                          type="submit"
                          className="text-danger hover:underline"
                        >
                          Rechazar
                        </button>
                      </form>
                    </>
                  )}
                  {r.estado === "aprobado" && (
                    <form action={ejecutarAdicional} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="obra_id" value={obraId} />
                      <input
                        type="hidden"
                        name="paquete_id"
                        value={paqueteId}
                      />
                      <button
                        type="submit"
                        className="text-accent hover:underline"
                      >
                        Marcar ejecutado
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
