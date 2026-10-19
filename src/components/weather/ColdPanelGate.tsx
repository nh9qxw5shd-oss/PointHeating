"use client";

// The cold panel follows the logbook's area filter (?area=), so it reads the search params here.

import { useSearchParams } from "next/navigation";
import ColdPanel from "./ColdPanel";

export default function ColdPanelGate() {
  const params = useSearchParams();
  return <ColdPanel area={params.get("area") ?? ""} />;
}
