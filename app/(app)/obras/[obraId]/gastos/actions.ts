"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function leerCampos(formData: FormData) {
  const cotizacion_usd_dia = formData.get("cotizacion_usd_dia") as string;

  return {
    paquete_id: (formData.get("paquete_id") as string) || null,
    fecha: formData.get("fecha") as string,
    categoria: formData.get("categoria") as string,
    descripcion: (formData.get("descripcion") as string) || null,
    proveedor: (formData.get("proveedor") as string) || null,
    pagado_por: (formData.get("pagado_por") as string) || null,
    forma_pago: (formData.get("forma_pago") as string) || null,
    monto: Number(formData.get("monto")),
    moneda: formData.get("moneda") as string,
    cotizacion_usd_dia: cotizacion_usd_dia ? Number(cotizacion_usd_dia) : null,
    link_factura: (formData.get("link_factura") as string) || null,
    link_comprobante_pago:
      (formData.get("link_comprobante_pago") as string) || null,
  };
}

export async function crearGasto(formData: FormData) {
  const obra_id = formData.get("obra_id") as string;
  const supabase = await createClient();

  const { error } = await supabase
    .from("gastos")
    .insert({ obra_id, ...leerCampos(formData) });

  if (error) {
    redirect(
      `/obras/${obra_id}/gastos?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/obras/${obra_id}/gastos`);
  redirect(`/obras/${obra_id}/gastos`);
}

export async function actualizarGasto(formData: FormData) {
  const id = formData.get("id") as string;
  const obra_id = formData.get("obra_id") as string;
  const supabase = await createClient();

  const { error } = await supabase
    .from("gastos")
    .update(leerCampos(formData))
    .eq("id", id);

  if (error) {
    redirect(
      `/obras/${obra_id}/gastos/${id}/editar?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/obras/${obra_id}/gastos`);
  redirect(`/obras/${obra_id}/gastos`);
}

export async function borrarGasto(formData: FormData) {
  const id = formData.get("id") as string;
  const obra_id = formData.get("obra_id") as string;
  const supabase = await createClient();

  await supabase.from("gastos").delete().eq("id", id);

  revalidatePath(`/obras/${obra_id}/gastos`);
  redirect(`/obras/${obra_id}/gastos`);
}
