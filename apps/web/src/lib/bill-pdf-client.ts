const PDFJS_NEED_PASSWORD = 1;

let pdfJsModulePromise: Promise<typeof import("pdfjs-dist")> | null = null;
let workerConfigured = false;

async function getPdfJs(): Promise<typeof import("pdfjs-dist")> {
  if (typeof window === "undefined") {
    throw new Error("PDF só está disponível no navegador.");
  }
  pdfJsModulePromise ??= import("pdfjs-dist");
  const pdfjs = await pdfJsModulePromise;
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    workerConfigured = true;
  }
  return pdfjs;
}

export function isPasswordException(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "PasswordException"
  );
}

export function passwordExceptionNeedsPassword(err: unknown): boolean {
  if (!isPasswordException(err)) return false;
  return (err as { code?: number }).code === PDFJS_NEED_PASSWORD;
}

const MAX_PDF_TEXT_PAGES = 20;

export async function extractPdfText(
  data: ArrayBuffer | Uint8Array,
  password?: string
): Promise<string> {
  const { getDocument } = await getPdfJs();
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const task = getDocument({
    data: u8.slice(),
    password,
    verbosity: 0,
  });
  const pdf = await task.promise;
  try {
    const n = Math.min(pdf.numPages, MAX_PDF_TEXT_PAGES);
    const chunks: string[] = [];
    for (let i = 1; i <= n; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const parts: string[] = [];
      for (const item of tc.items) {
        if (item && typeof item === "object" && "str" in item && typeof item.str === "string") {
          parts.push(item.str);
        }
      }
      const line = parts.join(" ").replace(/\s+/g, " ").trim();
      if (line) chunks.push(line);
    }
    return chunks.join("\n\n").trim();
  } finally {
    await pdf.cleanup();
  }
}

export function isBillPdfTextLayerUsable(text: string): boolean {
  const t = text.trim();
  if (t.length < 280) return false;
  const lower = t.toLowerCase();
  return (
    lower.includes("kwh") ||
    lower.includes("consumo") ||
    lower.includes("energia") ||
    lower.includes("fatura") ||
    lower.includes("conta de luz") ||
    lower.includes("distribuidora") ||
    lower.includes("cope")
  );
}

export async function openPdfWithPdfJs(
  data: ArrayBuffer | Uint8Array,
  password?: string
): Promise<void> {
  const { getDocument } = await getPdfJs();
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const task = getDocument({
    data: u8.slice(),
    password,
    verbosity: 0,
  });
  const pdf = await task.promise;
  await pdf.getPage(1);
  await pdf.cleanup();
}

export async function renderFirstPdfPageToPng(
  data: ArrayBuffer | Uint8Array,
  password?: string
): Promise<Uint8Array> {
  const { getDocument } = await getPdfJs();
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const task = getDocument({
    data: u8.slice(),
    password,
    verbosity: 0,
  });
  const pdf = await task.promise;
  try {
    const page = await pdf.getPage(1);
    const baseVp = page.getViewport({ scale: 1 });
    const maxSide = 2400;
    const scale = Math.min(2.2, maxSide / Math.max(baseVp.width, baseVp.height));
    const vp = page.getViewport({ scale });
    const w = Math.ceil(vp.width);
    const h = Math.ceil(vp.height);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D não disponível.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return await canvasToPngBytes(canvas);
  } finally {
    await pdf.cleanup();
  }
}

export async function tryCopyPdfWithoutEncryption(bytes: Uint8Array): Promise<Uint8Array | null> {
  const { PDFDocument } = await import("pdf-lib");
  try {
    let source: Awaited<ReturnType<typeof PDFDocument.load>>;
    try {
      source = await PDFDocument.load(bytes);
    } catch {
      source = await PDFDocument.load(bytes, { ignoreEncryption: true });
    }
    const out = await PDFDocument.create();
    const indices = source.getPageIndices();
    const copiedPages = await out.copyPages(source, indices);
    for (const page of copiedPages) {
      out.addPage(page);
    }
    return await out.save();
  } catch {
    return null;
  }
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("canvas.toBlob failed"));
        return;
      }
      void blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)));
    }, "image/png");
  });
}

async function countDarkPixelsPage1(
  data: Uint8Array,
  password: string | undefined
): Promise<number> {
  const { getDocument } = await getPdfJs();
  const task = getDocument({
    data: data.slice(),
    password,
    verbosity: 0,
  });
  const pdf = await task.promise;
  try {
    const page = await pdf.getPage(1);
    const baseVp = page.getViewport({ scale: 1 });
    const maxSide = 720;
    const fit = Math.min(1, maxSide / Math.max(baseVp.width, baseVp.height));
    const vp = page.getViewport({ scale: fit });
    const w = Math.ceil(vp.width);
    const h = Math.ceil(vp.height);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return 0;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const { data: img } = ctx.getImageData(0, 0, w, h);
    let dark = 0;
    for (let i = 0; i < img.length; i += 4) {
      const lum = 0.299 * img[i]! + 0.587 * img[i + 1]! + 0.114 * img[i + 2]!;
      if (lum < 248) dark++;
    }
    return dark;
  } finally {
    await pdf.cleanup();
  }
}

async function copiedPdfLostVisual(
  sourceBytes: Uint8Array,
  copiedBytes: Uint8Array,
  password?: string
): Promise<boolean> {
  const sourceDark = await countDarkPixelsPage1(sourceBytes, password);
  const copyDark = await countDarkPixelsPage1(copiedBytes, undefined);
  if (sourceDark < 40) return false;
  const threshold = Math.max(50, sourceDark * 0.12);
  return copyDark < threshold;
}

export async function rasterizePdfToNewPdf(
  data: Uint8Array,
  password?: string
): Promise<Uint8Array> {
  const { getDocument } = await getPdfJs();
  const { PDFDocument } = await import("pdf-lib");
  const task = getDocument({
    data: data.slice(),
    password,
    verbosity: 0,
  });
  const pdf = await task.promise;
  const out = await PDFDocument.create();
  const maxRasterSide = 2400;
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const baseVp = page.getViewport({ scale: 1 });
      const renderScale = Math.min(2, maxRasterSide / Math.max(baseVp.width, baseVp.height));
      const renderVp = page.getViewport({ scale: renderScale });
      const w = Math.ceil(renderVp.width);
      const h = Math.ceil(renderVp.height);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Canvas 2D não disponível.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
      const pngBytes = await canvasToPngBytes(canvas);
      const image = await out.embedPng(pngBytes);
      const pdfPage = out.addPage([baseVp.width, baseVp.height]);
      pdfPage.drawImage(image, {
        x: 0,
        y: 0,
        width: baseVp.width,
        height: baseVp.height,
      });
    }
  } finally {
    await pdf.cleanup();
  }
  return out.save();
}

export async function prepareUnencryptedBillPdf(
  bytes: Uint8Array,
  password?: string,
  onFallbackToRaster?: () => void
): Promise<Uint8Array | null> {
  const copied = await tryCopyPdfWithoutEncryption(bytes);
  if (copied && !(await copiedPdfLostVisual(bytes, copied, password))) {
    return copied;
  }
  onFallbackToRaster?.();
  try {
    return await rasterizePdfToNewPdf(bytes, password);
  } catch {
    return null;
  }
}

const UUID_LIKE_FILE_BASE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function unlockedBillImageUploadName(originalFileName: string): {
  uploadFileName: string;
  displayLabel: string;
} {
  const base = originalFileName.replace(/\.pdf$/i, "").trim() || "conta";
  if (UUID_LIKE_FILE_BASE.test(base)) {
    return {
      uploadFileName: "conta-luz-primeira-pagina.png",
      displayLabel: "Conta de luz (imagem da 1a pagina)",
    };
  }
  return {
    uploadFileName: `${base}-primeira-pagina.png`,
    displayLabel: `${base}-primeira-pagina.png`,
  };
}

function unlockedBillTextUploadName(originalFileName: string): {
  uploadFileName: string;
  displayLabel: string;
} {
  const base = originalFileName.replace(/\.pdf$/i, "").trim() || "conta";
  if (UUID_LIKE_FILE_BASE.test(base)) {
    return {
      uploadFileName: "conta-luz-texto.txt",
      displayLabel: "Conta de luz (texto extraído do PDF)",
    };
  }
  return {
    uploadFileName: `${base}-texto.txt`,
    displayLabel: `${base}-texto.txt`,
  };
}

export type PreparedPdfBillUpload = {
  file: File;
  mimeType: "text/plain" | "image/png";
  displayLabel: string;
};

export async function preparePdfBillFileForUpload(
  originalFileName: string,
  bytes: Uint8Array,
  pdfPassword?: string
): Promise<PreparedPdfBillUpload> {
  let pdfText: string;
  try {
    pdfText = await extractPdfText(bytes, pdfPassword);
  } catch {
    throw new Error(
      "Não foi possível ler o PDF. Exporte a conta sem senha ou envie uma imagem (JPG, PNG ou WEBP)."
    );
  }

  if (isBillPdfTextLayerUsable(pdfText)) {
    const blob = new Blob([pdfText], { type: "text/plain;charset=utf-8" });
    const { uploadFileName, displayLabel } = unlockedBillTextUploadName(originalFileName);
    return {
      file: new File([blob], uploadFileName, { type: "text/plain" }),
      mimeType: "text/plain",
      displayLabel,
    };
  }

  let pngBytes: Uint8Array;
  try {
    pngBytes = await renderFirstPdfPageToPng(bytes, pdfPassword);
  } catch {
    throw new Error(
      "Não foi possível converter o PDF. Exporte a conta sem senha ou envie uma imagem (JPG, PNG ou WEBP)."
    );
  }

  const pngBlob = new Blob([new Uint8Array(pngBytes)], { type: "image/png" });
  const { uploadFileName, displayLabel } = unlockedBillImageUploadName(originalFileName);
  return {
    file: new File([pngBlob], uploadFileName, { type: "image/png" }),
    mimeType: "image/png",
    displayLabel,
  };
}
