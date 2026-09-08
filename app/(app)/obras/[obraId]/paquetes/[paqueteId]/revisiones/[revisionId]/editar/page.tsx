import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { actualizarAdicional } from "../../actions";

export default async function EditarAdicionalPage({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string; paqueteId: string; revisionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { obraId, paqueteId, revisionId } = await params;
  const { error: formError } = await searchParams;
  const supabase = await createClient();

  const { data: revision } = await supabase
    .from("revisiones_presupuesto")
    .select("id, fecha, monto_anterior, monto_nuevo, notas, documento, estado")
    .eq("id", revisionId)
    .single();

  if (!revision) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Editar adicional
      </h1>

      <form action={actualizarAdicional} className="space-y-4">
        <input type="hidden" name="id" value={revision.id} />
        <input type="hidden" name="obra_id" value={obraId} />
        <input type="hidden" name="paquete_id" value={paqueteId} />

        {formError && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {formError}
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fecha
          </label>
          <input
            type="date"
            name="fecha"
            required
            defaultValue={revision.fecha}
            className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Monto anterior
            </label>
            <input
              type="number"
              step="0.01"
              name="monto_anterior"
              defaultValue={revision.monto_anterior ?? ""}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Monto nuevo
            </label>
            <input
              type="number"
              step="0.01"
              name="monto_nuevo"
              required
              defaultValue={revision.monto_nuevo ?? ""}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Documento (link al PDF)
          </label>
          <input
            type="url"
            name="documento"
            defaultValue={revision.documento ?? ""}
            className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Notas
          </label>
          <input
            type="text"
            name="notas"
            defaultValue={revision.notas ?? ""}
            className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
          />
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
