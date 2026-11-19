import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import {
  apiContentSecurityPolicy,
  staticSecurityHeaders,
} from "./src/server/http/security-headers";

const nextConfig: NextConfig = {
  // Stops `next dev` from writing its own agent instructions into AGENTS.md, which
  // is a link to CLAUDE.md. The project's agent rules are written by hand there.
  agentRules: false,
  poweredByHeader: false,
  // The headers every response carries (docs/07-SECURITY-AND-TESTING.md, section 1).
  // The page policy, which needs a nonce per request, is set in src/proxy.ts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(staticSecurityHeaders).map(([key, value]) => ({
          key,
          value,
        })),
      },
      {
        // Also covers API answers the route wrapper doesn't produce, such as
        // Next.js's own 404 and 405 responses.
        source: "/api/:path*",
        headers: [
          { key: "Content-Security-Policy", value: apiContentSecurityPolicy },
        ],
      },
    ];
  },
};

// Page translations (design decision 6 of the T-04 change).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
