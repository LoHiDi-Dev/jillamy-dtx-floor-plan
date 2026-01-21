import * as React from "react";

import { JimHeader } from "./components/JimHeader";
import { WarehouseFloorPlan } from "./components/WarehouseFloorPlan";
import type { RotationDeg } from "./types";

export default function App() {
  const [rotationDeg, setRotationDeg] = React.useState<RotationDeg>(0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f1f5f9] to-[#e2e8f0]">
      <JimHeader rotationDeg={rotationDeg} onRotationChange={setRotationDeg} />

      <main className="mx-auto w-full max-w-none px-4 pb-8 pt-6 sm:px-6">
        <WarehouseFloorPlan rotationDeg={rotationDeg} />
      </main>
    </div>
  );
}