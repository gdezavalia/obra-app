import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { borrarPaquete } from "./actions";

const TIPOS = [
  { value: "trabajo", label: "Trabajo" },
  { value: "materiales", label: "Materiales" },
  { value: "mixto", label: "Mixto" },
];

export default async function PaquetesPage({
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

  const { data: paquetes, error } = await supabase
    .from("paquetes")
    .select("id, codigo, nombre, tipo, presupuesto_base, moneda")
    .eq("obra_id", obraId)
    .order("codigo");

  return (
    <div className="mx-auto w-full max-w-5xl px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-muted">
            <Link href={`/obras/${obraId}`} className="hover:underline">
              {obra.nombre}
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Paquetes</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/obras/${obraId}/paquetes/import`}
            className={buttonVariants("secondary", "sm")}
          >
            Importar CSV
          </Link>
          <Link
            href={`/obras/${obraId}/paquetes/nuevo`}
            className={buttonVariants("primary", "sm")}
          >
            + Nuevo paquete
          </Link>
        </div>
      </div>

      {error && (
        <p className="text-sm text-muted">
          Error al leer los paquetes ({error.message}).
        </p>
      )}

      {!error && paquetes?.length === 0 && (
        <EmptyState
          titulo="Todavía no hay paquetes cargados"
          descripcion="Empezá creando el primero, o importá la estructura completa desde un CSV."
        >
          <Link
            href={`/obras/${obraId}/paquetes/nuevo`}
            className={buttonVariants("primary", "sm")}
          >
            + Nuevo paquete
          </Link>
        </EmptyState>
      )}

      {!error && paquetes && paquetes.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-3 pr-8 pl-3 font-medium">Código</th>
              <th className="py-3 pr-8 font-medium">Nombre</th>
              <th className="py-3 pr-8 font-medium">Tipo</th>
              <th className="py-3 pr-8 font-medium">Presupuesto</th>
              <th className="py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {paquetes.map((p) => {
              const nivel = Math.max(0, p.codigo.split(".").length - 1);
              return (
                <tr
                  key={p.id}
                  className="border-b border-border/60 odd:bg-black/[.015] dark:odd:bg-white/[.02]"
                >
                  <td className="py-3 pr-8 pl-3 font-mono text-xs text-muted">
                    {p.codigo}
                  </td>
                  <td
                    className="py-3 pr-8"
                    style={{ paddingLeft: `${nivel * 16}px` }}
                  >
                    <Link
                      href={`/obras/${obraId}/paquetes/${p.id}`}
                      className="hover:text-accent hover:underline"
                    >
                      {p.nombre}
                    </Link>
                  </td>
                  <td className="py-3 pr-8 text-muted">
                    {TIPOS.find((t) => t.value === p.tipo)?.label ?? p.tipo}
                  </td>
                  <td className="py-3 pr-8 text-muted">
                    {p.presupuesto_base != null
                      ? `${p.presupuesto_base.toLocaleString("es-AR")} ${p.moneda ?? ""}`
                      : "—"}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <Link
                      href={`/obras/${obraId}/paquetes/${p.id}/revisiones`}
                      className="mr-3 text-accent hover:underline"
                    >
                      Adicionales
                    </Link>
                    <Link
                      href={`/obras/${obraId}/paquetes/${p.id}/editar`}
                      className="mr-3 text-muted hover:text-foreground hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={borrarPaquete} className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="obra_id" value={obraId} />
                      <ConfirmSubmitButton
                        confirmMessage={`¿Borrar "${p.nombre}"? Si tiene sub-paquetes, se borran también.`}
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
