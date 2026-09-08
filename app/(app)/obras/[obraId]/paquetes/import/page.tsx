import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <p className="mb-1 text-sm text-muted">
        <Link href={`/obras/${obraId}/paquetes`} className="hover:underline">
          ← {obra.nombre} · Paquetes
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Importar paquetes desde CSV
      </h1>

      {!reporte && (
        <>
          <p className="mb-4 text-sm text-muted">
            Columnas esperadas: <code>codigo</code>, <code>nombre</code>,{" "}
            <code>tipo</code> (trabajo / materiales / mixto),{" "}
            <code>presupuesto_base</code> (opcional), <code>moneda</code>{" "}
            (opcional). Los códigos padre (ej. <code>01.04</code> para{" "}
            <code>01.04.02</code>) tienen que estar antes en el archivo o ya
            existir en la obra.
          </p>

          {error && (
            <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
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
              className="block w-full text-sm text-muted"
            />
            <Button type="submit">Importar</Button>
          </form>
        </>
      )}

      {reporte && (
        <>
          <p className="mb-4 text-sm text-muted">
            {aceptados.length} aceptados, {rechazados.length} rechazados.
          </p>

          {rechazados.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-foreground">
                Rechazados
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  {rechazados.map((f, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="py-2 font-mono text-xs text-muted">
                        {f.codigo}
                      </td>
                      <td className="py-2">{f.nombre}</td>
                      <td className="py-2">
                        <Badge tono="danger">{f.motivo}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {aceptados.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-foreground">
                Aceptados
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  {aceptados.map((f, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="py-2 font-mono text-xs text-muted">
                        {f.codigo}
                      </td>
                      <td className="py-2">{f.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Link
            href={`/obras/${obraId}/paquetes`}
            className={buttonVariants("secondary", "sm")}
          >
            Volver a paquetes
          </Link>
        </>
      )}
    </div>
  );
}
