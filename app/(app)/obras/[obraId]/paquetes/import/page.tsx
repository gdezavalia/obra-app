import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { importarPaquetes, type FilaImport } from "./actions";

export default async function ImportarPaquetesPage({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ error?: string; reporte?: string }>;
}) {
  const { obraId } = await params;
  const { error, reporte: reporteB64 } = await searchParams;
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("id", obraId)
    .single();

  if (!obra) notFound();

  let reporte: FilaImport[] | null = null;
  if (reporteB64) {
    try {
      reporte = JSON.parse(
        Buffer.from(reporteB64, "base64url").toString("utf-8"),
      );
    } catch {
      reporte = null;
    }
  }

  const aceptados = reporte?.filter((f) => f.estado === "aceptado") ?? [];
  const rechazados = reporte?.filter((f) => f.estado === "rechazado") ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href={`/obras/${obraId}/paquetes`} className="hover:underline">
          {obra.nombre} · Paquetes
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Importar paquetes desde CSV
      </h1>

      {!reporte && (
        <>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Columnas esperadas: <code>codigo</code>, <code>nombre</code>,{" "}
            <code>tipo</code> (trabajo / materiales / mixto),{" "}
            <code>presupuesto_base</code> (opcional), <code>moneda</code>{" "}
            (opcional). Los códigos padre (ej. <code>01.04</code> para{" "}
            <code>01.04.02</code>) tienen que estar antes en el archivo o ya
            existir en la obra.
          </p>

          {error && (
            <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <form action={importarPaquetes} className="space-y-4">
            <input type="hidden" name="obra_id" value={obraId} />
            <input
              type="file"
              name="archivo"
              accept=".csv,text/csv"
              required
              className="block w-full text-sm text-zinc-700 dark:text-zinc-300"
            />
            <button
              type="submit"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Importar
            </button>
          </form>
        </>
      )}

      {reporte && (
        <>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            {aceptados.length} aceptados, {rechazados.length} rechazados.
          </p>

          {rechazados.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
                Rechazados
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  {rechazados.map((f, i) => (
                    <tr
                      key={i}
                      className="border-b border-black/[.05] dark:border-white/[.08]"
                    >
                      <td className="py-2 font-mono text-xs">{f.codigo}</td>
                      <td className="py-2">{f.nombre}</td>
                      <td className="py-2 text-red-600 dark:text-red-400">
                        {f.motivo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {aceptados.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-black dark:text-zinc-50">
                Aceptados
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  {aceptados.map((f, i) => (
                    <tr
                      key={i}
                      className="border-b border-black/[.05] dark:border-white/[.08]"
                    >
                      <td className="py-2 font-mono text-xs">{f.codigo}</td>
                      <td className="py-2">{f.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Link
            href={`/obras/${obraId}/paquetes`}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
          >
            Volver a paquetes
          </Link>
        </>
      )}
    </div>
  );
}
