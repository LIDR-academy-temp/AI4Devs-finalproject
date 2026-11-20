import { auth } from "../../lib/auth";
import { DashboardNav } from "./DashboardNav";
import { SignOutButton } from "./SignOutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-col gap-3 border-b-2 border-mist-line px-6 py-4 sm:px-10">
        <div className="flex items-center justify-between gap-4">
          <span className="font-display text-lg font-semibold text-ink">AgendaYa</span>
          <div className="flex items-center gap-3 text-sm">
            {session?.user?.name && (
              <span className="hidden text-ink-soft sm:inline">{session.user.name}</span>
            )}
            <SignOutButton />
          </div>
        </div>
        <DashboardNav />
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 sm:px-10">{children}</div>
    </div>
  );
}
