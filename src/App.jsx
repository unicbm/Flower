import { useEffect, useMemo, useRef, useState } from "react";
import { ArtworkCard, getArtworkMarkup } from "./ArtworkCard.jsx";
import { downloadPng, downloadSvg } from "./exportArtwork.js";
import { generateArtwork } from "./flowerGenerator.js";
import { parseArtworkState, serializeArtworkState } from "./shareState.js";

const defaultControls = {
  density: 0.68,
  airy: 0.62,
  bloomSize: 0.74,
};

function createSeed() {
  const part = () => Math.random().toString(36).slice(2, 6);
  return `${part()}-${part()}-${part()}`;
}

function clamp(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function sanitizeImportedState(value) {
  return {
    seed: typeof value.seed === "string" && value.seed ? value.seed : createSeed(),
    controls: {
      density: clamp(value.controls?.density, 0.3, 1, defaultControls.density),
      airy: clamp(value.controls?.airy, 0.3, 1, defaultControls.airy),
      bloomSize: clamp(value.controls?.bloomSize, 0.35, 1, defaultControls.bloomSize),
    },
  };
}

export default function App() {
  const [seed, setSeed] = useState(createSeed);
  const [controls, setControls] = useState(defaultControls);
  const [status, setStatus] = useState("");
  const [artKey, setArtKey] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [shareLink, setShareLink] = useState(
    typeof window === "undefined" ? "" : window.location.href,
  );
  const hydrateOnce = useRef(false);
  const exportRef = useRef(null);

  useEffect(() => {
    if (hydrateOnce.current) {
      return;
    }
    hydrateOnce.current = true;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("f");
    if (!raw) {
      return;
    }
    setIsBusy(true);
    parseArtworkState(raw)
      .then((parsed) => {
        const next = sanitizeImportedState(parsed);
        setSeed(next.seed);
        setControls(next.controls);
        setStatus("Artwork restored");
        setArtKey((value) => value + 1);
      })
      .catch(() => {
        setStatus("Invalid link. New artwork generated.");
      })
      .finally(() => {
        setIsBusy(false);
      });
  }, []);

  useEffect(() => {
    if (!status) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setStatus("");
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [status]);

  useEffect(() => {
    if (!isExportOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (exportRef.current?.contains(event.target)) {
        return;
      }
      setIsExportOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsExportOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExportOpen]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      serializeArtworkState({ seed, controls })
        .then((serialized) => {
          if (!active) {
            return;
          }
          const nextUrl = `${window.location.pathname}?f=${serialized}`;
          window.history.replaceState({}, "", nextUrl);
          setShareLink(window.location.href);
        })
        .catch(() => {
          if (active) {
            setStatus("Share compression is not supported here.");
          }
        });
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [seed, controls]);

  const artwork = useMemo(
    () =>
      generateArtwork(seed, {
        density: Number(controls.density.toFixed(2)),
        airy: Number(controls.airy.toFixed(2)),
        bloomSize: Number(controls.bloomSize.toFixed(2)),
      }),
    [seed, controls],
  );

  function handleRandomize() {
    setSeed(createSeed());
    setArtKey((current) => current + 1);
    setIsExportOpen(false);
    setStatus("New bouquet generated");
  }

  async function handleCopyLink() {
    try {
      const serialized = await serializeArtworkState({ seed, controls });
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.set("f", serialized);
      const nextLink = shareUrl.toString();
      window.history.replaceState({}, "", `${window.location.pathname}?f=${serialized}`);
      setShareLink(nextLink);
      await navigator.clipboard.writeText(nextLink);
      setIsExportOpen(false);
      setStatus("Link copied");
    } catch {
      try {
        await navigator.clipboard.writeText(shareLink || window.location.href);
        setStatus("Link copied");
      } catch {
        setStatus("Copy failed. Please use the address bar.");
      }
    }
  }

  async function handleExport(type) {
    const svgMarkup = getArtworkMarkup(artwork);
    const filenameBase = `floral-letter-${seed}`;
    setIsBusy(true);
    setIsExportOpen(false);
    try {
      if (type === "svg") {
        downloadSvg(svgMarkup, `${filenameBase}.svg`);
        setStatus("SVG exported");
      } else {
        await downloadPng(
          svgMarkup,
          `${filenameBase}.png`,
          artwork.frame.width,
          artwork.frame.height,
        );
        setStatus("PNG exported");
      }
    } catch {
      setStatus("Export failed. Try again shortly.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="backdrop backdrop-a" />
      <div className="backdrop backdrop-b" />

      <main className="gallery-shell">
        <header className="topbar motion-rise">
          <div className="brand-lockup">
            <p className="eyebrow">Floral Letter Studio</p>
            <h1>Bouquet Generator</h1>
          </div>
        </header>

        <section className="stage motion-rise delay-one">
          <ArtworkCard artwork={artwork} artKey={artKey} />
        </section>

        <div className="toolbar-shell motion-rise delay-two">
          <div className="toolbar" ref={exportRef}>
            <button type="button" className="tool-button primary" onClick={handleRandomize}>
              New Bouquet
            </button>
            <button type="button" className="tool-button" onClick={handleCopyLink}>
              Copy Link
            </button>
            <div className="export-group">
              <button
                type="button"
                className="tool-button"
                aria-expanded={isExportOpen}
                onClick={() => setIsExportOpen((open) => !open)}
              >
                Export
              </button>
              {isExportOpen ? (
                <div className="export-menu" role="menu" aria-label="Export format">
                  <button type="button" role="menuitem" onClick={() => handleExport("svg")}>
                    SVG
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleExport("png")}>
                    PNG
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className={`status-toast${status ? " is-visible" : ""}`} aria-live="polite">
          {isBusy ? "Processing" : status}
        </div>
      </main>
    </div>
  );
}
