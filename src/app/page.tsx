import { Suspense } from "react";
import Logbook from "@/components/points/Logbook";
import { PageSkeleton } from "@/components/ui";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton kind="table" />}>
      <Logbook />
    </Suspense>
  );
}
