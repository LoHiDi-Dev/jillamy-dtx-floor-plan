import * as React from "react";

const imgLogo = "https://www.figma.com/api/mcp/asset/2e42f702-6ed8-43af-b10c-372f267a71d5";
const imgLogout = "https://www.figma.com/api/mcp/asset/9b094ceb-314b-43ea-a72f-f9de4c8c67b8";

export function JimHeader() {
  return (
    <header>
      {/* DTX header bar (like legacy screenshot) */}
      <div className="bg-[#1e293b] text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
        <div className="mx-auto w-full max-w-[1152px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="text-[28px] font-semibold leading-[34px]">DTX Warehouse Location System</div>
          <div className="mt-1 text-[14px] leading-[20px] text-white/80">
            JIM Web App Integration - Warehouse Floor Plan
          </div>
          <div className="mt-1 text-[12px] leading-[16px] text-white/60">2D Top-Down Layout View</div>
        </div>
      </div>
    </header>
  );
}

