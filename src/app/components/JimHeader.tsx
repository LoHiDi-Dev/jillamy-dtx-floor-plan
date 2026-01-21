import * as React from "react";

import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { RotationDeg } from "../types";
import { Check, ChevronDown } from "lucide-react";

const ROTATION_LABEL: Record<RotationDeg, string> = {
  0: "Standard",
  90: "90°",
  180: "180°",
  270: "270°",
};

function RotationMenuItem({
  value,
  label,
  current,
  onSelect,
}: {
  value: RotationDeg;
  label: string;
  current: RotationDeg;
  onSelect: (deg: RotationDeg) => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        onSelect(value);
      }}
    >
      <span className="flex w-full items-center justify-between">
        <span>{label}</span>
        {current === value ? <Check className="size-4" /> : <span className="size-4" />}
      </span>
    </DropdownMenuItem>
  );
}

export function JimHeader({
  rotationDeg,
  onRotationChange,
}: {
  rotationDeg: RotationDeg;
  onRotationChange: (deg: RotationDeg) => void;
}) {
  return (
    <header>
      {/* DTX header bar (like legacy screenshot) */}
      <div className="bg-[#1e293b] text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
        <div className="mx-auto w-full max-w-[1152px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[28px] font-semibold leading-[34px]">DTX Warehouse Location System</div>
              <div className="mt-1 text-[14px] leading-[20px] text-white/80">
                JIM Web App Integration - Warehouse Floor Plan
              </div>
              <div className="mt-1 text-[12px] leading-[16px] text-white/60">2D Top-Down Layout View</div>
            </div>

            <div className="shrink-0 pt-1">
              <div className="text-[12px] font-medium text-white/70">Rotation</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-1 h-8 rounded-[10px] bg-white/10 px-3 text-white hover:bg-white/15"
                  >
                    <span className="mr-2">{ROTATION_LABEL[rotationDeg]}</span>
                    <ChevronDown className="size-4 opacity-80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[140px]">
                  <RotationMenuItem
                    value={0}
                    label="Standard"
                    current={rotationDeg}
                    onSelect={onRotationChange}
                  />
                  <DropdownMenuSeparator />
                  <RotationMenuItem
                    value={90}
                    label="90°"
                    current={rotationDeg}
                    onSelect={onRotationChange}
                  />
                  <RotationMenuItem
                    value={180}
                    label="180°"
                    current={rotationDeg}
                    onSelect={onRotationChange}
                  />
                  <RotationMenuItem
                    value={270}
                    label="270°"
                    current={rotationDeg}
                    onSelect={onRotationChange}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

