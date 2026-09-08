import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Field, Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
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
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <p className="mb-1 text-sm text-muted">
        <Link
          href={`/obras/${obraId}/paquetes/${paqueteId}/revisiones`}
          className="hover:underline"
        >
          ← Adicionales
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Editar adicional
      </h1>

      <form action={actualizarAdicional} className="space-y-4">
        <input type="hidden" name="id" value={revision.id} />
        <input type="hidden" name="obra_id" value={obraId} />
        <input type="hidden" name="paquete_id" value={paqueteId} />

        {formError && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}

        <Field label="Fecha">
          <Input type="date" name="fecha" required defaultValue={revision.fecha} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Monto anterior">
            <MoneyInput name="monto_anterior" defaultValue={revision.monto_anterior} />
          </Field>
          <Field label="Monto nuevo">
            <MoneyInput name="monto_nuevo" required defaultValue={revision.monto_nuevo} />
          </Field>
        </div>

        <Field label="Documento (link al PDF)">
          <Input type="url" name="documento" defaultValue={revision.documento ?? ""} />
        </Field>

        <Field label="Notas">
          <Input type="text" name="notas" defaultValue={revision.notas ?? ""} />
        </Field>

        <Button type="submit">Guardar cambios</Button>
      </form>
    </div>
  );
}
