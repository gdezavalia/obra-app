import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { construirTablaMaestra, serieAcumuladaSemanal } from "@/lib/reporte";
import { correrValidaciones } from "@/lib/validaciones";
import { PrintButton } from "@/components/print-button";

const CATEGORIA_LABEL: Record<string, string> = {
  mano_de_obra: "Mano de obra",
  materiales: "Materiales",
  honorarios: "Honorarios",
};

function money(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default async function VerReportePage({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const { obraId } = await params;
  const { desde, hasta } = await searchParams;

  if (!desde || !hasta) notFound();

  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre, cliente, direccion, moneda_base, pct_honorarios")
    .eq("id", obraId)
    .single();

  if (!obra) notFound();

  const [{ data: paquetes }, { data: revisionesRaw }, { data: gastosRaw }] =
    await Promise.all([
      supabase
        .from("paquetes")
        .select("id, parent_id, codigo, nombre, tipo, presupuesto_base")
        .eq("obra_id", obraId)
        .order("codigo"),
      supabase
        .from("revisiones_presupuesto")
        .select(
          "id, paquete_id, fecha, monto_anterior, monto_nuevo, estado, paquetes!inner(obra_id)",
        )
        .eq("paquetes.obra_id", obraId),
      supabase
        .from("gastos")
        .select(
          "id, fecha, categoria, descripcion, proveedor, monto, moneda, paquete_id, revision_id, link_factura, link_comprobante_pago, paquetes(codigo, nombre)",
        )
        .eq("obra_id", obraId)
        .lte("fecha", hasta)
        .order("fecha"),
    ]);

  const revisiones = (revisionesRaw ?? []).map((r) => ({
    id: r.id,
    paquete_id: r.paquete_id,
    fecha: r.fecha,
    monto_anterior: r.monto_anterior,
    monto_nuevo: r.monto_nuevo,
    estado: r.estado,
  }));

  type GastoFila = {
    id: string;
    fecha: string;
    categoria: "mano_de_obra" | "materiales" | "honorarios";
    descripcion: string | null;
    proveedor: string | null;
    monto: number;
    moneda: string;
    paquete_id: string | null;
    revision_id: string | null;
    link_factura: string | null;
    link_comprobante_pago: string | null;
    paquete: { codigo: string; nombre: string } | null;
  };

  const gastos: GastoFila[] = (gastosRaw ?? []).map((g) => ({
    ...g,
    paquete: Array.isArray(g.paquetes) ? g.paquetes[0] : g.paquetes,
  }));

  const gastosSemana = gastos.filter((g) => g.fecha >= desde && g.fecha <= hasta);

  const gastoPorPaquete = new Map<string, number>();
  for (const g of gastos) {
    if (!g.paquete_id) continue;
    gastoPorPaquete.set(
      g.paquete_id,
      (gastoPorPaquete.get(g.paquete_id) ?? 0) + g.monto,
    );
  }

  const tablaMaestra = construirTablaMaestra(
    paquetes ?? [],
    gastoPorPaquete,
    revisiones,
  );
  const raices = tablaMaestra.filter((f) => f.nivel === 0);

  const inversionAcumulada = gastos.reduce((acc, g) => acc + g.monto, 0);
  const totalSemana = gastosSemana.reduce((acc, g) => acc + g.monto, 0);

  const porCategoriaSemana = new Map<string, number>();
  const porCategoriaAcumulado = new Map<string, number>();
  for (const g of gastosSemana) {
    porCategoriaSemana.set(
      g.categoria,
      (porCategoriaSemana.get(g.categoria) ?? 0) + g.monto,
    );
  }
  for (const g of gastos) {
    porCategoriaAcumulado.set(
      g.categoria,
      (porCategoriaAcumulado.get(g.categoria) ?? 0) + g.monto,
    );
  }

  const puntosDeAtencion = correrValidaciones(
    gastos,
    paquetes ?? [],
    revisiones,
    obra.pct_honorarios,
  );

  const serieSemanal = serieAcumuladaSemanal(gastos, hasta);

  const honorariosSemana = gastosSemana.filter(
    (g) => g.categoria === "honorarios",
  );
  const honorariosAcumulados = gastos
    .filter((g) => g.categoria === "honorarios")
    .reduce((acc, g) => acc + g.monto, 0);

  // --- Gráfico de barras por paquete (vigente vs ejecutado) ---
  const anchoGrafico = 720;
  const altoGrafico = 260;
  const margenInf = 40;
  const margenSup = 20;
  const altoBarras = altoGrafico - margenInf - margenSup;
  const maxBarra = Math.max(
    1,
    ...raices.map((f) => Math.max(f.vigente, f.ejecutado)),
  );
  const anchoSlot = anchoGrafico / Math.max(1, raices.length);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 15mm; }
          section { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <p className="text-sm text-muted">
          <Link href={`/obras/${obraId}/reportes`} className="hover:underline">
            ← Elegir otro rango
          </Link>
        </p>
        <PrintButton />
      </div>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          {obra.nombre}
        </h1>
        <p className="text-sm text-muted">
          {obra.cliente} · {obra.direccion}
        </p>
        <p className="mt-2 text-sm text-muted">
          Reporte semanal — {desde} a {hasta}
        </p>
      </header>

      {/* 1. Movimientos de la semana */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          1. Movimientos de la semana
        </h2>
        <div className="mb-4 grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted">Total</p>
            <p className="text-lg font-semibold text-foreground">
              ${money(totalSemana)}
            </p>
          </div>
          {(["mano_de_obra", "materiales", "honorarios"] as const).map(
            (cat) => (
              <div
                key={cat}
                className="rounded-lg border border-border p-3"
              >
                <p className="text-xs text-muted">
                  {CATEGORIA_LABEL[cat]}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  ${money(porCategoriaSemana.get(cat) ?? 0)}
                </p>
              </div>
            ),
          )}
        </div>

        {gastosSemana.length === 0 ? (
          <p className="text-sm text-muted">
            No hay movimientos cargados en este rango.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-1.5 pr-4 font-medium">Fecha</th>
                <th className="py-1.5 pr-4 font-medium">Paquete</th>
                <th className="py-1.5 pr-4 font-medium">Categoría</th>
                <th className="py-1.5 pr-4 font-medium">Descripción</th>
                <th className="py-1.5 pr-4 font-medium">Proveedor</th>
                <th className="py-1.5 pr-4 font-medium">Monto</th>
                <th className="py-1.5 pr-4 font-medium">Respaldo</th>
              </tr>
            </thead>
            <tbody>
              {gastosSemana.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-border/60"
                >
                  <td className="py-1.5 pr-4">{g.fecha}</td>
                  <td className="py-1.5 pr-4">
                    {g.paquete ? `${g.paquete.codigo} · ${g.paquete.nombre}` : "—"}
                  </td>
                  <td className="py-1.5 pr-4">{CATEGORIA_LABEL[g.categoria]}</td>
                  <td className="py-1.5 pr-4">{g.descripcion ?? "—"}</td>
                  <td className="py-1.5 pr-4">{g.proveedor ?? "—"}</td>
                  <td className="py-1.5 pr-4">
                    ${money(g.monto)} {g.moneda}
                  </td>
                  <td className="py-1.5 pr-4">
                    {g.link_factura && (
                      <a href={g.link_factura} className="mr-2 underline">
                        Factura
                      </a>
                    )}
                    {g.link_comprobante_pago && (
                      <a href={g.link_comprobante_pago} className="underline">
                        Comprobante
                      </a>
                    )}
                    {!g.link_factura && !g.link_comprobante_pago && "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 2. Estado general */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          2. Estado general
        </h2>
        <p className="mb-3 text-sm text-foreground">
          Inversión acumulada a la fecha:{" "}
          <span className="font-semibold">${money(inversionAcumulada)}</span>
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(["mano_de_obra", "materiales", "honorarios"] as const).map(
            (cat) => (
              <div
                key={cat}
                className="rounded-lg border border-border p-3"
              >
                <p className="text-xs text-muted">
                  {CATEGORIA_LABEL[cat]} (acumulado)
                </p>
                <p className="text-lg font-semibold text-foreground">
                  ${money(porCategoriaAcumulado.get(cat) ?? 0)}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* 3. Puntos de atención */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          3. Puntos de atención
        </h2>
        {puntosDeAtencion.length === 0 ? (
          <p className="text-sm text-muted">
            No hay nada para revisar por ahora.
          </p>
        ) : (
          <ul className="space-y-1">
            {puntosDeAtencion.map((h, i) => (
              <li
                key={i}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              >
                {h.mensaje}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4. Tabla maestra por paquete */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          4. Tabla maestra por paquete
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-1.5 pr-4 font-medium">Código</th>
              <th className="py-1.5 pr-4 font-medium">Nombre</th>
              <th className="py-1.5 pr-4 font-medium">Vigente</th>
              <th className="py-1.5 pr-4 font-medium">Ejecutado</th>
              <th className="py-1.5 pr-4 font-medium">Desvío</th>
              <th className="py-1.5 pr-4 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {tablaMaestra.map((f) => (
              <tr
                key={f.id}
                className="border-b border-border/60"
              >
                <td className="py-1.5 pr-4 font-mono text-xs">{f.codigo}</td>
                <td
                  className="py-1.5 pr-4"
                  style={{ paddingLeft: `${f.nivel * 16}px` }}
                >
                  {f.nombre}
                </td>
                <td className="py-1.5 pr-4">${money(f.vigente)}</td>
                <td className="py-1.5 pr-4">${money(f.ejecutado)}</td>
                <td
                  className={
                    f.desvio > 0
                      ? "py-1.5 text-danger"
                      : "py-1.5"
                  }
                >
                  ${money(f.desvio)}
                </td>
                <td className="py-1.5 pr-4">
                  {f.pct != null ? `${f.pct.toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 5. Gráficos */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          5. Gráficos
        </h2>

        <p className="mb-2 text-sm font-medium text-foreground">
          Vigente vs. ejecutado por paquete
        </p>
        <svg
          viewBox={`0 0 ${anchoGrafico} ${altoGrafico}`}
          className="mb-6 w-full"
        >
          {raices.map((f, i) => {
            const x = i * anchoSlot;
            const wBarra = anchoSlot / 3;
            const hVigente = (f.vigente / maxBarra) * altoBarras;
            const hEjecutado = (f.ejecutado / maxBarra) * altoBarras;
            const colorEjecutado = f.ejecutado > f.vigente ? "#dc2626" : "#2563eb";
            return (
              <g key={f.id}>
                <rect
                  x={x + anchoSlot / 2 - wBarra - 2}
                  y={margenSup + altoBarras - hVigente}
                  width={wBarra}
                  height={hVigente}
                  fill="#a1a1aa"
                />
                <rect
                  x={x + anchoSlot / 2 + 2}
                  y={margenSup + altoBarras - hEjecutado}
                  width={wBarra}
                  height={hEjecutado}
                  fill={colorEjecutado}
                />
                <text
                  x={x + anchoSlot / 2}
                  y={altoGrafico - margenInf + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fill="currentColor"
                >
                  {f.codigo}
                </text>
              </g>
            );
          })}
          <line
            x1="0"
            y1={margenSup + altoBarras}
            x2={anchoGrafico}
            y2={margenSup + altoBarras}
            stroke="currentColor"
            strokeOpacity="0.2"
          />
        </svg>

        <p className="mb-2 text-sm font-medium text-foreground">
          Evolución acumulada semanal
        </p>
        {serieSemanal.length > 1 && (
          <svg
            viewBox={`0 0 ${anchoGrafico} ${altoGrafico}`}
            className="w-full"
          >
            {(() => {
              const maxAcum = Math.max(
                1,
                ...serieSemanal.map((p) => p.acumulado),
              );
              const pasoX = anchoGrafico / (serieSemanal.length - 1);
              const puntos = serieSemanal
                .map((p, i) => {
                  const x = i * pasoX;
                  const y =
                    margenSup + altoBarras -
                    (p.acumulado / maxAcum) * altoBarras;
                  return `${x},${y}`;
                })
                .join(" ");
              return (
                <>
                  <polyline
                    points={puntos}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                  />
                  <line
                    x1="0"
                    y1={margenSup + altoBarras}
                    x2={anchoGrafico}
                    y2={margenSup + altoBarras}
                    stroke="currentColor"
                    strokeOpacity="0.2"
                  />
                  <text x="0" y={altoGrafico - margenInf + 16} fontSize="11" fill="currentColor">
                    {serieSemanal[0].semana}
                  </text>
                  <text
                    x={anchoGrafico}
                    y={altoGrafico - margenInf + 16}
                    textAnchor="end"
                    fontSize="11"
                    fill="currentColor"
                  >
                    {serieSemanal[serieSemanal.length - 1].semana}
                  </text>
                </>
              );
            })()}
          </svg>
        )}
      </section>

      {/* 6. Detalle por paquete */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          6. Detalle por paquete
        </h2>
        {raices.map((f) => {
          const revisionesPaquete = revisiones.filter(
            (r) => r.paquete_id === f.id,
          );
          const gastosPaquete = gastos.filter((g) => g.paquete_id === f.id);
          if (revisionesPaquete.length === 0 && gastosPaquete.length === 0) {
            return null;
          }
          return (
            <div key={f.id} className="mb-5">
              <h3 className="mb-1 text-sm font-semibold text-foreground">
                {f.codigo} · {f.nombre}
              </h3>

              {revisionesPaquete.length > 0 && (
                <ul className="mb-2 space-y-0.5 text-xs text-muted">
                  {revisionesPaquete.map((r) => (
                    <li key={r.id}>
                      Adicional {r.fecha}: ${money(r.monto_nuevo)} ({r.estado})
                    </li>
                  ))}
                </ul>
              )}

              <table className="w-full text-xs">
                <tbody>
                  {gastosPaquete.map((g) => {
                    const esDeLaSemana = g.fecha >= desde && g.fecha <= hasta;
                    return (
                      <tr
                        key={g.id}
                        className={
                          esDeLaSemana
                            ? "bg-warning-soft"
                            : ""
                        }
                      >
                        <td className="py-1 pr-4">{g.fecha}</td>
                        <td className="py-1 pr-4">
                          {CATEGORIA_LABEL[g.categoria]}
                        </td>
                        <td className="py-1 pr-4">{g.descripcion ?? "—"}</td>
                        <td className="py-1">${money(g.monto)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </section>

      {/* 7. Honorarios cobrados */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          7. Honorarios cobrados
        </h2>
        <p className="mb-2 text-sm text-foreground">
          Cobrado a la fecha:{" "}
          <span className="font-semibold">${money(honorariosAcumulados)}</span>
        </p>
        {honorariosSemana.length > 0 && (
          <table className="w-full text-sm">
            <tbody>
              {honorariosSemana.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-border/60"
                >
                  <td className="py-1.5 pr-4">{g.fecha}</td>
                  <td className="py-1.5 pr-4">${money(g.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
