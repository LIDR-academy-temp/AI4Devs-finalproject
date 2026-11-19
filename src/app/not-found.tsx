import { NotAvailable } from "@/components/screen-states";

// An address that doesn't exist (BR-13). The start sends a signed-in user to
// their main screen and anyone else to Welcome.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col justify-center px-4 py-8 md:px-8">
      <NotAvailable href="/" />
    </main>
  );
}
