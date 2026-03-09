import { palettes } from "./palette.js";
import { createRandom, rangeRandom, sample } from "./random.js";

function polar(cx, cy, radius, angle) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
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
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHex(a, b, ratio) {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  return rgbToHex({
    r: left.r + (right.r - left.r) * ratio,
    g: left.g + (right.g - left.g) * ratio,
    b: left.b + (right.b - left.b) * ratio,
  });
}

function rotatePoint(x, y, angle) {
  return {
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
  };
}

function mapLocalPoint(cx, cy, point, angle) {
  const rotated = rotatePoint(point.x, point.y, angle);
  return {
    x: cx + rotated.x,
    y: cy + rotated.y,
  };
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function lerp(min, max, ratio) {
  return min + (max - min) * ratio;
}

function createPetalPath(centerX, centerY, innerRadius, outerRadius, angle, spread, pull = 0.82) {
  const tip = polar(centerX, centerY, outerRadius, angle);
  const left = polar(centerX, centerY, innerRadius, angle - spread);
  const right = polar(centerX, centerY, innerRadius, angle + spread);
  const leftCtrl = polar(centerX, centerY, outerRadius * pull, angle - spread * 0.72);
  const rightCtrl = polar(centerX, centerY, outerRadius * pull, angle + spread * 0.72);
  return [
    `M ${left.x.toFixed(2)} ${left.y.toFixed(2)}`,
    `Q ${leftCtrl.x.toFixed(2)} ${leftCtrl.y.toFixed(2)} ${tip.x.toFixed(2)} ${tip.y.toFixed(2)}`,
    `Q ${rightCtrl.x.toFixed(2)} ${rightCtrl.y.toFixed(2)} ${right.x.toFixed(2)} ${right.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function createOrganicPetalGeometry(baseX, baseY, length, baseWidth, shoulderWidth, angle, options = {}) {
  const {
    lean = 0,
    pinch = 0.22,
    waist = 0.34,
    asymmetry = 0,
    curl = 0,
    droop = 0,
  } = options;

  const leftBase = mapLocalPoint(
    baseX,
    baseY,
    { x: -baseWidth * (0.52 + asymmetry * 0.06), y: 0 },
    angle,
  );
  const leftShoulder = mapLocalPoint(
    baseX,
    baseY,
    { x: -shoulderWidth * (0.98 + asymmetry * 0.14), y: -length * (waist + curl * 0.02) },
    angle,
  );
  const leftMid = mapLocalPoint(
    baseX,
    baseY,
    { x: -shoulderWidth * (0.56 + asymmetry * 0.08), y: -length * (0.78 + curl * 0.05) },
    angle,
  );
  const tip = mapLocalPoint(
    baseX,
    baseY,
    { x: lean * length * 0.16, y: -length * (1 - droop * 0.04) },
    angle,
  );
  const rightMid = mapLocalPoint(
    baseX,
    baseY,
    { x: shoulderWidth * (0.52 - asymmetry * 0.04), y: -length * (0.76 - curl * 0.04) },
    angle,
  );
  const rightShoulder = mapLocalPoint(
    baseX,
    baseY,
    { x: shoulderWidth * (0.94 - asymmetry * 0.10), y: -length * (waist - droop * 0.02) },
    angle,
  );
  const rightBase = mapLocalPoint(
    baseX,
    baseY,
    { x: baseWidth * (0.48 - asymmetry * 0.04), y: 0 },
    angle,
  );
  const notch = mapLocalPoint(
    baseX,
    baseY,
    { x: lean * baseWidth * 0.10, y: baseWidth * pinch * 0.22 },
    angle,
  );

  const ridgeStart = mapLocalPoint(
    baseX,
    baseY,
    { x: lean * baseWidth * 0.05, y: baseWidth * 0.06 },
    angle,
  );
  const ridgeControl = mapLocalPoint(
    baseX,
    baseY,
    { x: lean * length * 0.08, y: -length * 0.54 },
    angle,
  );
  const ridgeEnd = mapLocalPoint(
    baseX,
    baseY,
    { x: lean * length * 0.14, y: -length * 0.92 },
    angle,
  );

  return {
    path: [
      `M ${leftBase.x.toFixed(2)} ${leftBase.y.toFixed(2)}`,
      `C ${leftShoulder.x.toFixed(2)} ${leftShoulder.y.toFixed(2)} ${leftMid.x.toFixed(2)} ${leftMid.y.toFixed(2)} ${tip.x.toFixed(2)} ${tip.y.toFixed(2)}`,
      `C ${rightMid.x.toFixed(2)} ${rightMid.y.toFixed(2)} ${rightShoulder.x.toFixed(2)} ${rightShoulder.y.toFixed(2)} ${rightBase.x.toFixed(2)} ${rightBase.y.toFixed(2)}`,
      `Q ${notch.x.toFixed(2)} ${notch.y.toFixed(2)} ${leftBase.x.toFixed(2)} ${leftBase.y.toFixed(2)}`,
      "Z",
    ].join(" "),
    ridgePath: `M ${ridgeStart.x.toFixed(2)} ${ridgeStart.y.toFixed(2)} Q ${ridgeControl.x.toFixed(2)} ${ridgeControl.y.toFixed(2)} ${ridgeEnd.x.toFixed(2)} ${ridgeEnd.y.toFixed(2)}`,
  };
}

function createLeafPath(startX, startY, length, width, bend, tilt) {
  const end = polar(startX, startY, length, tilt);
  const controlA = polar(startX, startY, length * 0.42, tilt - bend);
  const controlB = polar(startX, startY, length * 0.55, tilt + bend);
  const flankA = polar(startX, startY, width, tilt - Math.PI / 2.3);
  const flankB = polar(startX, startY, width, tilt + Math.PI / 2.3);
  const path = [
    `M ${startX.toFixed(2)} ${startY.toFixed(2)}`,
    `Q ${controlA.x.toFixed(2)} ${controlA.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    `Q ${controlB.x.toFixed(2)} ${controlB.y.toFixed(2)} ${flankB.x.toFixed(2)} ${flankB.y.toFixed(2)}`,
    `Q ${startX.toFixed(2)} ${startY.toFixed(2)} ${flankA.x.toFixed(2)} ${flankA.y.toFixed(2)}`,
    "Z",
  ].join(" ");
  const veinPath = `M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${controlA.x.toFixed(2)} ${controlA.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  return { path, veinPath };
}

function createWash(random, palette, x, y, scale = 1) {
  return {
    x,
    y,
    rx: rangeRandom(random, 74, 160) * scale,
    ry: rangeRandom(random, 42, 96) * scale,
    fill: sample(random, [...palette.bloom, palette.haze]),
    opacity: rangeRandom(random, 0.1, 0.24),
    rotation: rangeRandom(random, 0, 360),
  };
}

function createVeil(random, palette, x, y, scale = 1) {
  return {
    x,
    y,
    rx: rangeRandom(random, 120, 220) * scale,
    ry: rangeRandom(random, 62, 148) * scale,
    fill: mixHex(
      sample(random, [...palette.bloom, palette.haze]),
      palette.haze,
      rangeRandom(random, 0.46, 0.78),
    ),
    opacity: rangeRandom(random, 0.06, 0.16),
    rotation: rangeRandom(random, 0, 360),
  };
}

function createPaperStroke(random, palette, x, y, length, angle) {
  const start = polar(x, y, length * 0.5, angle + Math.PI);
  const end = polar(x, y, length * 0.5, angle);
  const controlA = polar(x, y, length * 0.18, angle - rangeRandom(random, 0.6, 1.1));
  const controlB = polar(x, y, length * 0.14, angle + rangeRandom(random, 0.6, 1.1));
  return {
    path: `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${controlA.x.toFixed(2)} ${controlA.y.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} Q ${controlB.x.toFixed(2)} ${controlB.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    stroke: mixHex(
      sample(random, [...palette.leaves, ...palette.bloom]),
      palette.haze,
      rangeRandom(random, 0.52, 0.76),
    ),
    width: rangeRandom(random, 0.7, 2.1),
    opacity: rangeRandom(random, 0.05, 0.12),
  };
}

function createShadowLeaf(random, palette, x, y, scale = 1) {
  const tilt = rangeRandom(random, -2.7, 0.8);
  const shape = createLeafPath(
    x,
    y,
    rangeRandom(random, 82, 168) * scale,
    rangeRandom(random, 24, 48) * scale,
    rangeRandom(random, 0.22, 0.44),
    tilt,
  );
  return {
    path: shape.path,
    veinPath: shape.veinPath,
    fill: mixHex(sample(random, palette.leaves), palette.haze, rangeRandom(random, 0.34, 0.58)),
    stroke: mixHex(sample(random, palette.leaves), palette.accent, 0.32),
    opacity: rangeRandom(random, 0.06, 0.16),
  };
}

function createDustCluster(random, palette, x, y, count, spread) {
  return Array.from({ length: count }, () => ({
    x: x + rangeRandom(random, -spread, spread),
    y: y + rangeRandom(random, -spread * 0.72, spread * 0.72),
    radius: rangeRandom(random, 0.8, 3.2),
    fill: sample(random, [palette.metal, palette.accent, ...palette.bloom]),
    opacity: rangeRandom(random, 0.14, 0.48),
  }));
}

function createStamen(centerX, centerY, radius, angle, length) {
  const start = polar(centerX, centerY, radius * 0.2, angle);
  const control = polar(centerX, centerY, length * 0.76, angle - 0.12);
  const tip = polar(centerX, centerY, length, angle);
  return {
    path: `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${control.x.toFixed(2)} ${control.y.toFixed(2)} ${tip.x.toFixed(2)} ${tip.y.toFixed(2)}`,
    tip,
  };
}

function createOrchidLobePath(cx, cy, length, width, angle, pinch = 0.32) {
  const start = mapLocalPoint(cx, cy, { x: -width * 0.22, y: 0 }, angle);
  const ctrlA = mapLocalPoint(cx, cy, { x: -width * 0.96, y: -length * 0.24 }, angle);
  const ctrlB = mapLocalPoint(cx, cy, { x: -width * 0.54, y: -length * 0.84 }, angle);
  const tip = mapLocalPoint(cx, cy, { x: 0, y: -length }, angle);
  const ctrlC = mapLocalPoint(cx, cy, { x: width * 0.54, y: -length * 0.84 }, angle);
  const ctrlD = mapLocalPoint(cx, cy, { x: width * 0.96, y: -length * 0.24 }, angle);
  const end = mapLocalPoint(cx, cy, { x: width * 0.22, y: 0 }, angle);
  const ctrlE = mapLocalPoint(cx, cy, { x: width * 0.12, y: length * pinch }, angle);
  const ctrlF = mapLocalPoint(cx, cy, { x: -width * 0.12, y: length * pinch }, angle);
  return [
    `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `C ${ctrlA.x.toFixed(2)} ${ctrlA.y.toFixed(2)} ${ctrlB.x.toFixed(2)} ${ctrlB.y.toFixed(2)} ${tip.x.toFixed(2)} ${tip.y.toFixed(2)}`,
    `C ${ctrlC.x.toFixed(2)} ${ctrlC.y.toFixed(2)} ${ctrlD.x.toFixed(2)} ${ctrlD.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    `C ${ctrlE.x.toFixed(2)} ${ctrlE.y.toFixed(2)} ${ctrlF.x.toFixed(2)} ${ctrlF.y.toFixed(2)} ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function createOrchidLipPath(cx, cy, scale, angle) {
  const points = [
    { x: -10 * scale, y: -4 * scale },
    { x: -26 * scale, y: 10 * scale },
    { x: -18 * scale, y: 34 * scale },
    { x: 0, y: 30 * scale },
    { x: 18 * scale, y: 34 * scale },
    { x: 26 * scale, y: 10 * scale },
    { x: 10 * scale, y: -4 * scale },
    { x: 0, y: 8 * scale },
  ].map((point) => mapLocalPoint(cx, cy, point, angle));

  return [
    `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`,
    `C ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)} ${points[2].x.toFixed(2)} ${points[2].y.toFixed(2)} ${points[3].x.toFixed(2)} ${points[3].y.toFixed(2)}`,
    `C ${points[4].x.toFixed(2)} ${points[4].y.toFixed(2)} ${points[5].x.toFixed(2)} ${points[5].y.toFixed(2)} ${points[6].x.toFixed(2)} ${points[6].y.toFixed(2)}`,
    `C ${points[7].x.toFixed(2)} ${points[7].y.toFixed(2)} ${points[7].x.toFixed(2)} ${points[7].y.toFixed(2)} ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function createPigmentPools(random, palette, x, y, count, spread, biasColor) {
  return Array.from({ length: count }, () => ({
    x: x + rangeRandom(random, -spread, spread),
    y: y + rangeRandom(random, -spread, spread),
    rx: rangeRandom(random, 8, 20),
    ry: rangeRandom(random, 5, 12),
    rotation: rangeRandom(random, 0, 360),
    fill: mixHex(sample(random, palette.bloom), biasColor, rangeRandom(random, 0.18, 0.42)),
    opacity: rangeRandom(random, 0.12, 0.24),
  }));
}

function createCenterDots(random, palette, x, y, radius, count, extraColors = []) {
  return Array.from({ length: count }, () => {
    const angle = rangeRandom(random, 0, Math.PI * 2);
    const r = rangeRandom(random, 2, radius);
    const point = polar(x, y, r, angle);
    return {
      x: point.x,
      y: point.y,
      radius: rangeRandom(random, 0.9, 3.1),
      fill: sample(random, [...extraColors, palette.accent, palette.metal, ...palette.bloom]),
      opacity: rangeRandom(random, 0.42, 0.94),
    };
  });
}

function createPeonyBloom(random, palette, x, y, controls, sizeFactor = 1) {
  const density = controls.density ?? 0.68;
  const bloomSize = controls.bloomSize ?? 0.74;
  const scale = sizeFactor * (0.9 + bloomSize * 0.62);
  const shapes = [];
  const highlights = [];
  const darkBias = mixHex(palette.accent, "#26181f", 0.54);

  const outerLayers = 4 + Math.round(density * 2);
  for (let layerIndex = 0; layerIndex < outerLayers; layerIndex += 1) {
    const layerRatio = outerLayers === 1 ? 1 : layerIndex / (outerLayers - 1);
    const petalCount = 7 + layerIndex * 3 + Math.floor(random() * 2);
    const anchorRadius = lerp(18, 64, layerRatio) * scale;
    const length = lerp(52, 112, layerRatio) * scale;
    const baseWidth = lerp(12, 20, layerRatio) * scale;
    const shoulderWidth = lerp(18, 30, layerRatio) * scale;

    for (let petalIndex = 0; petalIndex < petalCount; petalIndex += 1) {
      const angle =
        (Math.PI * 2 * petalIndex) / petalCount +
        (layerIndex % 2 === 0 ? 0 : Math.PI / petalCount) +
        rangeRandom(random, -0.08, 0.08);
      const base = polar(x, y, anchorRadius, angle);
      const geometry = createOrganicPetalGeometry(
        base.x,
        base.y,
        length * rangeRandom(random, 0.92, 1.12),
        baseWidth * rangeRandom(random, 0.92, 1.08),
        shoulderWidth * rangeRandom(random, 0.92, 1.12),
        angle + rangeRandom(random, -0.32, 0.32),
        {
          lean: rangeRandom(random, -0.18, 0.18),
          pinch: rangeRandom(random, 0.14, 0.24),
          waist: rangeRandom(random, 0.28, 0.42),
          asymmetry: rangeRandom(random, -0.2, 0.24),
          curl: rangeRandom(random, -0.1, 0.28),
          droop: rangeRandom(random, 0, 0.24),
        },
      );
      const fillBase = sample(random, palette.bloom);
      const fill = mixHex(fillBase, darkBias, rangeRandom(random, 0.06, 0.24));
      shapes.push({
        path: geometry.path,
        fill,
        opacity: lerp(0.42, 0.24, layerRatio) * rangeRandom(random, 0.88, 1.12),
        blur: lerp(0.8, 2.4, layerRatio),
        stroke: mixHex(fill, darkBias, 0.28),
        strokeOpacity: rangeRandom(random, 0.04, 0.14),
        strokeWidth: 0.8,
      });
      if (random() < 0.58) {
        highlights.push({
          path: geometry.ridgePath,
          stroke: mixHex(palette.haze, fillBase, 0.08),
          opacity: rangeRandom(random, 0.06, 0.14),
          strokeWidth: rangeRandom(random, 0.7, 1.05),
        });
      }
    }
  }

  const innerPetalDefs = [];
  const innerPetalCount = 30 + Math.round(density * 26);
  for (let index = 0; index < innerPetalCount; index += 1) {
    const ratio = innerPetalCount === 1 ? 0 : index / (innerPetalCount - 1);
    const spiralAngle = index * GOLDEN_ANGLE * 0.88 + rangeRandom(random, -0.14, 0.14);
    const anchorRadius = (8 + Math.pow(ratio, 0.76) * 34) * scale;
    const base = polar(x, y, anchorRadius, spiralAngle);
    const geometry = createOrganicPetalGeometry(
      base.x,
      base.y,
      lerp(18, 54, ratio) * scale * rangeRandom(random, 0.92, 1.06),
      lerp(5.5, 14.5, ratio) * scale,
      lerp(9, 22, ratio) * scale,
      spiralAngle + Math.PI / 2 + rangeRandom(random, -0.32, 0.32),
      {
        lean: rangeRandom(random, -0.12, 0.18),
        pinch: rangeRandom(random, 0.12, 0.22),
        waist: rangeRandom(random, 0.34, 0.48),
        asymmetry: rangeRandom(random, -0.18, 0.22),
        curl: rangeRandom(random, -0.08, 0.26),
        droop: rangeRandom(random, 0, 0.18),
      },
    );
    const fillBase = sample(random, palette.bloom);
    const fill = mixHex(fillBase, darkBias, rangeRandom(random, 0.10, 0.26));
    innerPetalDefs.push({
      order: anchorRadius + ratio * 4,
      shape: {
        path: geometry.path,
        fill,
        opacity: lerp(0.66, 0.38, ratio) * rangeRandom(random, 0.9, 1.08),
        blur: lerp(0.4, 1.3, ratio),
        stroke: mixHex(fill, darkBias, 0.26),
        strokeOpacity: rangeRandom(random, 0.04, 0.1),
        strokeWidth: 0.7,
      },
      highlight:
        random() < 0.68
          ? {
              path: geometry.ridgePath,
              stroke: mixHex(palette.haze, fillBase, 0.1),
              opacity: rangeRandom(random, 0.08, 0.16),
              strokeWidth: rangeRandom(random, 0.65, 0.95),
            }
          : null,
    });
  }

  innerPetalDefs
    .sort((left, right) => right.order - left.order)
    .forEach((item) => {
      shapes.push(item.shape);
      if (item.highlight) {
        highlights.push(item.highlight);
      }
    });

  const stamens = Array.from({ length: 18 + Math.round(density * 12) }, () => {
    const angle = rangeRandom(random, 0, Math.PI * 2);
    const length = rangeRandom(random, 16, 30) * scale;
    const stamen = createStamen(x, y, 10 * scale, angle, length);
    return {
      path: stamen.path,
      x: stamen.tip.x,
      y: stamen.tip.y,
      radius: rangeRandom(random, 1.1, 2.4),
      opacity: rangeRandom(random, 0.34, 0.74),
      fill: sample(random, [palette.metal, palette.accent, ...palette.bloom]),
    };
  });

  return {
    kind: "peony",
    speciesData: {
      silhouette: "ruffled-mass",
      layerCount: outerLayers + 1,
      petalStyle: "guard-and-spiral",
    },
    x,
    y,
    rotation: rangeRandom(random, -20, 20),
    glow: rangeRandom(random, 66, 102) * scale,
    shadow: {
      rx: 64 * scale,
      ry: 26 * scale,
      offsetY: 18 * scale,
      fill: darkBias,
      opacity: 0.1,
    },
    wash: createWash(
      random,
      palette,
      x + rangeRandom(random, -18, 18),
      y + rangeRandom(random, -12, 12),
      0.92 * scale,
    ),
    pigmentPools: createPigmentPools(random, palette, x, y, 7, 38 * scale, darkBias),
    shapes,
    highlights,
    stamens,
    centerDots: createCenterDots(random, palette, x, y, 18 * scale, 34, [palette.metal]),
    coreShape: {
      path: createPetalPath(
        x,
        y,
        4.5 * scale,
        15 * scale,
        rangeRandom(random, 0, Math.PI * 2),
        0.92,
        0.42,
      ),
      fill: mixHex(palette.metal, palette.accent, 0.22),
      opacity: 0.28,
    },
  };
}

function createCamelliaBloom(random, palette, x, y, controls, sizeFactor = 1) {
  const bloomSize = controls.bloomSize ?? 0.74;
  const density = controls.density ?? 0.68;
  const scale = sizeFactor * (0.78 + bloomSize * 0.42);
  const shapes = [];
  const highlights = [];
  const darkBias = mixHex(palette.accent, "#2c1f26", 0.44);
  const layerDefs = [
    { petals: 9, anchor: 38, length: 62, baseWidth: 16, shoulderWidth: 28, opacity: [0.38, 0.56] },
    { petals: 8, anchor: 24, length: 50, baseWidth: 13, shoulderWidth: 23, opacity: [0.44, 0.62] },
    { petals: 6, anchor: 12, length: 34, baseWidth: 10, shoulderWidth: 16, opacity: [0.52, 0.7] },
  ];

  layerDefs.forEach((layer, layerIndex) => {
    const petalCount = layer.petals + Math.round(density * (layerIndex + 1));
    for (let petalIndex = 0; petalIndex < petalCount; petalIndex += 1) {
      const angle =
        (Math.PI * 2 * petalIndex) / petalCount +
        (layerIndex % 2 === 0 ? 0 : Math.PI / petalCount) +
        rangeRandom(random, -0.06, 0.06);
      const base = polar(x, y, layer.anchor * scale, angle);
      const geometry = createOrganicPetalGeometry(
        base.x,
        base.y,
        layer.length * scale * rangeRandom(random, 0.94, 1.08),
        layer.baseWidth * scale * rangeRandom(random, 0.92, 1.08),
        layer.shoulderWidth * scale * rangeRandom(random, 0.94, 1.1),
        angle + rangeRandom(random, -0.18, 0.18),
        {
          lean: rangeRandom(random, -0.08, 0.12),
          pinch: rangeRandom(random, 0.08, 0.16),
          waist: rangeRandom(random, 0.3, 0.4),
          asymmetry: rangeRandom(random, -0.12, 0.14),
          curl: rangeRandom(random, -0.06, 0.14),
          droop: rangeRandom(random, 0, 0.12),
        },
      );
      const fillBase = sample(random, palette.bloom);
      const fill = mixHex(fillBase, darkBias, rangeRandom(random, 0.04, 0.18));
      shapes.push({
        path: geometry.path,
        fill,
        opacity: rangeRandom(random, layer.opacity[0], layer.opacity[1]),
        blur: rangeRandom(random, 0.35, 1.2),
        stroke: mixHex(fill, darkBias, 0.24),
        strokeOpacity: rangeRandom(random, 0.06, 0.14),
        strokeWidth: 0.8,
      });
      if (layerIndex < 2) {
        highlights.push({
          path: geometry.ridgePath,
          stroke: mixHex(palette.haze, fillBase, 0.1),
          opacity: rangeRandom(random, 0.08, 0.16),
          strokeWidth: rangeRandom(random, 0.75, 1),
        });
      }
    }
  });

  const corePetals = Array.from({ length: 4 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 4 + rangeRandom(random, -0.18, 0.18);
    const geometry = createOrganicPetalGeometry(
      x,
      y,
      (18 + index * 3) * scale,
      (5 + index) * scale,
      (8 + index * 1.8) * scale,
      angle,
      {
        lean: rangeRandom(random, -0.08, 0.08),
        pinch: 0.08,
        waist: 0.42,
        asymmetry: rangeRandom(random, -0.08, 0.1),
        curl: rangeRandom(random, -0.04, 0.08),
        droop: 0,
      },
    );
    const fill = mixHex(sample(random, palette.bloom), darkBias, 0.22);
    return {
      path: geometry.path,
      fill,
      opacity: 0.48 - index * 0.06,
      blur: 0.25,
      stroke: mixHex(fill, darkBias, 0.22),
      strokeOpacity: 0.08,
      strokeWidth: 0.7,
    };
  });

  return {
    kind: "camellia",
    speciesData: {
      silhouette: "rosette",
      layerCount: layerDefs.length,
      petalStyle: "waxy-round",
    },
    x,
    y,
    rotation: rangeRandom(random, -14, 16),
    glow: rangeRandom(random, 48, 72) * scale,
    shadow: {
      rx: 54 * scale,
      ry: 20 * scale,
      offsetY: 14 * scale,
      fill: darkBias,
      opacity: 0.08,
    },
    wash: createWash(
      random,
      palette,
      x + rangeRandom(random, -12, 16),
      y + rangeRandom(random, -10, 10),
      0.72 * scale,
    ),
    pigmentPools: createPigmentPools(random, palette, x, y, 4, 22 * scale, darkBias),
    shapes: [...shapes, ...corePetals],
    highlights,
    stamens: [],
    centerDots: createCenterDots(random, palette, x, y, 10 * scale, 12, [palette.metal]),
    coreShape: {
      path: createPetalPath(
        x,
        y,
        4 * scale,
        10 * scale,
        rangeRandom(random, 0, Math.PI * 2),
        0.78,
        0.5,
      ),
      fill: mixHex(palette.haze, palette.accent, 0.28),
      opacity: 0.24,
    },
  };
}

function createRoseBloom(random, palette, x, y, controls, sizeFactor = 1) {
  const density = controls.density ?? 0.68;
  const bloomSize = controls.bloomSize ?? 0.74;
  const scale = sizeFactor * (0.84 + bloomSize * 0.46);
  const shapes = [];
  const highlights = [];
  const darkBias = mixHex(palette.accent, "#24161d", 0.58);

  const guardPetalCount = 8 + Math.round(density * 4);
  for (let index = 0; index < guardPetalCount; index += 1) {
    const angle = (Math.PI * 2 * index) / guardPetalCount + rangeRandom(random, -0.08, 0.08);
    const base = polar(x, y, 46 * scale, angle);
    const geometry = createOrganicPetalGeometry(
      base.x,
      base.y,
      rangeRandom(random, 74, 96) * scale,
      rangeRandom(random, 14, 18) * scale,
      rangeRandom(random, 24, 32) * scale,
      angle + rangeRandom(random, -0.24, 0.24),
      {
        lean: rangeRandom(random, -0.14, 0.18),
        pinch: rangeRandom(random, 0.12, 0.18),
        waist: rangeRandom(random, 0.26, 0.34),
        asymmetry: rangeRandom(random, -0.18, 0.22),
        curl: rangeRandom(random, 0.04, 0.28),
        droop: rangeRandom(random, 0, 0.18),
      },
    );
    const fillBase = sample(random, palette.bloom);
    const fill = mixHex(fillBase, darkBias, rangeRandom(random, 0.08, 0.22));
    shapes.push({
      path: geometry.path,
      fill,
      opacity: rangeRandom(random, 0.28, 0.44),
      blur: rangeRandom(random, 1, 2.1),
      stroke: mixHex(fill, darkBias, 0.26),
      strokeOpacity: rangeRandom(random, 0.04, 0.12),
      strokeWidth: 0.8,
    });
    if (random() < 0.64) {
      highlights.push({
        path: geometry.ridgePath,
        stroke: mixHex(palette.haze, fillBase, 0.08),
        opacity: rangeRandom(random, 0.08, 0.14),
        strokeWidth: rangeRandom(random, 0.72, 1),
      });
    }
  }

  const spiralPetalDefs = [];
  const spiralPetalCount = 42 + Math.round(density * 28);
  for (let index = 0; index < spiralPetalCount; index += 1) {
    const ratio = spiralPetalCount === 1 ? 0 : index / (spiralPetalCount - 1);
    const spiralAngle = index * GOLDEN_ANGLE * 0.74 + rangeRandom(random, -0.14, 0.14);
    const anchorRadius = (6 + Math.pow(ratio, 0.82) * 42) * scale;
    const base = polar(x, y, anchorRadius, spiralAngle);
    const geometry = createOrganicPetalGeometry(
      base.x,
      base.y,
      lerp(14, 68, ratio) * scale * rangeRandom(random, 0.94, 1.08),
      lerp(4.5, 16, ratio) * scale,
      lerp(8, 24, ratio) * scale,
      spiralAngle + Math.PI / 2 + rangeRandom(random, -0.24, 0.24),
      {
        lean: rangeRandom(random, -0.16, 0.18),
        pinch: rangeRandom(random, 0.08, 0.18),
        waist: lerp(0.48, 0.28, ratio),
        asymmetry: rangeRandom(random, -0.16, 0.2),
        curl: rangeRandom(random, 0.02, 0.3),
        droop: rangeRandom(random, 0, 0.12),
      },
    );
    const fillBase = sample(random, palette.bloom);
    const fill = mixHex(fillBase, darkBias, rangeRandom(random, 0.12, 0.28));
    spiralPetalDefs.push({
      order: anchorRadius + ratio * 6,
      shape: {
        path: geometry.path,
        fill,
        opacity: lerp(0.76, 0.42, ratio) * rangeRandom(random, 0.92, 1.08),
        blur: lerp(0.25, 1.4, ratio),
        stroke: mixHex(fill, darkBias, 0.24),
        strokeOpacity: rangeRandom(random, 0.04, 0.1),
        strokeWidth: 0.7,
      },
      highlight:
        random() < 0.72
          ? {
              path: geometry.ridgePath,
              stroke: mixHex(palette.haze, fillBase, 0.12),
              opacity: rangeRandom(random, 0.08, 0.16),
              strokeWidth: rangeRandom(random, 0.65, 0.95),
            }
          : null,
    });
  }

  spiralPetalDefs
    .sort((left, right) => right.order - left.order)
    .forEach((item) => {
      shapes.push(item.shape);
      if (item.highlight) {
        highlights.push(item.highlight);
      }
    });

  return {
    kind: "rose",
    speciesData: {
      silhouette: "spiral-rosette",
      layerCount: 5,
      petalStyle: "spiral-cup",
    },
    x,
    y,
    rotation: rangeRandom(random, -16, 18),
    glow: rangeRandom(random, 52, 82) * scale,
    shadow: {
      rx: 56 * scale,
      ry: 22 * scale,
      offsetY: 15 * scale,
      fill: darkBias,
      opacity: 0.09,
    },
    wash: createWash(
      random,
      palette,
      x + rangeRandom(random, -14, 14),
      y + rangeRandom(random, -12, 10),
      0.78 * scale,
    ),
    pigmentPools: createPigmentPools(random, palette, x, y, 5, 24 * scale, darkBias),
    shapes,
    highlights,
    stamens: [],
    centerDots: createCenterDots(random, palette, x, y, 8 * scale, 10, [palette.metal]),
    coreShape: {
      path: createPetalPath(
        x,
        y,
        3.5 * scale,
        9 * scale,
        rangeRandom(random, 0, Math.PI * 2),
        0.72,
        0.58,
      ),
      fill: mixHex(palette.metal, palette.accent, 0.24),
      opacity: 0.22,
    },
  };
}

function createOrchidBloom(random, palette, x, y, controls, sizeFactor = 1) {
  const bloomSize = controls.bloomSize ?? 0.74;
  const scale = sizeFactor * (0.82 + bloomSize * 0.3);
  const shapes = [];
  const highlights = [];
  const darkBias = mixHex(palette.accent, "#2d1b21", 0.34);
  const tilt = rangeRandom(random, -0.28, 0.28);
  const petalColor = sample(random, palette.bloom);
  const wingColor = mixHex(sample(random, palette.bloom), palette.haze, 0.18);
  const sepalColor = mixHex(sample(random, palette.bloom), darkBias, 0.08);
  const lipColor = mixHex(sample(random, palette.bloom), darkBias, 0.24);

  [
    { path: createOrchidLobePath(x, y - 2 * scale, 56 * scale, 26 * scale, tilt, 0.18), fill: sepalColor, blur: 0.9 },
    { path: createOrchidLobePath(x - 6 * scale, y + 4 * scale, 56 * scale, 34 * scale, tilt - 1.18, 0.22), fill: wingColor, blur: 1.1 },
    { path: createOrchidLobePath(x + 6 * scale, y + 4 * scale, 56 * scale, 34 * scale, tilt + 1.18, 0.22), fill: wingColor, blur: 1.1 },
    { path: createOrchidLobePath(x - 14 * scale, y + 8 * scale, 44 * scale, 22 * scale, tilt - 2.72, 0.12), fill: sepalColor, blur: 1.2 },
    { path: createOrchidLobePath(x + 14 * scale, y + 8 * scale, 44 * scale, 22 * scale, tilt + 2.72, 0.12), fill: sepalColor, blur: 1.2 },
    { path: createOrchidLipPath(x, y + 18 * scale, 1.05 * scale, tilt), fill: lipColor, blur: 0.8 },
  ].forEach((shapeDef, index) => {
    const fill = mixHex(shapeDef.fill, petalColor, index === 5 ? 0.12 : 0.04);
    shapes.push({
      path: shapeDef.path,
      fill,
      opacity: index === 5 ? 0.82 : 0.68,
      blur: shapeDef.blur,
      stroke: mixHex(fill, darkBias, 0.3),
      strokeOpacity: 0.12,
      strokeWidth: 0.9,
    });
    highlights.push({
      path: shapeDef.path,
      stroke: mixHex(palette.haze, fill, 0.12),
      opacity: index === 5 ? 0.16 : 0.1,
      strokeWidth: index === 5 ? 1.1 : 0.8,
    });
  });

  const markings = Array.from({ length: 18 }, () => {
    const angle = rangeRandom(random, -0.8, 0.8) + Math.PI / 2;
    const radius = rangeRandom(random, 4, 16) * scale;
    const point = polar(x, y + 8 * scale, radius, angle);
    return {
      x: point.x,
      y: point.y,
      radius: rangeRandom(random, 0.9, 2.2),
      fill: sample(random, [darkBias, palette.accent, palette.metal]),
      opacity: rangeRandom(random, 0.28, 0.74),
    };
  });

  return {
    kind: "orchid",
    speciesData: {
      silhouette: "asymmetric-spray",
      lobeCount: 6,
      petalStyle: "orchid-lip",
    },
    x,
    y,
    rotation: rangeRandom(random, -10, 12),
    glow: rangeRandom(random, 42, 66) * scale,
    shadow: {
      rx: 48 * scale,
      ry: 18 * scale,
      offsetY: 12 * scale,
      fill: darkBias,
      opacity: 0.07,
    },
    wash: createWash(random, palette, x + rangeRandom(random, -10, 10), y + rangeRandom(random, -8, 8), 0.65 * scale),
    pigmentPools: createPigmentPools(random, palette, x, y + 8 * scale, 3, 18 * scale, darkBias),
    shapes,
    highlights,
    stamens: [
      {
        path: `M ${(x - 1.8 * scale).toFixed(2)} ${(y + 2 * scale).toFixed(2)} Q ${x.toFixed(2)} ${(y + 12 * scale).toFixed(2)} ${(x + 1.8 * scale).toFixed(2)} ${(y + 20 * scale).toFixed(2)}`,
        x,
        y: y + 10 * scale,
        radius: 2.6 * scale,
        opacity: 0.6,
        fill: palette.metal,
      },
    ],
    centerDots: markings,
    coreShape: {
      path: createOrchidLipPath(x, y + 14 * scale, 0.52 * scale, tilt),
      fill: mixHex(palette.metal, palette.accent, 0.22),
      opacity: 0.22,
    },
  };
}

function createMiniBloom(random, palette, x, y) {
  const variant = sample(random, ["camellia", "orchid", "rose", "wild"]);
  if (variant === "orchid") {
    return {
      x,
      y,
      petals: [
        {
          path: createOrchidLobePath(x, y, 20, 10, 0, 0.18),
          fill: sample(random, palette.bloom),
          opacity: 0.54,
        },
        {
          path: createOrchidLobePath(x - 2, y + 2, 18, 12, -1.14, 0.2),
          fill: sample(random, palette.bloom),
          opacity: 0.48,
        },
        {
          path: createOrchidLobePath(x + 2, y + 2, 18, 12, 1.14, 0.2),
          fill: sample(random, palette.bloom),
          opacity: 0.48,
        },
      ],
      dots: createCenterDots(random, palette, x, y + 4, 6, 8, [palette.metal]),
    };
  }

  const petals = [];
  const petalCount =
    variant === "camellia"
      ? 7 + Math.floor(random() * 2)
      : variant === "rose"
        ? 10 + Math.floor(random() * 4)
        : 6 + Math.floor(random() * 5);

  for (let petalIndex = 0; petalIndex < petalCount; petalIndex += 1) {
    const ratio = petalCount === 1 ? 0 : petalIndex / (petalCount - 1);
    const angle = (Math.PI * 2 * petalIndex) / petalCount + rangeRandom(random, -0.14, 0.14);
    const anchorRadius = variant === "rose" ? lerp(2, 10, ratio) : lerp(4, 12, ratio);
    const base = polar(x, y, anchorRadius, angle);
    const geometry = createOrganicPetalGeometry(
      base.x,
      base.y,
      (variant === "rose" ? lerp(10, 20, ratio) : lerp(12, 18, ratio)) * rangeRandom(random, 0.9, 1.08),
      (variant === "rose" ? lerp(3.4, 6.2, ratio) : lerp(4.2, 7.4, ratio)),
      (variant === "rose" ? lerp(5.6, 9.8, ratio) : lerp(7.8, 11.6, ratio)),
      variant === "rose"
        ? angle + Math.PI / 2 + rangeRandom(random, -0.28, 0.28)
        : angle + rangeRandom(random, -0.12, 0.12),
      {
        lean: rangeRandom(random, -0.12, 0.12),
        pinch: variant === "camellia" ? 0.1 : 0.16,
        waist: variant === "camellia" ? 0.34 : 0.4,
        asymmetry: rangeRandom(random, -0.12, 0.16),
        curl: variant === "rose" ? rangeRandom(random, 0.04, 0.18) : rangeRandom(random, -0.04, 0.1),
        droop: 0,
      },
    );
    petals.push({
      path: geometry.path,
      fill: sample(random, palette.bloom),
      opacity: rangeRandom(random, 0.28, 0.58),
    });
  }

  return {
    x,
    y,
    petals,
    dots: createCenterDots(random, palette, x, y, 7, 10, [palette.metal]),
  };
}

function createTendril(random, palette, startX, startY) {
  const endX = startX + rangeRandom(random, -90, 90);
  const endY = startY + rangeRandom(random, 80, 180);
  const controlX = startX + rangeRandom(random, -70, 70);
  const controlY = startY + rangeRandom(random, 28, 80);
  const beadCount = 3 + Math.floor(random() * 4);
  return {
    path: `M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}`,
    stroke: palette.metal,
    opacity: rangeRandom(random, 0.26, 0.44),
    beads: Array.from({ length: beadCount }, (_, index) => {
      const t = (index + 1) / (beadCount + 1);
      const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
      const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
      return {
        x,
        y,
        radius: rangeRandom(random, 1.4, 3.4),
        fill: index % 2 === 0 ? palette.metal : sample(random, palette.bloom),
        opacity: rangeRandom(random, 0.38, 0.74),
      };
    }),
  };
}

function createOrnamentArc(random, palette, cx, cy) {
  const radius = rangeRandom(random, 44, 90);
  const startAngle = rangeRandom(random, Math.PI * 0.92, Math.PI * 1.12);
  const endAngle = startAngle + rangeRandom(random, 0.52, 0.96);
  const start = polar(cx, cy, radius, startAngle);
  const end = polar(cx, cy, radius, endAngle);
  const mid = polar(cx, cy, radius * 1.06, (startAngle + endAngle) / 2);
  return {
    path: `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${mid.x.toFixed(2)} ${mid.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    stroke: palette.metal,
    opacity: rangeRandom(random, 0.16, 0.28),
  };
}

function createSprig(random, palette, startX, startY) {
  const endX = startX + rangeRandom(random, -58, 58);
  const endY = startY - rangeRandom(random, 36, 110);
  const controlX = startX + rangeRandom(random, -34, 34);
  const controlY = startY - rangeRandom(random, 14, 54);
  const berryCount = 4 + Math.floor(random() * 5);
  return {
    path: `M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}`,
    stroke: sample(random, palette.leaves),
    opacity: rangeRandom(random, 0.3, 0.54),
    berries: Array.from({ length: berryCount }, (_, index) => {
      const t = (index + 1) / (berryCount + 1);
      const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
      const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
      return {
        x: x + rangeRandom(random, -9, 9),
        y: y + rangeRandom(random, -8, 8),
        radius: rangeRandom(random, 2.2, 4.8),
        fill: sample(random, [palette.metal, ...palette.bloom]),
        opacity: rangeRandom(random, 0.34, 0.72),
      };
    }),
  };
}

function createBud(random, palette, startX, startY, endX, endY) {
  const rotation = rangeRandom(random, -36, 28);
  const scale = rangeRandom(random, 0.7, 1.15);
  const budCenterX = endX + rangeRandom(random, -6, 8);
  const budCenterY = endY + rangeRandom(random, -6, 6);

  const petals = Array.from({ length: 4 }, (_, index) => {
    const angle = -Math.PI / 2 + (index - 1.5) * 0.34 + rangeRandom(random, -0.06, 0.06);
    const base = polar(budCenterX, budCenterY, 4 * scale, angle);
    const geometry = createOrganicPetalGeometry(
      base.x,
      base.y,
      rangeRandom(random, 16, 24) * scale,
      rangeRandom(random, 5.2, 7.4) * scale,
      rangeRandom(random, 7.4, 10.2) * scale,
      angle + rangeRandom(random, -0.12, 0.12),
      {
        lean: rangeRandom(random, -0.08, 0.08),
        pinch: 0.18,
        waist: 0.4,
        asymmetry: rangeRandom(random, -0.08, 0.1),
        curl: rangeRandom(random, -0.02, 0.08),
        droop: 0.04,
      },
    );
    return {
      path: geometry.path,
      fill: sample(random, palette.bloom),
      opacity: rangeRandom(random, 0.38, 0.6),
    };
  });

  return {
    stemPath: `M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${((startX + endX) / 2 + rangeRandom(random, -16, 16)).toFixed(2)} ${((startY + endY) / 2 - rangeRandom(random, 10, 32)).toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}`,
    rotation,
    x: budCenterX,
    y: budCenterY,
    petals,
    sepal: {
      path: createLeafPath(
        budCenterX - 2,
        budCenterY + 8,
        rangeRandom(random, 18, 28),
        rangeRandom(random, 8, 12),
        rangeRandom(random, 0.24, 0.38),
        rangeRandom(random, -2.2, -0.9),
      ).path,
      fill: sample(random, palette.leaves),
      opacity: rangeRandom(random, 0.38, 0.58),
    },
  };
}

function createBloomByKind(random, palette, kind, x, y, controls, sizeFactor) {
  if (kind === "peony") {
    return createPeonyBloom(random, palette, x, y, controls, sizeFactor);
  }
  if (kind === "orchid") {
    return createOrchidBloom(random, palette, x, y, controls, sizeFactor);
  }
  if (kind === "rose") {
    return createRoseBloom(random, palette, x, y, controls, sizeFactor);
  }
  return createCamelliaBloom(random, palette, x, y, controls, sizeFactor);
}

export function generateArtwork(seed, controls) {
  const random = createRandom(`${seed}:${JSON.stringify(controls)}`);
  const palette = palettes[Math.floor(random() * palettes.length)];
  const atmosphereVeils = [];
  const paperStrokes = [];
  const shadowLeaves = [];
  const gildedDust = [];
  const stems = [];
  const branchlets = [];
  const leaves = [];
  const blooms = [];
  const buds = [];
  const miniBlooms = [];
  const floatingPetals = [];
  const washes = [];
  const tendrils = [];
  const ornaments = [];
  const sprigs = [];
  const bouquetPlan = [];

  const canvasWidth = 760;
  const canvasHeight = 960;
  const density = controls.density ?? 0.68;
  const airy = controls.airy ?? 0.62;
  const bloomCount = 6 + Math.round(density * 2);
  const bouquetLeft = 124;
  const bouquetRight = 648;
  const bouquetWidth = bouquetRight - bouquetLeft;
  const dominantKind = sample(random, ["peony", "camellia", "rose"]);
  const supportKind = sample(
    random,
    ["peony", "camellia", "rose"].filter((kind) => kind !== dominantKind),
  );
  const focalKind = sample(random, [dominantKind, dominantKind, "peony", "rose"]);
  const bouquetKinds = Array.from({ length: bloomCount }, (_, index) => {
    const ratio = bloomCount === 1 ? 0.5 : index / (bloomCount - 1);
    const normalized = ratio * 2 - 1;
    const edgeDistance = Math.abs(normalized);

    if (edgeDistance < 0.18) {
      return focalKind;
    }
    if (edgeDistance > 0.74) {
      return sample(random, ["orchid", supportKind, "camellia"]);
    }
    if (edgeDistance > 0.42) {
      return sample(random, [dominantKind, supportKind, supportKind, "camellia"]);
    }
    return sample(random, [dominantKind, dominantKind, supportKind, focalKind]);
  });

  atmosphereVeils.push({ ...createVeil(random, palette, 188, 212, 1.24), depth: -272 });
  atmosphereVeils.push({ ...createVeil(random, palette, 594, 248, 1.16), depth: -270 });
  atmosphereVeils.push({ ...createVeil(random, palette, 552, 684, 1.28), depth: -268 });
  atmosphereVeils.push({ ...createVeil(random, palette, 252, 582, 1.08), depth: -266 });

  washes.push({ ...createWash(random, palette, 172, 182, 1.18), depth: -240 });
  washes.push({ ...createWash(random, palette, 604, 608, 1.34), depth: -238 });
  washes.push({ ...createWash(random, palette, 392, 286, 1.1), depth: -236 });
  washes.push({ ...createWash(random, palette, 522, 396, 0.96), depth: -234 });

  for (let index = 0; index < 28; index += 1) {
    paperStrokes.push({
      ...createPaperStroke(
        random,
        palette,
        rangeRandom(random, 36, canvasWidth - 36),
        rangeRandom(random, 42, canvasHeight - 42),
        rangeRandom(random, 42, 134),
        rangeRandom(random, 0, Math.PI * 2),
      ),
      depth: -226 + (index % 3),
    });
  }

  for (let index = 0; index < 8; index += 1) {
    shadowLeaves.push({
      ...createShadowLeaf(
        random,
        palette,
        rangeRandom(random, 80, canvasWidth - 80),
        rangeRandom(random, 128, canvasHeight - 140),
        rangeRandom(random, 0.78, 1.16),
      ),
      depth: -164 + index,
    });
  }

  gildedDust.push(
    ...createDustCluster(random, palette, 200, 174, 18, 62).map((item, index) => ({
      ...item,
      depth: -112 + index,
    })),
  );
  gildedDust.push(
    ...createDustCluster(random, palette, 554, 224, 16, 58).map((item, index) => ({
      ...item,
      depth: -94 + index,
    })),
  );
  gildedDust.push(
    ...createDustCluster(random, palette, 386, 704, 24, 78).map((item, index) => ({
      ...item,
      depth: 82 + index,
    })),
  );

  for (let index = 0; index < bloomCount; index += 1) {
    const ratio = bloomCount === 1 ? 0.5 : index / (bloomCount - 1);
    const normalized = ratio * 2 - 1;
    const kind = bouquetKinds[index];
    const anchorX = bouquetLeft + bouquetWidth * ratio + rangeRandom(random, -28, 28);
    const anchorY = 772 + rangeRandom(random, -24, 36);
    const crownLift = (1 - normalized * normalized) * rangeRandom(random, 34, 88);
    const bloomSpread = rangeRandom(random, 154, 206);
    const bloomX =
      canvasWidth * 0.5 +
      normalized * bloomSpread +
      Math.sin(ratio * Math.PI * rangeRandom(random, 0.9, 1.4)) * rangeRandom(random, 8, 24) +
      rangeRandom(random, -24, 24);
    const bloomY =
      302 +
      Math.abs(normalized) * rangeRandom(random, 46, 128) -
      crownLift +
      rangeRandom(random, -24, 56);
    const stemCurve = rangeRandom(random, -0.36, 0.42) - normalized * 0.1;
    const stemMidX = anchorX + (bloomX - anchorX) * 0.46 + stemCurve * 160;
    const stemMidY = anchorY - (anchorY - bloomY) * 0.54;
    const depth =
      100 +
      Math.round((1 - Math.abs(normalized)) * 72) +
      (kind === "peony" ? 24 : kind === "rose" ? 18 : kind === "camellia" ? 10 : -6);

    bouquetPlan.push({
      id: `bloom-${index}`,
      role:
        kind === "peony" || kind === "rose"
          ? "primary"
          : kind === "camellia"
            ? "secondary"
            : "spray",
      kind,
      anchorX,
      anchorY,
      bloomX,
      bloomY,
      depth,
      ratio: Number(ratio.toFixed(3)),
    });

    stems.push({
      path: `M ${anchorX.toFixed(2)} ${anchorY.toFixed(2)} Q ${stemMidX.toFixed(2)} ${stemMidY.toFixed(2)} ${bloomX.toFixed(2)} ${bloomY.toFixed(2)}`,
      width: rangeRandom(random, 2.8, 5.4),
      color: sample(random, palette.leaves),
      opacity: rangeRandom(random, 0.56, 0.84),
      depth: depth - 90,
    });

    const leafCount = 3 + Math.round((1 - airy) * 3);
    for (let leafIndex = 0; leafIndex < leafCount; leafIndex += 1) {
      const startT = rangeRandom(random, 0.24, 0.82);
      const startX = anchorX + (bloomX - anchorX) * startT + stemCurve * 80 * (1 - startT);
      const startY = anchorY + (bloomY - anchorY) * startT;
      const tilt = rangeRandom(random, -2.1, 1.36);
      const leafShape = createLeafPath(
        startX,
        startY,
        rangeRandom(random, 42, 96),
        rangeRandom(random, 13, 26),
        rangeRandom(random, 0.22, 0.5),
        tilt,
      );
      leaves.push({
        path: leafShape.path,
        veinPath: leafShape.veinPath,
        color: sample(random, palette.leaves),
        opacity: rangeRandom(random, 0.22, 0.52),
        depth: depth - 48 + Math.round(rangeRandom(random, 0, 24)),
      });
    }

    const sizeFactor =
      kind === "peony"
        ? rangeRandom(random, 0.98, 1.16)
        : kind === "rose"
          ? rangeRandom(random, 0.88, 1.06)
          : kind === "orchid"
            ? rangeRandom(random, 0.82, 0.98)
            : rangeRandom(random, 0.84, 1.02);
    const bloom = createBloomByKind(random, palette, kind, bloomX, bloomY, controls, sizeFactor);
    blooms.push({
      ...bloom,
      depth,
    });
    washes.push({
      ...bloom.wash,
      depth: depth - 132,
    });
    atmosphereVeils.push({
      ...createVeil(
        random,
        palette,
        bloomX + rangeRandom(random, -24, 24),
        bloomY + rangeRandom(random, -22, 22),
        kind === "peony" ? 0.74 : kind === "rose" ? 0.64 : 0.56,
      ),
      depth: depth - 146,
    });
    ornaments.push({
      ...createOrnamentArc(random, palette, bloomX + rangeRandom(random, -8, 10), bloomY + rangeRandom(random, -4, 10)),
      depth: depth - 118,
    });
    sprigs.push({
      ...createSprig(random, palette, bloomX + rangeRandom(random, -12, 12), bloomY + rangeRandom(random, 18, 34)),
      depth: depth - 18,
    });

    const branchCount =
      kind === "orchid"
        ? 4
        : kind === "rose"
          ? 3 + Math.round((1 - airy) * 2)
          : 2 + Math.round((1 - airy) * 2);
    for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
      const branchStartT = rangeRandom(random, 0.34, 0.74);
      const startX = anchorX + (bloomX - anchorX) * branchStartT;
      const startY = anchorY + (bloomY - anchorY) * branchStartT;
      const endX = startX + rangeRandom(random, -92, 92);
      const endY = startY - rangeRandom(random, 54, 126);
      branchlets.push({
        path: `M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${((startX + endX) / 2 + rangeRandom(random, -22, 22)).toFixed(2)} ${((startY + endY) / 2 - rangeRandom(random, 8, 28)).toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}`,
        width: rangeRandom(random, 1.2, 2.2),
        color: sample(random, palette.leaves),
        opacity: rangeRandom(random, 0.42, 0.68),
        depth: depth - 36,
      });
      buds.push({
        ...createBud(random, palette, startX, startY, endX, endY),
        depth: depth + (kind === "orchid" ? 10 : kind === "rose" ? 4 : -4),
      });
      tendrils.push({
        ...createTendril(random, palette, endX, endY),
        depth: depth - 72,
      });
      miniBlooms.push(
        {
          ...createMiniBloom(
            random,
            palette,
            endX + rangeRandom(random, -22, 22),
            endY + rangeRandom(random, -18, 18),
          ),
          depth: depth - (kind === "orchid" ? 2 : 12),
        },
      );
      sprigs.push({
        ...createSprig(random, palette, endX, endY),
        depth: depth - 10,
      });
    }
  }

  const extraMiniBloomCount = 7 + Math.round(density * 5);
  for (let index = 0; index < extraMiniBloomCount; index += 1) {
    miniBlooms.push({
      ...createMiniBloom(
        random,
        palette,
        rangeRandom(random, 116, canvasWidth - 70),
        rangeRandom(random, 160, canvasHeight - 180),
      ),
      depth: 52 + index,
    });
  }

  const ornamentCount = 7 + Math.round((1 - airy) * 3);
  for (let index = 0; index < ornamentCount; index += 1) {
    ornaments.push({
      ...createOrnamentArc(
        random,
        palette,
        rangeRandom(random, 120, canvasWidth - 90),
        rangeRandom(random, 180, canvasHeight - 220),
      ),
      depth: -126 + index,
    });
  }

  const sprigCount = 10 + Math.round(density * 5);
  for (let index = 0; index < sprigCount; index += 1) {
    sprigs.push({
      ...createSprig(
        random,
        palette,
        rangeRandom(random, 140, canvasWidth - 120),
        rangeRandom(random, 430, canvasHeight - 90),
      ),
      depth: 64 + index,
    });
  }

  const petalCount = 14 + Math.round((1 - airy) * 8);
  for (let index = 0; index < petalCount; index += 1) {
    floatingPetals.push({
      x: rangeRandom(random, 108, canvasWidth - 56),
      y: rangeRandom(random, 112, canvasHeight - 96),
      width: rangeRandom(random, 14, 32),
      height: rangeRandom(random, 9, 24),
      fill: mixHex(sample(random, palette.bloom), palette.accent, rangeRandom(random, 0.08, 0.22)),
      rotation: rangeRandom(random, 0, 360),
      opacity: rangeRandom(random, 0.12, 0.24),
      depth: 160 + index,
    });
  }

  const renderOrder = [
    ...atmosphereVeils.map((item, index) => ({ id: `veil-${index}`, depth: item.depth })),
    ...paperStrokes.map((item, index) => ({ id: `paper-stroke-${index}`, depth: item.depth })),
    ...washes.map((item) => ({ id: `wash-${item.depth}-${item.x.toFixed(0)}`, depth: item.depth })),
    ...shadowLeaves.map((item, index) => ({ id: `shadow-leaf-${index}`, depth: item.depth })),
    ...ornaments.map((item, index) => ({ id: `ornament-${index}`, depth: item.depth })),
    ...gildedDust.map((item, index) => ({ id: `dust-${index}`, depth: item.depth })),
    ...tendrils.map((item, index) => ({ id: `tendril-${index}`, depth: item.depth })),
    ...stems.map((item, index) => ({ id: `stem-${index}`, depth: item.depth })),
    ...leaves.map((item, index) => ({ id: `leaf-${index}`, depth: item.depth })),
    ...branchlets.map((item, index) => ({ id: `branch-${index}`, depth: item.depth })),
    ...sprigs.map((item, index) => ({ id: `sprig-${index}`, depth: item.depth })),
    ...miniBlooms.map((item, index) => ({ id: `mini-${index}`, depth: item.depth })),
    ...blooms.map((item, index) => ({ id: `bloom-${index}`, depth: item.depth })),
    ...buds.map((item, index) => ({ id: `bud-${index}`, depth: item.depth })),
    ...floatingPetals.map((item, index) => ({ id: `petal-${index}`, depth: item.depth })),
  ]
    .sort((left, right) => left.depth - right.depth)
    .map((item) => item.id);

  return {
    seed,
    palette,
    atmosphereVeils,
    paperStrokes,
    shadowLeaves,
    gildedDust,
    stems,
    branchlets,
    leaves,
    blooms,
    buds,
    miniBlooms,
    floatingPetals,
    washes,
    tendrils,
    ornaments,
    sprigs,
    composition: {
      focusX: canvasWidth * 0.52,
      focusY: 338,
      plan: bouquetPlan,
      renderOrder,
    },
    textureDots: Array.from({ length: 180 }, () => ({
      x: rangeRandom(random, 0, canvasWidth),
      y: rangeRandom(random, 0, canvasHeight),
      radius: rangeRandom(random, 0.5, 1.7),
      opacity: rangeRandom(random, 0.03, 0.14),
      depth: -180,
    })),
    frame: {
      width: canvasWidth,
      height: canvasHeight,
    },
  };
}
