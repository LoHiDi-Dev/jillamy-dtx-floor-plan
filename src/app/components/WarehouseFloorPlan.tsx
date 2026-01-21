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
import type { RotationDeg } from "../types";

type RowCode = "I" | "A" | "B" | "C" | "D" | "E" | "F" | "G";

type SelectedLocation = {
  row: RowCode;
  column: number;
  spot: number | null;
};

const ROWS: RowCode[] = ["I", "A", "B", "C", "D", "E", "F", "G"];
const COLS = Array.from({ length: 9 }, (_, i) => i + 1);
const SPOTS = Array.from({ length: 9 }, (_, i) => i + 1);

type Location3D = { row: RowCode; aisle: number; spot: number };

const ROW_INDEX: Record<RowCode, number> = {
  G: 0,
  F: 1,
  E: 2,
  D: 3,
  C: 4,
  B: 5,
  A: 6,
  I: 7,
};

const WALK_TIME_ANCHORS: Array<Location3D & { seconds: number }> = [
  { row: "I", aisle: 1, spot: 1, seconds: 70 },
  { row: "I", aisle: 9, spot: 9, seconds: 100 },
  { row: "D", aisle: 6, spot: 9, seconds: 48 },
  { row: "G", aisle: 1, spot: 9, seconds: 25 },
  { row: "E", aisle: 5, spot: 5, seconds: 30 },
];

function parseLocationCode(code: string): Location3D | null {
  const parts = code.trim().toUpperCase().split("-");
  if (parts.length !== 3) return null;
  const row = parts[0] as RowCode;
  const aisle = Number(parts[1]);
  const spot = Number(parts[2]);
  if (!Object.prototype.hasOwnProperty.call(ROW_INDEX, row)) return null;
  if (!Number.isFinite(aisle) || !Number.isFinite(spot)) return null;
  return { row, aisle, spot };
}

function formatMinutesSeconds(totalSeconds: number) {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  if (minutes <= 0) return `${seconds} seconds`;
  const minuteLabel = minutes === 1 ? "minute" : "minutes";
  if (seconds <= 0) return `${minutes} ${minuteLabel}`;
  return `${minutes} ${minuteLabel} ${seconds} seconds`;
}

function estimateWalkSecondsIDW(loc: Location3D) {
  const ROW_SPAN = 7;
  const AISLE_SPAN = 8; // aisles 1..9
  const SPOT_SPAN = 8; // spots 1..9

  const eps = 1e-6;
  const power = 2;

  const rowIndexP = ROW_INDEX[loc.row];

  const anchorSeconds = WALK_TIME_ANCHORS.map((a) => a.seconds);
  const minAnchorSeconds = Math.min(...anchorSeconds);
  const maxAnchorSeconds = Math.max(...anchorSeconds);

  let weightedSum = 0;
  let weightTotal = 0;

  for (const a of WALK_TIME_ANCHORS) {
    // Exact anchor match -> exact time
    if (a.row === loc.row && a.aisle === loc.aisle && a.spot === loc.spot) return a.seconds;

    const dr = Math.abs(rowIndexP - ROW_INDEX[a.row]) / ROW_SPAN;
    const da = Math.abs(loc.aisle - a.aisle) / AISLE_SPAN;
    const ds = Math.abs(loc.spot - a.spot) / SPOT_SPAN;
    const distance = Math.sqrt(dr * dr + da * da + ds * ds);
    const w = 1 / Math.pow(distance + eps, power);

    weightedSum += w * a.seconds;
    weightTotal += w;
  }

  const pred = weightedSum / weightTotal;
  const clamped = Math.max(minAnchorSeconds, Math.min(maxAnchorSeconds, pred));
  return Math.round(clamped);
}

function isValidCell(row: RowCode, column: number) {
  if (row === "I") return column >= 1 && column <= 9;
  if (row === "A" || row === "B" || row === "C" || row === "D") return column >= 1 && column <= 6;
  // E–G
  return column >= 1 && column <= 5;
}

function formatLocation(loc: SelectedLocation) {
  if (!loc.spot) return `${loc.row}-${loc.column}`;
  return `${loc.row}-${loc.column}-${loc.spot}`;
}

export function WarehouseFloorPlan({ rotationDeg = 0 }: { rotationDeg?: RotationDeg }) {
  const [selected, setSelected] = React.useState<SelectedLocation | null>(null);
  const [hovered, setHovered] = React.useState<{ row: RowCode; column: number } | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Keep selection view + grid the same width to avoid “stretching” when a spot is selected.
  const CONTENT_WIDTH_CLASS = "mx-auto w-full max-w-[1200px]";

  // Readability: each cell contains 9 spot “slices” (1–9). Keep enough height + font size
  // so the numbers remain readable across common desktop resolutions.
  const CELL_HEIGHT_CLASS = "h-[clamp(96px,12vh,160px)]";
  // Don’t stretch the plan; keep a natural width and center it.
  const GRID_WIDTH_CLASS = "w-full justify-center";
  const SPOT_TEXT_CLASS = "text-[clamp(10px,0.9vw,14px)]";

  const selectedCellCode = React.useMemo(() => {
    if (!selected) return null;
    return `${selected.row}-${selected.column}`;
  }, [selected]);

  const hasSelection = Boolean(selected);
  const crosshairOn = Boolean(selected?.spot);
  const highlightedRow = selected?.row ?? null;
  const highlightedCol = selected?.column ?? null;

  const approxWalkTime = React.useMemo(() => {
    if (!selected?.spot) return null;
    const loc3d: Location3D = { row: selected.row, aisle: selected.column, spot: selected.spot };
    const seconds = estimateWalkSecondsIDW(loc3d);
    return { seconds, label: formatMinutesSeconds(seconds) };
  }, [selected]);

  // Clear selection when user clicks outside the floor plan area.
  React.useEffect(() => {
    if (!hasSelection) return;

    function onPointerDown(e: PointerEvent) {
      const root = containerRef.current;
      const target = e.target as Node | null;
      if (!root || !target) return;
      if (!root.contains(target)) {
        setSelected(null);
      }
    }

    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => window.removeEventListener("pointerdown", onPointerDown, { capture: true } as any);
  }, [hasSelection]);

  return (
    <div ref={containerRef} className="flex w-full flex-col gap-4">
      {hasSelection ? (
        <div className={CONTENT_WIDTH_CLASS}>
          {/* Sticky clear action while scrolling */}
          <div className="sticky top-3 z-30 flex justify-end">
            <Button
              size="sm"
              onClick={() => setSelected(null)}
              className="h-8 rounded-[10px] bg-red-500 px-3 text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.18),0px_4px_6px_-4px_rgba(0,0,0,0.18)] hover:bg-red-600"
            >
              Clear Selection
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
                {approxWalkTime ? (
                  <div className="mt-2 text-sm font-semibold text-[#0f172b]">
                    Approx Walk Time: <span className="font-semibold">{approxWalkTime.label}</span>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card
        className={cn(
          "overflow-hidden rounded-[16px] border-[#e2e8f0] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]",
          CONTENT_WIDTH_CLASS,
        )}
      >
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
            Rows: I, A–G • Aisles: 1–9 • Spots: 1–9
          </CardDescription>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          <div
            className={cn(
              "w-full overflow-auto overscroll-contain [scrollbar-gutter:stable]",
              hasSelection ? "max-h-[calc(100vh-360px)]" : "max-h-[calc(100vh-260px)]",
            )}
          >
            <div
              className="w-fit max-w-full"
              style={{
                transform: rotationDeg ? `rotate(${rotationDeg}deg)` : undefined,
                transformOrigin: "center center",
                transition: "transform 180ms ease",
              }}
            >
            <div
              className={cn(
                "grid grid-cols-[24px_56px_repeat(9,minmax(72px,88px))_24px] gap-1 sm:grid-cols-[32px_72px_repeat(9,minmax(84px,96px))_32px] sm:gap-2",
                GRID_WIDTH_CLASS,
              )}
            >
              {/* Orientation label */}
              <div />
              <div />
              <div className="col-span-9 py-1 text-center text-xs font-semibold text-[#1e3a8a] sm:text-sm">
                This side WEST
              </div>
              <div />

              {/* Sticky top-left spacers (keep header row solid when scrolling) */}
              <div className="sticky left-0 top-0 z-40 h-10 bg-white/95 backdrop-blur" />
              <div className="sticky left-[24px] top-0 z-40 h-10 bg-white/95 backdrop-blur sm:left-[32px]" />
                {COLS.map((c) => (
                  <div
                    key={`col-${c}`}
                    className={cn(
                      "sticky top-0 z-30 flex h-9 items-center justify-center rounded-md border bg-white/95 text-xs font-medium backdrop-blur transition-colors sm:h-10 sm:text-sm",
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
                      <div className="sticky left-0 z-40 row-span-9 flex items-center justify-center bg-white/95 backdrop-blur">
                        <div className="select-none text-xs font-semibold text-[#880e4f] sm:text-sm [writing-mode:vertical-rl] rotate-180">
                          This side SOUTH
                        </div>
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        cn(
                          "sticky z-20 flex items-center justify-center rounded-md border text-sm font-semibold transition-colors",
                          CELL_HEIGHT_CLASS,
                        ),
                        "left-[24px] sm:left-[32px] bg-white/95 backdrop-blur",
                        hasSelection && highlightedRow === r && "top-[44px] sm:top-[52px] z-40 shadow-sm",
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
                          {/* 9 spot slices */}
                          <div
                            className={cn(
                              "absolute inset-1 grid grid-rows-9 gap-px overflow-hidden rounded-[6px]",
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
                                    cn(
                                      "flex w-full items-center justify-start px-2 leading-none tabular-nums",
                                      SPOT_TEXT_CLASS,
                                    ),
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
                      <div className="sticky right-0 z-40 row-span-9 flex items-center justify-center bg-white/95 backdrop-blur">
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
                L-shaped layout: Row I (Aisles 1–9) • Rows A–G (Aisles 1–6) • Spots 1–9 • Aisles on WEST (top) • Rows on SOUTH (left)
              </div>
            </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}