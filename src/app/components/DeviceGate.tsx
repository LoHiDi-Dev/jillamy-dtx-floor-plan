import * as React from "react";

type DeviceMode = "phone" | "tablet" | "desktop";

const FORCE_DESKTOP_STORAGE_KEY = "dtx-floorplan:forceDesktopOnPhone";

function getDeviceMode(): { mode: DeviceMode; width: number; height: number } {
  const width = typeof window !== "undefined" ? window.innerWidth : 0;
  const height = typeof window !== "undefined" ? window.innerHeight : 0;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  const minSide = Math.min(width, height);

  const isPhoneUA =
    /\b(iPhone|iPod)\b/i.test(ua) ||
    (/\bAndroid\b/i.test(ua) && /\bMobile\b/i.test(ua)) ||
    /\bWindows Phone\b/i.test(ua);

  const isTabletUA =
    /\b(iPad)\b/i.test(ua) ||
    (/\bAndroid\b/i.test(ua) && !/\bMobile\b/i.test(ua)) ||
    /\bTablet\b/i.test(ua);

  const coarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  // Phone rule: small side OR explicit phone UA. We also treat very small coarse-pointer
  // screens as phone to avoid letting small phones through.
  const isPhone = minSide > 0 && (minSide < 768 || isPhoneUA || (coarsePointer && minSide < 820));

  // Tablet rule:
  // - Explicit tablet UA (iPad / Android tablet)
  // - OR a coarse-pointer device in typical tablet size range.
  // NOTE: We intentionally do NOT use width-only rules for non-touch devices, so a resized
  // desktop browser window never becomes "tablet".
  const isTablet = !isPhone && (isTabletUA || (coarsePointer && minSide >= 768 && minSide < 1367));

  const mode: DeviceMode = isPhone ? "phone" : isTablet ? "tablet" : "desktop";
  return { mode, width, height };
}

export function DeviceGate({
  children,
}: {
  children: (info: { mode: DeviceMode; isTablet: boolean; isDesktop: boolean; isPhone: boolean }) => React.ReactNode;
}) {
  const [{ mode, width, height }, setInfo] = React.useState(() => getDeviceMode());
  const [forceDesktopOnPhone, setForceDesktopOnPhone] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const url = new URL(window.location.href);
      const qp = url.searchParams.get("desktop");
      if (qp === "1" || qp === "true") return true;
    } catch {
      // ignore
    }
    try {
      return window.localStorage.getItem(FORCE_DESKTOP_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    let raf = 0;

    function onResize() {
      cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => setInfo(getDeviceMode()));
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  if (mode === "phone" && !forceDesktopOnPhone) {
    return (
      <div className="fixed inset-0 z-[1000] flex min-h-screen items-center justify-center bg-[#0b1220] px-6 text-white">
        <div className="w-full max-w-[520px] rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="text-2xl font-semibold leading-tight">Desktop Required</div>
          <div className="mt-2 text-sm leading-relaxed text-white/80">
            This training tool is not available on mobile. Please open it on a desktop or tablet.
          </div>

          <button
            type="button"
            onClick={() => {
              setForceDesktopOnPhone(true);
              try {
                window.localStorage.setItem(FORCE_DESKTOP_STORAGE_KEY, "1");
              } catch {
                // ignore
              }
            }}
            className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-[14px] bg-white px-4 text-sm font-semibold text-[#0b1220] shadow-sm transition hover:bg-white/90 active:bg-white/80"
          >
            View desktop version on mobile
          </button>

          <div className="mt-5 rounded-[14px] border border-white/10 bg-white/5 p-4 text-sm text-white/85">
            <div className="font-semibold text-white">Current screen</div>
            <div className="mt-1 font-mono text-xs text-white/70">
              {width}×{height}
            </div>
            <div className="mt-2 text-xs text-white/65">
              Tip: Rotating your device may change the size, but phones remain blocked.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const effectiveMode: DeviceMode =
    mode === "phone" && forceDesktopOnPhone ? "desktop" : mode;

  return (
    <>
      {children({
        mode: effectiveMode,
        isPhone: mode === "phone",
        isTablet: effectiveMode === "tablet",
        isDesktop: effectiveMode === "desktop",
      })}
    </>
  );
}

