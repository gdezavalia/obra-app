import Link from "next/link";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { crearProveedor } from "../actions";

export default async function NuevoProveedorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <p className="mb-1 text-sm text-muted">
        <Link href="/proveedores" className="hover:underline">
          ← Proveedores
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Nuevo proveedor
      </h1>

      <form action={crearProveedor} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Field label="Nombre">
          <Input type="text" name="nombre" required autoFocus />
        </Field>

        <Button type="submit">Crear proveedor</Button>
      </form>
    </div>
  );
}
