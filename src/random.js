export function xmur3(value) {
  let h = 1779033703 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    h = Math.imul(h ^ value.charCodeAt(index), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandom(seedText) {
  const seed = xmur3(seedText)();
  return mulberry32(seed);
}

export function sample(random, values) {
  return values[Math.floor(random() * values.length)];
}

export function rangeRandom(random, min, max) {
  return min + (max - min) * random();
}
