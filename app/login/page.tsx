import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <div className="flex flex-col justify-center gap-4 bg-violet px-8 py-16 text-paper sm:px-16 lg:w-1/2">
        <p className="font-display text-2xl font-semibold">AgendaYa</p>
        <h1 className="font-display max-w-sm text-3xl leading-tight font-semibold sm:text-4xl">
          Tu agenda, siempre al día.
        </h1>
        <p className="max-w-sm text-paper/80">
          Entra para ajustar tus servicios, tus horarios disponibles y revisar las citas
          que te están llegando.
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6 px-8 py-16 sm:px-16">
        <header className="flex flex-col gap-1">
          <h2 className="font-display text-2xl font-semibold text-ink">Inicia sesión</h2>
          <p className="text-ink-soft">Usa el email y la contraseña de tu negocio.</p>
        </header>
        <div className="max-w-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
