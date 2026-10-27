import type { NextConfig } from "next";

// Weather Resilience is mounted under /weather on the Derby Control hub (PotatOS), which proxies
// /weather/* to this deployment. basePath keeps every route and asset under that prefix on the
// standalone hostname too; the bare hostname redirects there. The points logbook lived at /points
// before the system widened to the other seasons, so that address keeps working.
const BASE_PATH = "/weather";

// Overseer is the only way in (PotatOS docs/09 §4.6). The hub marks every request it forwards with
// x-overseer-hop; a page load without the marker (a bookmark or link to this hostname) goes to the same
// address on Overseer, which signs the person in and frames this page. Scripts, data, API calls and
// the storage bridge are untouched. The marker routes people; it is not a secret.
const VIA_OVERSEER = {
  source: "/:path((?!.*storage-bridge).*)",
  has: [{ type: "header" as const, key: "sec-fetch-dest", value: "(document|iframe)" }],
  missing: [{ type: "header" as const, key: "x-overseer-hop", value: "overseer" }],
  destination: "https://overseer.derbycontrol.co.uk/:path",
  basePath: false as const,
  permanent: false,
};

const nextConfig: NextConfig = {
  agentRules: false,
  basePath: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  serverExternalPackages: ["pdfjs-dist"],
  // pdfjs loads its worker by a dynamic import at runtime, which Vercel's file tracing cannot
  // see; without this the deployed function has no pdf.worker.mjs and every PDF fails.
  outputFileTracingIncludes: { "/api/hotrail": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"] },
  async redirects() {
    const temp = { basePath: false as const, permanent: false };
    return [
      { source: "/", destination: BASE_PATH, ...temp },
      { source: "/index.html", destination: BASE_PATH, ...temp },
      { source: "/storage-bridge.html", destination: `${BASE_PATH}/storage-bridge.html`, ...temp },
      // The winter points logbook's old address (bookmarks, the hub's old mount).
      { source: "/points", destination: `${BASE_PATH}/points`, ...temp },
      { source: "/points/storage-bridge.html", destination: `${BASE_PATH}/storage-bridge.html`, ...temp },
      VIA_OVERSEER,
    ];
  },
};

export default nextConfig;
