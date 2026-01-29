import * as React from "react";

import { DeviceGate } from "./components/DeviceGate";
import { EntranceFooter } from "./components/EntranceFooter";
import { JimHeader } from "./components/JimHeader";
import { WarehouseFloorPlan } from "./components/WarehouseFloorPlan";
import type { EntranceView } from "./types";

export default function App() {
  const [entranceView, setEntranceView] = React.useState<EntranceView>("bottom");

  return (
    <DeviceGate>
      {({ isTablet, isPhone }) => (
        <div className="min-h-screen bg-gradient-to-b from-[#f1f5f9] to-[#e2e8f0]">
          <JimHeader entranceView={entranceView} onEntranceViewChange={setEntranceView} isPhone={isPhone} />

          <main className="mx-auto w-full max-w-none px-4 pb-[160px] pt-6 sm:px-6">
            <WarehouseFloorPlan entranceView={entranceView} isTablet={isTablet} />
          </main>

          <EntranceFooter />
        </div>
      )}
    </DeviceGate>
  );
}