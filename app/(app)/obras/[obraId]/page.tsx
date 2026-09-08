import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ObraPage({
  params,
}: {
  params: Promise<{ obraId: string }>;
}) {
  const { obraId } = await params;
  const supabase = await createClient();
  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre, cliente, moneda_base")
    .eq("id", obraId)
    .single();

  if (!obra) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        {obra.nombre}
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        {obra.cliente} · {obra.moneda_base}
      </p>

      <nav className="flex gap-4 text-sm">
        <Link
          href={`/obras/${obra.id}/paquetes`}
          className="rounded-full border border-black/[.08] px-4 py-2 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
        >
          Paquetes
        </Link>
        <Link
          href={`/obras/${obra.id}/gastos`}
          className="rounded-full border border-black/[.08] px-4 py-2 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
        >
          Gastos
        </Link>
        <Link
          href={`/obras/${obra.id}/validaciones`}
          className="rounded-full border border-black/[.08] px-4 py-2 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
        >
          Puntos de atención
        </Link>
      </nav>
    </div>
  );
}
