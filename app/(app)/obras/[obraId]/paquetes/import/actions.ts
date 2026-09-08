"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCsv } from "@/lib/csv";

export type FilaImport = {
  codigo: string;
  nombre: string;
  estado: "aceptado" | "rechazado";
  motivo?: string;
};

const TIPOS_VALIDOS = ["trabajo", "materiales", "mixto"];

export async function importarPaquetes(formData: FormData) {
  const obra_id = formData.get("obra_id") as string;
  const file = formData.get("archivo") as File | null;

  if (!file || file.size === 0) {
    redirect(
      `/obras/${obra_id}/paquetes/import?error=${encodeURIComponent("Elegí un archivo CSV.")}`,
    );
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length === 0) {
    redirect(
      `/obras/${obra_id}/paquetes/import?error=${encodeURIComponent("El archivo está vacío.")}`,
    );
  }

  const header = rows[0].map((h) => h.toLowerCase());
  const dataRows = rows.slice(1);

  const idx = {
    codigo:
      header.indexOf("codigo") !== -1
        ? header.indexOf("codigo")
        : header.indexOf("código"),
    nombre: header.indexOf("nombre"),
    tipo: header.indexOf("tipo"),
    presupuesto_base: header.indexOf("presupuesto_base"),
    moneda: header.indexOf("moneda"),
  };

  if (idx.codigo === -1 || idx.nombre === -1 || idx.tipo === -1) {
    redirect(
      `/obras/${obra_id}/paquetes/import?error=${encodeURIComponent(
        "Faltan columnas obligatorias: codigo, nombre, tipo.",
      )}`,
    );
  }

  const supabase = await createClient();
  const { data: existentes } = await supabase
    .from("paquetes")
    .select("id, codigo")
    .eq("obra_id", obra_id);

  const codigoToId = new Map<string, string>(
    existentes?.map((p) => [p.codigo, p.id]),
  );
  const codigosVistos = new Set<string>(existentes?.map((p) => p.codigo));
  const resultado: FilaImport[] = [];

  for (const row of dataRows) {
    if (row.every((c) => c === "")) continue;

    const codigo = row[idx.codigo]?.trim() ?? "";
    const nombre = row[idx.nombre]?.trim() ?? "";
    const tipo = row[idx.tipo]?.trim().toLowerCase() ?? "";
    const presupuestoRaw =
      idx.presupuesto_base !== -1 ? row[idx.presupuesto_base]?.trim() : "";
    const moneda =
      idx.moneda !== -1 ? row[idx.moneda]?.trim() || null : null;

    if (!codigo || !nombre) {
      resultado.push({
        codigo,
        nombre,
        estado: "rechazado",
        motivo: "Falta código o nombre",
      });
      continue;
    }

    if (codigosVistos.has(codigo)) {
      resultado.push({
        codigo,
        nombre,
        estado: "rechazado",
        motivo: "Código duplicado",
      });
      continue;
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      resultado.push({
        codigo,
        nombre,
        estado: "rechazado",
        motivo: `Tipo inválido: "${tipo}" (debe ser trabajo, materiales o mixto)`,
      });
      continue;
    }

    let presupuesto_base: number | null = null;
    if (presupuestoRaw) {
      const n = Number(presupuestoRaw.replace(",", "."));
      if (Number.isNaN(n)) {
        resultado.push({
          codigo,
          nombre,
          estado: "rechazado",
          motivo: `Monto no numérico: "${presupuestoRaw}"`,
        });
        continue;
      }
      presupuesto_base = n;
    }

    const segmentos = codigo.split(".");
    let parent_id: string | null = null;
    if (segmentos.length > 1) {
      const codigoPadre = segmentos.slice(0, -1).join(".");
      const padreId = codigoToId.get(codigoPadre);
      if (!padreId) {
        resultado.push({
          codigo,
          nombre,
          estado: "rechazado",
          motivo: `Jerarquía rota: falta el código padre "${codigoPadre}"`,
        });
        continue;
      }
      parent_id = padreId;
    }

    const { data: inserted, error } = await supabase
      .from("paquetes")
      .insert({ obra_id, codigo, nombre, tipo, presupuesto_base, moneda, parent_id })
      .select("id")
      .single();

    if (error || !inserted) {
      resultado.push({
        codigo,
        nombre,
        estado: "rechazado",
        motivo: error?.message ?? "Error al guardar",
      });
      continue;
    }

    codigoToId.set(codigo, inserted.id);
    codigosVistos.add(codigo);
    resultado.push({ codigo, nombre, estado: "aceptado" });
  }

  revalidatePath(`/obras/${obra_id}/paquetes`);

  const reporte = Buffer.from(JSON.stringify(resultado)).toString("base64url");
  redirect(`/obras/${obra_id}/paquetes/import?reporte=${reporte}`);
}
