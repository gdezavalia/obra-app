import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { actualizarGasto } from "../../actions";

const CATEGORIAS = [
  { value: "mano_de_obra", label: "Mano de obra" },
  { value: "materiales", label: "Materiales" },
  { value: "honorarios", label: "Honorarios" },
];

const PAGADO_POR = [
  { value: "cliente", label: "Cliente" },
  { value: "arquitecta", label: "Arquitecta" },
];

export default async function EditarGastoPage({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string; gastoId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { obraId, gastoId } = await params;
  const { error: formError } = await searchParams;
  const supabase = await createClient();

  const { data: gasto } = await supabase
    .from("gastos")
    .select(
      "id, paquete_id, revision_id, fecha, categoria, descripcion, proveedor, pagado_por, forma_pago, monto, moneda, cotizacion_usd_dia, link_factura, link_comprobante_pago",
    )
    .eq("id", gastoId)
    .single();

  if (!gasto) notFound();

  const [{ data: paquetes }, { data: revisiones }] = await Promise.all([
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
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Editar gasto
      </h1>

      <form action={actualizarGasto} className="space-y-4">
        <input type="hidden" name="id" value={gasto.id} />
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
              defaultValue={gasto.fecha}
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
              defaultValue={gasto.paquete_id ?? ""}
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
            defaultValue={gasto.revision_id ?? ""}
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
              defaultValue={gasto.categoria}
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
              defaultValue={gasto.proveedor ?? ""}
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
            defaultValue={gasto.descripcion ?? ""}
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
              defaultValue={gasto.monto}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Moneda
            </label>
            <select
              name="moneda"
              defaultValue={gasto.moneda}
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
              defaultValue={gasto.forma_pago ?? ""}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Pagado por
            </label>
            <select
              name="pagado_por"
              defaultValue={gasto.pagado_por ?? ""}
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
              defaultValue={gasto.link_factura ?? ""}
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
              defaultValue={gasto.link_comprobante_pago ?? ""}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
