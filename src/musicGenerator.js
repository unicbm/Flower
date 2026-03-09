import { createRandom } from "./random.js";

const ROOTS = ["C", "D", "Eb", "F", "G", "A", "Bb"];

const SCALES = [
  { name: "Major", intervals: [0, 2, 4, 5, 7, 9, 11], mood: "radiant" },
  { name: "Lydian", intervals: [0, 2, 4, 6, 7, 9, 11], mood: "lifted" },
  { name: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10], mood: "wandering" },
  { name: "Natural Minor", intervals: [0, 2, 3, 5, 7, 8, 10], mood: "velvet" },
  { name: "Major Pentatonic", intervals: [0, 2, 4, 7, 9], mood: "clear" },
];

const SEMITONES = {
  C: 0,
  Db: 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  Gb: 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function average(values, fallback = 0) {
  if (!values.length) {
    return fallback;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function variance(values, fallback = 0) {
  if (!values.length) {
    return fallback;
  }
  const mean = average(values, fallback);
  return average(values.map((value) => (value - mean) ** 2), fallback);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : clean;
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue = 0;
  if (max === red) {
    hue = ((green - blue) / delta + (green < blue ? 6 : 0)) * 60;
  } else if (max === green) {
    hue = ((blue - red) / delta + 2) * 60;
  } else {
    hue = ((red - green) / delta + 4) * 60;
  }

  return { h: hue, s: saturation, l: lightness };
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function midiToPitch(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${octave}`;
}

function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function degreeToMidi(root, scale, degree, octave) {
  const length = scale.intervals.length;
  const wrappedDegree = ((degree % length) + length) % length;
  const octaveShift = Math.floor(degree / length);
  return 12 * (octave + 1) + SEMITONES[root] + scale.intervals[wrappedDegree] + octaveShift * 12;
}

function chooseScale(mode, brightness, airy, random) {
  if (mode === "abstract") {
    return brightness > 0.74 && airy > 0.56
      ? SCALES[1]
      : sampleWeighted(random, [
          [SCALES[2], 2.4],
          [SCALES[3], 1.8],
          [SCALES[1], 1.2],
        ]);
  }

  return brightness > 0.76
    ? sampleWeighted(random, [
        [SCALES[4], 2.4],
        [SCALES[0], 2],
        [SCALES[1], 1.4],
      ])
    : sampleWeighted(random, [
        [SCALES[0], 1.4],
        [SCALES[2], 1.8],
        [SCALES[3], 1.6],
      ]);
}

function sampleWeighted(random, pairs) {
  const total = pairs.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = random() * total;
  for (const [value, weight] of pairs) {
    cursor -= weight;
    if (cursor <= 0) {
      return value;
    }
  }
  return pairs[pairs.length - 1][0];
}

function createFeatureSummary(artwork, controls, compositionMode) {
  const plan = artwork.composition?.plan ?? [];
  const frameWidth = artwork.frame?.width ?? 760;
  const frameHeight = artwork.frame?.height ?? 960;
  const anchors = plan.length
    ? plan.map((item) => ({
        x: (item.bloomX ?? artwork.composition?.focusX ?? frameWidth * 0.5) / frameWidth,
        y: (item.bloomY ?? artwork.composition?.focusY ?? frameHeight * 0.5) / frameHeight,
        depth: item.depth ?? 0,
      }))
    : [
        {
          x: (artwork.composition?.focusX ?? frameWidth * 0.5) / frameWidth,
          y: (artwork.composition?.focusY ?? frameHeight * 0.5) / frameHeight,
          depth: 120,
        },
      ];

  const bloomKinds = plan.reduce(
    (totals, item) => ({
      peony: totals.peony + (item.kind === "peony" ? 1 : 0),
      rose: totals.rose + (item.kind === "rose" ? 1 : 0),
      camellia: totals.camellia + (item.kind === "camellia" ? 1 : 0),
      orchid: totals.orchid + (item.kind === "orchid" ? 1 : 0),
    }),
    { peony: 0, rose: 0, camellia: 0, orchid: 0 },
  );

  const centroidX = average(anchors.map((point) => point.x), 0.5);
  const centroidY = average(anchors.map((point) => point.y), 0.4);
  const spread = Math.sqrt(
    variance(anchors.map((point) => point.x), 0.018) +
      variance(anchors.map((point) => point.y), 0.024),
  );
  const normalizedDepth = average(anchors.map((point) => point.depth), 120) / 220;
  const paletteBrightness = average(
    [...artwork.palette.background, ...artwork.palette.bloom].map((value) => luminance(value)),
    0.72,
  );
  const accentHue = rgbToHsl(hexToRgb(artwork.palette.accent)).h;

  return {
    bloomCount: plan.length || artwork.blooms?.length || 0,
    petalCount: artwork.floatingPetals?.length ?? 0,
    leafCount: artwork.leaves?.length ?? 0,
    branchCount: (artwork.branchlets?.length ?? 0) + (artwork.tendrils?.length ?? 0),
    ornamentCount: (artwork.ornaments?.length ?? 0) + (artwork.sprigs?.length ?? 0),
    centroidX: round(centroidX),
    centroidY: round(centroidY),
    spread: round(spread),
    normalizedDepth: round(normalizedDepth),
    paletteBrightness: round(paletteBrightness),
    accentHue: round(accentHue / 360),
    density: round(controls?.density ?? 0.68),
    airy: round(controls?.airy ?? 0.62),
    bloomSize: round(controls?.bloomSize ?? 0.74),
    compositionMode,
    bloomKinds,
  };
}

function buildMotif(random, phraseBeats, movement, densityFactor) {
  const notes = [];
  const durations = densityFactor > 0.7 ? [0.5, 0.5, 1, 1, 1.5] : [0.5, 1, 1, 1.5, 2];
  let cursor = 0;
  let degree = Math.round(movement.startDegree);

  while (cursor < phraseBeats - 0.001) {
    const remaining = round(phraseBeats - cursor, 3);
    const available = durations.filter((value) => value <= remaining + 0.001);
    const duration = available.length ? available[Math.floor(random() * available.length)] : remaining;
    const directionRoll = random();
    const leapBias = movement.leapBias;
    const stepOptions =
      directionRoll < movement.ascendBias
        ? [1, 1, 2, leapBias > 0.5 ? 4 : 3]
        : [-1, -1, -2, leapBias > 0.5 ? -4 : -3];
    const delta = stepOptions[Math.floor(random() * stepOptions.length)];
    degree = clamp(degree + delta, movement.minDegree, movement.maxDegree);
    notes.push({
      degree,
      startBeat: round(cursor, 3),
      durationBeats: round(duration, 3),
      velocity: round(0.52 + random() * 0.26, 3),
    });
    cursor += duration;
  }

  if (notes.length) {
    notes[notes.length - 1].degree = movement.resolveDegree;
    notes[notes.length - 1].durationBeats = round(
      Math.max(notes[notes.length - 1].durationBeats, 1.5),
      3,
    );
  }

  return notes;
}

function varyMotif(random, motif, offsetBeats, movement) {
  return motif.map((note, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    const adjustment =
      random() < 0.56 ? 0 : direction * (movement.leapBias > 0.54 && random() < 0.4 ? 2 : 1);
    const durationShift =
      note.durationBeats >= 1 && random() < 0.34 ? (random() < 0.5 ? 0.5 : -0.5) : 0;
    return {
      ...note,
      degree: clamp(note.degree + adjustment, movement.minDegree, movement.maxDegree),
      startBeat: round(note.startBeat + offsetBeats, 3),
      durationBeats: round(Math.max(0.5, note.durationBeats + durationShift), 3),
      velocity: round(clamp(note.velocity + (random() - 0.5) * 0.16, 0.38, 0.92), 3),
    };
  });
}

function createBassNotes(totalMeasures, root, scale, movement) {
  const notes = [];
  for (let measure = 0; measure < totalMeasures; measure += 1) {
    const measureStart = measure * 4;
    const degree = measure % 2 === 0 ? 0 : movement.resolveDegree > 2 ? 4 : 2;
    const bassMidi = degreeToMidi(root, scale, degree, 2);
    const accentMidi = degreeToMidi(root, scale, degree + 4, 3);
    notes.push({
      midi: bassMidi,
      pitch: midiToPitch(bassMidi),
      frequency: round(midiToFrequency(bassMidi), 6),
      startBeat: measureStart,
      durationBeats: 2.5,
      velocity: 0.4,
      hand: "left",
    });
    notes.push({
      midi: accentMidi,
      pitch: midiToPitch(accentMidi),
      frequency: round(midiToFrequency(accentMidi), 6),
      startBeat: measureStart + 2,
      durationBeats: 1.5,
      velocity: 0.28,
      hand: "left",
    });
  }
  return notes;
}

export function generateMelody(artwork, options = {}) {
  const compositionMode = options.compositionMode ?? artwork.composition?.mode ?? "bouquet";
  const features = createFeatureSummary(artwork, options.controls, compositionMode);
  const signature = JSON.stringify({
    seed: options.seed ?? artwork.seed ?? "flower",
    mode: compositionMode,
    features,
  });
  const random = createRandom(`melody:${signature}`);
  const scale = chooseScale(compositionMode, features.paletteBrightness, features.airy, random);
  const root = ROOTS[Math.floor(((features.accentHue * 1000) + features.bloomCount * 7) % ROOTS.length)];
  const tempo = Math.round(
    clamp(
      74 +
        features.density * 18 +
        features.spread * 60 +
        features.ornamentCount * 0.35 -
        features.airy * 8,
      72,
      108,
    ),
  );
  const measures = clamp(
    4 + (compositionMode === "abstract" ? 1 : 0) + (features.spread > 0.2 ? 1 : 0),
    4,
    6,
  );
  const totalBeats = measures * 4;
  const phraseBeats = totalBeats / 2;
  const movement = {
    startDegree: 2 + Math.round(features.centroidY * 3),
    resolveDegree:
      features.bloomKinds.rose > features.bloomKinds.peony
        ? 4
        : compositionMode === "abstract"
          ? 2
          : 0,
    ascendBias: clamp(0.34 + (1 - features.centroidY) * 0.42 + features.centroidX * 0.08, 0.2, 0.8),
    leapBias: clamp(
      (features.bloomKinds.peony + features.bloomKinds.orchid * 0.8 + features.spread * 6) /
        Math.max(1, features.bloomCount + 2),
      0.2,
      0.85,
    ),
    minDegree: 0,
    maxDegree: 9 + Math.round(features.bloomSize * 3),
  };

  const motif = buildMotif(random, phraseBeats, movement, features.density);
  const rightHandDegrees = [
    ...motif,
    ...varyMotif(random, motif, phraseBeats, movement),
  ].sort((left, right) => left.startBeat - right.startBeat);

  const rightHandNotes = rightHandDegrees.map((note, index) => {
    const octave = note.degree > 7 || features.bloomKinds.orchid > 0 ? 5 : 4;
    const midi = degreeToMidi(root, scale, note.degree, octave);
    return {
      midi,
      pitch: midiToPitch(midi),
      frequency: round(midiToFrequency(midi), 6),
      startBeat: round(note.startBeat, 3),
      durationBeats: round(note.durationBeats, 3),
      velocity: round(
        clamp(note.velocity + (index === rightHandDegrees.length - 1 ? 0.1 : 0), 0.34, 0.96),
        3,
      ),
      hand: "right",
    };
  });

  const leftHandNotes = createBassNotes(measures, root, scale, movement);
  const notes = [...leftHandNotes, ...rightHandNotes].sort((left, right) => {
    if (left.startBeat === right.startBeat) {
      return left.midi - right.midi;
    }
    return left.startBeat - right.startBeat;
  });

  const durationSeconds = round((totalBeats * 60) / tempo, 2);
  return {
    id: `melody-${Math.abs(signature.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0))}`,
    title: `${artwork.palette.name} Nocturne`,
    root,
    scaleName: scale.name,
    tempo,
    timeSignature: "4/4",
    totalBeats,
    durationSeconds,
    notes,
    descriptor: `${root} ${scale.name}`,
    mood: scale.mood,
    analysis: features,
  };
}
