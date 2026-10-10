import { bytesToHex, type Hex } from 'viem';

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

export async function recordAudioHash3s(): Promise<Hex> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  try {
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    const result = await new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => reject(new Error('Media recorder failed.'));
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));

      recorder.start();
      setTimeout(() => recorder.stop(), 3000);
    });

    const buffer = await blobToArrayBuffer(result);
    const digest = await crypto.subtle.digest('SHA-256', buffer);

    return bytesToHex(new Uint8Array(digest));
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}
