import type { ButtonHTMLAttributes } from "react";

type Variante = "primary" | "secondary" | "danger" | "ghost";
type Tamano = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variantes: Record<Variante, string> = {
  primary: "bg-accent text-accent-foreground hover:opacity-90",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-muted hover:text-foreground",
};

const tamanos: Record<Tamano, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
};

export function buttonVariants(
  variante: Variante = "primary",
  tamano: Tamano = "md",
  className = "",
) {
  return `${base} ${variantes[variante]} ${tamanos[tamano]} ${className}`.trim();
}

export function Button({
  variante = "primary",
  tamano = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamano?: Tamano;
}) {
  return (
    <button
      className={buttonVariants(variante, tamano, className)}
      {...props}
    />
  );
}
