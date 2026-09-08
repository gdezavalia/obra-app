import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { crearObra } from "./actions";

export default async function ObrasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: createError } = await searchParams;
  const supabase = await createClient();
  const { data: obras, error } = await supabase
    .from("obras")
    .select("id, nombre, cliente")
    .order("nombre");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Mis obras
      </h1>

      {error && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no hay tabla de obras en la base ({error.message}).
        </p>
      )}

      {!error && obras?.length === 0 && (
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          No tenés obras cargadas todavía.
        </p>
      )}

      {!error && obras && obras.length > 0 && (
        <ul className="mb-8 divide-y divide-black/[.08] dark:divide-white/[.145]">
          {obras.map((obra) => (
            <li key={obra.id} className="py-3">
              <Link
                href={`/obras/${obra.id}`}
                className="font-medium text-black hover:underline dark:text-zinc-50"
              >
                {obra.nombre}
              </Link>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {obra.cliente}
              </p>
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <summary className="cursor-pointer text-sm font-medium text-black dark:text-zinc-50">
          Nueva obra
        </summary>

        <form action={crearObra} className="mt-4 space-y-4">
          {createError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {createError}
            </p>
          )}

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

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Cliente
            </label>
            <input
              type="text"
              name="cliente"
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Moneda base
            </label>
            <select
              name="moneda_base"
              defaultValue="ARS"
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Crear obra
          </button>
        </form>
      </details>
    </div>
  );
}
