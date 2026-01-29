import * as React from "react";
import { Search, X, MapPin, Clock, TriangleAlert } from "lucide-react";

type RowCode = 'I' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

interface Location {
  row: RowCode;
  aisle: number;
  spot: number | null;
  code: string;
}

// Determine if a location is valid based on warehouse geometry
function isValidLocation(row: RowCode, aisle: number): boolean {
  if (row === 'I') return aisle >= 1 && aisle <= 9;
  if (['A', 'B', 'C', 'D'].includes(row)) return aisle >= 1 && aisle <= 6;
  if (['E', 'F', 'G'].includes(row)) return aisle >= 1 && aisle <= 5;
  return false;
}

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

function formatMinutesSeconds(totalSeconds: number) {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  const secondLabel = seconds === 1 ? "second" : "seconds";
  if (minutes <= 0) return `${seconds} ${secondLabel}`;
  const minuteLabel = minutes === 1 ? "minute" : "minutes";
  if (seconds <= 0) return `${minutes} ${minuteLabel}`;
  return `${minutes} ${minuteLabel} ${seconds} ${secondLabel}`;
}

function estimateWalkSecondsIDW(loc: Location3D) {
  const ROW_SPAN = 7;
  const AISLE_SPAN = 8; // 1..9
  const SPOT_SPAN = 8; // 1..9

  const eps = 1e-6;
  const power = 2;

  const anchorSeconds = WALK_TIME_ANCHORS.map((a) => a.seconds);
  const minAnchorSeconds = Math.min(...anchorSeconds);
  const maxAnchorSeconds = Math.max(...anchorSeconds);

  let weightedSum = 0;
  let weightTotal = 0;

  for (const a of WALK_TIME_ANCHORS) {
    if (a.row === loc.row && a.aisle === loc.aisle && a.spot === loc.spot) return a.seconds;

    const dr = Math.abs(ROW_INDEX[loc.row] - ROW_INDEX[a.row]) / ROW_SPAN;
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

function buildCode(row: RowCode, aisle: number, spot: number | null) {
  return spot ? `${row}-${aisle}-${spot}` : `${row}-${aisle}`;
}

type ParsedSearch =
  | { ok: true; row: RowCode; aisle: number; spot: number | null }
  | { ok: false; message: string };

function parseSearchInput(raw: string): ParsedSearch {
  const value = raw.trim().toUpperCase();
  if (!value) return { ok: false, message: "Enter a location (e.g., I-2-7 or I27)" };
  const allowedRows: RowCode[] = ["I", "A", "B", "C", "D", "E", "F", "G"];
  const firstChar = value[0];
  if (/^[A-Z]$/.test(firstChar) && !allowedRows.includes(firstChar as RowCode)) {
    return { ok: false, message: "Invalid row (valid rows: I, A–G)." };
  }

  // Hyphen formats: I-1 or I-1-2
  const hyphen = value.match(/^([IA-G])-(\d)(?:-(\d))?$/);
  if (hyphen) {
    const row = hyphen[1] as RowCode;
    const aisle = Number(hyphen[2]);
    const spot = hyphen[3] ? Number(hyphen[3]) : null;
    if (aisle < 1 || aisle > 9) return { ok: false, message: "Invalid aisle (valid range is 1–9)." };
    if (spot !== null && (spot < 1 || spot > 9)) return { ok: false, message: "Invalid spot (valid range is 1–9)." };
    return { ok: true, row, aisle, spot };
  }

  // Compact formats: I2 (partial) or I21 (full)
  const compact = value.match(/^([IA-G])(\d)(\d)?$/);
  if (compact) {
    const row = compact[1] as RowCode;
    const aisle = Number(compact[2]);
    const spot = compact[3] ? Number(compact[3]) : null;
    if (aisle < 1 || aisle > 9) return { ok: false, message: "Invalid aisle (valid range is 1–9)." };
    if (spot !== null && (spot < 1 || spot > 9)) return { ok: false, message: "Invalid spot (valid range is 1–9)." };
    return { ok: true, row, aisle, spot };
  }

  return {
    ok: false,
    message: "Invalid format. Use ROW-AISLE-SPOT (I-2-7), partial (I-2), or compact (I27).",
  };
}

export function WarehouseFloorPlan() {
  const [selectedLocation, setSelectedLocation] = React.useState<Location | null>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const scrollRootRef = React.useRef<HTMLDivElement | null>(null);
  const spotRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const primaryButtonClass =
    "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#1E3A8A] px-4 text-[18px] font-medium leading-7 text-white shadow-sm transition-colors hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#93c5fd] focus:ring-offset-2 active:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#1E3A8A] disabled:active:bg-[#1E3A8A]";

  const canSearch = searchValue.trim().length > 0;

  const handleSpotClick = (row: RowCode, aisle: number, spot: number) => {
    if (isValidLocation(row, aisle)) {
      const code = buildCode(row, aisle, spot);
      setSelectedLocation({ row, aisle, spot, code });
      setSearchValue("");
      setSearchError(null);
    }
  };

  const clearSelection = () => {
    setSelectedLocation(null);
    setSearchValue("");
    setSearchError(null);
  };

  // Click-away: if a spot is selected and the user clicks anywhere else on the page,
  // clear the selection. Spot clicks are ignored so selection still works.
  React.useEffect(() => {
    if (!selectedLocation) return;

    const captureOptions = { capture: true } as const;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-spot-button="true"]')) return;
      clearSelection();
    };

    document.addEventListener("pointerdown", onPointerDown, captureOptions);
    return () => document.removeEventListener("pointerdown", onPointerDown, captureOptions);
  }, [selectedLocation]);

  const handleSearchGo = () => {
    const parsed = parseSearchInput(searchValue);
    if (!parsed.ok) {
      setSearchError(parsed.message);
      return;
    }

    if (!isValidLocation(parsed.row, parsed.aisle)) {
      setSearchError(`No storage at ${parsed.row}-${parsed.aisle}.`);
      return;
    }

    const code = buildCode(parsed.row, parsed.aisle, parsed.spot);
    setSelectedLocation({ row: parsed.row, aisle: parsed.aisle, spot: parsed.spot, code });
    setSearchValue("");
    setSearchError(null);
  };

  const isSelected = (row: RowCode, aisle: number, spot: number) => {
    return selectedLocation?.row === row && 
           selectedLocation?.aisle === aisle && 
           selectedLocation?.spot === spot;
  };

  React.useEffect(() => {
    if (!selectedLocation) return;
    const targetSpot = selectedLocation.spot ?? 1;
    const key = `${selectedLocation.row}-${selectedLocation.aisle}-${targetSpot}`;
    const el = spotRefs.current[key];
    if (!el) return;
    el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  }, [selectedLocation?.row, selectedLocation?.aisle, selectedLocation?.spot]);

  const approxWalkTimeLabel = React.useMemo(() => {
    if (!selectedLocation?.spot) return null;
    const seconds = estimateWalkSecondsIDW({
      row: selectedLocation.row,
      aisle: selectedLocation.aisle,
      spot: selectedLocation.spot,
    });
    return formatMinutesSeconds(seconds);
  }, [selectedLocation]);

  return (
    <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-4 mb-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.10),0px_1px_2px_-1px_rgba(0,0,0,0.10)]">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#1e3a8a] mb-2">Warehouse Plan • Lola Blankets</h1>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Rows:</span> I, A–G • <span className="font-medium">Aisles:</span> 1–9 • <span className="font-medium">Spots:</span> 1–9
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Status:</span>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  selectedLocation
                    ? "border border-green-200 bg-green-50 text-green-700"
                    : "border border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {selectedLocation ? "Active" : "Not Active"}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Search + Grid */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search Section */}
            <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.10),0px_1px_2px_-1px_rgba(0,0,0,0.10)]">
              <h2 className="text-lg font-semibold text-[#0f172b] mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-[#1e3a8a]" />
                Find Location
              </h2>
              
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => {
                      setSearchValue(e.target.value.toUpperCase());
                      setSearchError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && canSearch && handleSearchGo()}
                    placeholder="Find a location (e.g., I-2-7, I-2, I27)"
                    className={`w-full rounded-[12px] bg-white px-4 py-2 border outline-none ring-offset-2 transition-all ${
                      searchError 
                        ? 'border-red-300 ring-2 ring-red-200 bg-red-50' 
                        : 'border-[#e2e8f0] focus:ring-2 focus:ring-[#93c5fd]'
                    }`}
                  />
                  {searchError ? (
                    <p className="text-xs text-red-600 mt-1 ml-1">
                      {searchError}
                    </p>
                  ) : null}
                </div>
                <button
                  onClick={handleSearchGo}
                  disabled={!canSearch}
                  className={primaryButtonClass}
                >
                  Go
                </button>
                {searchValue && (
                  <button
                    onClick={() => {
                      setSearchValue("");
                      setSearchError(null);
                    }}
                    className="inline-flex items-center justify-center rounded-[14px] bg-slate-100 px-4 py-3 text-slate-700 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] focus:ring-offset-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

            </div>

            {/* Warehouse Grid */}
            <div
              className="rounded-[16px] border border-[#e2e8f0] bg-white p-4 overflow-x-auto shadow-[0px_1px_3px_0px_rgba(0,0,0,0.10),0px_1px_2px_-1px_rgba(0,0,0,0.10)]"
              ref={scrollRootRef}
            >
              <div className="relative min-w-[640px]">
                {/* WEST label (top) */}
                <div className="text-center mb-3">
                  <span className="text-sm font-semibold text-[#1e3a8a] bg-[#eff6ff] px-4 py-1 rounded-full border border-[#bfdbfe]">
                    This side WEST
                  </span>
                </div>

                {/* Grid Table */}
                <div className="overflow-hidden border border-gray-300 rounded-lg">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="bg-[#f8fafc] border border-gray-300 p-2 w-16"></th>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((aisle) => (
                          <th
                            key={aisle}
                            className={`border border-gray-300 p-2 text-center font-bold text-sm transition-all ${
                              selectedLocation?.aisle === aisle
                                ? 'bg-[#1e3a8a] text-white'
                                : 'bg-[#dbeafe] text-[#1e3a8a]'
                            }`}
                          >
                            {aisle}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(['I', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] as RowCode[]).map((row) => (
                        <tr key={row}>
                          {/* Row Label */}
                          <td
                            className={`border border-gray-300 p-2 text-center font-bold text-sm transition-all ${
                              selectedLocation?.row === row
                                ? 'bg-[#1e3a8a] text-white'
                                : row === 'I'
                                ? 'bg-orange-200 text-orange-900'
                                : 'bg-[#f8fafc] text-[#0f172b]'
                            }`}
                          >
                            {row}
                          </td>

                          {/* Aisle Cells */}
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((aisle) => {
                            const valid = isValidLocation(row, aisle);
                            
                            if (!valid) {
                              return (
                                <td
                                  key={aisle}
                                  className="border border-gray-300 bg-gray-200 p-0 relative"
                                  aria-disabled="true"
                                >
                                  <div className="h-14 xl:h-16 flex items-center justify-center px-2">
                                    <span className="text-[11px] text-gray-500 italic">No storage</span>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={aisle}
                                className="border border-gray-300 p-0 bg-[#f8fafc]"
                              >
                                {/* 9 spots grid */}
                                <div className="grid grid-cols-3 grid-rows-3 gap-0.5 p-1 h-14 xl:h-16">
                                  {[1, 4, 7, 2, 5, 8, 3, 6, 9].map((spot) => {
                                    const selected = isSelected(row, aisle, spot);
                                    const code = `${row}-${aisle}-${spot}`;
                                    
                                    return (
                                      <button
                                        key={spot}
                                        onClick={() => handleSpotClick(row, aisle, spot)}
                                        ref={(el) => {
                                          spotRefs.current[code] = el;
                                        }}
                                        data-spot-button="true"
                                        className={`relative flex h-full w-full items-center justify-center rounded-md border text-[11px] font-semibold leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-[#93c5fd] focus:ring-offset-1 ${
                                          selected
                                            ? "border-blue-700 bg-blue-50 text-blue-800 ring-[3px] ring-blue-700"
                                            : "border-gray-300 bg-white text-slate-600"
                                        }`}
                                        aria-label={`Select ${code}`}
                                      >
                                        <span className="pointer-events-none select-none">{spot}</span>

                                        {/* Marker */}
                                        {selected ? (
                                          <div className="absolute inset-0 pointer-events-none">
                                            <div className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-blue-700" />
                                            <MapPin className="w-3 h-3 text-blue-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                          </div>
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Side Labels */}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-semibold text-red-700 bg-red-50 px-4 py-1 rounded-full">
                    This side SOUTH
                  </span>
                  <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-4 py-1 rounded-full">
                    This side North
                  </span>
                </div>

                {/* Entrance Bar */}
                <div className="mt-4 bg-[#0f172b] text-white text-center py-3 rounded-[12px] font-semibold text-sm">
                  The side EAST warehouse entrance
                </div>
              </div>
            </div>
              ) : null}
          </div>

          {/* Right Column - Selected Location Panel */}
          <div className="lg:col-span-1">
            <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-4 sticky top-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.10),0px_1px_2px_-1px_rgba(0,0,0,0.10)]">
              <h2 className="text-lg font-semibold text-[#0f172b] mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#1e3a8a]" />
                Selected Location
              </h2>

              {selectedLocation ? (
                <div className="space-y-4">
                  {/* Location Code */}
                  <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-[14px] p-4 text-center">
                    <div className="text-3xl font-bold text-[#1e3a8a] font-mono mb-2">
                      {selectedLocation.code}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-blue-800">
                      <div className="rounded-md bg-white/60 px-2 py-1">
                        <span className="font-semibold">Row:</span> <span className="font-mono">{selectedLocation.row}</span>
                      </div>
                      <div className="rounded-md bg-white/60 px-2 py-1">
                        <span className="font-semibold">Aisle:</span>{" "}
                        <span className="font-mono">{selectedLocation.aisle}</span>
                      </div>
                      <div className="rounded-md bg-white/60 px-2 py-1">
                        <span className="font-semibold">Spot:</span>{" "}
                        <span className="font-mono">{selectedLocation.spot ?? "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Walk Time */}
                  <div className="bg-green-50 border border-green-200 rounded-[14px] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-green-700" />
                      <span className="text-sm font-semibold text-green-700">Approx. Walk Time</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {approxWalkTimeLabel ?? "—"}
                    </div>
                    <p className="text-xs text-green-700 mt-1">From entrance</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={clearSelection}
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 font-medium shadow-sm transition enabled:hover:-translate-y-[1px] enabled:hover:shadow-md active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(23,42,130,0.22)] focus-visible:ring-offset-2 focus-visible:ring-offset-white h-11 text-sm border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 w-full justify-center border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:hover:bg-red-50"
                      type="button"
                      data-testid="ic-reset-admin"
                      aria-disabled="false"
                    >
                      <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                      Clear Selection
                    </button>
                  </div>

                  {/* Additional Info */}
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Location Details</h4>
                    <div className="space-y-1 text-xs text-slate-600">
                      <p><span className="font-medium">Row:</span> {selectedLocation.row}</p>
                      <p><span className="font-medium">Aisle:</span> {selectedLocation.aisle}</p>
                      <p><span className="font-medium">Spot:</span> {selectedLocation.spot ?? "—"}</p>
                      <p className="pt-2"><span className="font-medium">Status:</span> <span className="text-green-600 font-semibold">Available</span></p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium mb-1">No location selected</p>
                  <p className="text-sm text-slate-500">
                    Click a spot on the grid or use search
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
