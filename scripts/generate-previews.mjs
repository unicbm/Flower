import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { generateArtwork } from "../src/flowerGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const docsDir = path.join(repoRoot, "docs");
const tempDir = path.join(repoRoot, ".tmp-preview-build");
const artworkCardSource = path.join(repoRoot, "src", "ArtworkCard.jsx");
const artworkCardBundle = path.join(tempDir, "artwork-card.bundle.mjs");

await fs.mkdir(docsDir, { recursive: true });
await fs.mkdir(tempDir, { recursive: true });

await build({
  entryPoints: [artworkCardSource],
  outfile: artworkCardBundle,
  bundle: true,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  logLevel: "silent",
});

const { getArtworkMarkup } = await import(pathToFileURL(artworkCardBundle).href);

const previews = [
  {
    file: "preview-1.svg",
    seed: "pearl-garden-dawn",
    controls: { density: 0.68, airy: 0.62, bloomSize: 0.74 },
    compositionMode: "bouquet",
  },
  {
    file: "preview-2.svg",
    seed: "amber-ribbon-mist",
    controls: { density: 0.82, airy: 0.44, bloomSize: 0.86 },
    compositionMode: "bouquet",
  },
  {
    file: "preview-3.svg",
    seed: "moon-petal-archive",
    controls: { density: 0.56, airy: 0.84, bloomSize: 0.66 },
    compositionMode: "abstract",
  },
  {
    file: "preview-4.svg",
    seed: "mirror-garden-signal",
    controls: { density: 0.74, airy: 0.58, bloomSize: 0.82 },
    compositionMode: "abstract",
  },
];

for (const preview of previews) {
  const artwork = generateArtwork(preview.seed, preview.controls, preview.compositionMode);
  const svg = getArtworkMarkup(artwork).trimStart();
  await fs.writeFile(path.join(docsDir, preview.file), `${svg}\n`, "utf8");
}

await fs.rm(tempDir, { recursive: true, force: true });

for (const preview of previews) {
  console.log(path.join("docs", preview.file));
}
