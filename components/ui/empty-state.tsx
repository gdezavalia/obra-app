import type { ReactNode } from "react";

export function EmptyState({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      {descripcion && (
        <p className="mt-1 text-sm text-muted">{descripcion}</p>
      )}
      {children && <div className="mt-4 flex justify-center gap-3">{children}</div>}
    </div>
  );
}
