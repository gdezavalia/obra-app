"use client";

import { useState } from "react";
import { Field, Select, Input } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";

type Proveedor = { id: string; nombre: string };

export function CampoProveedor({
  proveedores,
  defaultProveedorId = "",
  defaultNombreNuevo = "",
}: {
  proveedores: Proveedor[];
  defaultProveedorId?: string;
  defaultNombreNuevo?: string;
}) {
  const [modoNuevo, setModoNuevo] = useState(Boolean(defaultNombreNuevo));

  return (
    <Field label="Proveedor">
      {!modoNuevo ? (
        <div className="flex gap-2">
          <Select
            name="proveedor_id"
            defaultValue={defaultProveedorId}
            className="flex-1"
          >
            <option value="">— sin especificar —</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() => setModoNuevo(true)}
            className={buttonVariants("secondary", "sm", "shrink-0")}
          >
            + nuevo
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            type="text"
            name="proveedor_nuevo"
            placeholder="Nombre del proveedor"
            defaultValue={defaultNombreNuevo}
            className="flex-1"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setModoNuevo(false)}
            className={buttonVariants("secondary", "sm", "shrink-0")}
          >
            cancelar
          </button>
        </div>
      )}
    </Field>
  );
}
