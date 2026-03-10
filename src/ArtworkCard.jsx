import { useRef } from "react";
import { createRandom } from "./random.js";

function petalBlurId(value) {
  return Math.min(22, Math.max(5, Math.round(value * 10)));
}

const motionPresets = {
  atmosphere: {
    driftX: [1.6, 4.4],
    driftY: [1.4, 4.8],
    rotate: [0.2, 1.1],
    duration: [15, 23],
    tilt: [4, 12],
  },
  paper: {
    driftX: [0.3, 1.1],
    driftY: [0.3, 1],
    rotate: [0.08, 0.34],
    duration: [20, 32],
    tilt: [1, 4],
  },
  shadow: {
    driftX: [0.6, 1.8],
    driftY: [0.8, 2.1],
    rotate: [0.18, 0.48],
    duration: [18, 26],
    tilt: [2, 6],
  },
  ornament: {
    driftX: [0.8, 2],
    driftY: [0.8, 2],
    rotate: [0.24, 0.72],
    duration: [14, 20],
    tilt: [2, 7],
  },
  dust: {
    driftX: [1.4, 3.8],
    driftY: [1.2, 4.2],
    rotate: [0.18, 0.9],
    duration: [12, 18],
    tilt: [4, 10],
  },
  stem: {
    driftX: [0.4, 1.4],
    driftY: [0.6, 1.8],
    rotate: [0.18, 0.46],
    duration: [11, 15],
    tilt: [3, 8],
  },
  branch: {
    driftX: [0.6, 1.8],
    driftY: [0.8, 2],
    rotate: [0.22, 0.68],
    duration: [10, 14],
    tilt: [4, 9],
  },
  leaf: {
    driftX: [0.9, 2.2],
    driftY: [0.9, 2.4],
    rotate: [0.32, 1.2],
    duration: [8, 13],
    tilt: [5, 12],
  },
  sprig: {
    driftX: [1, 2.6],
    driftY: [0.8, 2.2],
    rotate: [0.3, 0.94],
    duration: [9, 14],
    tilt: [4, 10],
  },
  bloom: {
    driftX: [0.8, 2],
    driftY: [0.8, 1.8],
    rotate: [0.5, 1.8],
    duration: [7, 11.5],
    tilt: [8, 18],
  },
  bud: {
    driftX: [0.7, 1.8],
    driftY: [0.7, 1.6],
    rotate: [0.48, 1.3],
    duration: [8, 12],
    tilt: [7, 15],
  },
  petal: {
    driftX: [2.4, 6.2],
    driftY: [1.6, 5.4],
    rotate: [1.2, 3.4],
    duration: [9, 16],
    tilt: [10, 24],
  },
};

function range(random, min, max) {
  return min + (max - min) * random();
}

function formatMotionStyle(seed, key, kind, originX, originY) {
  const preset = motionPresets[kind];
  if (!preset) {
    return "";
  }
  const random = createRandom(`${seed}:${key}:${kind}`);
  const driftX = range(random, preset.driftX[0], preset.driftX[1]);
  const driftY = range(random, preset.driftY[0], preset.driftY[1]);
  const rotate = range(random, preset.rotate[0], preset.rotate[1]);
  const duration = range(random, preset.duration[0], preset.duration[1]);
  const delay = range(random, 0, duration);
  const direction = random() > 0.5 ? 1 : -1;
  const depth = range(random, preset.tilt[0], preset.tilt[1]) * direction;
  return [
    `--motion-drift-x:${(driftX * direction).toFixed(2)}px`,
    `--motion-drift-y:${(driftY * (direction * -1)).toFixed(2)}px`,
    `--motion-rotate:${(rotate * direction).toFixed(2)}deg`,
    `--motion-duration:${duration.toFixed(2)}s`,
    `--motion-delay:-${delay.toFixed(2)}s`,
    `--motion-depth:${depth.toFixed(2)}px`,
    `--motion-origin-x:${originX.toFixed(2)}px`,
    `--motion-origin-y:${originY.toFixed(2)}px`,
  ].join(";");
}

function wrapMotion(markup, artworkSeed, item) {
  if (!item.motion) {
    return markup;
  }
  const style = formatMotionStyle(
    artworkSeed,
    item.key,
    item.motion.kind,
    item.motion.originX,
    item.motion.originY,
  );
  return `
    <g class="motion-node motion-node--${item.motion.kind}" style="${style}">
      ${markup}
    </g>
  `;
}

function wrapRelief(markup, item, composition) {
  if (composition?.mode !== "relief") {
    return markup;
  }
  const relief = item.relief ?? {};
  const layer = relief.layer ?? "mid";
  const shadow = relief.shadow ? ` filter="url(#relief-shadow-${relief.shadow})"` : "";
  const tiltBias = relief.tiltBias ?? [0, 0];
  const style = [
    `--relief-shift-x:${(tiltBias[0] * (relief.parallax ?? 0)).toFixed(3)}`,
    `--relief-shift-y:${(tiltBias[1] * (relief.parallax ?? 0)).toFixed(3)}`,
    `--relief-scale:${(1 + (relief.parallax ?? 0) * 0.012).toFixed(3)}`,
  ].join(";");
  return `
    <g class="relief-node relief-node--${layer}" style="${style}"${shadow}>
      ${markup}
    </g>
  `;
}

function renderBloom(bloom, palette) {
  const pigmentPools = bloom.pigmentPools ?? [];
  const shapes = bloom.shapes ?? [];
  const highlights = bloom.highlights ?? [];
  const stamens = bloom.stamens ?? [];
  const centerDots = bloom.centerDots ?? bloom.coreDots ?? [];
  return `
    <g transform="rotate(${bloom.rotation.toFixed(2)} ${bloom.x.toFixed(2)} ${bloom.y.toFixed(2)})">
      <ellipse cx="${bloom.x.toFixed(2)}" cy="${(bloom.y + bloom.shadow.offsetY).toFixed(2)}" rx="${bloom.shadow.rx.toFixed(2)}" ry="${bloom.shadow.ry.toFixed(2)}" fill="${bloom.shadow.fill}" opacity="${bloom.shadow.opacity.toFixed(2)}" filter="url(#shadowBlur)" />
      <circle cx="${bloom.x.toFixed(2)}" cy="${bloom.y.toFixed(2)}" r="${bloom.glow.toFixed(2)}" fill="${palette.haze}" opacity="0.55" filter="url(#softBlur)" />
      ${pigmentPools
        .map(
          (pool) => `
            <ellipse cx="${pool.x.toFixed(2)}" cy="${pool.y.toFixed(2)}" rx="${pool.rx.toFixed(2)}" ry="${pool.ry.toFixed(2)}" fill="${pool.fill}" opacity="${pool.opacity.toFixed(2)}" transform="rotate(${pool.rotation.toFixed(2)} ${pool.x.toFixed(2)} ${pool.y.toFixed(2)})" />
          `,
        )
        .join("")}
      ${shapes
        .map(
          (shape) => `
            <path d="${shape.path}" fill="${shape.fill}" opacity="${shape.opacity.toFixed(2)}" filter="url(#petalBlur-${petalBlurId(shape.blur)})" stroke="${shape.stroke ?? "none"}" stroke-opacity="${shape.strokeOpacity?.toFixed(2) ?? 0}" stroke-width="${shape.strokeWidth ?? 0}" />
          `,
        )
        .join("")}
      ${highlights
        .map(
          (highlight) => `
            <path d="${highlight.path}" fill="none" stroke="${highlight.stroke}" stroke-width="${highlight.strokeWidth.toFixed(2)}" opacity="${highlight.opacity.toFixed(2)}" />
          `,
        )
        .join("")}
      ${stamens
        .map(
          (stamen) => `
            <path d="${stamen.path}" fill="none" stroke="${palette.accent}" stroke-width="0.7" opacity="${stamen.opacity.toFixed(2)}" />
            <circle cx="${stamen.x.toFixed(2)}" cy="${stamen.y.toFixed(2)}" r="${stamen.radius.toFixed(2)}" fill="${stamen.fill}" opacity="${stamen.opacity.toFixed(2)}" />
          `,
        )
        .join("")}
      ${centerDots
        .map(
          (dot) => `
            <circle cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="${dot.radius.toFixed(2)}" fill="${dot.fill}" opacity="${dot.opacity.toFixed(2)}" />
          `,
        )
        .join("")}
      <path d="${bloom.coreShape.path}" fill="${bloom.coreShape.fill}" opacity="${bloom.coreShape.opacity.toFixed(2)}" />
    </g>
  `;
}

function renderMiniBloom(miniBloom) {
  return `
    <g>
      ${miniBloom.petals
        .map(
          (petal) => `
            <path d="${petal.path}" fill="${petal.fill}" opacity="${petal.opacity.toFixed(2)}" />
          `,
        )
        .join("")}
      ${miniBloom.dots
        .map(
          (dot) => `
            <circle cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="${dot.radius.toFixed(2)}" fill="${dot.fill}" opacity="${dot.opacity.toFixed(2)}" />
          `,
        )
        .join("")}
    </g>
  `;
}

function renderBud(bud, palette) {
  return `
    <g>
      <path d="${bud.stemPath}" fill="none" stroke="${palette.accent}" stroke-width="1.2" opacity="0.42" />
      <g transform="rotate(${bud.rotation.toFixed(2)} ${bud.x.toFixed(2)} ${bud.y.toFixed(2)})">
        <path d="${bud.sepal.path}" fill="${bud.sepal.fill}" opacity="${bud.sepal.opacity.toFixed(2)}" />
        ${bud.petals
          .map(
            (petal) => `
              <path d="${petal.path}" fill="${petal.fill}" opacity="${petal.opacity.toFixed(2)}" />
            `,
          )
          .join("")}
      </g>
    </g>
  `;
}

function renderSprig(sprig) {
  return `
    <g>
      <path d="${sprig.path}" fill="none" stroke="${sprig.stroke}" stroke-width="1.1" opacity="${sprig.opacity.toFixed(2)}" />
      ${sprig.berries
        .map(
          (berry) => `
            <circle cx="${berry.x.toFixed(2)}" cy="${berry.y.toFixed(2)}" r="${berry.radius.toFixed(2)}" fill="${berry.fill}" opacity="${berry.opacity.toFixed(2)}" />
          `,
        )
        .join("")}
    </g>
  `;
}

function renderTendril(tendril) {
  return `
    <g>
      <path d="${tendril.path}" fill="none" stroke="${tendril.stroke}" stroke-width="1" opacity="${tendril.opacity.toFixed(2)}" />
      ${tendril.beads
        .map(
          (bead) => `
            <circle cx="${bead.x.toFixed(2)}" cy="${bead.y.toFixed(2)}" r="${bead.radius.toFixed(2)}" fill="${bead.fill}" opacity="${bead.opacity.toFixed(2)}" />
          `,
        )
        .join("")}
    </g>
  `;
}

function renderWash(wash) {
  return `
    <ellipse cx="${wash.x.toFixed(2)}" cy="${wash.y.toFixed(2)}" rx="${wash.rx.toFixed(2)}" ry="${wash.ry.toFixed(2)}" fill="${wash.fill}" opacity="${wash.opacity.toFixed(2)}" transform="rotate(${wash.rotation.toFixed(2)} ${wash.x.toFixed(2)} ${wash.y.toFixed(2)})" filter="url(#washBlur)" />
  `;
}

function renderVeil(veil) {
  return `
    <ellipse cx="${veil.x.toFixed(2)}" cy="${veil.y.toFixed(2)}" rx="${veil.rx.toFixed(2)}" ry="${veil.ry.toFixed(2)}" fill="${veil.fill}" opacity="${veil.opacity.toFixed(2)}" transform="rotate(${veil.rotation.toFixed(2)} ${veil.x.toFixed(2)} ${veil.y.toFixed(2)})" filter="url(#veilBlur)" />
  `;
}

function renderPaperStroke(stroke) {
  return `
    <path d="${stroke.path}" fill="none" stroke="${stroke.stroke}" stroke-width="${stroke.width.toFixed(2)}" stroke-linecap="round" opacity="${stroke.opacity.toFixed(2)}" />
  `;
}

function renderShadowLeaf(leaf) {
  return `
    <g>
      <path d="${leaf.path}" fill="${leaf.fill}" opacity="${leaf.opacity.toFixed(2)}" />
      <path d="${leaf.veinPath}" fill="none" stroke="${leaf.stroke}" stroke-width="1" opacity="${(leaf.opacity * 0.72).toFixed(2)}" />
    </g>
  `;
}

function renderFloatingPetal(petal) {
  return `
    <ellipse cx="${petal.x.toFixed(2)}" cy="${petal.y.toFixed(2)}" rx="${petal.width.toFixed(2)}" ry="${petal.height.toFixed(2)}" fill="${petal.fill}" opacity="${petal.opacity.toFixed(2)}" transform="rotate(${petal.rotation.toFixed(2)} ${petal.x.toFixed(2)} ${petal.y.toFixed(2)})" />
  `;
}

function buildMarkup(artwork) {
  const grainSeed =
    Array.from(artwork.seed ?? "").reduce((total, char) => total + char.charCodeAt(0), 0) % 97;
  const {
    frame,
    palette,
    atmosphereVeils = [],
    paperStrokes = [],
    shadowLeaves = [],
    gildedDust = [],
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
    textureDots,
  } = artwork;

  const renderables = [
    ...atmosphereVeils.map((veil, index) => ({
      key: `veil-${index}`,
      depth: veil.depth ?? -260,
      markup: renderVeil(veil),
      motion: { kind: "atmosphere", originX: veil.x, originY: veil.y },
    })),
    ...paperStrokes.map((stroke, index) => ({
      key: `paper-stroke-${index}`,
      depth: stroke.depth ?? -220,
      markup: renderPaperStroke(stroke),
      motion: { kind: "paper", originX: frame.width * 0.5, originY: frame.height * 0.5 },
    })),
    ...washes.map((wash, index) => ({
      key: `wash-${index}`,
      depth: wash.depth ?? -200,
      markup: renderWash(wash),
      motion: { kind: "atmosphere", originX: wash.x, originY: wash.y },
    })),
    {
      key: "texture",
      depth: -180,
      markup: `
        <g opacity="0.58">
          ${textureDots
            .map(
              (dot) => `
                <circle cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="${dot.radius.toFixed(2)}" fill="${palette.accent}" opacity="${dot.opacity.toFixed(2)}" />
              `,
            )
            .join("")}
        </g>
      `,
      motion: { kind: "paper", originX: frame.width * 0.5, originY: frame.height * 0.5 },
    },
    ...shadowLeaves.map((leaf, index) => ({
      key: `shadow-leaf-${index}`,
      depth: leaf.depth ?? -150,
      markup: renderShadowLeaf(leaf),
      motion: { kind: "shadow", originX: frame.width * 0.5, originY: frame.height * 0.5 },
    })),
    ...ornaments.map((ornament, index) => ({
      key: `ornament-${index}`,
      depth: ornament.depth ?? -120,
      markup: `<path d="${ornament.path}" fill="none" stroke="${ornament.stroke}" stroke-width="1.25" opacity="${ornament.opacity.toFixed(2)}" />`,
      motion: { kind: "ornament", originX: frame.width * 0.5, originY: frame.height * 0.5 },
    })),
    ...gildedDust.map((particle, index) => ({
      key: `dust-${index}`,
      depth: particle.depth ?? -90,
      markup: `<circle cx="${particle.x.toFixed(2)}" cy="${particle.y.toFixed(2)}" r="${particle.radius.toFixed(2)}" fill="${particle.fill}" opacity="${particle.opacity.toFixed(2)}" />`,
      motion: { kind: "dust", originX: particle.x, originY: particle.y },
    })),
    ...tendrils.map((tendril, index) => ({
      key: `tendril-${index}`,
      depth: tendril.depth ?? -80,
      markup: renderTendril(tendril),
      motion: { kind: "branch", originX: frame.width * 0.5, originY: frame.height * 0.66 },
    })),
    ...stems.map((stem, index) => ({
      key: `stem-${index}`,
      depth: stem.depth ?? 0,
      markup: `<path d="${stem.path}" fill="none" stroke="${stem.color}" stroke-width="${stem.width.toFixed(2)}" stroke-linecap="round" opacity="${stem.opacity.toFixed(2)}" />`,
      motion: { kind: "stem", originX: frame.width * 0.5, originY: frame.height * 0.86 },
    })),
    ...branchlets.map((branch, index) => ({
      key: `branch-${index}`,
      depth: branch.depth ?? 0,
      markup: `<path d="${branch.path}" fill="none" stroke="${branch.color}" stroke-width="${branch.width.toFixed(2)}" stroke-linecap="round" opacity="${branch.opacity.toFixed(2)}" />`,
      motion: { kind: "branch", originX: frame.width * 0.5, originY: frame.height * 0.74 },
    })),
    ...leaves.map((leaf, index) => ({
      key: `leaf-${index}`,
      depth: leaf.depth ?? 0,
      markup: `
        <g>
          <path d="${leaf.path}" fill="${leaf.color}" opacity="${leaf.opacity.toFixed(2)}" />
          <path d="${leaf.veinPath}" fill="none" stroke="${palette.haze}" stroke-width="1.1" opacity="${(leaf.opacity * 0.7).toFixed(2)}" />
        </g>
      `,
      motion: { kind: "leaf", originX: frame.width * 0.5, originY: frame.height * 0.72 },
    })),
    ...sprigs.map((sprig, index) => ({
      key: `sprig-${index}`,
      depth: sprig.depth ?? 0,
      markup: renderSprig(sprig),
      motion: { kind: "sprig", originX: frame.width * 0.5, originY: frame.height * 0.68 },
    })),
    ...miniBlooms.map((miniBloom, index) => ({
      key: `mini-${index}`,
      depth: miniBloom.depth ?? 40,
      markup: renderMiniBloom(miniBloom),
      motion: { kind: "bud", originX: frame.width * 0.5, originY: frame.height * 0.52 },
    })),
    ...blooms.map((bloom, index) => ({
      key: `bloom-${index}`,
      depth: bloom.depth ?? 100,
      markup: renderBloom(bloom, palette),
      motion: { kind: "bloom", originX: bloom.x, originY: bloom.y },
    })),
    ...buds.map((bud, index) => ({
      key: `bud-${index}`,
      depth: bud.depth ?? 110,
      markup: renderBud(bud, palette),
      motion: { kind: "bud", originX: bud.x, originY: bud.y },
    })),
    ...floatingPetals.map((petal, index) => ({
      key: `petal-${index}`,
      depth: petal.depth ?? 160,
      markup: renderFloatingPetal(petal),
      motion: { kind: "petal", originX: petal.x, originY: petal.y },
    })),
  ]
    .sort((left, right) => left.depth - right.depth)
    .map((item) => wrapRelief(wrapMotion(item.markup, artwork.seed ?? "flower", item), item, artwork.composition))
    .join("");

  const isRelief = artwork.composition?.mode === "relief";
  const reliefFrameGlow = isRelief
    ? `
      <g opacity="0.54">
        <ellipse cx="${(frame.width * 0.5).toFixed(2)}" cy="${(frame.height * 0.28).toFixed(2)}" rx="${(frame.width * 0.28).toFixed(2)}" ry="${(frame.height * 0.12).toFixed(2)}" fill="${palette.haze}" opacity="0.42" filter="url(#softBlur)" />
        <ellipse cx="${(frame.width * 0.52).toFixed(2)}" cy="${(frame.height * 0.76).toFixed(2)}" rx="${(frame.width * 0.2).toFixed(2)}" ry="${(frame.height * 0.08).toFixed(2)}" fill="${palette.accent}" opacity="0.14" filter="url(#shadowBlur)" />
      </g>
    `
    : "";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${frame.width} ${frame.height}" width="${frame.width}" height="${frame.height}" aria-label="Ornate floral artwork">
      <defs>
        <linearGradient id="paper" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.background[0]}" />
          <stop offset="48%" stop-color="${palette.background[1]}" />
          <stop offset="100%" stop-color="${palette.background[2]}" />
        </linearGradient>
        <radialGradient id="sunwash" cx="26%" cy="18%" r="70%">
          <stop offset="0%" stop-color="${palette.haze}" stop-opacity="0.94" />
          <stop offset="100%" stop-color="${palette.background[0]}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="72%" stop-color="#000000" stop-opacity="0" />
          <stop offset="100%" stop-color="#4b3a3d" stop-opacity="0.12" />
        </radialGradient>
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id="washBlur">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id="veilBlur">
          <feGaussianBlur stdDeviation="34" />
        </filter>
        <filter id="shadowBlur">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="relief-shadow-soft" x="-14%" y="-14%" width="128%" height="132%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="${palette.accent}" flood-opacity="0.14" />
        </filter>
        <filter id="relief-shadow-mid" x="-14%" y="-14%" width="128%" height="136%">
          <feDropShadow dx="0" dy="9" stdDeviation="11" flood-color="${palette.accent}" flood-opacity="0.18" />
        </filter>
        <filter id="relief-shadow-strong" x="-14%" y="-14%" width="132%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="${palette.accent}" flood-opacity="0.24" />
        </filter>
        <filter id="paperGrain" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.86" numOctaves="2" seed="${grainSeed}" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 0.08 0"
          />
        </filter>
        ${[5, 8, 11, 14, 18, 22]
          .map(
            (blur) =>
              `<filter id="petalBlur-${blur}"><feGaussianBlur stdDeviation="${(
                blur / 10
              ).toFixed(1)}" /></filter>`,
          )
          .join("")}
        <style>
          .relief-node {
            transform-box: fill-box;
            transform-origin: center;
            transform: translate(calc(var(--relief-pan-x, 0px) * var(--relief-shift-x, 0)), calc(var(--relief-pan-y, 0px) * var(--relief-shift-y, 0))) scale(var(--relief-scale, 1));
            transition: transform 180ms ease-out, opacity 180ms ease-out;
          }
          .relief-node--back {
            opacity: 0.96;
          }
          .relief-node--mid {
            opacity: 0.99;
          }
          .relief-node--front {
            opacity: 1;
          }
        </style>
      </defs>

      <rect width="${frame.width}" height="${frame.height}" rx="42" fill="url(#paper)" />
      <rect width="${frame.width}" height="${frame.height}" rx="42" fill="${palette.haze}" opacity="0.24" filter="url(#paperGrain)" />
      <rect x="30" y="34" width="${frame.width - 60}" height="${frame.height - 68}" rx="34" fill="none" stroke="${palette.metal}" stroke-opacity="0.36" stroke-width="1.2" />
      <rect x="48" y="52" width="${frame.width - 96}" height="${frame.height - 104}" rx="30" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.74)" />
      <rect x="62" y="66" width="${frame.width - 124}" height="${frame.height - 132}" rx="24" fill="none" stroke="${palette.metal}" stroke-opacity="0.22" />
      <ellipse cx="180" cy="172" rx="248" ry="176" fill="url(#sunwash)" opacity="0.92" />
      <rect width="${frame.width}" height="${frame.height}" rx="42" fill="url(#vignette)" />
      ${reliefFrameGlow}

      <g opacity="0.38">
        <path d="M 86 96 Q 132 74 178 96" fill="none" stroke="${palette.metal}" stroke-width="1.1" />
        <path d="M 582 96 Q 628 74 674 96" fill="none" stroke="${palette.metal}" stroke-width="1.1" />
        <path d="M 86 864 Q 132 886 178 864" fill="none" stroke="${palette.metal}" stroke-width="1.1" />
        <path d="M 582 864 Q 628 886 674 864" fill="none" stroke="${palette.metal}" stroke-width="1.1" />
        <circle cx="92" cy="102" r="4" fill="${palette.metal}" />
        <circle cx="668" cy="102" r="4" fill="${palette.metal}" />
        <circle cx="92" cy="858" r="4" fill="${palette.metal}" />
        <circle cx="668" cy="858" r="4" fill="${palette.metal}" />
      </g>

      <g opacity="0.18">
        <path d="M 172 126 Q 380 72 588 126" fill="none" stroke="${palette.metal}" stroke-width="0.9" />
        <path d="M 196 830 Q 380 884 564 830" fill="none" stroke="${palette.metal}" stroke-width="0.9" />
        <path d="M 134 190 Q 110 478 134 766" fill="none" stroke="${palette.metal}" stroke-width="0.8" />
        <path d="M 626 190 Q 650 478 626 766" fill="none" stroke="${palette.metal}" stroke-width="0.8" />
      </g>

      ${renderables}

      <g opacity="0.92">
        <path d="M 334 742 C 356 718 404 718 426 742 C 406 758 354 758 334 742 Z" fill="${palette.bloom[1]}" opacity="0.74" />
        <path d="M 354 742 C 330 708 330 678 350 654 C 382 682 390 718 382 748 Z" fill="${palette.bloom[2]}" opacity="0.62" />
        <path d="M 406 742 C 432 708 432 678 410 654 C 380 684 370 720 378 748 Z" fill="${palette.bloom[0]}" opacity="0.62" />
        <path d="M 350 744 C 384 732 392 732 426 744" fill="none" stroke="${palette.metal}" stroke-opacity="0.42" stroke-width="1.3" />
        <circle cx="380" cy="742" r="7" fill="${palette.metal}" opacity="0.68" />
        <path d="M 380 749 Q 356 806 340 860" fill="none" stroke="${palette.metal}" stroke-opacity="0.22" stroke-width="1.1" />
        <path d="M 380 749 Q 404 806 420 860" fill="none" stroke="${palette.metal}" stroke-opacity="0.22" stroke-width="1.1" />
        <circle cx="340" cy="860" r="3.8" fill="${palette.metal}" opacity="0.36" />
        <circle cx="420" cy="860" r="3.8" fill="${palette.metal}" opacity="0.36" />
      </g>
    </svg>
  `;
}

export function ArtworkCard({ artwork, artKey }) {
  const frameRef = useRef(null);
  const markup = buildMarkup(artwork);
  const isRelief = artwork.composition?.mode === "relief";

  function handlePointerMove(event) {
    if (!isRelief || !frameRef.current) {
      return;
    }
    const rect = frameRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 18;
    frameRef.current.style.setProperty("--relief-pan-x", `${x.toFixed(2)}px`);
    frameRef.current.style.setProperty("--relief-pan-y", `${y.toFixed(2)}px`);
  }

  function handlePointerLeave() {
    if (!frameRef.current) {
      return;
    }
    frameRef.current.style.setProperty("--relief-pan-x", "0px");
    frameRef.current.style.setProperty("--relief-pan-y", "0px");
  }

  return (
    <div className="art-scene">
      <div className={`art-frame${isRelief ? " art-frame--relief" : ""}`}>
        <div className="art-frame-shine" aria-hidden="true" />
        <div
          ref={frameRef}
          className={`art-svg${isRelief ? " art-svg--relief" : ""}`}
          key={artKey}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      </div>
    </div>
  );
}

export function getArtworkMarkup(artwork) {
  return buildMarkup(artwork);
}
