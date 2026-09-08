import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { buttonVariants } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="no-print flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/obras" className="text-sm font-semibold text-foreground">
            Obra
          </Link>
          <Link href="/proveedores" className="text-sm text-muted hover:text-foreground">
            Proveedores
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span>{user?.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className={buttonVariants("ghost", "sm", "!px-0")}
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
