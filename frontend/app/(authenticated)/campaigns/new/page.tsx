"use client";

import { useState } from "react";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { CreateCampaignForm } from "@/features/campaigns/CreateCampaignForm";
import { SessionExpiredPage } from "@/lib/components/SessionExpiredPage";
import { AccessDeniedPage } from "@/lib/components/AccessDeniedPage";

type PageState = "form" | "session-expired" | "access-denied";

export default function CreateCampaignPage() {
  const [pageState, setPageState] = useState<PageState>("form");

  if (pageState === "session-expired") {
    return <SessionExpiredPage />;
  }

  if (pageState === "access-denied") {
    return <AccessDeniedPage message="No tienes permiso para registrar campañas." />;
  }

  return (
    <RequireAuth>
      <CreateCampaignForm onAuthError={(kind) => {
        if (kind === "unauthenticated") {
          setPageState("session-expired");
        } else if (kind === "forbidden") {
          setPageState("access-denied");
        }
      }} />
    </RequireAuth>
  );
}
