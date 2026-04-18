/**
 * Перед відправкою на ImgBB: зменшує довгу сторону та стискає JPEG,
 * щоб на сайті картинки відкривались швидше (менший файл на CDN).
 * PNG зберігає альфа-канал (скіни з прозорістю).
 */
const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.86;
/** Не чіпати вже легкі файли */
const SKIP_IF_UNDER_BYTES = 450_000;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

export async function prepareImageForImgbbUpload(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return readFileAsDataUrl(file);
  }

  let bmp: ImageBitmap | null = null;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    return readFileAsDataUrl(file);
  }

  try {
    const w = bmp.width;
    const h = bmp.height;
    const longest = Math.max(w, h);
    const scale = longest > MAX_SIDE ? MAX_SIDE / longest : 1;

    if (scale >= 1 && file.size < SKIP_IF_UNDER_BYTES) {
      return readFileAsDataUrl(file);
    }

    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return readFileAsDataUrl(file);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, tw, th);

    const isPng =
      file.type === "image/png" || /\.png$/i.test(file.name || "");

    if (isPng) {
      return canvas.toDataURL("image/png");
    }
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bmp.close();
  }
}
