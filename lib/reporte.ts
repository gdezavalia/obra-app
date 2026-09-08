import { calcularVigente, type RevisionParaVigente } from "./presupuesto";

export type PaqueteBase = {
  id: string;
  parent_id: string | null;
  codigo: string;
  nombre: string;
  tipo: string;
  presupuesto_base: number | null;
};

export type FilaTablaMaestra = {
  id: string;
  codigo: string;
  nombre: string;
  nivel: number;
  vigente: number;
  ejecutado: number;
  desvio: number;
  pct: number | null;
};

// Roll-up por árbol: cada paquete acumula vigente/ejecutado propio +
// el de todos sus descendientes (dominio.md 5.2: profundidad arbitraria).
export function construirTablaMaestra(
  paquetes: PaqueteBase[],
  gastoPorPaquete: Map<string, number>,
  revisiones: RevisionParaVigente[],
): FilaTablaMaestra[] {
  const hijosDe = new Map<string | null, PaqueteBase[]>();
  for (const p of paquetes) {
    const lista = hijosDe.get(p.parent_id) ?? [];
    lista.push(p);
    hijosDe.set(p.parent_id, lista);
  }
  for (const lista of hijosDe.values()) {
    lista.sort((a, b) => a.codigo.localeCompare(b.codigo));
  }

  const filas: FilaTablaMaestra[] = [];

  function visitar(paquete: PaqueteBase, nivel: number): {
    vigente: number;
    ejecutado: number;
  } {
    const vigenteDirecto = calcularVigente(
      paquete.presupuesto_base,
      paquete.id,
      revisiones,
    );
    const ejecutadoDirecto = gastoPorPaquete.get(paquete.id) ?? 0;

    let vigenteTotal = vigenteDirecto;
    let ejecutadoTotal = ejecutadoDirecto;

    const hijos = hijosDe.get(paquete.id) ?? [];
    const filaIndex = filas.length;
    filas.push({
      id: paquete.id,
      codigo: paquete.codigo,
      nombre: paquete.nombre,
      nivel,
      vigente: 0,
      ejecutado: 0,
      desvio: 0,
      pct: null,
    });

    for (const hijo of hijos) {
      const r = visitar(hijo, nivel + 1);
      vigenteTotal += r.vigente;
      ejecutadoTotal += r.ejecutado;
    }

    filas[filaIndex] = {
      id: paquete.id,
      codigo: paquete.codigo,
      nombre: paquete.nombre,
      nivel,
      vigente: vigenteTotal,
      ejecutado: ejecutadoTotal,
      desvio: ejecutadoTotal - vigenteTotal,
      pct: vigenteTotal > 0 ? (ejecutadoTotal / vigenteTotal) * 100 : null,
    };

    return { vigente: vigenteTotal, ejecutado: ejecutadoTotal };
  }

  for (const raiz of hijosDe.get(null) ?? []) {
    visitar(raiz, 0);
  }

  return filas;
}

function lunes(fechaISO: string): string {
  const d = new Date(fechaISO + "T00:00:00");
  const dia = d.getDay();
  const offset = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export type PuntoSerie = { semana: string; total: number; acumulado: number };

// Evolución acumulada semanal (sección 5 del reporte): desde la primera
// semana con gastos hasta la semana de `hasta`, sin saltar semanas vacías.
export function serieAcumuladaSemanal(
  gastos: { fecha: string; monto: number }[],
  hasta: string,
): PuntoSerie[] {
  if (gastos.length === 0) return [];

  const totalPorSemana = new Map<string, number>();
  for (const g of gastos) {
    const s = lunes(g.fecha);
    totalPorSemana.set(s, (totalPorSemana.get(s) ?? 0) + g.monto);
  }

  const primeraSemana = [...totalPorSemana.keys()].sort()[0];
  const ultimaSemana = lunes(hasta);

  const puntos: PuntoSerie[] = [];
  let acumulado = 0;
  const cursor = new Date(primeraSemana + "T00:00:00");
  const fin = new Date(ultimaSemana + "T00:00:00");

  while (cursor <= fin) {
    const semana = cursor.toISOString().slice(0, 10);
    const total = totalPorSemana.get(semana) ?? 0;
    acumulado += total;
    puntos.push({ semana, total, acumulado });
    cursor.setDate(cursor.getDate() + 7);
  }

  return puntos;
}
