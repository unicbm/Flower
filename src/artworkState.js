export const defaultControls = Object.freeze({
  density: 0.68,
  airy: 0.62,
  bloomSize: 0.74,
});

export const artworkStateVersion = 5;

const controlRanges = Object.freeze({
  density: Object.freeze({ min: 0.3, max: 1, fallback: defaultControls.density }),
  airy: Object.freeze({ min: 0.3, max: 1, fallback: defaultControls.airy }),
  bloomSize: Object.freeze({ min: 0.35, max: 1, fallback: defaultControls.bloomSize }),
});

export const controlDefinitions = Object.freeze([
  Object.freeze({
    key: "density",
    label: "Density",
    min: controlRanges.density.min,
    max: controlRanges.density.max,
    step: 0.01,
  }),
  Object.freeze({
    key: "airy",
    label: "Air",
    min: controlRanges.airy.min,
    max: controlRanges.airy.max,
    step: 0.01,
  }),
  Object.freeze({
    key: "bloomSize",
    label: "Bloom Size",
    min: controlRanges.bloomSize.min,
    max: controlRanges.bloomSize.max,
    step: 0.01,
  }),
]);

function clampFinite(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeControlValue(key, value) {
  const range = controlRanges[key];
  return Number(clampFinite(value, range.min, range.max, range.fallback).toFixed(2));
}

export function normalizeControls(controls = defaultControls) {
  return {
    density: normalizeControlValue("density", controls?.density),
    airy: normalizeControlValue("airy", controls?.airy),
    bloomSize: normalizeControlValue("bloomSize", controls?.bloomSize),
  };
}

export function createControlsKey(controls = defaultControls) {
  const normalized = normalizeControls(controls);
  return ["density", "airy", "bloomSize"]
    .map((key) => `${key}:${normalized[key].toFixed(2)}`)
    .join("|");
}

export const getControlsKey = createControlsKey;

export function normalizeCompositionMode(value) {
  return value === "abstract" ? value : "bouquet";
}

export function createSeed() {
  const createPart = () => {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const buffer = new Uint16Array(2);
      crypto.getRandomValues(buffer);
      return Array.from(buffer, (value) => value.toString(36)).join("").slice(0, 4).padEnd(4, "0");
    }
    return Math.random().toString(36).slice(2, 6).padEnd(4, "0");
  };

  return `${createPart()}-${createPart()}-${createPart()}`;
}

export function normalizeArtworkState(value = {}) {
  return {
    seed: typeof value.seed === "string" && value.seed ? value.seed : createSeed(),
    controls: normalizeControls(value.controls),
    compositionMode: normalizeCompositionMode(value.compositionMode),
  };
}

export function createArtworkStatePayload(state = {}) {
  return {
    version: artworkStateVersion,
    ...normalizeArtworkState(state),
  };
}
