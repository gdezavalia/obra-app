import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { analizarComprobante } from "./actions";

export default async function CargarPorFotoPage({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { obraId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("id", obraId)
    .single();

  if (!obra) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <p className="mb-1 text-sm text-muted">
        <Link href={`/obras/${obraId}/gastos`} className="hover:underline">
          ← {obra.nombre} · Gastos
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        Cargar por foto
      </h1>
      <p className="mb-6 text-sm text-muted">
        Subí una foto o PDF del comprobante. Vamos a intentar leer la fecha,
        el proveedor, el monto y la forma de pago automáticamente — después
        revisás y confirmás todo antes de guardar.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <form action={analizarComprobante} className="space-y-4">
        <input type="hidden" name="obra_id" value={obraId} />
        <input
          type="file"
          name="archivo"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          required
          className="block w-full text-sm text-muted"
        />
        <Button type="submit">Analizar comprobante</Button>
      </form>
    </div>
  );
}
