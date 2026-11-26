
async function compressImageForAI(blob: Blob): Promise<string> {
  const MAX_IMAGE_BYTES = 300 * 1024;
  const MAX_DIMENSION = 1200;
  const objectUrl = URL.createObjectURL(blob);

  try {
    const img = new window.Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();

      img.onerror = () =>
        reject(
          new Error(
            "無法讀取圖片，請使用 JPG、PNG 或 WebP 照片。"
          )
        );

      img.src = objectUrl;
    });

    if (!img.width || !img.height) {
      throw new Error("圖片尺寸不正確。");
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("無法處理商品照片。");
    }

    const qualities = [
      0.88,
      0.80,
      0.72,
      0.64,
      0.56,
      0.48,
      0.40,
    ];

    let maxDimension = MAX_DIMENSION;

    for (let attempt = 0; attempt < 7; attempt++) {
      const scale = Math.min(
        1,
        maxDimension / Math.max(img.width, img.height)
      );

      canvas.width = Math.max(
        1,
        Math.round(img.width * scale)
      );

      canvas.height = Math.max(
        1,
        Math.round(img.height * scale)
      );

      ctx.fillStyle = "#FFFFFF";

      ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
      );

      for (const quality of qualities) {
        const result = canvas.toDataURL(
          "image/jpeg",
          quality
        );

        const prefix = "data:image/jpeg;base64,";

        if (!result.startsWith(prefix)) {
          continue;
        }

        const base64 = result.slice(prefix.length);

        const padding = base64.endsWith("==")
          ? 2
          : base64.endsWith("=")
            ? 1
            : 0;

        const byteLength =
          Math.floor(base64.length * 3 / 4) - padding;

        if (
          byteLength > 0 &&
          byteLength <= MAX_IMAGE_BYTES
        ) {
          return base64;
        }
      }

      maxDimension = Math.max(
        320,
        Math.floor(maxDimension * 0.85)
      );
    }

    throw new Error(
      "圖片無法壓縮至 300 KiB 以下，請更換商品照片。"
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
