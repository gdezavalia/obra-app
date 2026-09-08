"use client";

import { useState } from "react";
import { controlBase } from "./field";

function limpiar(valor: string) {
  const v = valor.replace(/[^\d,]/g, "");
  const [entero, ...resto] = v.split(",");
  const tieneComa = resto.length > 0;
  const decimal = tieneComa ? resto.join("").slice(0, 2) : undefined;
  return { entero: entero ?? "", decimal, tieneComa };
}

function formatear({
  entero,
  decimal,
  tieneComa,
}: {
  entero: string;
  decimal?: string;
  tieneComa: boolean;
}) {
  const enteroFmt = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return tieneComa ? `${enteroFmt},${decimal ?? ""}` : enteroFmt;
}

function inicial(valor?: number | null) {
  if (valor == null) return { display: "", raw: "" };
  const [entero, decimal] = valor.toString().split(".");
  return {
    display: formatear({ entero, decimal, tieneComa: decimal !== undefined }),
    raw: decimal ? `${entero}.${decimal}` : entero,
  };
}

export function MoneyInput({
  name,
  defaultValue,
  required,
  className = "",
}: {
  name: string;
  defaultValue?: number | null;
  required?: boolean;
  className?: string;
}) {
  const init = inicial(defaultValue);
  const [display, setDisplay] = useState(init.display);
  const [raw, setRaw] = useState(init.raw);

  return (
    <div>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => {
          const { entero, decimal, tieneComa } = limpiar(e.target.value);
          setDisplay(formatear({ entero, decimal, tieneComa }));
          setRaw(decimal !== undefined ? `${entero}.${decimal}` : entero);
        }}
        required={required}
        placeholder="0"
        className={`${controlBase} ${className}`}
      />
      <input type="hidden" name={name} value={raw} />
    </div>
  );
}
