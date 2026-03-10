import { palettes } from "./palette.js";
import { createRandom, rangeRandom, sample } from "./random.js";

const sceneTypes = ["orb-bouquet", "spiral-branch", "floating-cluster"];
const speciesProfiles = {
  anemone: {
    layers: [2, 3],
    petals: [8, 12],
    openness: [0.72, 1.05],
    petalLength: [0.54, 0.82],
    petalWidth: [0.16, 0.24],
    petalDepth: [0.05, 0.1],
    droop: [0.08, 0.2],
    centerRadius: [0.12, 0.18],
  },
  lantern: {
    layers: [3, 4],
    petals: [5, 7],
    openness: [0.44, 0.7],
    petalLength: [0.6, 0.9],
    petalWidth: [0.22, 0.34],
    petalDepth: [0.06, 0.12],
    droop: [0.22, 0.42],
    centerRadius: [0.1, 0.14],
  },
  starburst: {
    layers: [2, 3],
    petals: [10, 16],
    openness: [0.92, 1.28],
    petalLength: [0.62, 0.98],
    petalWidth: [0.12, 0.18],
    petalDepth: [0.04, 0.08],
    droop: [0.04, 0.14],
    centerRadius: [0.08, 0.12],
  },
  orchid: {
    layers: [3, 4],
    petals: [6, 9],
    openness: [0.62, 0.88],
    petalLength: [0.48, 0.76],
    petalWidth: [0.18, 0.28],
    petalDepth: [0.05, 0.09],
    droop: [0.1, 0.26],
    centerRadius: [0.1, 0.16],
  },
};

const materialFamilies = ["velvet", "pearl", "glass"];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function polar(radius, angle) {
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  };
}

function mixChannel(left, right, ratio) {
  return Math.round(left + (right - left) * ratio);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value =
    clean.length === 3
      ? clean
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : clean;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((value) => clamp(value, 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHex(left, right, ratio) {
  const a = hexToRgb(left);
  const b = hexToRgb(right);
  return rgbToHex({
    r: mixChannel(a.r, b.r, ratio),
    g: mixChannel(a.g, b.g, ratio),
    b: mixChannel(a.b, b.b, ratio),
  });
}

function choosePalette(random) {
  return sample(random, palettes);
}

function chooseSceneType(random, airy) {
  if (airy > 0.78 && random() > 0.4) {
    return "floating-cluster";
  }
  if (airy < 0.5 && random() > 0.45) {
    return "orb-bouquet";
  }
  return sample(random, sceneTypes);
}

function chooseSpecies(random, sceneType) {
  if (sceneType === "spiral-branch") {
    return sample(random, ["lantern", "orchid", "starburst"]);
  }
  if (sceneType === "floating-cluster") {
    return sample(random, ["starburst", "orchid", "anemone"]);
  }
  return sample(random, ["anemone", "lantern", "orchid"]);
}

function createCameraProfile(sceneType, airy) {
  if (sceneType === "floating-cluster") {
    return {
      position: [0, 0.9, 8.8],
      fov: 34 + airy * 4,
    };
  }
  if (sceneType === "spiral-branch") {
    return {
      position: [0.2, 1.2, 9.2],
      fov: 36,
    };
  }
  return {
    position: [0, 1.0, 8.1],
    fov: 33,
  };
}

function createLightingProfile(palette, random) {
  return {
    ambient: {
      intensity: rangeRandom(random, 1.05, 1.35),
      color: mixHex(palette.haze, "#ffffff", 0.55),
    },
    key: {
      position: [4.6, 5.4, 5.2],
      intensity: rangeRandom(random, 14, 18),
      color: mixHex(sample(random, palette.bloom), "#ffffff", 0.72),
    },
    rim: {
      position: [-5.2, 2.8, -3.8],
      intensity: rangeRandom(random, 3.4, 5.2),
      color: mixHex(palette.accent, palette.haze, 0.55),
    },
    floor: {
      position: [0, -4.2, 0],
      intensity: rangeRandom(random, 1.8, 2.8),
      color: mixHex(sample(random, palette.background), palette.haze, 0.62),
    },
  };
}

function createAtmosphere(random, palette, airy) {
  const moteCount = Math.round(22 + airy * 24);
  const motes = Array.from({ length: moteCount }, (_, index) => ({
    id: `mote-${index}`,
    position: [
      rangeRandom(random, -3.8, 3.8),
      rangeRandom(random, -0.6, 4.8),
      rangeRandom(random, -3.6, 3.6),
    ],
    radius: rangeRandom(random, 0.025, 0.085),
    opacity: rangeRandom(random, 0.16, 0.54),
    color: sample(random, [palette.haze, palette.metal, ...palette.bloom]),
  }));
  return {
    fogColor: mixHex(sample(random, palette.background), palette.haze, 0.52),
    fogNear: 6.5,
    fogFar: 16.5 + airy * 4,
    motes,
  };
}

function createStemOrigin(sceneType, index, count, random) {
  if (sceneType === "floating-cluster") {
    const spread = polar(rangeRandom(random, 0.3, 1.4), ((Math.PI * 2) / count) * index);
    return [spread.x * 0.6, -2.8, spread.z * 0.6];
  }
  if (sceneType === "spiral-branch") {
    const angle = index * 0.52 + rangeRandom(random, -0.16, 0.16);
    const branch = polar(rangeRandom(random, 0.15, 0.72), angle);
    return [branch.x, -2.5 + index * 0.05, branch.z];
  }
  const root = polar(rangeRandom(random, 0.08, 0.42), ((Math.PI * 2) / count) * index);
  return [root.x, -2.85, root.z];
}

function createFlowerPosition(sceneType, index, count, controls, random) {
  const airySpread = 1 + controls.airy * 0.8;
  if (sceneType === "spiral-branch") {
    const progress = count <= 1 ? 0 : index / (count - 1);
    const angle = progress * Math.PI * 2.6 + rangeRandom(random, -0.24, 0.24);
    const radius = lerp(0.75, 2.25 * airySpread, progress);
    const offset = polar(radius, angle);
    return [
      offset.x,
      -0.8 + progress * 4.5 + rangeRandom(random, -0.2, 0.2),
      offset.z,
    ];
  }
  if (sceneType === "floating-cluster") {
    return [
      rangeRandom(random, -2.7, 2.7) * airySpread,
      rangeRandom(random, -0.3, 3.7),
      rangeRandom(random, -2.4, 2.4) * airySpread,
    ];
  }
  const angle = index * 1.618 + rangeRandom(random, -0.18, 0.18);
  const radius = Math.sqrt((index + 0.7) / count) * 2.4 * airySpread;
  const offset = polar(radius, angle);
  return [
    offset.x,
    rangeRandom(random, 0.1, 3.1),
    offset.z,
  ];
}

function lerp(min, max, ratio) {
  return min + (max - min) * ratio;
}

function createLeafPairs(random, palette, stemLength) {
  const count = Math.floor(rangeRandom(random, 1, 3.8));
  return Array.from({ length: count }, (_, index) => ({
    id: `leaf-${index}`,
    offset: rangeRandom(random, 0.24, 0.82) * stemLength,
    side: index % 2 === 0 ? 1 : -1,
    size: rangeRandom(random, 0.3, 0.52),
    twist: rangeRandom(random, -0.6, 0.6),
    color: sample(random, palette.leaves),
    accent: mixHex(sample(random, palette.leaves), palette.haze, 0.36),
  }));
}

function createFlower(random, seed, sceneType, palette, controls, index, count) {
  const species = chooseSpecies(random, sceneType);
  const profile = speciesProfiles[species];
  const position = createFlowerPosition(sceneType, index, count, controls, random);
  const stemOrigin = createStemOrigin(sceneType, index, count, random);
  const material = sample(random, materialFamilies);
  const primaryBloom = sample(random, palette.bloom);
  const secondaryBloom = mixHex(sample(random, palette.bloom), palette.haze, rangeRandom(random, 0.18, 0.46));
  const bloomScale = lerp(0.88, 1.58, controls.bloomSize) * rangeRandom(random, 0.82, 1.18);
  const stemLength = position[1] - stemOrigin[1];

  return {
    id: `${seed}-flower-${index}`,
    species,
    material,
    position,
    stemOrigin,
    scale: bloomScale,
    rotation: [
      rangeRandom(random, -0.28, 0.28),
      rangeRandom(random, -Math.PI, Math.PI),
      rangeRandom(random, -0.3, 0.3),
    ],
    layers: Math.round(rangeRandom(random, profile.layers[0], profile.layers[1] + 0.99)),
    petalCount: Math.round(rangeRandom(random, profile.petals[0], profile.petals[1] + 0.99)),
    openness: rangeRandom(random, profile.openness[0], profile.openness[1]),
    petalLength: rangeRandom(random, profile.petalLength[0], profile.petalLength[1]),
    petalWidth: rangeRandom(random, profile.petalWidth[0], profile.petalWidth[1]),
    petalDepth: rangeRandom(random, profile.petalDepth[0], profile.petalDepth[1]),
    droop: rangeRandom(random, profile.droop[0], profile.droop[1]),
    centerRadius: rangeRandom(random, profile.centerRadius[0], profile.centerRadius[1]),
    petalColor: primaryBloom,
    petalColorAlt: secondaryBloom,
    coreColor: mixHex(palette.metal, palette.haze, rangeRandom(random, 0.08, 0.28)),
    stemColor: mixHex(sample(random, palette.leaves), palette.accent, 0.18),
    leafPairs: createLeafPairs(random, palette, stemLength),
    swayPhase: rangeRandom(random, 0, Math.PI * 2),
    swayAmplitude: rangeRandom(random, 0.04, 0.12),
  };
}

function createSculpturalArcs(random, palette, sceneType) {
  const arcCount = sceneType === "floating-cluster" ? 2 : 3;
  return Array.from({ length: arcCount }, (_, index) => ({
    id: `arc-${index}`,
    radius: rangeRandom(random, 1.6, 2.9),
    y: rangeRandom(random, -0.5, 2.6),
    rotation: [rangeRandom(random, -0.7, 0.7), rangeRandom(random, 0, Math.PI), rangeRandom(random, -0.4, 0.4)],
    tube: rangeRandom(random, 0.014, 0.026),
    color: mixHex(sample(random, palette.bloom), palette.haze, 0.48),
    opacity: rangeRandom(random, 0.18, 0.34),
  }));
}

export function generateArtwork3D(seed, controls) {
  const random = createRandom(`3d:${seed}`);
  const palette = choosePalette(random);
  const density = clamp(controls.density ?? 0.68, 0.3, 1);
  const airy = clamp(controls.airy ?? 0.62, 0.3, 1);
  const bloomSize = clamp(controls.bloomSize ?? 0.74, 0.35, 1);
  const sceneType = chooseSceneType(random, airy);
  const flowerCount = Math.round(5 + density * 6 + (sceneType === "floating-cluster" ? 1 : 0));
  const flowers = Array.from({ length: flowerCount }, (_, index) =>
    createFlower(random, seed, sceneType, palette, { density, airy, bloomSize }, index, flowerCount),
  );

  return {
    id: `three-d-${seed}`,
    seed,
    mode: "3d",
    sceneType,
    palette,
    background: {
      top: palette.background[0],
      middle: palette.background[1],
      bottom: palette.background[2],
    },
    cameraProfile: createCameraProfile(sceneType, airy),
    lightingProfile: createLightingProfile(palette, random),
    atmosphere: createAtmosphere(random, palette, airy),
    flowers,
    sculpturalArcs: createSculpturalArcs(random, palette, sceneType),
  };
}
