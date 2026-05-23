/**
 * Client-only loader for DistanceBetween (Leaflet requires `window`).
 */
import { useEffect, useState, type ComponentType } from "react";
import { Loader2 } from "lucide-react";

export function DistanceBetweenLoader() {
  const [Component, setComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    void import("./DistanceBetween").then((m) => setComponent(() => m.DistanceBetween));
  }, []);

  if (!Component) {
    return (
      <section className="py-24 px-6 flex justify-center" aria-busy="true" aria-label="Loading map">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </section>
    );
  }

  return <Component />;
}
