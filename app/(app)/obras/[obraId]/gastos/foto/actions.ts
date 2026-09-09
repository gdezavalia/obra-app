"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extraerComprobante } from "@/lib/ocr";

const TIPOS_SOPORTADOS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];
const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10MB

export async function analizarComprobante(formData: FormData) {
  const obra_id = formData.get("obra_id") as string;
  const archivo = formData.get("archivo") as File | null;

  if (!archivo || archivo.size === 0) {
    redirect(
      `/obras/${obra_id}/gastos/foto?error=${encodeURIComponent("Elegí una foto o PDF del comprobante.")}`,
    );
  }

  if (!TIPOS_SOPORTADOS.includes(archivo.type)) {
    redirect(
      `/obras/${obra_id}/gastos/foto?error=${encodeURIComponent("Formato no soportado. Usá una foto (JPG, PNG, WEBP) o un PDF.")}`,
    );
  }

  if (archivo.size > TAMANO_MAXIMO) {
    redirect(
      `/obras/${obra_id}/gastos/foto?error=${encodeURIComponent("El archivo pesa más de 10MB.")}`,
    );
  }

  const supabase = await createClient();
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const base64 = Buffer.from(bytes).toString("base64");

  const extension = archivo.name.split(".").pop() || "jpg";
  const ruta = `${obra_id}/${crypto.randomUUID()}.${extension}`;

  const { error: errorSubida } = await supabase.storage
    .from("comprobantes")
    .upload(ruta, bytes, { contentType: archivo.type });

  if (errorSubida) {
    redirect(
      `/obras/${obra_id}/gastos/foto?error=${encodeURIComponent(`No se pudo subir el archivo: ${errorSubida.message}`)}`,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("comprobantes").getPublicUrl(ruta);

  const extraido = await extraerComprobante(base64, archivo.type);

  const params = new URLSearchParams();
  params.set("link_factura", publicUrl);
  if (extraido) {
    if (extraido.fecha) params.set("fecha", extraido.fecha);
    if (extraido.proveedor) params.set("proveedor_texto", extraido.proveedor);
    if (extraido.descripcion) params.set("descripcion", extraido.descripcion);
    if (extraido.monto != null) params.set("monto", String(extraido.monto));
    if (extraido.forma_pago) params.set("forma_pago", extraido.forma_pago);
  } else {
    params.set("ocr_error", "1");
  }

  redirect(`/obras/${obra_id}/gastos/nuevo?${params.toString()}`);
}
