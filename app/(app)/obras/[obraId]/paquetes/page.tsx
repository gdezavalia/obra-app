import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { crearPaquete, borrarPaquete } from "./actions";

const TIPOS = [
  { value: "trabajo", label: "Trabajo" },
  { value: "materiales", label: "Materiales" },
  { value: "mixto", label: "Mixto" },
];

export default async function PaquetesPage({
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
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href={`/obras/${obraId}`} className="hover:underline">
          {obra.nombre}
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Paquetes
      </h1>

      {error && (
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Error al leer los paquetes ({error.message}).
        </p>
      )}

      {!error && paquetes?.length === 0 && (
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no hay paquetes cargados.
        </p>
      )}

      {!error && paquetes && paquetes.length > 0 && (
        <table className="mb-8 w-full text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-left text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
              <th className="py-2 font-medium">Código</th>
              <th className="py-2 font-medium">Nombre</th>
              <th className="py-2 font-medium">Tipo</th>
              <th className="py-2 font-medium">Presupuesto</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {paquetes.map((p) => {
              const nivel = Math.max(0, p.codigo.split(".").length - 1);
              return (
                <tr
                  key={p.id}
                  className="border-b border-black/[.05] dark:border-white/[.08]"
                >
                  <td className="py-2 font-mono text-xs">{p.codigo}</td>
                  <td className="py-2" style={{ paddingLeft: `${nivel * 16}px` }}>
                    {p.nombre}
                  </td>
                  <td className="py-2 text-zinc-500 dark:text-zinc-400">
                    {TIPOS.find((t) => t.value === p.tipo)?.label ?? p.tipo}
                  </td>
                  <td className="py-2 text-zinc-500 dark:text-zinc-400">
                    {p.presupuesto_base != null
                      ? `${p.presupuesto_base.toLocaleString("es-AR")} ${p.moneda ?? ""}`
                      : "—"}
                  </td>
                  <td className="py-2 text-right">
                    <Link
                      href={`/obras/${obraId}/paquetes/${p.id}/editar`}
                      className="mr-3 underline underline-offset-2"
                    >
                      Editar
                    </Link>
                    <form action={borrarPaquete} className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="obra_id" value={obraId} />
                      <ConfirmSubmitButton
                        confirmMessage={`¿Borrar "${p.nombre}"? Si tiene sub-paquetes, se borran también.`}
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

      <div className="mb-4 flex gap-3">
        <Link
          href={`/obras/${obraId}/paquetes/import`}
          className="rounded-full border border-black/[.08] px-4 py-2 text-sm hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
        >
          Importar CSV
        </Link>
      </div>

      <details className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <summary className="cursor-pointer text-sm font-medium text-black dark:text-zinc-50">
          Nuevo paquete
        </summary>

        <form action={crearPaquete} className="mt-4 space-y-4">
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
                placeholder="01.04.02"
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
                defaultValue="trabajo"
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
                defaultValue=""
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
                className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Moneda
              </label>
              <select
                name="moneda"
                defaultValue="ARS"
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
            Crear paquete
          </button>
        </form>
      </details>
    </div>
  );
}
