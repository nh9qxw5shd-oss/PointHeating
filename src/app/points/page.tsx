import { Suspense } from "react";
import Logbook from "@/components/points/Logbook";
import ColdPanelGate from "@/components/weather/ColdPanelGate";
import { PageSkeleton } from "@/components/ui";

export const metadata = { title: "Ice and point heating" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton kind="table" />}>
      <ColdPanelGate />
      <Logbook />
    </Suspense>
  );
}
