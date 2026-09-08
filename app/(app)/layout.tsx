import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

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
      <header className="flex items-center justify-between border-b border-black/[.08] px-6 py-3 dark:border-white/[.145]">
        <span className="text-sm font-semibold text-black dark:text-zinc-50">
          Obra
        </span>
        <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span>{user?.email}</span>
          <form action={signOut}>
            <button type="submit" className="underline underline-offset-2">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
