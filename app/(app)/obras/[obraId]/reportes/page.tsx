import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

function ultimoLunes(fecha: Date): Date {
  const d = new Date(fecha);
  const dia = d.getDay();
  const offset = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + offset);
  return d;
}

export default async function ReportesPage({
  params,
}: {
  params: Promise<{ obraId: string }>;
}) {
  const { obraId } = await params;
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("id", obraId)
    .single();

  if (!obra) notFound();

  const hoy = new Date();
  const lunesActual = ultimoLunes(hoy);
  const lunesPasado = new Date(lunesActual);
  lunesPasado.setDate(lunesPasado.getDate() - 7);
  const domingoPasado = new Date(lunesPasado);
  domingoPasado.setDate(domingoPasado.getDate() + 6);

  const defaultDesde = lunesPasado.toISOString().slice(0, 10);
  const defaultHasta = domingoPasado.toISOString().slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <p className="mb-1 text-sm text-muted">
        <Link href={`/obras/${obraId}`} className="hover:underline">
          {obra.nombre}
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Reporte semanal
      </h1>

      <form
        action={`/obras/${obraId}/reportes/ver`}
        className="flex flex-wrap items-end gap-4"
      >
        <Field label="Desde">
          <Input type="date" name="desde" required defaultValue={defaultDesde} />
        </Field>
        <Field label="Hasta">
          <Input type="date" name="hasta" required defaultValue={defaultHasta} />
        </Field>
        <Button type="submit">Generar reporte</Button>
      </form>
    </div>
  );
}
