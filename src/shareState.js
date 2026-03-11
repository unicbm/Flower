import { createArtworkStatePayload, normalizeArtworkState } from "./artworkState.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const supportedVersions = new Set([1, 2, 3, 4, 5]);

function createShareStateError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function decompressString(serialized) {
  if (!serialized.startsWith("gz.")) {
    return decoder.decode(base64UrlDecode(serialized));
  }
  if (typeof DecompressionStream === "undefined") {
    throw createShareStateError(
      "Browser does not support compressed links.",
      "UNSUPPORTED_COMPRESSED_LINK",
    );
  }
  const compressed = base64UrlDecode(serialized.slice(3));
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(compressed);
  await writer.close();
  const text = await new Response(stream.readable).arrayBuffer();
  return decoder.decode(text);
}

export function isCompressedArtworkState(value) {
  return typeof value === "string" && value.startsWith("gz.");
}

export function isUnsupportedCompressedArtworkStateError(error) {
  return error?.code === "UNSUPPORTED_COMPRESSED_LINK";
}

export async function serializeArtworkState(state) {
  const payload = createArtworkStatePayload(state);
  return base64UrlEncode(encoder.encode(JSON.stringify(payload)));
}

export async function parseArtworkState(rawValue, options = {}) {
  const jsonText = await decompressString(rawValue);
  const parsed = JSON.parse(jsonText);
  if (!parsed || !supportedVersions.has(parsed.version)) {
    throw createShareStateError("Invalid artwork version", "INVALID_ARTWORK_VERSION");
  }
  if (options.normalize === false) {
    return parsed;
  }
  return normalizeArtworkState(parsed);
}
