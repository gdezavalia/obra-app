import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { crearAdicional } from "../actions";

export default async function NuevoAdicionalPage({
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

  const { data: revisiones } = await supabase
    .from("revisiones_presupuesto")
    .select("monto_anterior, monto_nuevo, estado")
    .eq("paquete_id", paqueteId);

  const vigente =
    (paquete.presupuesto_base ?? 0) +
    (revisiones
      ?.filter((r) => r.estado === "aprobado" || r.estado === "ejecutado")
      .reduce(
        (acc, r) => acc + ((r.monto_nuevo ?? 0) - (r.monto_anterior ?? 0)),
        0,
      ) ?? 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <p className="mb-1 text-sm text-muted">
        <Link
          href={`/obras/${obraId}/paquetes/${paqueteId}/revisiones`}
          className="hover:underline"
        >
          ← {paquete.codigo} · {paquete.nombre} · Adicionales
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Nuevo adicional
      </h1>

      <form action={crearAdicional} className="space-y-4">
        <input type="hidden" name="obra_id" value={obraId} />
        <input type="hidden" name="paquete_id" value={paqueteId} />

        {formError && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}

        <Field label="Fecha">
          <Input type="date" name="fecha" required />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Monto anterior">
            <Input
              type="number"
              step="0.01"
              name="monto_anterior"
              defaultValue={vigente || ""}
            />
          </Field>
          <Field label="Monto nuevo">
            <Input type="number" step="0.01" name="monto_nuevo" required />
          </Field>
        </div>

        <Field label="Documento (link al PDF)">
          <Input type="url" name="documento" />
        </Field>

        <Field label="Notas">
          <Input type="text" name="notas" />
        </Field>

        <Button type="submit">Cargar adicional</Button>
      </form>
    </div>
  );
}
