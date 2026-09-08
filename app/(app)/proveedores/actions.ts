"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function crearProveedor(formData: FormData) {
  const nombre = (formData.get("nombre") as string)?.trim();
  const supabase = await createClient();

  const { error } = await supabase.from("proveedores").insert({ nombre });

  if (error) {
    redirect(`/proveedores/nuevo?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/proveedores");
  redirect("/proveedores");
}

export async function borrarProveedor(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  await supabase.from("proveedores").delete().eq("id", id);

  revalidatePath("/proveedores");
  redirect("/proveedores");
}
