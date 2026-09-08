"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function leerCampos(formData: FormData) {
  const parent_id = (formData.get("parent_id") as string) || null;
  const presupuesto_base = formData.get("presupuesto_base") as string;
  const moneda = (formData.get("moneda") as string) || null;

  return {
    codigo: formData.get("codigo") as string,
    nombre: formData.get("nombre") as string,
    tipo: formData.get("tipo") as string,
    parent_id,
    presupuesto_base: presupuesto_base ? Number(presupuesto_base) : null,
    moneda,
  };
}

export async function crearPaquete(formData: FormData) {
  const obra_id = formData.get("obra_id") as string;
  const supabase = await createClient();

  const { error } = await supabase
    .from("paquetes")
    .insert({ obra_id, ...leerCampos(formData) });

  if (error) {
    redirect(
      `/obras/${obra_id}/paquetes?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/obras/${obra_id}/paquetes`);
  redirect(`/obras/${obra_id}/paquetes`);
}

export async function actualizarPaquete(formData: FormData) {
  const id = formData.get("id") as string;
  const obra_id = formData.get("obra_id") as string;
  const supabase = await createClient();

  const { error } = await supabase
    .from("paquetes")
    .update(leerCampos(formData))
    .eq("id", id);

  if (error) {
    redirect(
      `/obras/${obra_id}/paquetes/${id}/editar?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/obras/${obra_id}/paquetes`);
  redirect(`/obras/${obra_id}/paquetes`);
}

export async function borrarPaquete(formData: FormData) {
  const id = formData.get("id") as string;
  const obra_id = formData.get("obra_id") as string;
  const supabase = await createClient();

  await supabase.from("paquetes").delete().eq("id", id);

  revalidatePath(`/obras/${obra_id}/paquetes`);
  redirect(`/obras/${obra_id}/paquetes`);
}
