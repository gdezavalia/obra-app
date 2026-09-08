import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { CamposPaqueteYRevision } from "@/components/campos-paquete-revision";
import { CampoProveedor } from "@/components/campo-proveedor";
import { crearGasto } from "../actions";

const CATEGORIAS = [
  { value: "mano_de_obra", label: "Mano de obra" },
  { value: "materiales", label: "Materiales" },
  { value: "honorarios", label: "Honorarios" },
];

const PAGADO_POR = [
  { value: "cliente", label: "Cliente" },
  { value: "arquitecta", label: "Arquitecta" },
];

export default async function NuevoGastoPage({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { obraId } = await params;
  const { error: formError } = await searchParams;
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre, moneda_base")
    .eq("id", obraId)
    .single();

  if (!obra) notFound();

  const [{ data: paquetes }, { data: revisiones }, { data: proveedores }] =
    await Promise.all([
      supabase
        .from("paquetes")
        .select("id, codigo, nombre")
        .eq("obra_id", obraId)
        .order("codigo"),
      supabase
        .from("revisiones_presupuesto")
        .select("id, paquete_id, monto_nuevo, estado, paquetes!inner(obra_id)")
        .eq("paquetes.obra_id", obraId),
      supabase.from("proveedores").select("id, nombre").order("nombre"),
    ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <p className="mb-1 text-sm text-muted">
        <Link href={`/obras/${obraId}/gastos`} className="hover:underline">
          ← {obra.nombre} · Gastos
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Nuevo gasto
      </h1>

      <form action={crearGasto} className="space-y-4">
        <input type="hidden" name="obra_id" value={obraId} />

        {formError && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}

        <Field label="Fecha">
          <Input type="date" name="fecha" required />
        </Field>

        <CamposPaqueteYRevision
          paquetes={paquetes ?? []}
          revisiones={revisiones ?? []}
        />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoría">
            <Select name="categoria" required defaultValue="materiales">
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <CampoProveedor proveedores={proveedores ?? []} />
        </div>

        <Field label="Descripción">
          <Textarea name="descripcion" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Monto">
            <MoneyInput name="monto" required />
          </Field>
          <Field label="Moneda">
            <Select name="moneda" defaultValue={obra.moneda_base}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Forma de pago">
            <Input
              type="text"
              name="forma_pago"
              placeholder="Efectivo, transferencia..."
            />
          </Field>
          <Field label="Pagado por">
            <Select name="pagado_por" defaultValue="">
              <option value="">— sin especificar —</option>
              {PAGADO_POR.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Link factura">
            <Input type="url" name="link_factura" />
          </Field>
          <Field label="Link comprobante de pago">
            <Input type="url" name="link_comprobante_pago" />
          </Field>
        </div>

        <Button type="submit">Guardar gasto</Button>
      </form>
    </div>
  );
}
