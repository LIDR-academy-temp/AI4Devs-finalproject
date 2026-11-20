import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-coral/15 text-xl font-bold text-coral-dark">
        ?
      </span>
      <h1 className="font-display text-2xl font-semibold text-ink">No encontramos esta página</h1>
      <p className="text-ink-soft">
        Revisa el enlace, o puede que este negocio todavía no tenga una agenda pública en
        AgendaYa.
      </p>
      <Link href="/" className="btn-primary">
        Volver al inicio
      </Link>
    </main>
  );
}
