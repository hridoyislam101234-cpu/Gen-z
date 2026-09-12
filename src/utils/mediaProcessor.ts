/**
 * Utility to detect and prepare media files for metadata generation:
 * - Images: JPG, JPEG, PNG, WEBP
 * - Vectors: SVG, EPS
 * - Videos: MP4, MOV
 * 
 * Provides snapshot frame extraction for videos and rasterization/thumbnailing for SVGs and EPS
 * so that Multimodal Vision models (Gemini / Mistral) receive crisp visual data.
 */

import * as UTIF from 'utif';

export type SupportedMediaKind = 'image' | 'vector' | 'video';

export interface ProcessedMedia {
  dataUrl: string;
  mimeType: string;
  mediaKind: SupportedMediaKind;
  dimensions?: { width: number; height: number };
  videoDuration?: number;
}

export function isSupportedMedia(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isImageExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  const isVectorExt = ['svg', 'eps'].includes(ext);
  const isVideoExt = ['mp4', 'mov', 'quicktime', 'm4v', 'webm'].includes(ext);

  return (
    isImageExt ||
    isVectorExt ||
    isVideoExt ||
    file.type.startsWith('image/') ||
    file.type.startsWith('video/') ||
    file.type === 'image/svg+xml'
  );
}

export function detectMediaKind(file: File): SupportedMediaKind {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'mov', 'm4v', 'webm'].includes(ext) || file.type.startsWith('video/')) {
    return 'video';
  }
  if (['svg', 'eps'].includes(ext) || file.type === 'image/svg+xml') {
    return 'vector';
  }
  return 'image';
}

/**
 * Extract a high-quality video snapshot frame (around 1.5s or 25% duration) from MP4 or MOV.
 */
export function extractVideoSnapshot(file: File): Promise<{
  dataUrl: string;
  dimensions: { width: number; height: number };
  duration: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    let hasLoadedData = false;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onloadedmetadata = () => {
      // Seek to 1.5s or 20% mark to avoid black intro frames
      const seekTime = Math.min(Math.max(video.duration * 0.2, 1.0), Math.max(video.duration - 0.5, 0));
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      if (hasLoadedData) return;
      hasLoadedData = true;

      try {
        const canvas = document.createElement('canvas');
        const maxDim = 1280;
        let width = video.videoWidth || 1280;
        let height = video.videoHeight || 720;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Could not get 2d canvas context for video'));
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const duration = video.duration || 0;

        cleanup();
        resolve({
          dataUrl,
          dimensions: { width, height },
          duration,
        });
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error(`Failed to load video file: ${file.name}`));
    };

    // 10s fallback timeout
    setTimeout(() => {
      if (!hasLoadedData) {
        cleanup();
        reject(new Error(`Video preview extraction timed out for ${file.name}`));
      }
    }, 10000);
  });
}

/**
 * Render an SVG to a high-resolution PNG data URL
 */
export function rasterizeSvg(file: File): Promise<{
  dataUrl: string;
  dimensions: { width: number; height: number };
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const svgText = reader.result as string;
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || 1000;
        const height = img.naturalHeight || 1000;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill crisp white background so transparent SVG shapes remain clearly visible to AI
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png', 0.95);
          URL.revokeObjectURL(url);
          resolve({
            dataUrl,
            dimensions: { width, height },
          });
        } else {
          URL.revokeObjectURL(url);
          resolve({
            dataUrl: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`,
            dimensions: { width, height },
          });
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Fallback: use raw SVG as data URL
        resolve({
          dataUrl: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`,
          dimensions: { width: 800, height: 800 },
        });
      };

      img.src = url;
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Parse an EPS file.
 * EPS files often contain an embedded TIFF or WMF preview or PostScript header,
 * or can be rendered on a graphic card or previewed with SVG fallback.
 * If text-based EPS (e.g. AI-generated vector), we extract bounding box and title comments,
 * and generate a high-contrast vector preview badge or attempt embedded preview extraction.
 */
export function processEpsFile(file: File): Promise<{
  dataUrl: string;
  dimensions: { width: number; height: number };
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);

      // Check for DOS EPS Binary Header: 0xC5D0D3C6
      // Header layout:
      // bytes 0-3: Magic (C5 D0 D3 C6)
      // bytes 4-7: PostScript start
      // bytes 8-11: PostScript length
      // bytes 20-23: TIFF/preview start
      // bytes 24-27: TIFF/preview length
      if (
        bytes.length > 30 &&
        bytes[0] === 0xc5 &&
        bytes[1] === 0xd0 &&
        bytes[2] === 0xd3 &&
        bytes[3] === 0xc6
      ) {
        const view = new DataView(buffer);
        const tiffOffset = view.getUint32(20, true);
        const tiffLength = view.getUint32(24, true);

        if (tiffOffset > 0 && tiffLength > 0 && tiffOffset + tiffLength <= bytes.length) {
          const tiffBytes = bytes.slice(tiffOffset, tiffOffset + tiffLength);
          try {
            const tiffBuffer = tiffBytes.buffer.slice(
              tiffBytes.byteOffset,
              tiffBytes.byteOffset + tiffBytes.byteLength
            );
            const ifds = UTIF.decode(tiffBuffer);
            if (ifds && ifds.length > 0) {
              UTIF.decodeImage(tiffBuffer, ifds[0]);
              const rgba = UTIF.toRGBA8(ifds[0]);
              const w = ifds[0].width;
              const h = ifds[0].height;
              if (w > 0 && h > 0 && rgba && rgba.length > 0) {
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  const imgData = ctx.createImageData(w, h);
                  imgData.data.set(rgba);
                  ctx.putImageData(imgData, 0, 0);
                  const dataUrl = canvas.toDataURL('image/png');
                  resolve({
                    dataUrl,
                    dimensions: { width: w, height: h },
                  });
                  return;
                }
              }
            }
          } catch (utifErr) {
            console.warn('UTIF failed to decode embedded EPS TIFF thumbnail:', utifErr);
          }
        }
      }

      // Generate a rich, descriptive EPS Vector Card thumbnail for AI comprehension
      // Read header string to extract comments like %%Title, %%Creator, %%BoundingBox
      let headerStr = '';
      try {
        const decoder = new TextDecoder('latin1');
        headerStr = decoder.decode(bytes.slice(0, Math.min(bytes.length, 4096)));
      } catch {
        headerStr = '';
      }

      const titleMatch = headerStr.match(/%%Title:\s*([^\r\n]+)/i);
      const creatorMatch = headerStr.match(/%%Creator:\s*([^\r\n]+)/i);
      const bboxMatch = headerStr.match(/%%BoundingBox:\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i);

      const epsTitle = titleMatch ? titleMatch[1].trim() : file.name.replace(/\.eps$/i, '');
      const epsCreator = creatorMatch ? creatorMatch[1].trim() : 'Vector Graphic EPS';
      const width = bboxMatch ? parseInt(bboxMatch[3], 10) - parseInt(bboxMatch[1], 10) : 1000;
      const height = bboxMatch ? parseInt(bboxMatch[4], 10) - parseInt(bboxMatch[2], 10) : 1000;

      // Create a visual canvas card representing the EPS Vector file
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 800;
      const ctx = canvas.getContext('2d')!;

      // Background grid
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 1000, 800);

      // Subtle isometric grid lines
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let i = 0; i < 1000; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 800);
        ctx.stroke();
      }
      for (let j = 0; j < 800; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(1000, j);
        ctx.stroke();
      }

      // Center vector container
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(150, 120, 700, 560, 24);
      ctx.fill();
      ctx.stroke();

      // Top EPS badge
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(420, 160, 160, 48, 12);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EPS VECTOR', 500, 193);

      // Vector Illustration Icon (Bezier Curve / Pen Tool visual)
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(320, 360);
      ctx.bezierCurveTo(400, 240, 600, 480, 680, 360);
      ctx.stroke();

      // Anchor points
      const drawAnchor = (x: number, y: number) => {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.fillRect(x - 8, y - 8, 16, 16);
        ctx.strokeRect(x - 8, y - 8, 16, 16);
      };
      drawAnchor(320, 360);
      drawAnchor(680, 360);
      drawAnchor(500, 360);

      // File Details
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      const cleanName = file.name.length > 35 ? file.name.substring(0, 32) + '...' : file.name;
      ctx.fillText(cleanName, 500, 470);

      ctx.fillStyle = '#64748b';
      ctx.font = '20px sans-serif';
      ctx.fillText(epsTitle !== file.name ? `Title: ${epsTitle}` : `Vector Illustrator Format`, 500, 520);
      ctx.fillText(`Creator: ${epsCreator} • Size: ${(file.size / 1024).toFixed(0)} KB`, 500, 560);

      const dataUrl = canvas.toDataURL('image/png', 0.95);
      resolve({
        dataUrl,
        dimensions: { width: Math.max(width, 600), height: Math.max(height, 600) },
      });
    };

    reader.onerror = () => {
      // Emergency simple canvas fallback
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(file.name, 400, 300);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        dimensions: { width: 800, height: 600 },
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Universal media processor: transforms images, vectors (EPS, SVG), and videos (MP4, MOV)
 * into a valid base64 dataUrl and dimensions ready for AI vision analysis.
 */
export async function processMediaFile(file: File): Promise<ProcessedMedia> {
  const mediaKind = detectMediaKind(file);
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (mediaKind === 'video') {
    try {
      const snap = await extractVideoSnapshot(file);
      return {
        dataUrl: snap.dataUrl,
        mimeType: 'image/jpeg',
        mediaKind: 'video',
        dimensions: snap.dimensions,
        videoDuration: snap.duration,
      };
    } catch (err) {
      console.warn('Video frame capture failed, generating visual video card:', err);
      // Fallback video card
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Video Footage: ${file.name}`, 640, 360);
      return {
        dataUrl: canvas.toDataURL('image/jpeg', 0.9),
        mimeType: 'image/jpeg',
        mediaKind: 'video',
        dimensions: { width: 1280, height: 720 },
      };
    }
  }

  if (ext === 'svg' || file.type === 'image/svg+xml') {
    const svgRes = await rasterizeSvg(file);
    return {
      dataUrl: svgRes.dataUrl,
      mimeType: 'image/png',
      mediaKind: 'vector',
      dimensions: svgRes.dimensions,
    };
  }

  if (ext === 'eps') {
    const epsRes = await processEpsFile(file);
    return {
      dataUrl: epsRes.dataUrl,
      mimeType: 'image/png',
      mediaKind: 'vector',
      dimensions: epsRes.dimensions,
    };
  }

  // Standard images (JPG, JPEG, PNG, WEBP)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          dataUrl,
          mimeType: file.type || 'image/jpeg',
          mediaKind: 'image',
          dimensions: { width: img.width, height: img.height },
        });
      };
      img.onerror = () => {
        resolve({
          dataUrl,
          mimeType: file.type || 'image/jpeg',
          mediaKind: 'image',
          dimensions: { width: 1000, height: 1000 },
        });
      };
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Ensures a data URL string is a base64 encoded string, not a blob: URL.
 * If a blob: URL is received, it resolves it into a base64 Data URL.
 */
export async function ensureBase64DataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.startsWith('blob:') || url.startsWith('http')) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('Failed to convert blob URL to base64:', err);
    }
  }
  return url;
}

