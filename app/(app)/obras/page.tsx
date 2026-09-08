import { createClient } from "@/lib/supabase/server";

export default async function ObrasPage() {
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
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No tenés obras cargadas todavía.
        </p>
      )}

      {!error && obras && obras.length > 0 && (
        <ul className="divide-y divide-black/[.08] dark:divide-white/[.145]">
          {obras.map((obra) => (
            <li key={obra.id} className="py-3">
              <p className="font-medium text-black dark:text-zinc-50">
                {obra.nombre}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {obra.cliente}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
