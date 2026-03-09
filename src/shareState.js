const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

async function compressString(text) {
  if (typeof CompressionStream === "undefined") {
    return base64UrlEncode(encoder.encode(text));
  }
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(encoder.encode(text));
  await writer.close();
  const compressed = await new Response(stream.readable).arrayBuffer();
  return `gz.${base64UrlEncode(new Uint8Array(compressed))}`;
}

async function decompressString(serialized) {
  if (!serialized.startsWith("gz.")) {
    return decoder.decode(base64UrlDecode(serialized));
  }
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Browser does not support compressed links.");
  }
  const compressed = base64UrlDecode(serialized.slice(3));
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(compressed);
  await writer.close();
  const text = await new Response(stream.readable).arrayBuffer();
  return decoder.decode(text);
}

export async function serializeArtworkState(state) {
  const payload = {
    version: 2,
    ...state,
  };
  return compressString(JSON.stringify(payload));
}

export async function parseArtworkState(rawValue) {
  const jsonText = await decompressString(rawValue);
  const parsed = JSON.parse(jsonText);
  if (!parsed || (parsed.version !== 1 && parsed.version !== 2)) {
    throw new Error("Invalid artwork version");
  }
  return parsed;
}
