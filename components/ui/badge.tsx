type Tono = "neutral" | "accent" | "success" | "warning" | "danger";

const tonos: Record<Tono, string> = {
  neutral: "bg-black/[.05] text-muted dark:bg-white/[.08]",
  accent: "bg-accent/10 text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  children,
  tono = "neutral",
}: {
  children: React.ReactNode;
  tono?: Tono;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tonos[tono]}`}
    >
      {children}
    </span>
  );
}

const ESTADO_TONO: Record<string, Tono> = {
  pendiente: "warning",
  aprobado: "accent",
  ejecutado: "success",
  rechazado: "danger",
};

export function BadgeEstado({ estado }: { estado: string }) {
  return (
    <Badge tono={ESTADO_TONO[estado] ?? "neutral"}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </Badge>
  );
}
