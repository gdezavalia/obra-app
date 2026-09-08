"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function rutaBase(obra_id: string, paquete_id: string) {
  return `/obras/${obra_id}/paquetes/${paquete_id}/revisiones`;
}

export async function crearAdicional(formData: FormData) {
  const obra_id = formData.get("obra_id") as string;
  const paquete_id = formData.get("paquete_id") as string;
  const monto_anterior = formData.get("monto_anterior") as string;

  const supabase = await createClient();
  const { error } = await supabase.from("revisiones_presupuesto").insert({
    paquete_id,
    motivo: "adicional",
    fecha: formData.get("fecha") as string,
    monto_anterior: monto_anterior ? Number(monto_anterior) : null,
    monto_nuevo: Number(formData.get("monto_nuevo")),
    notas: (formData.get("notas") as string) || null,
    documento: (formData.get("documento") as string) || null,
    estado: "pendiente",
  });

  if (error) {
    redirect(
      `${rutaBase(obra_id, paquete_id)}/nuevo?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(rutaBase(obra_id, paquete_id));
  redirect(rutaBase(obra_id, paquete_id));
}

export async function actualizarAdicional(formData: FormData) {
  const id = formData.get("id") as string;
  const obra_id = formData.get("obra_id") as string;
  const paquete_id = formData.get("paquete_id") as string;
  const monto_anterior = formData.get("monto_anterior") as string;

  const supabase = await createClient();
  const { error } = await supabase
    .from("revisiones_presupuesto")
    .update({
      fecha: formData.get("fecha") as string,
      monto_anterior: monto_anterior ? Number(monto_anterior) : null,
      monto_nuevo: Number(formData.get("monto_nuevo")),
      notas: (formData.get("notas") as string) || null,
      documento: (formData.get("documento") as string) || null,
    })
    .eq("id", id);

  if (error) {
    redirect(
      `${rutaBase(obra_id, paquete_id)}/${id}/editar?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(rutaBase(obra_id, paquete_id));
  redirect(rutaBase(obra_id, paquete_id));
}

async function cambiarEstado(
  formData: FormData,
  estado: "aprobado" | "rechazado" | "ejecutado",
) {
  const id = formData.get("id") as string;
  const obra_id = formData.get("obra_id") as string;
  const paquete_id = formData.get("paquete_id") as string;

  const supabase = await createClient();
  await supabase
    .from("revisiones_presupuesto")
    .update({
      estado,
      fecha_aprobacion: estado === "aprobado" ? new Date().toISOString().slice(0, 10) : undefined,
    })
    .eq("id", id);

  revalidatePath(rutaBase(obra_id, paquete_id));
  redirect(rutaBase(obra_id, paquete_id));
}

export async function aprobarAdicional(formData: FormData) {
  await cambiarEstado(formData, "aprobado");
}

export async function rechazarAdicional(formData: FormData) {
  await cambiarEstado(formData, "rechazado");
}

export async function ejecutarAdicional(formData: FormData) {
  await cambiarEstado(formData, "ejecutado");
}
