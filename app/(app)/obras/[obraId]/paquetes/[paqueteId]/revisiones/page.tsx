import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  crearAdicional,
  aprobarAdicional,
  rechazarAdicional,
  ejecutarAdicional,
} from "./actions";

const ESTADOS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  ejecutado: "Ejecutado",
};

function diasDesde(fecha: string) {
  const ms = Date.now() - new Date(fecha).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default async function RevisionesPage({
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
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href={`/obras/${obraId}/paquetes`} className="hover:underline">
          {paquete.codigo} · {paquete.nombre}
        </Link>
      </p>
      <h1 className="mb-1 text-2xl font-semibold text-black dark:text-zinc-50">
        Adicionales
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Presupuesto base {paquete.presupuesto_base?.toLocaleString("es-AR") ?? "—"}{" "}
        {paquete.moneda} · Vigente {vigente.toLocaleString("es-AR")}{" "}
        {paquete.moneda}
      </p>

      {error && (
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Error al leer las revisiones ({error.message}).
        </p>
      )}

      {!error && revisiones?.length === 0 && (
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no hay adicionales cargados.
        </p>
      )}

      {!error && revisiones && revisiones.length > 0 && (
        <table className="mb-8 w-full text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-left text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
              <th className="py-2 font-medium">Fecha</th>
              <th className="py-2 font-medium">Monto anterior → nuevo</th>
              <th className="py-2 font-medium">Estado</th>
              <th className="py-2 font-medium">Notas</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {revisiones.map((r) => (
              <tr
                key={r.id}
                className="border-b border-black/[.05] dark:border-white/[.08]"
              >
                <td className="py-2">{r.fecha}</td>
                <td className="py-2 text-zinc-500 dark:text-zinc-400">
                  {r.monto_anterior?.toLocaleString("es-AR") ?? "—"} →{" "}
                  {r.monto_nuevo?.toLocaleString("es-AR") ?? "—"}
                </td>
                <td className="py-2">
                  {ESTADOS[r.estado] ?? r.estado}
                  {r.estado === "pendiente" && diasDesde(r.fecha) > 7 && (
                    <span className="ml-2 text-red-600 dark:text-red-400">
                      ({diasDesde(r.fecha)} días)
                    </span>
                  )}
                </td>
                <td className="py-2 text-zinc-500 dark:text-zinc-400">
                  {r.notas ?? "—"}
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  {r.estado === "pendiente" && (
                    <>
                      <Link
                        href={`/obras/${obraId}/paquetes/${paqueteId}/revisiones/${r.id}/editar`}
                        className="mr-3 underline underline-offset-2"
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
                          className="mr-3 text-green-700 underline underline-offset-2 dark:text-green-400"
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
                          className="text-red-600 underline underline-offset-2 dark:text-red-400"
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
                        className="underline underline-offset-2"
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

      <details className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <summary className="cursor-pointer text-sm font-medium text-black dark:text-zinc-50">
          Nuevo adicional
        </summary>

        <form action={crearAdicional} className="mt-4 space-y-4">
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
                defaultValue={vigente || ""}
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
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />
          </div>

          <button
            type="submit"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Cargar adicional
          </button>
        </form>
      </details>
    </div>
  );
}
