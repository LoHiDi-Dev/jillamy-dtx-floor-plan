import * as React from "react";

export function EntranceFooter() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-3 sm:px-6">
      <div className="mx-auto w-full max-w-[1200px] rounded-[16px] border border-[#e2e8f0] bg-white/95 p-3 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.10),0px_4px_6px_-4px_rgba(0,0,0,0.10)] backdrop-blur">
        <div className="w-full rounded-md bg-black py-2 text-center text-xs font-semibold text-white sm:text-sm">
          The side EAST warehouse entrance
        </div>

        <div className="mt-3 mx-auto max-w-[720px] rounded-sm border border-[#94a3b8] bg-[#eef2f7] px-3 py-2 text-center text-[10px] leading-[14px] text-[#334155] sm:text-xs">
          L-shaped layout: Row I (Aisles 1–9) • Rows A–G (Aisles 1–6) • Spots 1–9 • Aisles on WEST (top) • Rows on
          SOUTH (left)
        </div>
      </div>
    </div>
  );
}

