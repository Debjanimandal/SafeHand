import { createWorker, type Worker } from 'tesseract.js';

/**
 * ─── Local OCR engine ─────────────────────────────────────────────────────────
 *
 * Runs tesseract.js entirely inside the extension using assets bundled under
 * `public/tesseract/*` (worker, WASM core, English language data). Because every
 * asset is served from `chrome.runtime.getURL(...)`, no image data and no network
 * request ever leaves the user's machine — core to SafeHand's "data stays in safe
 * hands" guarantee.
 */

/** Resolve a bundled asset to its extension URL. */
function assetUrl(path: string): string {
  return chrome.runtime.getURL(`tesseract/${path}`);
}

let workerPromise: Promise<Worker> | null = null;

async function getWorker(onProgress?: (p: number) => void): Promise<Worker> {
  if (workerPromise) return workerPromise;

  workerPromise = createWorker('eng', 1, {
    workerPath: assetUrl('worker.min.js'),
    // tesseract.js appends the lang file name to langPath → <langPath>/eng.traineddata.gz
    langPath: assetUrl('lang'),
    // v6 LSTM core. tesseract.js auto-selects the SIMD build when supported.
    corePath: assetUrl(''),
    // CRITICAL for MV3: by default tesseract spawns the worker from a blob that does
    // `importScripts("<workerPath>")`, which the extension CSP blocks. Spawning the
    // worker directly from its extension URL avoids that and is allowed in MV3.
    workerBlobURL: false,
    // We ship a gzipped traineddata and keep it cached in memory.
    cacheMethod: 'none',
    logger: (m: { status: string; progress: number }) => {
      if (onProgress && typeof m.progress === 'number') {
        onProgress(m.progress);
      }
    },
    errorHandler: (err: unknown) => {
      // Surface worker-level failures (asset load, importScripts, wasm) to the console.
      console.error('[SafeHand OCR] worker error:', err);
    },
  }).catch((err) => {
    // Reset so a later attempt can retry a fresh worker.
    workerPromise = null;
    throw err;
  });

  return workerPromise;
}

export interface OcrResult {
  text: string;
  confidence: number;
}

/** Runs OCR over an image blob and returns the recognised text. */
export async function runOcr(image: Blob, onProgress?: (p: number) => void): Promise<OcrResult> {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(image);
  return { text: data.text ?? '', confidence: data.confidence ?? 0 };
}

/** Tears down the OCR worker and frees its memory. Call when the view unmounts. */
export async function terminateOcr(): Promise<void> {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch {
    // best-effort cleanup
  } finally {
    workerPromise = null;
  }
}
