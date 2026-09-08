import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <form
        action={login}
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-8"
      >
        <h1 className="mb-1 text-xl font-semibold text-foreground">Obra</h1>
        <p className="mb-6 text-sm text-muted">
          Seguimiento económico de obra
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <Field label="Email">
            <Input type="email" name="email" required autoComplete="email" />
          </Field>
          <Field label="Contraseña">
            <Input
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </Field>
        </div>

        <Button type="submit" className="mt-6 w-full">
          Ingresar
        </Button>
      </form>
    </div>
  );
}
