import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { ArtworkCard, getArtworkMarkup } from "./ArtworkCard.jsx";
import { createMelodyPlayer } from "./audioPlayback.js";
import { downloadPng, downloadSvg } from "./exportArtwork.js";
import { generateArtwork } from "./flowerGenerator.js";
import { generateMelody } from "./musicGenerator.js";
import { parseArtworkState, serializeArtworkState } from "./shareState.js";
import { generateArtwork3D } from "./threeDGenerator.js";

const defaultControls = {
  density: 0.68,
  airy: 0.62,
  bloomSize: 0.74,
};
const defaultCompositionMode = "bouquet";
const ThreeDArtworkCard = lazy(() =>
  import("./ThreeDArtworkCard.jsx").then((module) => ({ default: module.ThreeDArtworkCard })),
);

function sanitizeCompositionMode(value) {
  return value === "abstract" || value === "3d" ? value : defaultCompositionMode;
}

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
    compositionMode: sanitizeCompositionMode(value.compositionMode),
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
  const [compositionMode, setCompositionMode] = useState(defaultCompositionMode);
  const [status, setStatus] = useState("");
  const [artKey, setArtKey] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [isMelodyPlaying, setIsMelodyPlaying] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [shareLink, setShareLink] = useState(
    typeof window === "undefined" ? "" : window.location.href,
  );
  const hydrateOnce = useRef(false);
  const exportRef = useRef(null);
  const melodyPlayerRef = useRef(null);
  const isThreeDMode = compositionMode === "3d";

  const normalizedControls = useMemo(
    () => ({
      density: Number(controls.density.toFixed(2)),
      airy: Number(controls.airy.toFixed(2)),
      bloomSize: Number(controls.bloomSize.toFixed(2)),
    }),
    [controls],
  );

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
        setCompositionMode(next.compositionMode);
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
      serializeArtworkState({ seed, controls, compositionMode })
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
  }, [seed, controls, compositionMode]);

  const artwork = useMemo(
    () => (isThreeDMode ? null : generateArtwork(seed, normalizedControls, compositionMode)),
    [compositionMode, isThreeDMode, normalizedControls, seed],
  );

  const threeDArtwork = useMemo(
    () => (isThreeDMode ? generateArtwork3D(seed, normalizedControls) : null),
    [isThreeDMode, normalizedControls, seed],
  );

  const melody = useMemo(
    () =>
      artwork
        ? generateMelody(artwork, {
            seed,
            controls: normalizedControls,
            compositionMode,
          })
        : null,
    [artwork, compositionMode, normalizedControls, seed],
  );

  useEffect(() => {
    const player = createMelodyPlayer({
      onStateChange: setIsMelodyPlaying,
    });
    melodyPlayerRef.current = player;
    return () => {
      melodyPlayerRef.current = null;
      player.dispose();
    };
  }, []);

  useEffect(() => {
    melodyPlayerRef.current?.stop();
  }, [melody?.id]);

  function handleRandomize() {
    melodyPlayerRef.current?.stop();
    setSeed(createSeed());
    setArtKey((current) => current + 1);
    setIsExportOpen(false);
    setStatus(
      compositionMode === "3d"
        ? "New sculpture generated"
        : compositionMode === "abstract"
          ? "New artwork generated"
          : "New bouquet generated",
    );
  }

  async function handleCopyLink() {
    try {
      const serialized = await serializeArtworkState({ seed, controls, compositionMode });
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

  function handleCompositionModeChange(nextMode) {
    if (nextMode === compositionMode) {
      return;
    }
    melodyPlayerRef.current?.stop();
    setCompositionMode(nextMode);
    setArtKey((current) => current + 1);
    setIsExportOpen(false);
    setStatus(
      nextMode === "3d"
        ? "3D sculpture mode enabled"
        : nextMode === "abstract"
          ? "Abstract mode enabled"
          : "Bouquet mode enabled",
    );
  }

  async function handleToggleMelody() {
    if (isThreeDMode) {
      setStatus("Melody is not available in 3D mode yet.");
      return;
    }
    if (!melodyPlayerRef.current) {
      setStatus("Audio is not ready yet.");
      return;
    }

    if (isMelodyPlaying) {
      melodyPlayerRef.current.stop();
      setStatus("Melody stopped");
      return;
    }

    try {
      await melodyPlayerRef.current.play(melody);
      setStatus(`Playing ${melody.descriptor}`);
    } catch {
      setStatus("Audio playback is not supported here.");
    }
  }

  async function handleExport(type) {
    if (!artwork) {
      setStatus("Export is not available in 3D mode yet.");
      setIsExportOpen(false);
      return;
    }
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
            <img
              className="brand-logo"
              src="/flower-randomizer-logo.svg"
              alt="Flower Randomizer logo"
              width="64"
              height="64"
            />
            <div className="brand-copy">
              <p className="eyebrow">Floral Letter Studio</p>
              <h1>Flower Randomizer</h1>
            </div>
          </div>
        </header>

        <section className="stage motion-rise delay-one">
          {isThreeDMode && threeDArtwork ? (
            <Suspense fallback={<div className="three-loading">Loading 3D sculpture...</div>}>
              <ThreeDArtworkCard scene={threeDArtwork} artKey={artKey} />
            </Suspense>
          ) : (
            <ArtworkCard artwork={artwork} artKey={artKey} />
          )}
        </section>

        <div className="toolbar-shell motion-rise delay-two">
          <div className="toolbar" ref={exportRef}>
            <div className="mode-toggle" role="group" aria-label="Composition mode">
              <button
                type="button"
                className={`tool-button mode-button${compositionMode === "bouquet" ? " is-active" : ""}`}
                aria-pressed={compositionMode === "bouquet"}
                onClick={() => handleCompositionModeChange("bouquet")}
              >
                Bouquet
              </button>
              <button
                type="button"
                className={`tool-button mode-button${compositionMode === "abstract" ? " is-active" : ""}`}
                aria-pressed={compositionMode === "abstract"}
                onClick={() => handleCompositionModeChange("abstract")}
              >
                Abstract
              </button>
              <button
                type="button"
                className={`tool-button mode-button${compositionMode === "3d" ? " is-active" : ""}`}
                aria-pressed={compositionMode === "3d"}
                onClick={() => handleCompositionModeChange("3d")}
              >
                Sculpture
              </button>
            </div>
            <button type="button" className="tool-button primary" onClick={handleRandomize}>
              {compositionMode === "3d"
                ? "New Sculpture"
                : compositionMode === "abstract"
                  ? "New Artwork"
                  : "New Bouquet"}
            </button>
            <button
              type="button"
              className={`tool-button melody-button${isMelodyPlaying ? " is-active" : ""}${isThreeDMode ? " is-disabled" : ""}`}
              aria-pressed={isMelodyPlaying}
              disabled={isThreeDMode}
              onClick={handleToggleMelody}
            >
              {isThreeDMode ? "Melody Later" : isMelodyPlaying ? "Stop Melody" : "Play Melody"}
            </button>
            <button type="button" className="tool-button" onClick={handleCopyLink}>
              Copy Link
            </button>
            <div className="export-group">
              <button
                type="button"
                className={`tool-button${isThreeDMode ? " is-disabled" : ""}`}
                aria-expanded={isExportOpen}
                disabled={isThreeDMode}
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

        <div className="melody-strip motion-rise delay-two" aria-live="polite">
          {isThreeDMode && threeDArtwork ? (
            <>
              <span className="melody-pill">3D {threeDArtwork.sceneType.replace("-", " ")}</span>
              <span className="melody-pill">{threeDArtwork.palette.name}</span>
              <span className="melody-pill">{threeDArtwork.flowers.length} blooms</span>
              <span className="melody-pill">Deterministic seed scene</span>
            </>
          ) : melody ? (
            <>
              <span className="melody-pill">{melody.title}</span>
              <span className="melody-pill">Piano in {melody.descriptor}</span>
              <span className="melody-pill">{melody.tempo} BPM</span>
              <span className="melody-pill">{Math.round(melody.durationSeconds)}s</span>
            </>
          ) : null}
        </div>

        <div className={`status-toast${status ? " is-visible" : ""}`} aria-live="polite">
          {isBusy ? "Processing" : status}
        </div>
      </main>
    </div>
  );
}
