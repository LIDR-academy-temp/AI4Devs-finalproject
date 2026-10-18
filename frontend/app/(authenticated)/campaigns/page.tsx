"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { createApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

interface Campaign {
  id: number;
  name: string;
  display_name: string;
  agency_id: number;
  advertiser_id: number;
  status: string;
  start_date: string;
  end_date: string;
}

export default function CampaignsPage() {
  const { session } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        setLoading(true);
        setError(null);

        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!baseUrl) {
          throw new Error("API URL not configured");
        }

        const client = createApiClient({ baseUrl });
        const data = await client.get<Campaign[]>("/campaigns");
        setCampaigns(data);
      } catch (err) {
        setError("Error al cargar las campañas. Intenta de nuevo más tarde.");
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    }

    if (session.status === "authenticated") {
      void loadCampaigns();
    }
  }, [session.status]);

  if (loading) {
    return <div role="status">Cargando campañas…</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Campañas</h1>
        <Link
          href="/campaigns/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Nueva campaña
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {campaigns && campaigns.length === 0 && !error && (
        <div className="text-center py-12 bg-gray-50 rounded">
          <p className="text-gray-600">Todavía no hay campañas registradas.</p>
          <p className="text-gray-500 text-sm mt-2">Crea la primera campaña haciendo clic en "Nueva campaña".</p>
        </div>
      )}

      {campaigns && campaigns.length > 0 && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="text-left px-4 py-2 font-semibold">ID</th>
              <th className="text-left px-4 py-2 font-semibold">Nombre</th>
              <th className="text-left px-4 py-2 font-semibold">Nombre mostrado</th>
              <th className="text-left px-4 py-2 font-semibold">Agencia</th>
              <th className="text-left px-4 py-2 font-semibold">Anunciante</th>
              <th className="text-left px-4 py-2 font-semibold">Estado</th>
              <th className="text-left px-4 py-2 font-semibold">Inicio</th>
              <th className="text-left px-4 py-2 font-semibold">Fin</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-2">{campaign.id}</td>
                <td className="px-4 py-2">{campaign.name}</td>
                <td className="px-4 py-2">{campaign.display_name}</td>
                <td className="px-4 py-2">{campaign.agency_id}</td>
                <td className="px-4 py-2">{campaign.advertiser_id}</td>
                <td className="px-4 py-2">
                  <span className="px-2 py-1 rounded text-white text-sm font-medium bg-green-600">
                    {campaign.status}
                  </span>
                </td>
                <td className="px-4 py-2">{campaign.start_date}</td>
                <td className="px-4 py-2">{campaign.end_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
