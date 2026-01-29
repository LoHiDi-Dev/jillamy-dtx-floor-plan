import * as React from "react";

import type { EntranceView } from "../types";
import { ChevronDown } from "lucide-react";

const ENTRANCE_VIEW_LABEL: Record<EntranceView, string> = {
  bottom: "Entrance at Bottom",
  left: "Entrance at Left",
  top: "Entrance at Top",
};

export function JimHeader({
  entranceView,
  onEntranceViewChange,
  isPhone = false,
}: {
  entranceView: EntranceView;
  onEntranceViewChange: (view: EntranceView) => void;
  isPhone?: boolean;
}) {
  return (
    <header>
      {/* DTX header bar (like legacy screenshot) */}
      <div className="bg-[#1e293b] text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
        <div className="mx-auto w-full max-w-[1152px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[28px] font-semibold leading-[34px]">DTX Warehouse Location System</div>
              {!isPhone ? (
                <>
                  <div className="mt-1 text-[14px] leading-[20px] text-white/80">
                    JIM Web App Integration - Warehouse Floor Plan
                  </div>
                  <div className="mt-1 text-[12px] leading-[16px] text-white/60">2D Top-Down Layout View</div>
                </>
              ) : null}
            </div>

            <div className="shrink-0 pt-1">
              <div className="text-[12px] font-medium text-white/70">Entrance View</div>
              <div className="relative mt-1 inline-flex items-center">
                <select
                  className="h-8 appearance-none rounded-[10px] bg-white/10 px-3 pr-9 text-sm font-medium text-white outline-none ring-1 ring-white/15 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/40"
                  value={entranceView}
                  onChange={(e) => onEntranceViewChange(e.target.value as EntranceView)}
                >
                  <option value="bottom">{ENTRANCE_VIEW_LABEL.bottom}</option>
                  <option value="left">{ENTRANCE_VIEW_LABEL.left}</option>
                  <option value="top">{ENTRANCE_VIEW_LABEL.top}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 size-4 opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

