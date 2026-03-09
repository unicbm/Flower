function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadSvg(svgMarkup, filename) {
  triggerDownload(
    new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }),
    filename,
  );
}

export async function downloadPng(svgMarkup, filename, width, height) {
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();
  image.decoding = "async";

  const dataUrl = await new Promise((resolve, reject) => {
    image.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas is unavailable"));
        return;
      }
      context.scale(scale, scale);
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Failed to render image"));
    image.src = url;
  });

  URL.revokeObjectURL(url);
  const response = await fetch(dataUrl);
  triggerDownload(await response.blob(), filename);
}
