/**
 * Utility to rename files and embed metadata (Title, Description, Keywords)
 * into image/video files (JPG, PNG, WEBP, SVG, EPS, MP4, MOV).
 */

import JSZip from 'jszip';
import piexif from 'piexifjs';
import { ImageItem } from '../types';

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Clean and sanitize filename for OS compatibility (Windows, Mac, Linux).
 * Removes invalid characters: \ / : * ? " < > |
 */
export function sanitizeFilename(title: string, originalFilename: string): string {
  const ext = originalFilename.includes('.')
    ? '.' + originalFilename.split('.').pop()!
    : '';
  
  // Base name candidate
  let cleanName = (title || originalFilename.replace(/\.[^/.]+$/, ''))
    .trim()
    .replace(/[\\/:*?"<>|\r\n\t]/g, ' ') // replace illegal characters with space
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .trim();

  // Strip trailing periods or spaces
  cleanName = cleanName.replace(/[. ]+$/, '');

  // If empty after cleaning, fallback to original name without ext
  if (!cleanName) {
    cleanName = originalFilename.replace(/\.[^/.]+$/, '') || 'Untitled';
  }

  // Cap at 180 chars to avoid OS path length limits
  if (cleanName.length > 180) {
    cleanName = cleanName.substring(0, 180).trim();
  }

  return `${cleanName}${ext}`;
}

/**
 * Generate standard Adobe XMP RDF metadata packet.
 */
function createXmpPacket(title: string, description: string, keywords: string[]): string {
  const safeTitle = escapeXml(title);
  const safeDesc = escapeXml(description);
  const keywordItems = keywords
    .filter(Boolean)
    .map((k) => `        <rdf:li>${escapeXml(k.trim())}</rdf:li>`)
    .join('\n');

  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21        ">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
        xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${safeTitle}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${safeDesc}</rdf:li>
        </rdf:Alt>
      </dc:description>
      <dc:subject>
        <rdf:Bag>
${keywordItems}
        </rdf:Bag>
      </dc:subject>
      <photoshop:Headline>${safeTitle}</photoshop:Headline>
      <photoshop:CaptionWriter>Gen-z Ai Studio</photoshop:CaptionWriter>
      <xmp:CreateDate>${new Date().toISOString()}</xmp:CreateDate>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

// CRC32 table for PNG chunk generation
const crcTable: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Helper to encode string into UCS-2 / UTF-16LE byte array for Windows XP tags.
 */
function toUCS2Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes.push(code & 0xff, (code >> 8) & 0xff);
  }
  bytes.push(0, 0); // null terminator
  return bytes;
}

/**
 * Inject EXIF metadata tags into JPEG bytes, specifically setting Windows Explorer
 * "Subject" (XPSubject tag 0x9c9f / 40095), "Title" (XPTitle tag 0x9c9b / 40091),
 * "Tags" (XPKeywords tag 0x9c9e / 40094), "Comments" (XPComment tag 0x9c9c / 40092),
 * and standard ImageDescription (tag 0x010e / 270).
 */
function injectExifMetadata(bytes: Uint8Array, title: string, description: string, keywords: string[]): Uint8Array {
  try {
    const len = bytes.length;
    let binary = '';
    const CHUNK_SIZE = 65536;
    for (let i = 0; i < len; i += CHUNK_SIZE) {
      const slice = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
      binary += String.fromCharCode.apply(null, Array.from(slice));
    }

    let exifObj: any;
    try {
      exifObj = piexif.load(binary);
    } catch {
      exifObj = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {}, thumbnail: null };
    }
    if (!exifObj || typeof exifObj !== 'object') {
      exifObj = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {}, thumbnail: null };
    }
    exifObj['0th'] = exifObj['0th'] || {};

    // XPTitle (40091) -> Windows Explorer Details "Title"
    exifObj['0th'][40091] = toUCS2Bytes(title);
    // XPSubject (40095) -> Windows Explorer Details "Subject" (populated with Description)
    exifObj['0th'][40095] = toUCS2Bytes(description);
    // XPKeywords (40094) -> Windows Explorer Details "Tags"
    exifObj['0th'][40094] = toUCS2Bytes(keywords.join('; '));
    // XPComment (40092) -> Windows Explorer Details "Comments"
    exifObj['0th'][40092] = toUCS2Bytes(description);
    // ImageDescription (270) -> Standard EXIF description
    exifObj['0th'][270] = description || title;

    const exifStr = piexif.dump(exifObj);
    const withExifBinary = piexif.insert(exifStr, binary);

    const outBytes = new Uint8Array(withExifBinary.length);
    for (let i = 0; i < withExifBinary.length; i++) {
      outBytes[i] = withExifBinary.charCodeAt(i);
    }
    return outBytes;
  } catch (err) {
    console.warn('Could not inject EXIF metadata, using original bytes:', err);
    return bytes;
  }
}

/**
 * Generate standard IPTC-NAA Photoshop APP13 segment (0xFF 0xED).
 * Contains:
 * - 2:05 (ObjectName): Title
 * - 2:105 (Headline): Title
 * - 2:120 (Caption/Abstract): Description (Subject)
 * - 2:25 (Keywords): Keywords list
 */
function createIptcSegment(title: string, description: string, keywords: string[]): Uint8Array {
  try {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];

    const addDataset = (record: number, dataset: number, str: string) => {
      const b = encoder.encode(str);
      const header = new Uint8Array([0x1c, record, dataset, (b.length >> 8) & 0xff, b.length & 0xff]);
      chunks.push(header, b);
    };

    // UTF-8 indicator (Record 1, Dataset 90: \x1b%G)
    chunks.push(new Uint8Array([0x1c, 1, 90, 0, 3, 0x1b, 0x25, 0x47]));

    if (title) addDataset(2, 5, title);
    if (title) addDataset(2, 105, title);
    if (description) addDataset(2, 120, description);
    for (const kw of keywords) {
      if (kw && kw.trim()) addDataset(2, 25, kw.trim());
    }

    const totalIptcLen = chunks.reduce((acc, c) => acc + c.length, 0);
    const iptcBytes = new Uint8Array(totalIptcLen);
    let offset = 0;
    for (const c of chunks) {
      iptcBytes.set(c, offset);
      offset += c.length;
    }

    const pad = totalIptcLen % 2 !== 0 ? 1 : 0;
    const bimHeader = new Uint8Array([
      0x38, 0x42, 0x49, 0x4d, // "8BIM"
      0x04, 0x04,             // IPTC-NAA
      0x00, 0x00,             // Name (empty string, 2 bytes)
      (totalIptcLen >> 24) & 0xff,
      (totalIptcLen >> 16) & 0xff,
      (totalIptcLen >> 8) & 0xff,
      totalIptcLen & 0xff,
    ]);

    const psHeader = encoder.encode('Photoshop 3.0\0');
    const payloadLen = psHeader.length + bimHeader.length + totalIptcLen + pad;
    const markerLen = payloadLen + 2;

    const app13 = new Uint8Array(4 + payloadLen);
    app13[0] = 0xff;
    app13[1] = 0xed; // APP13
    app13[2] = (markerLen >> 8) & 0xff;
    app13[3] = markerLen & 0xff;
    app13.set(psHeader, 4);
    app13.set(bimHeader, 4 + psHeader.length);
    app13.set(iptcBytes, 4 + psHeader.length + bimHeader.length);

    return app13;
  } catch (err) {
    console.warn('Could not generate IPTC segment:', err);
    return new Uint8Array(0);
  }
}

/**
 * Embed metadata into JPEG file using EXIF (including XPSubject = description for Windows Details),
 * IPTC-NAA segment (2:120 = description), and Adobe XMP APP1 segment.
 */
function embedJpegMetadata(bytes: Uint8Array, title: string, description: string, keywords: string[]): Uint8Array {
  // Verify SOI marker (FF D8)
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return bytes;
  }

  // 1. Inject EXIF tags (including XPSubject = description for Windows Explorer Details tab)
  const withExifBytes = injectExifMetadata(bytes, title, description, keywords);

  // 2. Prepare XMP APP1 segment
  const xmpPacket = createXmpPacket(title, description, keywords);
  const xmpBytes = new TextEncoder().encode(xmpPacket);
  const ns = 'http://ns.adobe.com/xap/1.0/\0';
  const nsBytes = new TextEncoder().encode(ns);

  const payloadLength = nsBytes.length + xmpBytes.length;
  const markerLength = payloadLength + 2; // includes 2 bytes length itself

  const app1Header = new Uint8Array(4 + nsBytes.length);
  app1Header[0] = 0xff;
  app1Header[1] = 0xe1; // APP1 marker
  app1Header[2] = (markerLength >> 8) & 0xff;
  app1Header[3] = markerLength & 0xff;
  app1Header.set(nsBytes, 4);

  // 3. Prepare IPTC APP13 segment
  const iptcSegment = createIptcSegment(title, description, keywords);

  const cleanParts: Uint8Array[] = [];
  let offset = 2; // after FF D8
  cleanParts.push(withExifBytes.subarray(0, 2));

  let injectedXmpAndIptc = false;

  // Scan remaining segments, skip old XMP APP1 and old IPTC APP13, and place new ones
  while (offset < withExifBytes.length) {
    if (withExifBytes[offset] !== 0xff) {
      if (!injectedXmpAndIptc) {
        cleanParts.push(app1Header);
        cleanParts.push(xmpBytes);
        if (iptcSegment.length > 0) cleanParts.push(iptcSegment);
        injectedXmpAndIptc = true;
      }
      cleanParts.push(withExifBytes.subarray(offset));
      break;
    }

    const marker = withExifBytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) {
      // SOS (Start of Scan) or EOI: inject XMP and IPTC if not already done, then copy rest
      if (!injectedXmpAndIptc) {
        cleanParts.push(app1Header);
        cleanParts.push(xmpBytes);
        if (iptcSegment.length > 0) cleanParts.push(iptcSegment);
        injectedXmpAndIptc = true;
      }
      cleanParts.push(withExifBytes.subarray(offset));
      break;
    }

    // Read segment length
    if (offset + 4 > withExifBytes.length) {
      cleanParts.push(withExifBytes.subarray(offset));
      break;
    }

    const segLength = (withExifBytes[offset + 2] << 8) | withExifBytes[offset + 3];
    const segEnd = offset + 2 + segLength;

    // Skip old XMP segment if present
    if (marker === 0xe1 && segLength >= 31) {
      const checkNs = new TextDecoder('latin1').decode(withExifBytes.subarray(offset + 4, offset + 4 + ns.length));
      if (checkNs === ns) {
        offset = segEnd;
        continue;
      }
    }

    // Skip old IPTC segment if present
    if (marker === 0xed && segLength >= 18) {
      const checkPs = new TextDecoder('latin1').decode(withExifBytes.subarray(offset + 4, offset + 4 + 14));
      if (checkPs.startsWith('Photoshop 3.0')) {
        offset = segEnd;
        continue;
      }
    }

    cleanParts.push(withExifBytes.subarray(offset, Math.min(segEnd, withExifBytes.length)));
    offset = segEnd;

    // Place XMP & IPTC segments immediately after EXIF (0xE1) or JFIF (0xE0)
    if (!injectedXmpAndIptc && (marker === 0xe1 || marker === 0xe0)) {
      cleanParts.push(app1Header);
      cleanParts.push(xmpBytes);
      if (iptcSegment.length > 0) cleanParts.push(iptcSegment);
      injectedXmpAndIptc = true;
    }
  }

  // Combine parts into final Uint8Array
  const totalLen = cleanParts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const part of cleanParts) {
    result.set(part, pos);
    pos += part.length;
  }
  return result;
}

/**
 * Embed metadata into PNG file using standard iTXt / tEXt chunks.
 */
function embedPngMetadata(bytes: Uint8Array, title: string, description: string, keywords: string[]): Uint8Array {
  // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;

  if (!isPng) return bytes;

  // Build text chunks: Title, Description, Keywords
  const makeTextChunk = (key: string, value: string): Uint8Array => {
    const keyBytes = new TextEncoder().encode(key);
    const valBytes = new TextEncoder().encode(value);
    const dataLen = keyBytes.length + 1 + valBytes.length; // key + null + value
    const chunk = new Uint8Array(8 + dataLen + 4);
    const view = new DataView(chunk.buffer);

    view.setUint32(0, dataLen, false); // Length
    chunk[4] = 0x74; chunk[5] = 0x45; chunk[6] = 0x58; chunk[7] = 0x74; // 'tEXt'
    chunk.set(keyBytes, 8);
    chunk[8 + keyBytes.length] = 0; // null separator
    chunk.set(valBytes, 8 + keyBytes.length + 1);

    // CRC covers type + data
    const crcVal = crc32(chunk.subarray(4, 8 + dataLen));
    view.setUint32(8 + dataLen, crcVal, false);
    return chunk;
  };

  // Build XMP iTXt chunk
  const makeXmpItxtChunk = (): Uint8Array => {
    const key = 'XML:com.adobe.xmp';
    const keyBytes = new TextEncoder().encode(key);
    const xmpText = createXmpPacket(title, description, keywords);
    const xmpBytes = new TextEncoder().encode(xmpText);

    // iTXt structure: key + null + compFlag(0) + compMethod(0) + langTag null + transKey null + text
    const extraHeader = new Uint8Array([0, 0, 0, 0, 0]); // null + flags + empty lang + empty transKey
    const dataLen = keyBytes.length + extraHeader.length + xmpBytes.length;
    const chunk = new Uint8Array(8 + dataLen + 4);
    const view = new DataView(chunk.buffer);

    view.setUint32(0, dataLen, false);
    chunk[4] = 0x69; chunk[5] = 0x54; chunk[6] = 0x58; chunk[7] = 0x74; // 'iTXt'
    let ptr = 8;
    chunk.set(keyBytes, ptr);
    ptr += keyBytes.length;
    chunk.set(extraHeader, ptr);
    ptr += extraHeader.length;
    chunk.set(xmpBytes, ptr);
    ptr += xmpBytes.length;

    const crcVal = crc32(chunk.subarray(4, 8 + dataLen));
    view.setUint32(ptr, crcVal, false);
    return chunk;
  };

  const titleChunk = makeTextChunk('Title', title);
  const descChunk = makeTextChunk('Description', description);
  const subjChunk = makeTextChunk('Subject', description);
  const kwChunk = makeTextChunk('Keywords', keywords.join(', '));
  const xmpChunk = makeXmpItxtChunk();

  // Find position after IHDR chunk (typically bytes 8..33)
  let insertPos = 8;
  if (bytes.length > 33) {
    const ihdrLen = (bytes[8] << 24) | (bytes[9] << 16) | (bytes[10] << 8) | bytes[11];
    insertPos = 8 + 4 + 4 + ihdrLen + 4; // after IHDR chunk
  }

  const parts = [
    bytes.subarray(0, insertPos),
    titleChunk,
    descChunk,
    subjChunk,
    kwChunk,
    xmpChunk,
    bytes.subarray(insertPos),
  ];

  const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLen);
  let cur = 0;
  for (const part of parts) {
    result.set(part, cur);
    cur += part.length;
  }
  return result;
}

/**
 * Embed metadata into SVG file.
 */
function embedSvgMetadata(text: string, title: string, description: string, keywords: string[]): string {
  const safeTitle = escapeXml(title);
  const safeDesc = escapeXml(description);
  const xmpPacket = createXmpPacket(title, description, keywords);

  const metaXml = `
  <title>${safeTitle}</title>
  <desc>${safeDesc}</desc>
  <metadata>
    ${xmpPacket}
  </metadata>
`;

  // Inject right after opening <svg ...> tag
  if (/<svg[^>]*>/i.test(text)) {
    return text.replace(/(<svg[^>]*>)/i, `$1${metaXml}`);
  }
  return metaXml + text;
}

function findFirstLineEnd(bytes: Uint8Array): number {
  for (let i = 0; i < Math.min(bytes.length, 512); i++) {
    if (bytes[i] === 0x0a) {
      return i + 1;
    }
    if (bytes[i] === 0x0d) {
      if (i + 1 < bytes.length && bytes[i + 1] === 0x0a) {
        return i + 2;
      }
      return i + 1;
    }
  }
  return -1;
}

function modifyPostScriptBytes(
  psBytes: Uint8Array,
  title: string,
  description: string,
  keywords: string[]
): Uint8Array {
  // Using Latin-1 decode so each character index in psText maps 1:1 to byte offset in psBytes
  const psText = new TextDecoder('latin1').decode(psBytes);

  const safeTitle = title.replace(/[\r\n\x00-\x1F]+/g, ' ').trim();
  const safeDesc = description.replace(/[\r\n\x00-\x1F]+/g, ' ').trim();
  const safeKeywords = keywords.map((k) => k.trim()).filter(Boolean).join(', ').replace(/[\r\n\x00-\x1F]+/g, ' ');
  const xmpPacket = createXmpPacket(title, description, keywords);
  const xmpBytes = new TextEncoder().encode(xmpPacket);

  // Check for existing XMP packet
  let xmpStart = -1;
  let xmpEnd = -1;

  const beginXmpIdx = psText.indexOf('%BeginXMP:');
  if (beginXmpIdx !== -1) {
    const endXmpIdx = psText.indexOf('%EndXMP', beginXmpIdx);
    if (endXmpIdx !== -1) {
      xmpStart = beginXmpIdx;
      xmpEnd = endXmpIdx + '%EndXMP'.length;
      if (psText.slice(xmpEnd, xmpEnd + 2) === '\r\n') {
        xmpEnd += 2;
      } else if (psText.charAt(xmpEnd) === '\n' || psText.charAt(xmpEnd) === '\r') {
        xmpEnd += 1;
      }
    }
  }

  if (xmpStart === -1) {
    const xpacketStart = psText.indexOf('<?xpacket begin');
    if (xpacketStart !== -1) {
      const xpacketEnd = psText.indexOf('<?xpacket end', xpacketStart);
      if (xpacketEnd !== -1) {
        const closeIdx = psText.indexOf('?>', xpacketEnd);
        if (closeIdx !== -1) {
          xmpStart = xpacketStart;
          xmpEnd = closeIdx + 2;
          if (psText.slice(xmpEnd, xmpEnd + 2) === '\r\n') {
            xmpEnd += 2;
          } else if (psText.charAt(xmpEnd) === '\n' || psText.charAt(xmpEnd) === '\r') {
            xmpEnd += 1;
          }
        }
      }
    }
  }

  // Construct standard Adobe XMP block bytes
  const xmpHeaderBytes = new TextEncoder().encode('%BeginXMP:\n');
  const xmpFooterBytes = new TextEncoder().encode('\n%EndXMP\n');
  const newXmpBlockBytes = new Uint8Array(
    xmpHeaderBytes.length + xmpBytes.length + xmpFooterBytes.length
  );
  newXmpBlockBytes.set(xmpHeaderBytes, 0);
  newXmpBlockBytes.set(xmpBytes, xmpHeaderBytes.length);
  newXmpBlockBytes.set(xmpFooterBytes, xmpHeaderBytes.length + xmpBytes.length);

  // Construct DSC comments
  const dscCommentsText = `%%Title: ${safeTitle}\n%%Subject: ${safeDesc}\n%%Keywords: ${safeKeywords}\n%%Description: ${safeDesc}\n`;
  const dscCommentsBytes = new TextEncoder().encode(dscCommentsText);

  if (xmpStart !== -1 && xmpEnd !== -1) {
    // Replace existing XMP block
    const beforeXmpBytes = psBytes.slice(0, xmpStart);
    const afterXmpBytes = psBytes.slice(xmpEnd);

    // Update DSC comments in the prefix if present
    let beforeText = psText.slice(0, xmpStart);
    let dscUpdated = false;
    if (beforeText.includes('%%Title:')) {
      beforeText = beforeText.replace(/%%Title:[^\r\n]*/g, `%%Title: ${safeTitle}`);
      beforeText = beforeText.replace(/%%Subject:[^\r\n]*/g, `%%Subject: ${safeDesc}`);
      beforeText = beforeText.replace(/%%Keywords:[^\r\n]*/g, `%%Keywords: ${safeKeywords}`);
      beforeText = beforeText.replace(/%%Description:[^\r\n]*/g, `%%Description: ${safeDesc}`);
      dscUpdated = true;
    }

    let finalBeforeBytes: Uint8Array;
    if (dscUpdated) {
      finalBeforeBytes = new Uint8Array(beforeText.length);
      for (let i = 0; i < beforeText.length; i++) {
        finalBeforeBytes[i] = beforeText.charCodeAt(i) & 0xff;
      }
    } else {
      const firstLineEnd = findFirstLineEnd(beforeXmpBytes);
      if (firstLineEnd !== -1) {
        const head = beforeXmpBytes.slice(0, firstLineEnd);
        const tail = beforeXmpBytes.slice(firstLineEnd);
        finalBeforeBytes = new Uint8Array(head.length + dscCommentsBytes.length + tail.length);
        finalBeforeBytes.set(head, 0);
        finalBeforeBytes.set(dscCommentsBytes, head.length);
        finalBeforeBytes.set(tail, head.length + dscCommentsBytes.length);
      } else {
        finalBeforeBytes = beforeXmpBytes;
      }
    }

    const totalLen = finalBeforeBytes.length + newXmpBlockBytes.length + afterXmpBytes.length;
    const result = new Uint8Array(totalLen);
    result.set(finalBeforeBytes, 0);
    result.set(newXmpBlockBytes, finalBeforeBytes.length);
    result.set(afterXmpBytes, finalBeforeBytes.length + newXmpBlockBytes.length);
    return result;
  } else {
    // No existing XMP: insert DSC comments and XMP block after first line
    const firstLineEnd = findFirstLineEnd(psBytes);
    const insertPos = firstLineEnd !== -1 ? firstLineEnd : 0;

    const head = psBytes.slice(0, insertPos);
    const tail = psBytes.slice(insertPos);

    const insertion = new Uint8Array(dscCommentsBytes.length + newXmpBlockBytes.length);
    insertion.set(dscCommentsBytes, 0);
    insertion.set(newXmpBlockBytes, dscCommentsBytes.length);

    const totalLen = head.length + insertion.length + tail.length;
    const result = new Uint8Array(totalLen);
    result.set(head, 0);
    result.set(insertion, head.length);
    result.set(tail, head.length + insertion.length);
    return result;
  }
}

/**
 * Embed metadata into EPS file.
 * Handles both standard ASCII PostScript EPS and DOS EPS Binary Header (0xC5D0D3C6) formats.
 * Preserves raw binary TIFF/WMF preview thumbnails and updates header byte offsets without corruption.
 */
function embedEpsMetadata(bytes: Uint8Array, title: string, description: string, keywords: string[]): Uint8Array {
  try {
    // Check for DOS EPS Binary Header: 0xC5 0xD0 0xD3 0xC6
    const isDosEps =
      bytes.length >= 30 &&
      bytes[0] === 0xc5 &&
      bytes[1] === 0xd0 &&
      bytes[2] === 0xd3 &&
      bytes[3] === 0xc6;

    if (!isDosEps) {
      // Pure ASCII PostScript EPS
      return modifyPostScriptBytes(bytes, title, description, keywords);
    }

    // DOS EPS Binary Header layout:
    // bytes 0-3: Magic (C5 D0 D3 C6)
    // bytes 4-7: PostScript start (uint32 LE)
    // bytes 8-11: PostScript length (uint32 LE)
    // bytes 12-15: WMF start (uint32 LE)
    // bytes 16-19: WMF length (uint32 LE)
    // bytes 20-23: TIFF start (uint32 LE)
    // bytes 24-27: TIFF length (uint32 LE)
    // bytes 28-29: Checksum (uint16 LE)
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const psStart = view.getUint32(4, true);
    const psLen = view.getUint32(8, true);
    const wmfStart = view.getUint32(12, true);
    const wmfLen = view.getUint32(16, true);
    const tiffStart = view.getUint32(20, true);
    const tiffLen = view.getUint32(24, true);

    if (psStart < 30 || psStart >= bytes.length) {
      return modifyPostScriptBytes(bytes, title, description, keywords);
    }

    const actualPsLen = Math.min(psLen, bytes.length - psStart);
    const psBytes = bytes.slice(psStart, psStart + actualPsLen);

    const newPsBytes = modifyPostScriptBytes(psBytes, title, description, keywords);
    const delta = newPsBytes.length - actualPsLen;

    // Clone header bytes up to psStart (preserving any padding bytes between 30 and psStart)
    const headerBytes = new Uint8Array(bytes.slice(0, psStart));
    const headerView = new DataView(headerBytes.buffer, headerBytes.byteOffset, headerBytes.byteLength);

    // Update PostScript length
    headerView.setUint32(8, newPsBytes.length, true);

    // Update WMF offset if preview is positioned after PostScript section
    if (wmfLen > 0 && wmfStart >= psStart + actualPsLen) {
      headerView.setUint32(12, wmfStart + delta, true);
    }

    // Update TIFF offset if preview is positioned after PostScript section
    if (tiffLen > 0 && tiffStart >= psStart + actualPsLen) {
      headerView.setUint32(20, tiffStart + delta, true);
    }

    // Adobe EPS spec: 0xFFFF indicates checksum is not verified
    headerView.setUint16(28, 0xffff, true);

    // Raw remaining bytes (e.g. TIFF preview thumbnail) preserved completely without byte distortion
    const restBytes = bytes.slice(psStart + actualPsLen);

    const result = new Uint8Array(headerBytes.length + newPsBytes.length + restBytes.length);
    result.set(headerBytes, 0);
    result.set(newPsBytes, headerBytes.length);
    result.set(restBytes, headerBytes.length + newPsBytes.length);

    return result;
  } catch (err) {
    console.warn('Error embedding metadata into EPS file, returning original bytes:', err);
    return bytes;
  }
}

/**
 * Embed metadata into WebP file (adds XMP RIFF chunk).
 */
function embedWebpMetadata(bytes: Uint8Array, title: string, description: string, keywords: string[]): Uint8Array {
  // Check RIFF and WEBP signatures
  if (
    bytes.length < 12 ||
    bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46 ||
    bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50
  ) {
    return bytes;
  }

  const xmpText = createXmpPacket(title, description, keywords);
  const xmpBytes = new TextEncoder().encode(xmpText);

  // XMP chunk header: 'XMP ' + 4 bytes little-endian length
  const padByte = xmpBytes.length % 2 !== 0 ? 1 : 0;
  const chunkHeader = new Uint8Array(8);
  chunkHeader[0] = 0x58; chunkHeader[1] = 0x4d; chunkHeader[2] = 0x50; chunkHeader[3] = 0x20; // 'XMP '
  const view = new DataView(chunkHeader.buffer);
  view.setUint32(4, xmpBytes.length, true);

  const parts = [
    bytes,
    chunkHeader,
    xmpBytes,
    padByte ? new Uint8Array([0]) : new Uint8Array(0),
  ];

  const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLen);
  let cur = 0;
  for (const part of parts) {
    result.set(part, cur);
    cur += part.length;
  }

  // Update total RIFF size in result (bytes 4..7)
  const newRiffSize = totalLen - 8;
  const resView = new DataView(result.buffer);
  resView.setUint32(4, newRiffSize, true);

  return result;
}

/**
 * Create an MP4 tag box inside ilst.
 */
function createIlstTagBox(fourCC: string, text: string): Uint8Array {
  const enc = new TextEncoder();
  const textBytes = enc.encode(text);
  const dataBoxLen = 16 + textBytes.length;
  const tagBoxLen = 8 + dataBoxLen;
  const buf = new Uint8Array(tagBoxLen);
  const view = new DataView(buf.buffer);
  view.setUint32(0, tagBoxLen, false);
  for (let i = 0; i < 4; i++) buf[4 + i] = fourCC.charCodeAt(i);
  view.setUint32(8, dataBoxLen, false);
  buf[12] = 0x64; buf[13] = 0x61; buf[14] = 0x74; buf[15] = 0x61; // 'data'
  view.setUint32(16, 1, false); // type 1 = UTF-8 text
  view.setUint32(20, 0, false);
  buf.set(textBytes, 24);
  return buf;
}

/**
 * Create QuickTime user data text tag (e.g. ©nam, ©des, subt).
 */
function createQuickTimeUdtaTag(fourCC: string, text: string): Uint8Array {
  const enc = new TextEncoder();
  const textBytes = enc.encode(text);
  const totalLen = 8 + 2 + 2 + textBytes.length;
  const buf = new Uint8Array(totalLen);
  const view = new DataView(buf.buffer);
  view.setUint32(0, totalLen, false);
  for (let i = 0; i < 4; i++) buf[4 + i] = fourCC.charCodeAt(i);
  view.setUint16(8, textBytes.length, false);
  view.setUint16(10, 0x55c4, false); // 'eng'
  buf.set(textBytes, 12);
  return buf;
}

/**
 * Create a Microsoft Xtra Unicode tag entry (type 8 = UTF-16LE null-terminated).
 * Windows File Explorer explicitly reads WM/Category, WM/Keywords, and Property System GUIDs
 * from moov.udta.Xtra to display the "Tags" field in the Properties -> Details tab.
 */
function createXtraUnicodeTag(tag: string, values: string[]): Uint8Array {
  const valBuffers: Uint8Array[] = [];
  for (const val of values) {
    const chars = val || '';
    const buf = new Uint8Array((chars.length + 1) * 2);
    for (let i = 0; i < chars.length; i++) {
      const code = chars.charCodeAt(i);
      buf[i * 2] = code & 0xff;
      buf[i * 2 + 1] = (code >> 8) & 0xff;
    }
    buf[chars.length * 2] = 0;
    buf[chars.length * 2 + 1] = 0;

    const itemLen = buf.length + 6;
    const itemBuf = new Uint8Array(itemLen);
    const itemView = new DataView(itemBuf.buffer);
    itemView.setUint32(0, itemLen, false);
    itemView.setUint16(4, 8, false); // type 8 = Unicode UTF-16LE
    itemBuf.set(buf, 6);
    valBuffers.push(itemBuf);
  }

  const tagBytes = new TextEncoder().encode(tag);
  const valPayloadLen = valBuffers.reduce((acc, b) => acc + b.length, 0);
  const buffLen = 4 + valPayloadLen;
  const entryLen = 8 + tagBytes.length + buffLen;

  const entryBuf = new Uint8Array(entryLen);
  const entryView = new DataView(entryBuf.buffer);
  entryView.setUint32(0, entryLen, false);
  entryView.setUint32(4, tagBytes.length, false);
  entryBuf.set(tagBytes, 8);

  let ptr = 8 + tagBytes.length;
  entryView.setUint32(ptr, values.length, false);
  ptr += 4;
  for (const vb of valBuffers) {
    entryBuf.set(vb, ptr);
    ptr += vb.length;
  }
  return entryBuf;
}

/**
 * Build Microsoft Xtra atom containing WM/Category, WM/Keywords, and Property System tags.
 */
function createXtraBox(title: string, description: string, keywords: string[]): Uint8Array {
  const cleanKeywords = keywords.filter(Boolean).map(k => k.trim());
  const tagList = cleanKeywords.length > 0 ? cleanKeywords : [''];

  const tags = [
    // 1. WM/Category (Windows File Explorer primary source for Details -> Tags)
    createXtraUnicodeTag('WM/Category', tagList),
    // 2. WM/Keywords (Windows Media / Property System Keywords)
    createXtraUnicodeTag('WM/Keywords', tagList),
    // 3. Exact Microsoft Property System GUID for System.Keywords (PKEY_Keywords)
    createXtraUnicodeTag('{F29F85E0-4FF9-1068-AB91-08002B27B3D9} 5', tagList),
    // 4. Subtitle / Description / Subject
    createXtraUnicodeTag('WM/SubTitle', [description]),
    createXtraUnicodeTag('{F29F85E0-4FF9-1068-AB91-08002B27B3D9} 3', [description]),
    // 5. Title
    createXtraUnicodeTag('WM/Title', [title]),
    createXtraUnicodeTag('{F29F85E0-4FF9-1068-AB91-08002B27B3D9} 2', [title]),
    // 6. Comments
    createXtraUnicodeTag('WM/Comments', [description]),
    createXtraUnicodeTag('{F29F85E0-4FF9-1068-AB91-08002B27B3D9} 6', [description]),
    // 7. Author / Producer
    createXtraUnicodeTag('WM/Author', ['Gen-z Ai Studio']),
    createXtraUnicodeTag('WM/Producer', ['Gen-z Ai Studio']),
    createXtraUnicodeTag('{F29F85E0-4FF9-1068-AB91-08002B27B3D9} 4', ['Gen-z Ai Studio']),
  ];

  const totalPayload = tags.reduce((acc, t) => acc + t.length, 0);
  const xtraBox = new Uint8Array(8 + totalPayload);
  new DataView(xtraBox.buffer).setUint32(0, 8 + totalPayload, false);
  xtraBox[4] = 0x58; xtraBox[5] = 0x74; xtraBox[6] = 0x72; xtraBox[7] = 0x61; // 'Xtra'
  let ptr = 8;
  for (const t of tags) {
    xtraBox.set(t, ptr);
    ptr += t.length;
  }
  return xtraBox;
}

/**
 * Build udta atom containing ilst tags, Microsoft Xtra box, Adobe XMP packet, and QuickTime tags.
 */
function buildMp4UdtaBox(title: string, description: string, keywords: string[]): Uint8Array {
  const kwString = keywords.join(', ');
  const year = `${new Date().getFullYear()}`;

  const tagBoxes = [
    createIlstTagBox('\xa9nam', title),
    createIlstTagBox('desc', description),
    createIlstTagBox('\xa9des', description),
    createIlstTagBox('\xa9cmt', description),
    createIlstTagBox('keyw', kwString),
    createIlstTagBox('\xa9key', kwString),
    createIlstTagBox('catg', kwString),
    createIlstTagBox('\xa9ART', 'Gen-z Ai Studio'),
    createIlstTagBox('\xa9pub', 'Gen-z Ai Studio'),
    createIlstTagBox('\xa9day', year),
  ];

  const ilstPayloadLen = tagBoxes.reduce((acc, b) => acc + b.length, 0);
  const ilstBoxLen = 8 + ilstPayloadLen;
  const ilstBuf = new Uint8Array(ilstBoxLen);
  new DataView(ilstBuf.buffer).setUint32(0, ilstBoxLen, false);
  ilstBuf[4] = 0x69; ilstBuf[5] = 0x6c; ilstBuf[6] = 0x73; ilstBuf[7] = 0x74; // 'ilst'
  let ptr = 8;
  for (const b of tagBoxes) {
    ilstBuf.set(b, ptr);
    ptr += b.length;
  }

  // Handler box for iTunes metadata
  const hdlrBuf = new Uint8Array(33);
  const hdlrView = new DataView(hdlrBuf.buffer);
  hdlrView.setUint32(0, 33, false);
  hdlrBuf[4] = 0x68; hdlrBuf[5] = 0x64; hdlrBuf[6] = 0x6c; hdlrBuf[7] = 0x72; // 'hdlr'
  hdlrBuf[16] = 0x6d; hdlrBuf[17] = 0x64; hdlrBuf[18] = 0x69; hdlrBuf[19] = 0x72; // 'mdir'
  hdlrBuf[20] = 0x61; hdlrBuf[21] = 0x70; hdlrBuf[22] = 0x70; hdlrBuf[23] = 0x6c; // 'appl'

  // meta box
  const metaPayloadLen = 4 + hdlrBuf.length + ilstBuf.length;
  const metaBoxLen = 8 + metaPayloadLen;
  const metaBuf = new Uint8Array(metaBoxLen);
  const metaView = new DataView(metaBuf.buffer);
  metaView.setUint32(0, metaBoxLen, false);
  metaBuf[4] = 0x6d; metaBuf[5] = 0x65; metaBuf[6] = 0x74; metaBuf[7] = 0x61; // 'meta'
  metaBuf.set(hdlrBuf, 12);
  metaBuf.set(ilstBuf, 12 + hdlrBuf.length);

  // Microsoft Xtra box (provides Windows Explorer Details -> Tags, Category, Keywords, Subtitle)
  const xtraBuf = createXtraBox(title, description, keywords);

  // Adobe XMP box inside udta
  const xmpPacket = createXmpPacket(title, description, keywords);
  const xmpBytes = new TextEncoder().encode(xmpPacket);
  const xmpBoxLen = 8 + xmpBytes.length;
  const xmpBuf = new Uint8Array(xmpBoxLen);
  new DataView(xmpBuf.buffer).setUint32(0, xmpBoxLen, false);
  xmpBuf[4] = 0x58; xmpBuf[5] = 0x4d; xmpBuf[6] = 0x50; xmpBuf[7] = 0x5f; // 'XMP_'
  xmpBuf.set(xmpBytes, 8);

  const udtaChildren = [
    metaBuf,
    xtraBuf,
    xmpBuf,
    createQuickTimeUdtaTag('\xa9nam', title),
    createQuickTimeUdtaTag('\xa9des', description),
    createQuickTimeUdtaTag('\xa9cmt', description),
    createQuickTimeUdtaTag('subt', description),
  ];

  const udtaPayloadLen = udtaChildren.reduce((acc, c) => acc + c.length, 0);
  const udtaBoxLen = 8 + udtaPayloadLen;
  const udtaBuf = new Uint8Array(udtaBoxLen);
  new DataView(udtaBuf.buffer).setUint32(0, udtaBoxLen, false);
  udtaBuf[4] = 0x75; udtaBuf[5] = 0x64; udtaBuf[6] = 0x74; udtaBuf[7] = 0x61; // 'udta'
  let uPtr = 8;
  for (const c of udtaChildren) {
    udtaBuf.set(c, uPtr);
    uPtr += c.length;
  }
  return udtaBuf;
}

/**
 * Recursively update 32-bit (stco) and 64-bit (co64) chunk offsets when moov shifts.
 */
function updateMp4ChunkOffsets(buf: Uint8Array, start: number, end: number, delta: number): void {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let pos = start;
  while (pos < end) {
    if (pos + 8 > end) break;
    const size = view.getUint32(pos, false);
    const type = String.fromCharCode(buf[pos + 4], buf[pos + 5], buf[pos + 6], buf[pos + 7]);
    if (size < 8 || pos + size > end) break;

    if (type === 'stco') {
      const count = view.getUint32(pos + 12, false);
      for (let i = 0; i < count; i++) {
        const offsetPtr = pos + 16 + i * 4;
        if (offsetPtr + 4 <= pos + size) {
          const oldVal = view.getUint32(offsetPtr, false);
          view.setUint32(offsetPtr, oldVal + delta, false);
        }
      }
    } else if (type === 'co64') {
      const count = view.getUint32(pos + 12, false);
      for (let i = 0; i < count; i++) {
        const offsetPtr = pos + 16 + i * 8;
        if (offsetPtr + 8 <= pos + size) {
          const oldVal = view.getBigUint64(offsetPtr, false);
          view.setBigUint64(offsetPtr, oldVal + BigInt(delta), false);
        }
      }
    } else if (['trak', 'mdia', 'minf', 'stbl', 'edts'].includes(type)) {
      updateMp4ChunkOffsets(buf, pos + 8, pos + size, delta);
    }
    pos += size;
  }
}

/**
 * Embed complete metadata into MP4 / MOV video files without corrupting streams.
 */
export function embedMp4Metadata(
  bytes: Uint8Array,
  title: string,
  description: string,
  keywords: string[]
): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let moovOffset = -1;
  let moovSize = 0;
  let mdatOffset = -1;

  let pos = 0;
  while (pos + 8 <= bytes.length) {
    const size = view.getUint32(pos, false);
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    const actualSize = size === 0 ? bytes.length - pos : size;
    if (type === 'moov') {
      moovOffset = pos;
      moovSize = actualSize;
    } else if (type === 'mdat') {
      mdatOffset = pos;
    }
    if (actualSize < 8) break;
    pos += actualSize;
  }

  if (moovOffset === -1 || moovSize < 8) return bytes;

  const newUdta = buildMp4UdtaBox(title, description, keywords);

  // Build standard Adobe XMP UUID box for MP4
  const xmpPacket = createXmpPacket(title, description, keywords);
  const xmpBytes = new TextEncoder().encode(xmpPacket);
  const uuidHeader = [0xbe, 0x7a, 0xcf, 0xcb, 0x97, 0xa9, 0x42, 0xe8, 0x9c, 0x71, 0x99, 0x94, 0x91, 0xe3, 0xaf, 0xac];
  const uuidTotalLen = 8 + 16 + xmpBytes.length;
  const uuidBox = new Uint8Array(uuidTotalLen);
  new DataView(uuidBox.buffer).setUint32(0, uuidTotalLen, false);
  uuidBox[4] = 0x75; uuidBox[5] = 0x75; uuidBox[6] = 0x69; uuidBox[7] = 0x64; // 'uuid'
  uuidBox.set(uuidHeader, 8);
  uuidBox.set(xmpBytes, 24);

  // Scan inside moov for existing udta
  let existingUdtaOffset = -1;
  let existingUdtaSize = 0;
  let mPos = moovOffset + 8;
  const moovEnd = moovOffset + moovSize;

  while (mPos + 8 <= moovEnd) {
    const cSize = view.getUint32(mPos, false);
    const cType = String.fromCharCode(bytes[mPos + 4], bytes[mPos + 5], bytes[mPos + 6], bytes[mPos + 7]);
    if (cSize < 8 || mPos + cSize > moovEnd) break;
    if (cType === 'udta') {
      existingUdtaOffset = mPos;
      existingUdtaSize = cSize;
      break;
    }
    mPos += cSize;
  }

  const udtaDelta = existingUdtaOffset !== -1 ? newUdta.length - existingUdtaSize : newUdta.length;
  const isMoovBeforeMdat = mdatOffset !== -1 && mdatOffset > moovOffset;
  const totalPreMdatDelta = udtaDelta + (isMoovBeforeMdat ? uuidBox.length : 0);

  // Build new moov content
  const moovPayloadParts: Uint8Array[] = [];
  mPos = moovOffset + 8;
  let udtaInserted = false;

  while (mPos + 8 <= moovEnd) {
    const cSize = view.getUint32(mPos, false);
    const cType = String.fromCharCode(bytes[mPos + 4], bytes[mPos + 5], bytes[mPos + 6], bytes[mPos + 7]);
    if (cSize < 8 || mPos + cSize > moovEnd) break;

    if (cType === 'udta') {
      moovPayloadParts.push(newUdta);
      udtaInserted = true;
    } else {
      const childSlice = bytes.slice(mPos, mPos + cSize);
      if (isMoovBeforeMdat && totalPreMdatDelta !== 0) {
        updateMp4ChunkOffsets(childSlice, 0, childSlice.length, totalPreMdatDelta);
      }
      moovPayloadParts.push(childSlice);
    }
    mPos += cSize;
  }

  if (!udtaInserted) {
    moovPayloadParts.push(newUdta);
  }

  const newMoovPayloadLen = moovPayloadParts.reduce((acc, p) => acc + p.length, 0);
  const newMoovSize = 8 + newMoovPayloadLen;
  const newMoovBox = new Uint8Array(newMoovSize);
  const newMoovView = new DataView(newMoovBox.buffer);
  newMoovView.setUint32(0, newMoovSize, false);
  newMoovBox[4] = 0x6d; newMoovBox[5] = 0x6f; newMoovBox[6] = 0x6f; newMoovBox[7] = 0x76; // 'moov'

  let moovPtr = 8;
  for (const part of moovPayloadParts) {
    newMoovBox.set(part, moovPtr);
    moovPtr += part.length;
  }

  // Construct full MP4 binary with new moov and Adobe XMP uuid box
  const finalParts = [
    bytes.slice(0, moovOffset),
    newMoovBox,
    uuidBox,
    bytes.slice(moovOffset + moovSize),
  ];

  const totalLen = finalParts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLen);
  let resPtr = 0;
  for (const p of finalParts) {
    result.set(p, resPtr);
    resPtr += p.length;
  }
  return result;
}

/**
 * Embed metadata into any supported file and return modified Blob.
 */
export async function applyMetadataToFile(item: ImageItem): Promise<{
  blob: Blob;
  renamedFilename: string;
}> {
  const metadata = item.result?.metadata;
  const title = metadata?.title || item.filename.replace(/\.[^/.]+$/, '');
  const description = metadata?.description || title;
  const keywords = metadata?.keywords || [];

  const renamedFilename = sanitizeFilename(title, item.filename);
  const ext = item.filename.split('.').pop()?.toLowerCase() || '';

  const buffer = await item.file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  try {
    if (ext === 'jpg' || ext === 'jpeg') {
      const modifiedBytes = embedJpegMetadata(bytes, title, description, keywords);
      return {
        blob: new Blob([modifiedBytes], { type: 'image/jpeg' }),
        renamedFilename,
      };
    }

    if (ext === 'png') {
      const modifiedBytes = embedPngMetadata(bytes, title, description, keywords);
      return {
        blob: new Blob([modifiedBytes], { type: 'image/png' }),
        renamedFilename,
      };
    }

    if (ext === 'webp') {
      const modifiedBytes = embedWebpMetadata(bytes, title, description, keywords);
      return {
        blob: new Blob([modifiedBytes], { type: 'image/webp' }),
        renamedFilename,
      };
    }

    if (ext === 'svg') {
      const text = new TextDecoder('utf-8').decode(bytes);
      const modifiedSvg = embedSvgMetadata(text, title, description, keywords);
      return {
        blob: new Blob([modifiedSvg], { type: 'image/svg+xml' }),
        renamedFilename,
      };
    }

    if (ext === 'eps') {
      const modifiedBytes = embedEpsMetadata(bytes, title, description, keywords);
      return {
        blob: new Blob([modifiedBytes], { type: item.file.type || 'application/postscript' }),
        renamedFilename,
      };
    }

    // Video formats (MP4, MOV, M4V, QuickTime): Embed Title, Subtitle, Tags, Description, Comments into atoms
    if (['mp4', 'mov', 'm4v', 'quicktime'].includes(ext) || item.file.type.startsWith('video/')) {
      const modifiedBytes = embedMp4Metadata(bytes, title, description, keywords);
      return {
        blob: new Blob([modifiedBytes], { type: item.file.type || (ext === 'mov' ? 'video/quicktime' : 'video/mp4') }),
        renamedFilename,
      };
    }

    return {
      blob: new Blob([bytes], { type: item.file.type || 'application/octet-stream' }),
      renamedFilename,
    };
  } catch (err) {
    console.warn(`Error injecting metadata into ${item.filename}, using fallback:`, err);
    return {
      blob: item.file,
      renamedFilename,
    };
  }
}

/**
 * Execute File Rename & Metadata Injection.
 * Supports:
 * 1. Native File System Access API (`showDirectoryPicker` with permission) to save directly into folder.
 * 2. Fallback to direct browser download or bundled ZIP package for seamless 1-click delivery.
 */
export async function executeRenameFiles(
  items: ImageItem[],
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<{ success: boolean; count: number; method: 'filesystem' | 'download' | 'zip'; error?: string }> {
  const eligibleItems = items.filter((item) => item.status === 'completed' && item.result?.metadata?.title);

  if (eligibleItems.length === 0) {
    return {
      success: false,
      count: 0,
      method: 'download',
      error: 'No files with generated metadata found to rename.',
    };
  }

  // Attempt File System Access API if supported in current browser environment
  const canUseDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  if (canUseDirectoryPicker) {
    try {
      // Prompt user to select target folder
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });

      let count = 0;
      for (let i = 0; i < eligibleItems.length; i++) {
        const item = eligibleItems[i];
        if (onProgress) onProgress(i + 1, eligibleItems.length, item.filename);

        const { blob, renamedFilename } = await applyMetadataToFile(item);

        // Create or overwrite file in selected directory
        const fileHandle = await dirHandle.getFileHandle(renamedFilename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        count++;
      }

      return { success: true, count, method: 'filesystem' };
    } catch (fsErr: any) {
      // If user deliberately aborted/canceled the directory picker dialog, cancel without falling back
      if (fsErr.name === 'AbortError') {
        return { success: false, count: 0, method: 'filesystem', error: 'Folder selection was cancelled.' };
      }
      console.info('DirectoryPicker unavailable or permission denied, using browser export fallback:', fsErr);
    }
  }

  // Fallback: Direct download for single file or ZIP bundle for multiple files
  if (eligibleItems.length === 1) {
    const item = eligibleItems[0];
    if (onProgress) onProgress(1, 1, item.filename);
    const { blob, renamedFilename } = await applyMetadataToFile(item);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = renamedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return { success: true, count: 1, method: 'download' };
  }

  // Multiple files -> Bundle into ZIP containing all renamed files with embedded metadata
  const zip = new JSZip();
  for (let i = 0; i < eligibleItems.length; i++) {
    const item = eligibleItems[i];
    if (onProgress) onProgress(i + 1, eligibleItems.length, item.filename);
    const { blob, renamedFilename } = await applyMetadataToFile(item);
    zip.file(renamedFilename, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const timestamp = new Date().toISOString().slice(0, 10);
  const zipName = `Renamed_Metadata_Files_${timestamp}.zip`;

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { success: true, count: eligibleItems.length, method: 'zip' };
}
