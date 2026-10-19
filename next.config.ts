import type { NextConfig } from "next";

// Weather Resilience is mounted under /weather on the Derby Control hub (PotatOS), which proxies
// /weather/* to this deployment. basePath keeps every route and asset under that prefix on the
// standalone hostname too; the bare hostname redirects there. The points logbook lived at /points
// before the system widened to the other seasons, so that address keeps working.
const BASE_PATH = "/weather";

const nextConfig: NextConfig = {
  agentRules: false,
  basePath: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  serverExternalPackages: ["pdfjs-dist"],
  async redirects() {
    const temp = { basePath: false as const, permanent: false };
    return [
      { source: "/", destination: BASE_PATH, ...temp },
      { source: "/index.html", destination: BASE_PATH, ...temp },
      { source: "/storage-bridge.html", destination: `${BASE_PATH}/storage-bridge.html`, ...temp },
      // The winter points logbook's old address (bookmarks, the hub's old mount).
      { source: "/points", destination: `${BASE_PATH}/points`, ...temp },
      { source: "/points/storage-bridge.html", destination: `${BASE_PATH}/storage-bridge.html`, ...temp },
    ];
  },
};

export default nextConfig;
