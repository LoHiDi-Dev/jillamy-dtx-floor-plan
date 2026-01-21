import * as React from "react";

import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { cn } from "./ui/utils";

type RowCode = "I" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

type SelectedLocation = {
  row: RowCode;
  column: number;
  spot: number | null;
};

const ROWS: RowCode[] = ["I", "A", "B", "C", "D", "E", "F", "G", "H"];
const COLS = Array.from({ length: 10 }, (_, i) => i + 1);
const SPOTS = Array.from({ length: 10 }, (_, i) => i + 1);

function isValidCell(row: RowCode, column: number) {
  if (row === "I") return column >= 1 && column <= 10;
  if (row === "A" || row === "B" || row === "C" || row === "D") return column >= 1 && column <= 6;
  // E–H
  return column >= 1 && column <= 5;
}

function formatLocation(loc: SelectedLocation) {
  if (!loc.spot) return `${loc.row}-${loc.column}`;
  return `${loc.row}-${loc.column}-${loc.spot}`;
}

export function WarehouseFloorPlan() {
  const [selected, setSelected] = React.useState<SelectedLocation | null>(null);
  const [hovered, setHovered] = React.useState<{ row: RowCode; column: number } | null>(null);

  // Keep the floor plan usable on shorter desktop viewports (e.g. 1366×768)
  // by allowing the cell height to shrink below the previous hard min (64px).
  // Spots are rendered as 10 slices inside each cell, so keep enough height for readability.
  const CELL_HEIGHT_CLASS = "h-[clamp(64px,7vh,120px)]";

  const selectedCellCode = React.useMemo(() => {
    if (!selected) return null;
    return `${selected.row}-${selected.column}`;
  }, [selected]);

  const hasSelection = Boolean(selected);
  const crosshairOn = Boolean(selected?.spot);
  const highlightedRow = selected?.row ?? null;
  const highlightedCol = selected?.column ?? null;

  return (
    <div className="flex w-full flex-col gap-4">
      {hasSelection ? (
        <>
          {/* Sticky clear action while scrolling */}
          <div className="sticky top-3 z-30 flex justify-end">
            <Button
              size="sm"
              onClick={() => setSelected(null)}
              className="h-8 rounded-[10px] bg-red-500 px-3 text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.18),0px_4px_6px_-4px_rgba(0,0,0,0.18)] hover:bg-red-600"
            >
              Clear
            </Button>
          </div>

          <Card className="rounded-[16px] border-[#e2e8f0] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <CardHeader className="border-b border-[#e2e8f0]">
              <div className="min-w-0">
                <CardTitle className="text-[#1e3a8a]">Selected Location</CardTitle>
                <CardDescription className="text-[#45556c]">Format: ROW-AISLE-SPOT</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              {/* hasSelection guarantees selected is non-null here */}
              <div className="rounded-[12px] border border-[#93c5fd] bg-[#eff6ff] p-3">
                <div className="text-sm font-semibold text-[#2563eb]">Location:</div>
                <div className="mt-1 font-mono text-2xl font-bold text-[#1e3a8a]">
                  {formatLocation(selected!)}
                </div>
                {selectedCellCode ? (
                  <div className="mt-1 text-xs text-[#45556c]">
                    Cell: <span className="font-mono">{selectedCellCode}</span>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card className="overflow-hidden rounded-[16px] border-[#e2e8f0] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <CardHeader className="border-b border-[#e2e8f0]">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-[#1e3a8a]">Warehouse Floor Plan</CardTitle>
            <div
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
                hasSelection
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-slate-200 bg-slate-50 text-slate-600",
              )}
            >
              Status: {hasSelection ? "Active" : "Not Active"}
            </div>
          </div>
          <CardDescription className="text-[#45556c]">
            Rows: I, A–H • Columns: 1–10 • Spots: 1–10
          </CardDescription>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          <div
            className={cn(
              "w-full overflow-auto overscroll-contain",
              hasSelection ? "max-h-[calc(100vh-360px)]" : "max-h-[calc(100vh-260px)]",
            )}
          >
            <div className="grid grid-cols-[24px_56px_repeat(10,minmax(0,1fr))_24px] gap-1 sm:grid-cols-[32px_72px_repeat(10,minmax(0,1fr))_32px] sm:gap-2">
              {/* Orientation label */}
              <div />
              <div />
              <div className="col-span-10 py-1 text-center text-xs font-semibold text-[#1e3a8a] sm:text-sm">
                This side WEST
              </div>
              <div />

              <div className="h-10" />
              <div className="h-10" />
                {COLS.map((c) => (
                  <div
                    key={`col-${c}`}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-md border text-xs font-medium transition-colors sm:h-10 sm:text-sm",
                      hasSelection && highlightedCol === c
                        ? "border-[#1e3a8a] bg-[#dbeafe] text-[#1e3a8a]"
                        : "border-[#e2e8f0] bg-[#f8fafc] text-[#45556c]",
                    )}
                  >
                    {c}
        </div>
                ))}
              <div className="h-10" />

                {ROWS.map((r) => (
                  <React.Fragment key={`row-${r}`}>
                    {r === "I" ? (
                      <div className="row-span-9 flex items-center justify-center">
                        <div className="select-none text-xs font-semibold text-[#880e4f] sm:text-sm [writing-mode:vertical-rl] rotate-180">
                          This side SOUTH
                        </div>
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        cn("flex items-center justify-center rounded-md border text-sm font-semibold transition-colors", CELL_HEIGHT_CLASS),
                        hasSelection && highlightedRow === r
                          ? "border-[#1e3a8a] bg-[#dbeafe] text-[#1e3a8a]"
                          : "border-[#e2e8f0] bg-[#f8fafc] text-[#0f172b]",
                      )}
                    >
                      {r}
      </div>

                    {COLS.map((c) => {
                      const valid = isValidCell(r, c);
                      const isSelected = selected?.row === r && selected?.column === c;
                      const isHovered = hovered?.row === r && hovered?.column === c;
                      const spot = isSelected ? selected?.spot : null;
                      if (!valid) {
                        return (
                          <div
                            key={`${r}-${c}-invalid`}
                            aria-hidden="true"
                            className={cn(
                              cn("relative flex items-center justify-center rounded-md border", CELL_HEIGHT_CLASS),
                              "border-[#e2e8f0] bg-[#e2e8f0]/60 text-xs text-[#62748e]",
                            )}
                          />
                        );
                      }
                  
                  return (
                        <div
                          key={`${r}-${c}`}
                          role="button"
                          tabIndex={0}
                          aria-label={`${r}-${c}`}
                          aria-pressed={isSelected}
                          onMouseEnter={() => setHovered({ row: r, column: c })}
                          onMouseLeave={() => setHovered(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelected({ row: r, column: c, spot: null });
                            }
                          }}
                          onClick={() => setSelected({ row: r, column: c, spot: null })}
                          className={cn(
                            cn("relative rounded-md border bg-white transition-colors", CELL_HEIGHT_CLASS),
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd] focus-visible:ring-offset-2",
                            // Only highlight the actual selected cell (not the entire row/column of cells)
                            isSelected && crosshairOn && "border-[#1e3a8a] shadow-[0px_1px_3px_0px_rgba(30,58,138,0.15)]",
                          )}
                        >
                          {/* 10 spot slices */}
                          <div
                            className={cn(
                              "absolute inset-1 grid grid-rows-10 gap-px overflow-hidden rounded-[6px]",
                              isSelected ? "bg-[#93c5fd]" : "bg-[#e2e8f0]",
                            )}
                          >
                            {SPOTS.map((spotValue) => {
                              const active = isSelected && spot === spotValue;
                        return (
                                <button
                                  key={`${r}-${c}-spot-${spotValue}`}
                                  type="button"
                                  aria-label={`${r}-${c}-${spotValue}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelected({ row: r, column: c, spot: spotValue });
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-start px-1 text-[clamp(7px,0.75vw,10px)] leading-none tabular-nums",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd]",
                                    isSelected ? "bg-white text-[#1e3a8a]" : "bg-white text-[#62748e]",
                                    active && "bg-[#1e3a8a] text-white",
                                  )}
                                >
                                  <span className="pointer-events-none select-none">{spotValue}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        );
                      })}

                    {r === "I" ? (
                      <div className="row-span-9 flex items-center justify-center">
                        <div className="select-none text-xs font-semibold text-[#0f172b] sm:text-sm [writing-mode:vertical-rl]">
                          This side North
                        </div>
                      </div>
                    ) : null}
                  </React.Fragment>
                ))}
            </div>

            {/* EAST entrance + layout note (below H row) */}
            <div className="mt-6 space-y-4">
              <div className="w-full rounded-md bg-black py-2 text-center text-xs font-semibold text-white sm:text-sm">
                The side EAST warehouse entrance
              </div>

              <div className="mx-auto max-w-[720px] rounded-sm border border-[#94a3b8] bg-[#eef2f7] px-3 py-2 text-center text-[10px] leading-[14px] text-[#334155] sm:text-xs">
                L-shaped layout: Row I (Aisles 1–10) • Rows A–H (Aisles 1–6) • Aisles on WEST (top) • Rows on SOUTH (left)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}