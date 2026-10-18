import { z } from "zod";

export const campaignLineSchema = z.object({
  dsp_id: z.number().int(),
  channel_id: z.number().int(),
  format_id: z.number().int(),
  scope: z.string().superRefine((val, ctx) => {
    if (!["national", "international"].includes(val)) {
      ctx.addIssue({
        code: "custom",
        message: "Selecciona el ámbito",
      });
    }
  }),
  market_description: z.string().min(1, "Descripción del mercado es obligatoria"),
  contracted_impressions: z.number().int().gt(0, "Impresiones contratadas debe ser mayor que 0"),
  sale_cpm: z.string().regex(/^\d+(\.\d{1,2})?$/, "CPM (venta) debe ser un número decimal válido"),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Nombre de la campaña es obligatorio").max(255, "Nombre de la campaña no puede exceder 255 caracteres"),
  display_name: z.string().min(1, "Nombre mostrado es obligatorio").max(255, "Nombre mostrado no puede exceder 255 caracteres"),
  agency_id: z.number().int(),
  advertiser_id: z.number().int(),
  campaign_type_id: z.number().int(),
  sector_id: z.number().int(),
  sales_rep_id: z.number().int(),
  start_date: z.string().date("Fecha de inicio debe ser una fecha válida"),
  end_date: z.string().date("Fecha de fin debe ser una fecha válida"),
  order_reference: z.string().min(1, "Referencia de orden es obligatoria").max(255, "Referencia de orden no puede exceder 255 caracteres"),
  order_received_on: z.string().date("Fecha de recepción debe ser una fecha válida"),
  lines: z.array(campaignLineSchema).min(1, "Debe haber al menos una línea"),
}).refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
  message: "Fecha de fin debe ser posterior o igual a fecha de inicio",
  path: ["end_date"],
});

export type CampaignCreateRequest = z.infer<typeof createCampaignSchema>;
export type CampaignLineRequest = z.infer<typeof campaignLineSchema>;
