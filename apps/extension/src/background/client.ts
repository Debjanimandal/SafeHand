/**
 * Typed bridge to the Proofly background service worker.
 * All popup UI and views should use this instead of calling
 * chrome.runtime.sendMessage directly.
 */
export async function runtimeRequest<T = void>(type: string, payload?: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response?.ok) {
        reject(new Error(response?.error?.message ?? 'Unknown runtime error.'));
        return;
      }

      resolve(response.result as T);
    });
  });
}
