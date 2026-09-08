import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { construirTablaMaestra, serieAcumuladaSemanal } from "@/lib/reporte";
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
          "id, paquete_id, fecha, monto_anterior, monto_nuevo, estado, documento, paquetes!inner(obra_id)",
        )
        .eq("paquetes.obra_id", obraId),
      supabase
        .from("gastos")
        .select(
          "id, fecha, categoria, descripcion, proveedor, monto, moneda, paquete_id, revision_id, link_factura, link_comprobante_pago, paquetes(codigo, nombre), proveedores(nombre)",
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
    documento: r.documento as string | null,
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

  const gastos: GastoFila[] = (gastosRaw ?? []).map((g) => {
    const proveedorVinculado = Array.isArray(g.proveedores)
      ? g.proveedores[0]
      : g.proveedores;
    return {
      ...g,
      paquete: Array.isArray(g.paquetes) ? g.paquetes[0] : g.paquetes,
      proveedor: proveedorVinculado?.nombre ?? g.proveedor,
    };
  });

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

  const serieSemanal = serieAcumuladaSemanal(gastos, hasta);

  const honorariosSemana = gastosSemana.filter(
    (g) => g.categoria === "honorarios",
  );
  const honorariosAcumulados = gastos
    .filter((g) => g.categoria === "honorarios")
    .reduce((acc, g) => acc + g.monto, 0);

  // --- Gráfico: vigente vs. ejecutado por ítem (barras horizontales) ---
  const anchoGrafico = 720;
  const maxBarra = Math.max(
    1,
    ...raices.map((f) => Math.max(f.vigente, f.ejecutado)),
  );
  const alturaFila = 32;
  const margenIzqBarras = 150;
  const margenInfBarras = 30;
  const anchoAreaBarras = anchoGrafico - margenIzqBarras - 16;
  const altoAreaBarras = raices.length * alturaFila;
  const altoGraficoBarras = altoAreaBarras + margenInfBarras;

  // --- Gráfico: evolución acumulada semanal ---
  const altoEvol = 260;
  const margenSupEvol = 20;
  const margenInfEvol = 30;
  const margenIzqEvol = 70;
  const altoAreaEvol = altoEvol - margenSupEvol - margenInfEvol;
  const anchoAreaEvol = anchoGrafico - margenIzqEvol;

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-8 print:max-w-none print:px-0 print:py-0">
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
              <div key={cat} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted">{CATEGORIA_LABEL[cat]}</p>
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
                <th className="py-1.5 pr-6 font-medium">Fecha</th>
                <th className="py-1.5 pr-6 font-medium">Ítem</th>
                <th className="py-1.5 pr-6 font-medium">Categoría</th>
                <th className="py-1.5 pr-6 font-medium">Descripción</th>
                <th className="py-1.5 pr-6 font-medium">Proveedor</th>
                <th className="py-1.5 pr-6 font-medium">Monto</th>
                <th className="py-1.5 pr-6 font-medium">Respaldo</th>
              </tr>
            </thead>
            <tbody>
              {gastosSemana.map((g) => (
                <tr key={g.id} className="border-b border-border/60">
                  <td className="py-1.5 pr-6">{g.fecha}</td>
                  <td className="py-1.5 pr-6">
                    {g.paquete ? `${g.paquete.codigo} · ${g.paquete.nombre}` : "—"}
                  </td>
                  <td className="py-1.5 pr-6">{CATEGORIA_LABEL[g.categoria]}</td>
                  <td className="py-1.5 pr-6">{g.descripcion ?? "—"}</td>
                  <td className="py-1.5 pr-6">{g.proveedor ?? "—"}</td>
                  <td className="py-1.5 pr-6">
                    ${money(g.monto)} {g.moneda}
                  </td>
                  <td className="py-1.5 pr-6">
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
              <div key={cat} className="rounded-lg border border-border p-3">
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

      {/* 3. Tabla maestra por ítem */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          3. Tabla maestra por ítem
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-1.5 pr-6 font-medium">Código</th>
              <th className="py-1.5 pr-6 font-medium">Ítem</th>
              <th className="py-1.5 pr-6 font-medium">Vigente</th>
              <th className="py-1.5 pr-6 font-medium">Ejecutado</th>
              <th className="py-1.5 pr-6 font-medium">Desvío</th>
              <th className="py-1.5 pr-6 font-medium">Avance</th>
            </tr>
          </thead>
          <tbody>
            {tablaMaestra.map((f) => (
              <tr key={f.id} className="border-b border-border/60">
                <td className="py-1.5 pr-6 font-mono text-xs">{f.codigo}</td>
                <td
                  className="py-1.5 pr-6"
                  style={{ paddingLeft: `${f.nivel * 16}px` }}
                >
                  {f.nombre}
                </td>
                <td className="py-1.5 pr-6">${money(f.vigente)}</td>
                <td className="py-1.5 pr-6">${money(f.ejecutado)}</td>
                <td className={f.desvio > 0 ? "py-1.5 pr-6 text-danger" : "py-1.5 pr-6"}>
                  ${money(f.desvio)}
                </td>
                <td className="py-1.5 pr-6">
                  {f.pct != null ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-border">
                        <div
                          className={f.pct > 100 ? "h-full bg-danger" : "h-full bg-accent"}
                          style={{ width: `${Math.min(100, f.pct)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted">
                        {f.pct.toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 4. Gráficos */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          4. Gráficos
        </h2>

        <p className="mb-2 text-sm font-medium text-foreground">
          Vigente vs. ejecutado por ítem
        </p>
        {raices.length > 0 && (
          <svg
            viewBox={`0 0 ${anchoGrafico} ${altoGraficoBarras}`}
            className="mb-8 w-full"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const x = margenIzqBarras + frac * anchoAreaBarras;
              return (
                <g key={frac}>
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={altoAreaBarras}
                    stroke="var(--border)"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={altoAreaBarras + 16}
                    textAnchor={frac === 0 ? "start" : frac === 1 ? "end" : "middle"}
                    fontSize="10"
                    fill="var(--muted)"
                  >
                    ${money(Math.round(frac * maxBarra))}
                  </text>
                </g>
              );
            })}
            {raices.map((f, i) => {
              const y = i * alturaFila;
              const grosor = 14;
              const barY = y + (alturaFila - grosor) / 2;
              const wVigente = (f.vigente / maxBarra) * anchoAreaBarras;
              const wEjecutado = (f.ejecutado / maxBarra) * anchoAreaBarras;
              const sobre = f.ejecutado > f.vigente;
              return (
                <g key={f.id}>
                  <text
                    x={margenIzqBarras - 10}
                    y={y + alturaFila / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize="12"
                    fill="var(--foreground)"
                  >
                    {f.nombre}
                  </text>
                  <rect
                    x={margenIzqBarras}
                    y={barY}
                    width={wVigente}
                    height={grosor}
                    rx="3"
                    fill="var(--border)"
                  />
                  <rect
                    x={margenIzqBarras}
                    y={barY}
                    width={wEjecutado}
                    height={grosor}
                    rx="3"
                    fill={sobre ? "var(--danger)" : "var(--accent)"}
                  />
                </g>
              );
            })}
          </svg>
        )}

        <p className="mb-2 text-sm font-medium text-foreground">
          Evolución acumulada semanal
        </p>
        {serieSemanal.length > 1 && (
          <svg viewBox={`0 0 ${anchoGrafico} ${altoEvol}`} className="w-full">
            {(() => {
              const maxAcum = Math.max(1, ...serieSemanal.map((p) => p.acumulado));
              const pasoX = anchoAreaEvol / (serieSemanal.length - 1);
              const puntos = serieSemanal
                .map((p, i) => {
                  const x = margenIzqEvol + i * pasoX;
                  const y =
                    margenSupEvol + altoAreaEvol -
                    (p.acumulado / maxAcum) * altoAreaEvol;
                  return `${x},${y}`;
                })
                .join(" ");

              const maxEtiquetas = 7;
              const pasoEtiqueta = Math.max(
                1,
                Math.ceil(serieSemanal.length / maxEtiquetas),
              );

              return (
                <>
                  {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                    const y = margenSupEvol + altoAreaEvol - frac * altoAreaEvol;
                    return (
                      <g key={frac}>
                        <line
                          x1={margenIzqEvol}
                          y1={y}
                          x2={anchoGrafico}
                          y2={y}
                          stroke="var(--border)"
                          strokeWidth="1"
                        />
                        <text
                          x={margenIzqEvol - 8}
                          y={y}
                          textAnchor="end"
                          dominantBaseline="middle"
                          fontSize="10"
                          fill="var(--muted)"
                        >
                          ${money(Math.round(frac * maxAcum))}
                        </text>
                      </g>
                    );
                  })}
                  <line
                    x1={margenIzqEvol}
                    y1={margenSupEvol}
                    x2={margenIzqEvol}
                    y2={margenSupEvol + altoAreaEvol}
                    stroke="var(--border)"
                    strokeWidth="1"
                  />
                  <polyline
                    points={puntos}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                  />
                  {serieSemanal.map((p, i) => {
                    const esUltima = i === serieSemanal.length - 1;
                    if (i % pasoEtiqueta !== 0 && !esUltima) return null;
                    const x = margenIzqEvol + i * pasoX;
                    return (
                      <text
                        key={p.semana}
                        x={x}
                        y={altoEvol - margenInfEvol + 16}
                        textAnchor={esUltima ? "end" : "middle"}
                        fontSize="10"
                        fill="var(--muted)"
                      >
                        {p.semana.slice(5)}
                      </text>
                    );
                  })}
                </>
              );
            })()}
          </svg>
        )}
      </section>

      {/* 5. Detalle por ítem */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          5. Detalle por ítem
        </h2>
        {raices.map((f) => {
          const revisionesItem = revisiones.filter((r) => r.paquete_id === f.id);
          const gastosItem = gastos.filter((g) => g.paquete_id === f.id);
          if (revisionesItem.length === 0 && gastosItem.length === 0) {
            return null;
          }
          const totalItem = gastosItem.reduce((acc, g) => acc + g.monto, 0);
          return (
            <div key={f.id} className="mb-6">
              <h3 className="mb-1 text-sm font-semibold text-foreground">
                {f.codigo} · {f.nombre}
              </h3>

              {revisionesItem.length > 0 && (
                <ul className="mb-2 space-y-0.5 text-xs text-muted">
                  {revisionesItem.map((r) =>
                    r.documento ? (
                      <li key={r.id}>
                        <a href={r.documento} className="underline">
                          Adicional {r.fecha}: ${money(r.monto_nuevo)} (
                          {r.estado})
                        </a>
                      </li>
                    ) : (
                      <li key={r.id}>
                        Adicional {r.fecha}: ${money(r.monto_nuevo)} (
                        {r.estado})
                      </li>
                    ),
                  )}
                </ul>
              )}

              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="py-1 pr-6 font-medium">Fecha</th>
                    <th className="py-1 pr-6 font-medium">Categoría</th>
                    <th className="py-1 pr-6 font-medium">Descripción</th>
                    <th className="py-1 pr-6 font-medium">Proveedor</th>
                    <th className="py-1 pr-6 font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosItem.map((g) => {
                    const esDeLaSemana = g.fecha >= desde && g.fecha <= hasta;
                    return (
                      <tr key={g.id} className={esDeLaSemana ? "bg-warning-soft" : ""}>
                        <td className="py-1 pr-6">{g.fecha}</td>
                        <td className="py-1 pr-6">{CATEGORIA_LABEL[g.categoria]}</td>
                        <td className="py-1 pr-6">{g.descripcion ?? "—"}</td>
                        <td className="py-1 pr-6">{g.proveedor ?? "—"}</td>
                        <td className="py-1 pr-6">${money(g.monto)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-1 text-xs font-medium text-foreground">
                Total gastado: ${money(totalItem)}
              </p>
            </div>
          );
        })}
      </section>

      {/* 6. Honorarios cobrados */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          6. Honorarios cobrados
        </h2>
        <p className="mb-2 text-sm text-foreground">
          Cobrado a la fecha:{" "}
          <span className="font-semibold">${money(honorariosAcumulados)}</span>
        </p>
        {honorariosSemana.length > 0 && (
          <table className="w-full text-sm">
            <tbody>
              {honorariosSemana.map((g) => (
                <tr key={g.id} className="border-b border-border/60">
                  <td className="py-1.5 pr-6">{g.fecha}</td>
                  <td className="py-1.5 pr-6">${money(g.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
