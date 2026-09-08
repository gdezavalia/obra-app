import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { crearGasto, borrarGasto } from "./actions";

const CATEGORIAS = [
  { value: "mano_de_obra", label: "Mano de obra" },
  { value: "materiales", label: "Materiales" },
  { value: "honorarios", label: "Honorarios" },
];

const PAGADO_POR = [
  { value: "cliente", label: "Cliente" },
  { value: "arquitecta", label: "Arquitecta" },
];

export default async function GastosPage({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { obraId } = await params;
  const { error: formError } = await searchParams;
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre, moneda_base")
    .eq("id", obraId)
    .single();

  if (!obra) notFound();

  const [{ data: gastos, error }, { data: paquetes }, { data: revisiones }] =
    await Promise.all([
      supabase
        .from("gastos")
        .select(
          "id, fecha, categoria, descripcion, proveedor, monto, moneda, paquete_id, paquetes(codigo, nombre)",
        )
        .eq("obra_id", obraId)
        .order("fecha", { ascending: false }),
      supabase
        .from("paquetes")
        .select("id, codigo, nombre")
        .eq("obra_id", obraId)
        .order("codigo"),
      supabase
        .from("revisiones_presupuesto")
        .select("id, monto_nuevo, estado, paquetes!inner(obra_id, codigo)")
        .eq("paquetes.obra_id", obraId),
    ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href={`/obras/${obraId}`} className="hover:underline">
          {obra.nombre}
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Gastos
      </h1>

      {error && (
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Error al leer los gastos ({error.message}).
        </p>
      )}

      {!error && gastos?.length === 0 && (
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no hay gastos cargados.
        </p>
      )}

      {!error && gastos && gastos.length > 0 && (
        <table className="mb-8 w-full text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-left text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
              <th className="py-2 font-medium">Fecha</th>
              <th className="py-2 font-medium">Paquete</th>
              <th className="py-2 font-medium">Categoría</th>
              <th className="py-2 font-medium">Proveedor</th>
              <th className="py-2 font-medium">Monto</th>
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
                  className="border-b border-black/[.05] dark:border-white/[.08]"
                >
                  <td className="py-2">{g.fecha}</td>
                  <td className="py-2">
                    {paquete ? `${paquete.codigo} · ${paquete.nombre}` : "—"}
                  </td>
                  <td className="py-2 text-zinc-500 dark:text-zinc-400">
                    {CATEGORIAS.find((c) => c.value === g.categoria)?.label ??
                      g.categoria}
                  </td>
                  <td className="py-2 text-zinc-500 dark:text-zinc-400">
                    {g.proveedor ?? "—"}
                  </td>
                  <td className="py-2 text-zinc-500 dark:text-zinc-400">
                    {g.monto.toLocaleString("es-AR")} {g.moneda}
                  </td>
                  <td className="py-2 text-right">
                    <Link
                      href={`/obras/${obraId}/gastos/${g.id}/editar`}
                      className="mr-3 underline underline-offset-2"
                    >
                      Editar
                    </Link>
                    <form action={borrarGasto} className="inline">
                      <input type="hidden" name="id" value={g.id} />
                      <input type="hidden" name="obra_id" value={obraId} />
                      <ConfirmSubmitButton
                        confirmMessage="¿Borrar este gasto?"
                        className="text-red-600 underline underline-offset-2 dark:text-red-400"
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

      <details className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]" open>
        <summary className="cursor-pointer text-sm font-medium text-black dark:text-zinc-50">
          Nuevo gasto
        </summary>

        <form action={crearGasto} className="mt-4 space-y-4">
          <input type="hidden" name="obra_id" value={obraId} />

          {formError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {formError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Fecha
              </label>
              <input
                type="date"
                name="fecha"
                required
                className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Paquete
              </label>
              <select
                name="paquete_id"
                required
                defaultValue=""
                className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              >
                <option value="" disabled>
                  Elegir paquete
                </option>
                {paquetes?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Adicional asociado (opcional)
            </label>
            <select
              name="revision_id"
              defaultValue=""
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            >
              <option value="">— ninguno —</option>
              {revisiones?.map((r) => {
                const paquete = Array.isArray(r.paquetes)
                  ? r.paquetes[0]
                  : r.paquetes;
                return (
                  <option key={r.id} value={r.id}>
                    {paquete?.codigo} · {r.monto_nuevo?.toLocaleString("es-AR")}{" "}
                    ARS ({r.estado})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Categoría
              </label>
              <select
                name="categoria"
                required
                defaultValue="materiales"
                className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Proveedor
              </label>
              <input
                type="text"
                name="proveedor"
                className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Descripción
            </label>
            <input
              type="text"
              name="descripcion"
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Monto
              </label>
              <input
                type="number"
                step="0.01"
                name="monto"
                required
                className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Moneda
              </label>
              <select
                name="moneda"
                defaultValue={obra.moneda_base}
                className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Forma de pago
              </label>
              <input
                type="text"
                name="forma_pago"
                placeholder="Efectivo, transferencia..."
                className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Pagado por
              </label>
              <select
                name="pagado_por"
                defaultValue=""
                className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              >
                <option value="">— sin especificar —</option>
                {PAGADO_POR.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Link factura
              </label>
              <input
                type="url"
                name="link_factura"
                className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Link comprobante de pago
              </label>
              <input
                type="url"
                name="link_comprobante_pago"
                className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Guardar gasto
          </button>
        </form>
      </details>
    </div>
  );
}
