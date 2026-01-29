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
import type { EntranceView } from "../types";

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

export function WarehouseFloorPlan({
  entranceView = "bottom",
  isTablet = false,
}: {
  entranceView?: EntranceView;
  isTablet?: boolean;
}) {
  const [selected, setSelected] = React.useState<SelectedLocation | null>(null);
  const [hovered, setHovered] = React.useState<{ row: RowCode; column: number } | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const viewportRef = React.useRef<HTMLDivElement | null>(null);

  // Keep selection view + grid the same width to avoid “stretching” when a spot is selected.
  const CONTENT_WIDTH_CLASS = "mx-auto w-full max-w-[1200px]";

  // Readability: each cell contains 9 spot “slices” (1–9). Keep enough height + font size
  // so the numbers remain readable across common desktop resolutions.
  const CELL_HEIGHT_CLASS = isTablet ? "h-[clamp(120px,14vh,220px)]" : "h-[clamp(96px,12vh,160px)]";
  // Don’t stretch the plan; keep a natural width and center it.
  const GRID_WIDTH_CLASS = "w-full justify-center";
  const SPOT_TEXT_CLASS = isTablet ? "text-[clamp(12px,1.2vw,16px)]" : "text-[clamp(10px,0.9vw,14px)]";

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

  // If a spot is selected, clicking outside the scrollable plan viewport clears the spot
  // (keeps row/aisle selection).
  React.useEffect(() => {
    if (!selected?.spot) return;

    function onPointerDown(e: PointerEvent) {
      const viewport = viewportRef.current;
      const target = e.target as Node | null;
      if (!viewport || !target) return;
      if (!viewport.contains(target)) setSelected((prev) => (prev ? { ...prev, spot: null } : prev));
    }

    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => window.removeEventListener("pointerdown", onPointerDown, { capture: true } as any);
  }, [selected?.spot]);

  const ROW_ORDER_BOTTOM_TO_TOP: RowCode[] = ["G", "F", "E", "D", "C", "B", "A", "I"];
  const ROWS_TOP_TO_BOTTOM_DEFAULT: RowCode[] = ["I", "A", "B", "C", "D", "E", "F", "G"];

  function getLayoutForView(view: EntranceView) {
    if (view === "top") {
      return {
        entranceEdge: "top" as const,
        rows: ROW_ORDER_BOTTOM_TO_TOP,
        aisles: [...COLS].reverse(),
      };
    }
    if (view === "left") {
      return {
        entranceEdge: "left" as const,
        rows: ROW_ORDER_BOTTOM_TO_TOP,
        aisles: COLS,
      };
    }
    return {
      entranceEdge: "bottom" as const,
      rows: ROWS_TOP_TO_BOTTOM_DEFAULT,
      aisles: COLS,
    };
  }

  const layout = React.useMemo(() => getLayoutForView(entranceView), [entranceView]);

  return (
    <div ref={containerRef} className="flex w-full flex-col gap-4 pb-6">
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

              {/* Tablet-friendly spot picker (large tap targets) */}
              {isTablet ? (
                <div className="rounded-[12px] border border-[#e2e8f0] bg-white p-3">
                  <div className="text-sm font-semibold text-[#0f172b]">Choose Spot</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {SPOTS.map((spotValue) => {
                      const active = selected?.spot === spotValue;
                      return (
                        <button
                          key={`tablet-spot-${spotValue}`}
                          type="button"
                          onClick={() => setSelected({ row: selected!.row, column: selected!.column, spot: spotValue })}
                          className={cn(
                            "h-11 min-h-[44px] rounded-[12px] border text-sm font-semibold transition-colors touch-manipulation",
                            active
                              ? "border-[#1e3a8a] bg-[#1e3a8a] text-white"
                              : "border-[#e2e8f0] bg-[#f8fafc] text-[#1e3a8a] hover:bg-[#eef2ff]",
                          )}
                        >
                          {spotValue}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSelected({ row: selected!.row, column: selected!.column, spot: null })}
                      className="col-span-3 h-11 min-h-[44px] rounded-[12px] border border-[#e2e8f0] bg-white text-sm font-semibold text-[#45556c] transition hover:bg-[#f8fafc] touch-manipulation"
                    >
                      No Spot (cell only)
                    </button>
                  </div>
                </div>
              ) : null}
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
          <div className="flex flex-col gap-4">
            <div
              ref={viewportRef}
              className={cn(
                "w-full overflow-auto overscroll-contain [scrollbar-gutter:stable]",
                hasSelection ? "max-h-[calc(100vh-420px)]" : "max-h-[calc(100vh-320px)]",
              )}
            >
              {/* Sticky context strip (keeps row/aisle/spot context visible even when rotated) */}
              {selected ? (
                <div className="sticky top-0 z-50 mb-2 flex justify-center">
                  <div className="inline-flex items-center gap-3 rounded-full border border-[#e2e8f0] bg-white/95 px-4 py-2 text-xs font-semibold text-[#0f172b] shadow-sm backdrop-blur">
                    <span>
                      Row: <span className="font-mono">{selected.row}</span>
                    </span>
                    <span className="text-[#94a3b8]">•</span>
                    <span>
                      Aisle: <span className="font-mono">{selected.column}</span>
                    </span>
                    <span className="text-[#94a3b8]">•</span>
                    <span>
                      Spot: <span className="font-mono">{selected.spot ?? "—"}</span>
                    </span>
                  </div>
                </div>
              ) : null}

              {entranceView === "left" ? (
                <div className="mx-auto w-fit max-w-full">
                  <div className="flex items-stretch gap-2">
                    <div className="flex w-12 items-center justify-center rounded-md bg-black px-2 text-center text-xs font-semibold text-white [writing-mode:vertical-rl]">
                      The side EAST warehouse entrance
                    </div>

                    <div className="flex flex-col gap-2">
                      <div
                        className={cn(
                          "grid gap-1",
                          "grid-cols-[56px_repeat(8,minmax(72px,88px))] sm:grid-cols-[72px_repeat(8,minmax(84px,96px))]",
                        )}
                      >
                        <div className="h-10" />
                        {layout.rows.map((r) => (
                          <div
                            key={`left-row-${r}`}
                            className={cn(
                              "flex h-9 items-center justify-center rounded-md border bg-[#f8fafc] text-xs font-semibold sm:h-10 sm:text-sm",
                              hasSelection && highlightedRow === r
                                ? "border-[#1e3a8a] bg-[#dbeafe] text-[#1e3a8a]"
                                : "border-[#e2e8f0] text-[#0f172b]",
                            )}
                          >
                            {r}
                          </div>
                        ))}
                      </div>

                      <div
                        className={cn(
                          "grid gap-1",
                          "grid-cols-[56px_repeat(8,minmax(72px,88px))] sm:grid-cols-[72px_repeat(8,minmax(84px,96px))]",
                        )}
                      >
                        {layout.aisles.map((aisle) => (
                          <React.Fragment key={`left-aisle-${aisle}`}>
                            <div
                              className={cn(
                                cn(
                                  "flex items-center justify-center rounded-md border bg-[#f8fafc] text-xs font-semibold transition-colors sm:text-sm",
                                  CELL_HEIGHT_CLASS,
                                ),
                                hasSelection && highlightedCol === aisle
                                  ? "border-[#1e3a8a] bg-[#dbeafe] text-[#1e3a8a]"
                                  : "border-[#e2e8f0] text-[#45556c]",
                              )}
                            >
                              {aisle}
                            </div>

                            {layout.rows.map((row) => {
                              const valid = isValidCell(row, aisle);
                              const isSelected = selected?.row === row && selected?.column === aisle;
                              const spot = isSelected ? selected?.spot : null;
                              if (!valid) {
                                return (
                                  <div
                                    key={`${row}-${aisle}-invalid`}
                                    aria-hidden="true"
                                    className={cn(
                                      cn("relative flex items-center justify-center rounded-md border", CELL_HEIGHT_CLASS),
                                      "border-[#e2e8f0] bg-[#e2e8f0]/60",
                                    )}
                                  />
                                );
                              }

                              return (
                                <div
                                  key={`${row}-${aisle}`}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`${row}-${aisle}`}
                                  aria-pressed={isSelected}
                                  onMouseEnter={() => setHovered({ row, column: aisle })}
                                  onMouseLeave={() => setHovered(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setSelected({ row, column: aisle, spot: null });
                                    }
                                  }}
                                  onClick={() => setSelected({ row, column: aisle, spot: null })}
                                  className={cn(
                                    cn("relative rounded-md border bg-white transition-colors", CELL_HEIGHT_CLASS),
                                    "touch-manipulation",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd] focus-visible:ring-offset-2",
                                    isSelected && crosshairOn && "border-[#1e3a8a] shadow-[0px_1px_3px_0px_rgba(30,58,138,0.15)]",
                                  )}
                                >
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
                                          key={`${row}-${aisle}-spot-${spotValue}`}
                                          type="button"
                                          aria-label={`${row}-${aisle}-${spotValue}`}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelected({ row, column: aisle, spot: spotValue });
                                          }}
                                          className={cn(
                                            cn(
                                              "flex w-full items-center justify-start px-2 leading-none tabular-nums",
                                              SPOT_TEXT_CLASS,
                                            ),
                                            "touch-manipulation",
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
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {entranceView !== "left" ? (
                <div className="mx-auto w-fit max-w-full">
                {layout.entranceEdge === "top" ? (
                  <div className="mb-4 w-full rounded-md bg-black py-2 text-center text-xs font-semibold text-white sm:text-sm">
                    The side EAST warehouse entrance
                  </div>
                ) : null}
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
                {layout.aisles.map((c) => (
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

                  {layout.rows.map((r) => (
                    <React.Fragment key={`row-${r}`}>
                    {r === "I" ? (
                      <div className="sticky left-0 z-40 row-span-9 flex items-center justify-center bg-white/95 backdrop-blur">
                        <div className="select-none px-1 text-xs font-semibold text-[#880e4f] sm:text-sm">
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

                    {layout.aisles.map((c) => {
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
                            "touch-manipulation",
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
                                    "touch-manipulation",
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
                        <div className="select-none px-1 text-xs font-semibold text-[#0f172b] sm:text-sm">
                          This side North
                        </div>
                      </div>
                    ) : null}
                    </React.Fragment>
                  ))}
                </div>

            </div>
              ) : null}
          </div>

          </div>
        </CardContent>
      </Card>

    </div>
  );
}