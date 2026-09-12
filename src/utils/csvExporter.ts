import { CsvPlatform, ImageItem } from '../types';

/**
 * Cleanly escapes a string value for RFC 4180 CSV compliance
 */
function escapeCsvValue(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).trim();
  // Always wrap strings with double quotes if they contain commas, newlines, or quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Builds CSV string based on selected stock platform preset
 */
export function generateStockCsv(items: ImageItem[], platform: CsvPlatform = 'adobe'): string {
  const completed = items.filter(
    (item) => item.status === 'completed' && item.result?.metadata && Array.isArray(item.result.metadata.keywords)
  );
  if (completed.length === 0) return '';

  let header = '';
  const rows: string[] = [];

  switch (platform) {
    case 'adobe':
      // Matches Adobe Stock and user's provided exact template:
      // Filename,Title,Keywords,Category
      header = 'Filename,Title,Keywords,Category';
      for (const item of completed) {
        const meta = item.result!.metadata;
        const keywordsStr = meta.keywords.join(', ');
        rows.push([
          item.filename,
          escapeCsvValue(meta.title),
          escapeCsvValue(keywordsStr),
          meta.category || 8,
        ].join(','));
      }
      break;

    case 'shutterstock':
      // Shutterstock standard format: Filename,Description,Keywords,Categories
      header = 'Filename,Description,Keywords,Categories';
      for (const item of completed) {
        const meta = item.result!.metadata;
        const keywordsStr = meta.keywords.join(', ');
        rows.push([
          item.filename,
          escapeCsvValue(meta.description || meta.title),
          escapeCsvValue(keywordsStr),
          escapeCsvValue(meta.categoryName || 'Graphic Resources'),
        ].join(','));
      }
      break;

    case 'dreamstime':
      // Dreamstime format: Filename,Title,Description,Keywords,Category
      header = 'Filename,Title,Description,Keywords,Category';
      for (const item of completed) {
        const meta = item.result!.metadata;
        const keywordsStr = meta.keywords.join(', ');
        rows.push([
          item.filename,
          escapeCsvValue(meta.title),
          escapeCsvValue(meta.description),
          escapeCsvValue(keywordsStr),
          meta.category || 8,
        ].join(','));
      }
      break;

    case '123rf':
      // 123RF standard: Filename,Title,Description,Keywords,Country
      header = 'Filename,Title,Description,Keywords,Country';
      for (const item of completed) {
        const meta = item.result!.metadata;
        const keywordsStr = meta.keywords.join(', ');
        rows.push([
          item.filename,
          escapeCsvValue(meta.title),
          escapeCsvValue(meta.description),
          escapeCsvValue(keywordsStr),
          'Worldwide',
        ].join(','));
      }
      break;

    case 'alamy':
      // Alamy: Filename,Title,Description,Tags,Category
      header = 'Filename,Title,Description,Tags,Category';
      for (const item of completed) {
        const meta = item.result!.metadata;
        const keywordsStr = meta.keywords.join(', ');
        rows.push([
          item.filename,
          escapeCsvValue(meta.title),
          escapeCsvValue(meta.description),
          escapeCsvValue(keywordsStr),
          escapeCsvValue(meta.categoryName || 'Illustrations'),
        ].join(','));
      }
      break;

    case 'freepik':
      // Freepik format: Filename,Title,Keywords
      header = 'Filename,Title,Keywords';
      for (const item of completed) {
        const meta = item.result!.metadata;
        const keywordsStr = meta.keywords.join(', ');
        rows.push([
          item.filename,
          escapeCsvValue(meta.title),
          escapeCsvValue(keywordsStr),
        ].join(','));
      }
      break;

    case 'universal':
    default:
      header = 'Filename,Title,Description,Keywords,Category,CategoryName';
      for (const item of completed) {
        const meta = item.result!.metadata;
        const keywordsStr = meta.keywords.join(', ');
        rows.push([
          item.filename,
          escapeCsvValue(meta.title),
          escapeCsvValue(meta.description),
          escapeCsvValue(keywordsStr),
          meta.category || 8,
          escapeCsvValue(meta.categoryName),
        ].join(','));
      }
      break;
  }

  // Prepend UTF-8 BOM so Excel opens non-ASCII and commas properly
  return '\uFEFF' + [header, ...rows].join('\r\n');
}

/**
 * Generates plain text file containing ONLY image-to-prompts.
 * Outputs pure prompts separated cleanly by an empty line,
 * without any comment headers (/* Prompt x * /) or divider lines.
 */
export function generatePromptsTextFile(items: ImageItem[]): string {
  const completed = items.filter(
    (item) => item.status === 'completed' && item.result?.prompt && item.result.prompt.trim().length > 0
  );
  if (completed.length === 0) return '';

  return completed
    .map((item) => item.result!.prompt!.trim())
    .join('\n\n');
}

/**
 * Triggers a browser file download for text or CSV content
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
