import { calcularVigente } from "./presupuesto";

export type Gasto = {
  id: string;
  fecha: string;
  categoria: "mano_de_obra" | "materiales" | "honorarios";
  monto: number;
  proveedor: string | null;
  paquete_id: string | null;
  revision_id: string | null;
  link_factura: string | null;
  link_comprobante_pago: string | null;
};

export type Paquete = {
  id: string;
  codigo: string;
  nombre: string;
  presupuesto_base: number | null;
};

export type Revision = {
  id: string;
  paquete_id: string;
  fecha: string;
  monto_anterior: number | null;
  monto_nuevo: number;
  estado: "pendiente" | "aprobado" | "rechazado" | "ejecutado";
};

export type Hallazgo = {
  regla: number;
  mensaje: string;
};

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? (ordenados[mitad - 1] + ordenados[mitad]) / 2
    : ordenados[mitad];
}

function lunesDeLaSemana(fechaISO: string): string {
  const d = new Date(fechaISO + "T00:00:00");
  const dia = d.getDay(); // 0=domingo
  const offset = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function paqueteLabel(paquetes: Paquete[], id: string | null): string {
  const p = paquetes.find((x) => x.id === id);
  return p ? `${p.codigo} · ${p.nombre}` : "paquete desconocido";
}

// #1 — Monto fuera de orden de magnitud vs. la mediana del paquete
export function validarMontosFueraDeMagnitud(
  gastos: Gasto[],
  paquetes: Paquete[],
): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const porPaquete = new Map<string, Gasto[]>();
  for (const g of gastos) {
    if (!g.paquete_id) continue;
    const lista = porPaquete.get(g.paquete_id) ?? [];
    lista.push(g);
    porPaquete.set(g.paquete_id, lista);
  }
  for (const [paqueteId, lista] of porPaquete) {
    if (lista.length < 3) continue;
    const med = mediana(lista.map((g) => g.monto));
    if (!med || med <= 0) continue;
    for (const g of lista) {
      const ratio = g.monto / med;
      if (ratio > 10 || ratio < 0.1) {
        hallazgos.push({
          regla: 1,
          mensaje: `Gasto de $${g.monto.toLocaleString("es-AR")} en ${paqueteLabel(paquetes, paqueteId)} el ${g.fecha} está muy lejos de la mediana del paquete ($${med.toLocaleString("es-AR")}). Revisar si el monto está bien cargado.`,
        });
      }
    }
  }
  return hallazgos;
}

// #2 — Honorarios liquidados sobre una semana con gastos cargados después
export function validarHonorariosVsGastosPosteriores(
  gastos: Gasto[],
  pctHonorarios: number | null,
): Hallazgo[] {
  if (!pctHonorarios) return [];
  const hallazgos: Hallazgo[] = [];
  const honorariosPorSemana = new Map<string, number>();
  const baseObraPorSemana = new Map<string, number>();

  for (const g of gastos) {
    const semana = lunesDeLaSemana(g.fecha);
    if (g.categoria === "honorarios") {
      honorariosPorSemana.set(
        semana,
        (honorariosPorSemana.get(semana) ?? 0) + g.monto,
      );
    } else {
      baseObraPorSemana.set(
        semana,
        (baseObraPorSemana.get(semana) ?? 0) + g.monto,
      );
    }
  }

  for (const [semana, honorario] of honorariosPorSemana) {
    const base = baseObraPorSemana.get(semana) ?? 0;
    const esperado = base * (pctHonorarios / 100);
    if (esperado - honorario > 1) {
      hallazgos.push({
        regla: 2,
        mensaje: `Semana del ${semana}: el honorario liquidado ($${honorario.toLocaleString("es-AR")}) es menor al ${pctHonorarios}% de los gastos de esa semana ($${base.toLocaleString("es-AR")} → esperado $${esperado.toLocaleString("es-AR")}). Puede haber gastos cargados después de liquidar.`,
      });
    }
  }
  return hallazgos;
}

// #3 — Honorarios con un paquete asignado (no deberían imputarse a un rubro)
export function validarHonorariosConPaquete(gastos: Gasto[]): Hallazgo[] {
  return gastos
    .filter((g) => g.categoria === "honorarios" && g.paquete_id)
    .map((g) => ({
      regla: 3,
      mensaje: `Gasto de honorarios del ${g.fecha} ($${g.monto.toLocaleString("es-AR")}) tiene un paquete asignado — revisar si la categoría está bien cargada.`,
    }));
}

// #4 — Paquete que supera el 90%/100% del presupuesto vigente
export function validarPresupuestoSuperado(
  gastos: Gasto[],
  paquetes: Paquete[],
  revisiones: Revision[],
): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  for (const p of paquetes) {
    const vigente = calcularVigente(p.presupuesto_base, p.id, revisiones);
    if (vigente <= 0) continue;
    const ejecutado = gastos
      .filter((g) => g.paquete_id === p.id)
      .reduce((acc, g) => acc + g.monto, 0);
    const pct = (ejecutado / vigente) * 100;
    if (pct >= 90) {
      hallazgos.push({
        regla: 4,
        mensaje: `${paqueteLabel(paquetes, p.id)} lleva ejecutado $${ejecutado.toLocaleString("es-AR")} de $${vigente.toLocaleString("es-AR")} vigentes (${pct.toFixed(1)}%).`,
      });
    }
  }
  return hallazgos;
}

// #5 — Revisión pendiente hace más de 7 días
export function validarRevisionesPendientes(
  revisiones: Revision[],
  paquetes: Paquete[],
): Hallazgo[] {
  const hoy = Date.now();
  return revisiones
    .filter((r) => r.estado === "pendiente")
    .filter((r) => {
      const dias = Math.floor(
        (hoy - new Date(r.fecha).getTime()) / (1000 * 60 * 60 * 24),
      );
      return dias > 7;
    })
    .map((r) => {
      const dias = Math.floor(
        (hoy - new Date(r.fecha).getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        regla: 5,
        mensaje: `Adicional de ${paqueteLabel(paquetes, r.paquete_id)} por $${r.monto_nuevo.toLocaleString("es-AR")} lleva ${dias} días pendiente.`,
      };
    });
}

// #6 — Gasto de mano de obra sin proveedor
export function validarManoDeObraSinProveedor(gastos: Gasto[]): Hallazgo[] {
  return gastos
    .filter((g) => g.categoria === "mano_de_obra" && !g.proveedor?.trim())
    .map((g) => ({
      regla: 6,
      mensaje: `Gasto de mano de obra del ${g.fecha} ($${g.monto.toLocaleString("es-AR")}) no tiene proveedor cargado.`,
    }));
}

// #7 — Gasto sin respaldo cuando ese proveedor históricamente lo tenía
export function validarSinRespaldoHistoricoProveedor(
  gastos: Gasto[],
): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const porProveedor = new Map<string, Gasto[]>();
  for (const g of gastos) {
    if (!g.proveedor?.trim()) continue;
    const lista = porProveedor.get(g.proveedor) ?? [];
    lista.push(g);
    porProveedor.set(g.proveedor, lista);
  }
  const tieneRespaldo = (g: Gasto) =>
    Boolean(g.link_factura?.trim() || g.link_comprobante_pago?.trim());

  for (const [proveedor, lista] of porProveedor) {
    if (lista.length < 3) continue;
    for (const g of lista) {
      if (tieneRespaldo(g)) continue;
      const otros = lista.filter((x) => x.id !== g.id);
      const conRespaldo = otros.filter(tieneRespaldo).length;
      const pctHistorico = conRespaldo / otros.length;
      if (pctHistorico >= 0.5) {
        hallazgos.push({
          regla: 7,
          mensaje: `Gasto del ${g.fecha} a ${proveedor} ($${g.monto.toLocaleString("es-AR")}) no tiene factura ni comprobante, aunque ese proveedor lo suele tener.`,
        });
      }
    }
  }
  return hallazgos;
}

// #10 — Gastos imputados a una revisión que superan su monto aprobado
export function validarGastosSuperanRevision(
  gastos: Gasto[],
  revisiones: Revision[],
  paquetes: Paquete[],
): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  for (const r of revisiones) {
    if (r.estado !== "aprobado" && r.estado !== "ejecutado") continue;
    const total = gastos
      .filter((g) => g.revision_id === r.id)
      .reduce((acc, g) => acc + g.monto, 0);
    if (total > r.monto_nuevo) {
      hallazgos.push({
        regla: 10,
        mensaje: `El adicional de ${paqueteLabel(paquetes, r.paquete_id)} por $${r.monto_nuevo.toLocaleString("es-AR")} tiene gastos imputados por $${total.toLocaleString("es-AR")}, superándolo.`,
      });
    }
  }
  return hallazgos;
}

export function correrValidaciones(
  gastos: Gasto[],
  paquetes: Paquete[],
  revisiones: Revision[],
  pctHonorarios: number | null,
): Hallazgo[] {
  return [
    ...validarMontosFueraDeMagnitud(gastos, paquetes),
    ...validarHonorariosVsGastosPosteriores(gastos, pctHonorarios),
    ...validarHonorariosConPaquete(gastos),
    ...validarPresupuestoSuperado(gastos, paquetes, revisiones),
    ...validarRevisionesPendientes(revisiones, paquetes),
    ...validarManoDeObraSinProveedor(gastos),
    ...validarSinRespaldoHistoricoProveedor(gastos),
    ...validarGastosSuperanRevision(gastos, revisiones, paquetes),
  ];
}
