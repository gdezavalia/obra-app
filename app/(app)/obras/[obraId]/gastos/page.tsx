import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { borrarGasto } from "./actions";

const CATEGORIAS: Record<string, string> = {
  mano_de_obra: "Mano de obra",
  materiales: "Materiales",
  honorarios: "Honorarios",
};

export default async function GastosPage({
  params,
}: {
  params: Promise<{ obraId: string }>;
}) {
  const { obraId } = await params;
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("id", obraId)
    .single();

  if (!obra) notFound();

  const { data: gastos, error } = await supabase
    .from("gastos")
    .select(
      "id, fecha, categoria, descripcion, proveedor, monto, moneda, paquete_id, paquetes(codigo, nombre)",
    )
    .eq("obra_id", obraId)
    .order("fecha", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-muted">
            <Link href={`/obras/${obraId}`} className="hover:underline">
              {obra.nombre}
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Gastos</h1>
        </div>
        <Link
          href={`/obras/${obraId}/gastos/nuevo`}
          className={buttonVariants("primary", "sm", "shrink-0")}
        >
          + Nuevo gasto
        </Link>
      </div>

      {error && (
        <p className="text-sm text-muted">
          Error al leer los gastos ({error.message}).
        </p>
      )}

      {!error && gastos?.length === 0 && (
        <EmptyState
          titulo="Todavía no hay gastos cargados"
          descripcion="Cargá el primero para empezar a ver el estado económico de la obra."
        >
          <Link
            href={`/obras/${obraId}/gastos/nuevo`}
            className={buttonVariants("primary", "sm")}
          >
            + Nuevo gasto
          </Link>
        </EmptyState>
      )}

      {!error && gastos && gastos.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-4 pl-2 font-medium">Fecha</th>
              <th className="py-2 pr-4 font-medium">Paquete</th>
              <th className="py-2 pr-4 font-medium">Categoría</th>
              <th className="py-2 pr-4 font-medium">Proveedor</th>
              <th className="py-2 pr-4 font-medium">Monto</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {gastos.map((g) => {
              const paquete = Array.isArray(g.paquetes)
                ? g.paquetes[0]
                : g.paquetes;
              return (
                <tr
                  key={g.id}
                  className="border-b border-border/60 odd:bg-black/[.015] dark:odd:bg-white/[.02]"
                >
                  <td className="py-2 pr-4 pl-2 whitespace-nowrap">
                    {g.fecha}
                  </td>
                  <td className="py-2 pr-4">
                    {paquete ? `${paquete.codigo} · ${paquete.nombre}` : "—"}
                  </td>
                  <td className="py-2 pr-4 text-muted">
                    {CATEGORIAS[g.categoria] ?? g.categoria}
                  </td>
                  <td className="py-2 pr-4 text-muted">
                    {g.proveedor ?? "—"}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {g.monto.toLocaleString("es-AR")} {g.moneda}
                  </td>
                  <td className="py-2 pr-2 text-right whitespace-nowrap">
                    <Link
                      href={`/obras/${obraId}/gastos/${g.id}/editar`}
                      className="mr-3 text-muted hover:text-foreground hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={borrarGasto} className="inline">
                      <input type="hidden" name="id" value={g.id} />
                      <input type="hidden" name="obra_id" value={obraId} />
                      <ConfirmSubmitButton
                        confirmMessage="¿Borrar este gasto?"
                        className="text-danger hover:underline"
                      >
                        Borrar
                      </ConfirmSubmitButton>
                    </form>
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
