import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { borrarProveedor } from "./actions";

export default async function ProveedoresPage() {
  const supabase = await createClient();
  const { data: proveedores, error } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .order("nombre");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          Proveedores
        </h1>
        <Link
          href="/proveedores/nuevo"
          className={buttonVariants("primary", "sm")}
        >
          + Nuevo proveedor
        </Link>
      </div>

      <p className="mb-6 text-sm text-muted">
        Compartidos entre todas tus obras. Los podés asignar directamente
        desde el formulario de carga de un gasto.
      </p>

      {error && (
        <p className="text-sm text-muted">
          Error al leer los proveedores ({error.message}).
        </p>
      )}

      {!error && proveedores?.length === 0 && (
        <EmptyState
          titulo="Todavía no tenés proveedores cargados"
          descripcion="Se crean acá o directo desde el formulario de un gasto."
        >
          <Link
            href="/proveedores/nuevo"
            className={buttonVariants("primary", "sm")}
          >
            + Nuevo proveedor
          </Link>
        </EmptyState>
      )}

      {!error && proveedores && proveedores.length > 0 && (
        <ul className="divide-y divide-border">
          {proveedores.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span className="text-foreground">{p.nombre}</span>
              <form action={borrarProveedor}>
                <input type="hidden" name="id" value={p.id} />
                <ConfirmSubmitButton
                  confirmMessage={`¿Borrar el proveedor "${p.nombre}"? Los gastos que lo tengan asignado quedan sin proveedor.`}
                  className="text-sm text-danger hover:underline"
                >
                  Borrar
                </ConfirmSubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
