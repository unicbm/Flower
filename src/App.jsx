import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArtworkCard, getArtworkMarkup } from "./ArtworkCard.jsx";
import { createMelodyPlayer } from "./audioPlayback.js";
import {
  controlDefinitions,
  createControlsKey,
  createSeed,
  defaultControls,
  normalizeArtworkState,
  normalizeControls,
} from "./artworkState.js";
import { downloadPng, downloadSvg } from "./exportArtwork.js";
import { generateArtwork } from "./flowerGenerator.js";
import { generateMelody } from "./musicGenerator.js";
import { parseArtworkState, serializeArtworkState } from "./shareState.js";

const defaultCompositionMode = "bouquet";
const developerModeStorageKey = "flower-randomizer:developer-mode";

function parseBooleanFlag(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "on", "yes", "enable", "enabled", "open", "dev"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "off", "no", "disable", "disabled", "close", "locked"].includes(normalized)) {
    return false;
  }

  return null;
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
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [shareLink, setShareLink] = useState(
    typeof window === "undefined" ? "" : window.location.href,
  );
  const hydrateOnce = useRef(false);
  const exportRef = useRef(null);
  const melodyPlayerRef = useRef(null);
  const areControlsDirty = useMemo(
    () => createControlsKey(controls) !== createControlsKey(defaultControls),
    [controls],
  );

  const normalizedControls = useMemo(() => normalizeControls(controls), [controls]);
  const deferredControls = useDeferredValue(normalizedControls);

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
        const next = normalizeArtworkState(parsed);
        setSeed(next.seed);
        setCompositionMode(next.compositionMode);
        setControls(next.controls);
        setStatus("Artwork restored");
        setArtKey((value) => value + 1);
      })
      .catch((error) => {
        setStatus(
          error?.code === "UNSUPPORTED_COMPRESSED_LINK"
            ? "This link needs a newer browser to open."
            : "Invalid link. New artwork generated.",
        );
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
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const queryFlag = parseBooleanFlag(params.get("dev"));
    const queryDeveloper = params.get("developer");
    const explicitFlag =
      queryFlag !== null ? queryFlag : parseBooleanFlag(queryDeveloper);

    if (explicitFlag !== null) {
      setIsDeveloperMode(explicitFlag);
      window.localStorage.setItem(
        developerModeStorageKey,
        explicitFlag ? "1" : "0",
      );
      return;
    }

    const stored = window.localStorage.getItem(developerModeStorageKey);
    setIsDeveloperMode(stored === "1");
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      serializeArtworkState({ seed, controls: normalizedControls, compositionMode })
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
            setStatus("Link update failed.");
          }
        });
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [compositionMode, normalizedControls, seed]);

  const artwork = useMemo(
    () => generateArtwork(seed, deferredControls, compositionMode),
    [compositionMode, deferredControls, seed],
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
    if (isBusy) {
      return;
    }
    melodyPlayerRef.current?.stop();
    startTransition(() => {
      setSeed(createSeed());
      setArtKey((current) => current + 1);
    });
    setIsExportOpen(false);
    setStatus(
      compositionMode === "abstract" ? "New artwork generated" : "New bouquet generated",
    );
  }

  async function handleCopyLink() {
    try {
      const serialized = await serializeArtworkState({
        seed,
        controls: normalizedControls,
        compositionMode,
      });
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
    if (isBusy || nextMode === compositionMode) {
      return;
    }
    melodyPlayerRef.current?.stop();
    startTransition(() => {
      setCompositionMode(nextMode);
      setArtKey((current) => current + 1);
    });
    setIsExportOpen(false);
    setStatus(
      nextMode === "abstract" ? "Abstract mode enabled" : "Bouquet mode enabled",
    );
  }

  async function handleToggleMelody() {
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
    if (isBusy) {
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
          { scale: window.devicePixelRatio > 2 ? 3 : 2 },
        );
        setStatus("PNG exported");
      }
    } catch {
      setStatus("Export failed. Try again shortly.");
    } finally {
      setIsBusy(false);
    }
  }

  function handleControlChange(key, nextValue) {
    if (isBusy) {
      return;
    }
    const numericValue = Number(nextValue);
    if (!Number.isFinite(numericValue)) {
      return;
    }
    melodyPlayerRef.current?.stop();
    startTransition(() => {
      setControls((current) =>
        normalizeControls({
          ...current,
          [key]: numericValue,
        }),
      );
    });
    setIsExportOpen(false);
  }

  function handleResetControls() {
    if (isBusy || !areControlsDirty) {
      return;
    }
    melodyPlayerRef.current?.stop();
    startTransition(() => {
      setControls(defaultControls);
    });
    setIsExportOpen(false);
    setStatus("Controls reset");
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
          <ArtworkCard artwork={artwork} artKey={artKey} />
        </section>

        <div className="toolbar-shell motion-rise delay-two">
          <div className="toolbar" ref={exportRef}>
            <div className="mode-toggle" role="group" aria-label="Composition mode">
              <button
                type="button"
                className={`tool-button mode-button${compositionMode === "bouquet" ? " is-active" : ""}`}
                aria-pressed={compositionMode === "bouquet"}
                disabled={isBusy}
                onClick={() => handleCompositionModeChange("bouquet")}
              >
                Bouquet
              </button>
              <button
                type="button"
                className={`tool-button mode-button${compositionMode === "abstract" ? " is-active" : ""}`}
                aria-pressed={compositionMode === "abstract"}
                disabled={isBusy}
                onClick={() => handleCompositionModeChange("abstract")}
              >
                Abstract
              </button>
            </div>
            <button type="button" className="tool-button primary" disabled={isBusy} onClick={handleRandomize}>
              {compositionMode === "abstract" ? "New Artwork" : "New Bouquet"}
            </button>
            <button
              type="button"
              className={`tool-button melody-button${isMelodyPlaying ? " is-active" : ""}`}
              aria-pressed={isMelodyPlaying}
              disabled={isBusy}
              onClick={handleToggleMelody}
            >
              {isMelodyPlaying ? "Stop Melody" : "Play Melody"}
            </button>
            <button type="button" className="tool-button" disabled={isBusy} onClick={handleCopyLink}>
              Copy Link
            </button>
            <div className="export-group">
              <button
                type="button"
                className="tool-button"
                aria-expanded={isExportOpen}
                disabled={isBusy}
                onClick={() => setIsExportOpen((open) => !open)}
              >
                Export
              </button>
              {isExportOpen ? (
                <div className="export-menu" role="menu" aria-label="Export format">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isBusy}
                    onClick={() => handleExport("svg")}
                  >
                    SVG
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isBusy}
                    onClick={() => handleExport("png")}
                  >
                    PNG
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {isDeveloperMode ? (
          <section
            className="control-panel-shell motion-rise delay-two"
            aria-label="Generation controls"
          >
            <div className="control-panel">
              <div className="control-panel-header">
                <div>
                  <p className="control-panel-eyebrow">Generator Controls</p>
                  <h2>Dial The Composition</h2>
                </div>
                <button
                  type="button"
                  className="tool-button control-reset"
                  disabled={isBusy || !areControlsDirty}
                  onClick={handleResetControls}
                >
                  Reset
                </button>
              </div>
              <div className="control-grid">
                {controlDefinitions.map((field) => (
                  <label key={field.key} className="control-field">
                    <span className="control-copy">
                      <span className="control-label">{field.label}</span>
                      <span className="control-value">{normalizedControls[field.key].toFixed(2)}</span>
                    </span>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={controls[field.key]}
                      disabled={isBusy}
                      onChange={(event) => handleControlChange(field.key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <div className="melody-strip motion-rise delay-two" aria-live="polite">
          {melody ? (
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

        <footer className="site-footer">
          <a
            className="site-link"
            href="https://github.com/unicbm/Flower"
            target="_blank"
            rel="noreferrer"
          >
            GitHub: unicbm/Flower
          </a>
          <span>© 2026 unicbm. All rights reserved.</span>
        </footer>
      </main>
    </div>
  );
}
