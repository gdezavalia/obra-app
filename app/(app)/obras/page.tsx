import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

export default async function ObrasPage() {
  const supabase = await createClient();
  const { data: obras, error } = await supabase
    .from("obras")
    .select("id, nombre, cliente")
    .order("nombre");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Mis obras</h1>
        <Link href="/obras/nueva" className={buttonVariants("primary", "sm")}>
          + Nueva obra
        </Link>
      </div>

      {error && (
        <p className="text-sm text-muted">
          Todavía no hay tabla de obras en la base ({error.message}).
        </p>
      )}

      {!error && obras?.length === 0 && (
        <EmptyState
          titulo="No tenés obras cargadas todavía"
          descripcion="Creá la primera para empezar a cargar paquetes y gastos."
        >
          <Link href="/obras/nueva" className={buttonVariants("primary", "sm")}>
            + Nueva obra
          </Link>
        </EmptyState>
      )}

      {!error && obras && obras.length > 0 && (
        <div className="grid gap-3">
          {obras.map((obra) => (
            <Link key={obra.id} href={`/obras/${obra.id}`}>
              <Card className="transition-colors hover:border-accent">
                <p className="font-medium text-foreground">{obra.nombre}</p>
                <p className="text-sm text-muted">{obra.cliente}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
