import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Field, Input, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { actualizarPaquete } from "../../actions";

const TIPOS = [
  { value: "trabajo", label: "Trabajo" },
  { value: "materiales", label: "Materiales" },
  { value: "mixto", label: "Mixto" },
];

export default async function EditarPaquetePage({
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
    .select("id, codigo, nombre, tipo, parent_id, presupuesto_base, moneda")
    .eq("id", paqueteId)
    .single();

  if (!paquete) notFound();

  const { data: paquetes } = await supabase
    .from("paquetes")
    .select("id, codigo, nombre")
    .eq("obra_id", obraId)
    .neq("id", paqueteId)
    .order("codigo");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <p className="mb-1 text-sm text-muted">
        <Link href={`/obras/${obraId}/paquetes`} className="hover:underline">
          ← Paquetes
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Editar paquete
      </h1>

      <form action={actualizarPaquete} className="space-y-4">
        <input type="hidden" name="id" value={paquete.id} />
        <input type="hidden" name="obra_id" value={obraId} />

        {formError && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Código">
            <Input type="text" name="codigo" required defaultValue={paquete.codigo} />
          </Field>
          <Field label="Nombre">
            <Input type="text" name="nombre" required defaultValue={paquete.nombre} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo">
            <Select name="tipo" required defaultValue={paquete.tipo}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Paquete padre">
            <Select name="parent_id" defaultValue={paquete.parent_id ?? ""}>
              <option value="">— sin padre —</option>
              {paquetes?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Presupuesto base (opcional)">
            <MoneyInput name="presupuesto_base" defaultValue={paquete.presupuesto_base} />
          </Field>
          <Field label="Moneda">
            <Select name="moneda" defaultValue={paquete.moneda ?? "ARS"}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
        </div>

        <Button type="submit">Guardar cambios</Button>
      </form>
    </div>
  );
}
