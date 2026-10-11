import type { NextConfig } from "next";

// The winter points logbook is mounted under /points on the Derby Control hub (PotatOS), which
// proxies /points/* to this deployment. basePath keeps every route and asset under that prefix on
// the standalone hostname too; the bare hostname redirects there.
const BASE_PATH = "/points";

const nextConfig: NextConfig = {
  agentRules: false,
  basePath: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  async redirects() {
    const temp = { basePath: false as const, permanent: false };
    return [
      { source: "/", destination: BASE_PATH, ...temp },
      { source: "/index.html", destination: BASE_PATH, ...temp },
      { source: "/storage-bridge.html", destination: `${BASE_PATH}/storage-bridge.html`, ...temp },
    ];
  },
};

export default nextConfig;
