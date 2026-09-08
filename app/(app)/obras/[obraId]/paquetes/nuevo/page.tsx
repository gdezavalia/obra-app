import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Field, Input, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { crearPaquete } from "../actions";

const TIPOS = [
  { value: "trabajo", label: "Trabajo" },
  { value: "materiales", label: "Materiales" },
  { value: "mixto", label: "Mixto" },
];

export default async function NuevoPaquetePage({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { obraId } = await params;
  const { error: formError } = await searchParams;
  const supabase = await createClient();

  const { data: paquetes } = await supabase
    .from("paquetes")
    .select("id, codigo, nombre")
    .eq("obra_id", obraId)
    .order("codigo");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <p className="mb-1 text-sm text-muted">
        <Link href={`/obras/${obraId}/paquetes`} className="hover:underline">
          ← Paquetes
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Nuevo paquete
      </h1>

      <form action={crearPaquete} className="space-y-4">
        <input type="hidden" name="obra_id" value={obraId} />

        {formError && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Código">
            <Input type="text" name="codigo" required placeholder="01.04.02" />
          </Field>
          <Field label="Nombre">
            <Input type="text" name="nombre" required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo">
            <Select name="tipo" required defaultValue="trabajo">
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Paquete padre">
            <Select name="parent_id" defaultValue="">
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
            <MoneyInput name="presupuesto_base" />
          </Field>
          <Field label="Moneda">
            <Select name="moneda" defaultValue="ARS">
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
        </div>

        <Button type="submit">Crear paquete</Button>
      </form>
    </div>
  );
}
