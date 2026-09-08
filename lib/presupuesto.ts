export type RevisionParaVigente = {
  paquete_id: string;
  monto_anterior: number | null;
  monto_nuevo: number;
  estado: "pendiente" | "aprobado" | "rechazado" | "ejecutado";
};

// Regla de negocio 1 (PRD): presupuesto vigente de un paquete = presupuesto_base
// + revisiones en estado aprobado o ejecutado.
export function calcularVigente(
  presupuestoBase: number | null,
  paqueteId: string,
  revisiones: RevisionParaVigente[],
): number {
  const deltas = revisiones
    .filter(
      (r) =>
        r.paquete_id === paqueteId &&
        (r.estado === "aprobado" || r.estado === "ejecutado"),
    )
    .reduce((acc, r) => acc + (r.monto_nuevo - (r.monto_anterior ?? 0)), 0);
  return (presupuestoBase ?? 0) + deltas;
}
