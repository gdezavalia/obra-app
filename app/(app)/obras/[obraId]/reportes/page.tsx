import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function ultimoLunes(fecha: Date): Date {
  const d = new Date(fecha);
  const dia = d.getDay();
  const offset = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + offset);
  return d;
}

export default async function ReportesPage({
  params,
}: {
  params: Promise<{ obraId: string }>;
}) {
  const { obraId } = await params;
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("id", obraId)
    .single();

  if (!obra) notFound();

  const hoy = new Date();
  const lunesActual = ultimoLunes(hoy);
  const lunesPasado = new Date(lunesActual);
  lunesPasado.setDate(lunesPasado.getDate() - 7);
  const domingoPasado = new Date(lunesPasado);
  domingoPasado.setDate(domingoPasado.getDate() + 6);

  const defaultDesde = lunesPasado.toISOString().slice(0, 10);
  const defaultHasta = domingoPasado.toISOString().slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href={`/obras/${obraId}`} className="hover:underline">
          {obra.nombre}
        </Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Reporte semanal
      </h1>

      <form
        action={`/obras/${obraId}/reportes/ver`}
        className="flex flex-wrap items-end gap-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Desde
          </label>
          <input
            type="date"
            name="desde"
            required
            defaultValue={defaultDesde}
            className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Hasta
          </label>
          <input
            type="date"
            name="hasta"
            required
            defaultValue={defaultHasta}
            className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Generar reporte
        </button>
      </form>
    </div>
  );
}
