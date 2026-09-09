import Anthropic from "@anthropic-ai/sdk";

export type ComprobanteExtraido = {
  fecha: string | null;
  proveedor: string | null;
  descripcion: string | null;
  monto: number | null;
  forma_pago: string | null;
};

const PROMPT = `Este es un comprobante de gasto de una obra en construcción (factura, ticket o recibo argentino). Extraé estos datos:
- fecha: la fecha del comprobante, en formato YYYY-MM-DD. Si el año no está impreso o no se lee con confianza, no lo inventes: dejá null.
- proveedor: el nombre del comercio o proveedor que emite el comprobante.
- descripcion: una descripción breve de qué se compró o pagó (los ítems principales, no el detalle línea por línea).
- monto: el monto TOTAL final del comprobante, como número (sin separadores de miles; usá punto para los decimales).
- forma_pago: cómo se pagó si está indicado (efectivo, transferencia, tarjeta, etc.), o null si no figura.

Si algún dato no se puede leer con confianza, usá null para ese campo en vez de inventarlo.

Respondé ÚNICAMENTE con un objeto JSON con esas 5 claves, sin texto adicional antes ni después, sin bloque de markdown.`;

const IMAGENES_SOPORTADAS = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function extraerComprobante(
  base64: string,
  mediaType: string,
): Promise<ComprobanteExtraido | null> {
  const client = new Anthropic();

  const contentBlock: Anthropic.ContentBlockParam = IMAGENES_SOPORTADAS.includes(
    mediaType,
  )
    ? {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: base64,
        },
      }
    : {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      };

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 500,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: PROMPT }] }],
    });
  } catch {
    return null;
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;

  try {
    const limpio = textBlock.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    const data = JSON.parse(limpio);
    return {
      fecha: typeof data.fecha === "string" ? data.fecha : null,
      proveedor: typeof data.proveedor === "string" ? data.proveedor : null,
      descripcion: typeof data.descripcion === "string" ? data.descripcion : null,
      monto: typeof data.monto === "number" ? data.monto : null,
      forma_pago: typeof data.forma_pago === "string" ? data.forma_pago : null,
    };
  } catch {
    return null;
  }
}
