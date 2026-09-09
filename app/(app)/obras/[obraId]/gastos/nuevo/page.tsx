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
  searchParams: Promise<{
    error?: string;
    fecha?: string;
    proveedor_texto?: string;
    descripcion?: string;
    monto?: string;
    forma_pago?: string;
    link_factura?: string;
    ocr_error?: string;
  }>;
}) {
  const { obraId } = await params;
  const {
    error: formError,
    fecha: fechaOcr,
    proveedor_texto: proveedorOcr,
    descripcion: descripcionOcr,
    monto: montoOcr,
    forma_pago: formaPagoOcr,
    link_factura: linkFacturaOcr,
    ocr_error: ocrError,
  } = await searchParams;
  const huboOcr = Boolean(
    fechaOcr || proveedorOcr || descripcionOcr || montoOcr || formaPagoOcr || linkFacturaOcr,
  );
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

        {huboOcr && (
          <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
            Completamos algunos campos leyendo la foto. Revisalos antes de
            guardar — el sistema nunca guarda sin que lo confirmes.
          </p>
        )}

        {ocrError === "1" && (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
            No pudimos leer los datos de la foto automáticamente. La foto ya
            se subió y quedó en &quot;Link factura&quot; — completá el resto a
            mano.
          </p>
        )}

        <Field label="Fecha">
          <Input type="date" name="fecha" required defaultValue={fechaOcr} />
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
          <CampoProveedor
            proveedores={proveedores ?? []}
            defaultNombreNuevo={proveedorOcr ?? ""}
          />
        </div>

        <Field label="Descripción">
          <Textarea name="descripcion" defaultValue={descripcionOcr} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Monto">
            <MoneyInput
              name="monto"
              required
              defaultValue={montoOcr ? Number(montoOcr) : null}
            />
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
              defaultValue={formaPagoOcr}
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
            <Input type="url" name="link_factura" defaultValue={linkFacturaOcr} />
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
