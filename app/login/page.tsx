import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <form
        action={login}
        className="w-full max-w-sm rounded-lg border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950"
      >
        <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">
          Iniciar sesión
        </h1>

        {error && (
          <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="mb-4 w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
        />

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contraseña
        </label>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mb-6 w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
        />

        <button
          type="submit"
          className="w-full rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
