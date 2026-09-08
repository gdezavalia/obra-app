"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function crearObra(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const cliente = formData.get("cliente") as string;
  const moneda_base = formData.get("moneda_base") as string;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obras")
    .insert({ nombre, cliente: cliente || null, moneda_base })
    .select("id")
    .single();

  if (error) {
    redirect(`/obras?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/obras");
  redirect(`/obras/${data.id}`);
}
