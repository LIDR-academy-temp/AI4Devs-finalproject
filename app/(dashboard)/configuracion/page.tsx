import { prisma } from "../../../lib/db";
import { auth } from "../../../lib/auth";
import { ConfirmationMessageForm } from "./ConfirmationMessageForm";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const session = await auth();
  const businessId = session!.user.businessId;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { confirmationMessageTemplate: true },
  });

  return (
    <main className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink">Configuración</h1>
      </header>
      <ConfirmationMessageForm
        businessId={businessId}
        initialTemplate={business?.confirmationMessageTemplate ?? ""}
      />
    </main>
  );
}
