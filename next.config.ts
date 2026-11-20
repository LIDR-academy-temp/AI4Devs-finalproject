import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  /* config options here */
  // Cache Components/Partial Prerendering exige envolver en Suspense o marcar
  // "use cache" cada acceso a datos dinámico; las dos páginas de este MVP
  // (reserva pública, agenda) son dinámicas por diseño (slots/citas en vivo),
  // así que esta feature no aporta nada aquí y rompía `next build` (ver
  // readme.md § 2.6). Se desactiva en vez de parchear cada ruta.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
