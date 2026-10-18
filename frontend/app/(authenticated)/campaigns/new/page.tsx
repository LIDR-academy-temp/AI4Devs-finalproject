"use client";

import { RequireAuth } from "@/features/auth/RequireAuth";
import { CreateCampaignForm } from "@/features/campaigns/CreateCampaignForm";

export default function CreateCampaignPage() {
  return (
    <RequireAuth>
      <CreateCampaignForm />
    </RequireAuth>
  );
}
