import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { actualizarPaquete } from "../../actions";

const TIPOS = [
  { value: "trabajo", label: "Trabajo" },
  { value: "materiales", label: "Materiales" },
  { value: "mixto", label: "Mixto" },
];

export default async function EditarPaquetePage({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string; paqueteId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { obraId, paqueteId } = await params;
  const { error: formError } = await searchParams;
  const supabase = await createClient();

  const { data: paquete } = await supabase
    .from("paquetes")
    .select("id, codigo, nombre, tipo, parent_id, presupuesto_base, moneda")
    .eq("id", paqueteId)
    .single();

  if (!paquete) notFound();

  const { data: paquetes } = await supabase
    .from("paquetes")
    .select("id, codigo, nombre")
    .eq("obra_id", obraId)
    .neq("id", paqueteId)
    .order("codigo");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Editar paquete
      </h1>

      <form action={actualizarPaquete} className="space-y-4">
        <input type="hidden" name="id" value={paquete.id} />
        <input type="hidden" name="obra_id" value={obraId} />

        {formError && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {formError}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Código
            </label>
            <input
              type="text"
              name="codigo"
              required
              defaultValue={paquete.codigo}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nombre
            </label>
            <input
              type="text"
              name="nombre"
              required
              defaultValue={paquete.nombre}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Tipo
            </label>
            <select
              name="tipo"
              required
              defaultValue={paquete.tipo}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Paquete padre
            </label>
            <select
              name="parent_id"
              defaultValue={paquete.parent_id ?? ""}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            >
              <option value="">— sin padre —</option>
              {paquetes?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Presupuesto base (opcional)
            </label>
            <input
              type="number"
              step="0.01"
              name="presupuesto_base"
              defaultValue={paquete.presupuesto_base ?? ""}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Moneda
            </label>
            <select
              name="moneda"
              defaultValue={paquete.moneda ?? "ARS"}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
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
