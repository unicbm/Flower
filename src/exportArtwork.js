function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 1200);
}

export function downloadSvg(svgMarkup, filename) {
  triggerDownload(
    new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }),
    filename,
  );
}

function createBlobFromCanvas(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to export canvas"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function downloadPng(svgMarkup, filename, width, height, options = {}) {
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();
  image.decoding = "async";
  const scale = Math.max(1, Number(options.scale) || 2);

  const pngBlob = await new Promise((resolve, reject) => {
    image.onload = () => {
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
      createBlobFromCanvas(canvas)
        .then((blob) => {
          canvas.width = 0;
          canvas.height = 0;
          resolve(blob);
        })
        .catch(reject);
    };
    image.onerror = () => reject(new Error("Failed to render image"));
    image.src = url;
  });

  URL.revokeObjectURL(url);
  image.src = "";
  triggerDownload(pngBlob, filename);
}
