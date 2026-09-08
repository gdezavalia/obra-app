import Link from "next/link";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { crearObra } from "../actions";

export default async function NuevaObraPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <p className="mb-1 text-sm text-muted">
        <Link href="/obras" className="hover:underline">
          ← Mis obras
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Nueva obra
      </h1>

      <form action={crearObra} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Field label="Nombre">
          <Input type="text" name="nombre" required />
        </Field>

        <Field label="Cliente">
          <Input type="text" name="cliente" />
        </Field>

        <Field label="Moneda base">
          <Select name="moneda_base" defaultValue="ARS">
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </Select>
        </Field>

        <Button type="submit">Crear obra</Button>
      </form>
    </div>
  );
}
