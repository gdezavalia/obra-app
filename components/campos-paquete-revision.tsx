"use client";

import { useState } from "react";
import { Field, Select } from "@/components/ui/field";

type Paquete = { id: string; codigo: string; nombre: string };
type Revision = { id: string; paquete_id: string; monto_nuevo: number; estado: string };

export function CamposPaqueteYRevision({
  paquetes,
  revisiones,
  defaultPaqueteId = "",
  defaultRevisionId = "",
}: {
  paquetes: Paquete[];
  revisiones: Revision[];
  defaultPaqueteId?: string;
  defaultRevisionId?: string;
}) {
  const [paqueteId, setPaqueteId] = useState(defaultPaqueteId);
  const [revisionId, setRevisionId] = useState(defaultRevisionId);

  const revisionesFiltradas = revisiones.filter(
    (r) => r.paquete_id === paqueteId,
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Paquete">
        <Select
          name="paquete_id"
          required
          value={paqueteId}
          onChange={(e) => {
            setPaqueteId(e.target.value);
            setRevisionId("");
          }}
        >
          <option value="" disabled>
            Elegir paquete
          </option>
          {paquetes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} · {p.nombre}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Adicional asociado (opcional)">
        <Select
          name="revision_id"
          value={revisionId}
          onChange={(e) => setRevisionId(e.target.value)}
          disabled={!paqueteId}
        >
          <option value="">— ninguno —</option>
          {revisionesFiltradas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.monto_nuevo.toLocaleString("es-AR")} ARS ({r.estado})
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
