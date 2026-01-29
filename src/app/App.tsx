import * as React from "react";

import { DeviceGate } from "./components/DeviceGate";
import { WarehouseFloorPlan } from "./components/WarehouseFloorPlan";

export default function App() {
  return (
    <DeviceGate>
      {() => (
        <div className="min-h-screen overflow-hidden bg-gradient-to-b from-[#f1f5f9] to-[#e2e8f0] flex flex-col">
          {/* Header */}
          <header className="shrink-0 border-b border-white/10 bg-[#1f2d3d] px-6 py-4 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.20),0px_4px_6px_-4px_rgba(0,0,0,0.20)]">
            <div className="mx-auto max-w-7xl">
              <h1 className="text-xl font-semibold text-white">Jillamy® I DTX Warehouse SMART floor</h1>
              <p className="mt-1 text-sm text-white/80">JIM Web App Integration - DTX Floor Plan</p>
              <p className="mt-0.5 text-xs text-white/60">2D Top-Down Layout View</p>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto px-4 py-4 sm:px-6">
            <WarehouseFloorPlan />
          </main>

          {/* Footer */}
          <footer className="shrink-0 border-t border-[#e2e8f0] bg-white/70 px-6 py-3 text-slate-600">
            <div className="mx-auto max-w-7xl text-center text-xs">
              <p>
                Jillamy I DTX Warehouse SMART Floor • Location System • JIM Web App • Developer: Joel S. Premier •{" "}
                {new Date().toLocaleDateString()}
              </p>
              <p className="mt-1 text-slate-500">Warehouse Floor • L-Shaped Layout • Format: ROW-AISLE-SPOT</p>
            </div>
          </footer>
        </div>
      )}
    </DeviceGate>
  );
}