import { KeywordFormat } from '../types';

/**
 * Detailed prompt instructions for AI models based on keywordFormat:
 * - 'single': strictly 1-word terms (e.g. business, analytics, dashboard, finance, technology, concept, icon, vector)
 * - 'double': strictly 2-word terms (e.g. business analytics, mobile dashboard, financial technology, user interface, data visualization)
 * - 'mixed': balanced 50% single words and 50% two-word compound phrases
 * - 'auto': optimal microstock SEO search mix
 */
export function getKeywordFormatPromptInstructions(format: KeywordFormat, count: number): string {
  switch (format) {
    case 'single':
      return `CRITICAL KEYWORD FORMAT RULE (SINGLE KEYWORDS ONLY):
- Every single keyword in the "keywords" array MUST be strictly ONE INDIVIDUAL WORD (e.g., 1-word terms like "business", "finance", "mobile", "dashboard", "technology", "analytics", "concept", "vector", "illustration", "interface", "data", "graphic", "isolated").
- ABSOLUTELY ZERO SPACES inside any keyword! No phrases, no compound multi-word strings.
- Output exactly ${count} unique single-word keywords.`;

    case 'double':
      return `CRITICAL KEYWORD FORMAT RULE (DOUBLE KEYWORDS / TWO-WORD PHRASES ONLY):
- Every single keyword in the "keywords" array MUST be strictly a TWO-WORD PHRASE (e.g., 2-word compound terms like "business analytics", "mobile dashboard", "financial technology", "user interface", "data visualization", "vector illustration", "graphic design", "modern technology", "creative concept", "digital interface", "isolated element").
- Every keyword MUST contain exactly TWO words separated by a single space.
- DO NOT output single isolated words (never output "dashboard" alone; output "dashboard template" or "mobile dashboard").
- Output exactly ${count} unique two-word phrase keywords.`;

    case 'mixed':
      return `KEYWORD FORMAT RULE (MIXED SINGLE & DOUBLE PHRASES):
- Provide a balanced 50/50 mix: approximately 50% individual single-word keywords (e.g., "business", "dashboard", "technology") AND approximately 50% specific two-word compound phrases (e.g., "business analytics", "mobile dashboard", "financial technology").
- Output exactly ${count} unique keywords in this balanced mix.`;

    case 'auto':
    default:
      return `KEYWORD FORMAT RULE (AUTO MICROSTOCK SEO):
- Intelligently generate high-converting microstock keywords optimized for Adobe Stock, Shutterstock, and Freepik search algorithms.
- Include a high-impact combination of core high-search-volume single keywords and long-tail two-word commercial phrases.
- Output exactly ${count} unique keywords.`;
  }
}

/**
 * Fallback contextual words commonly used in microstock metadata to enrich or pair tags
 */
const STOCK_MODIFIERS = [
  'concept', 'design', 'vector', 'illustration', 'template', 'graphic',
  'modern', 'digital', 'background', 'symbol', 'element', 'technology',
  'creative', 'isolated', 'abstract', 'style', 'sign', 'banner',
  'collection', 'infographic', 'layout', 'pattern', 'interface', 'object',
  'feature', 'system', 'display', 'screen', 'visual', 'application'
];

/**
 * Programmatic enforcer that guarantees 100% compliance with the selected keywordFormat.
 * Even if an LLM returns phrases for 'single' or single words for 'double', this function
 * guarantees every item strictly follows the user's selected format!
 */
export function formatKeywordsByMode(
  rawKeywords: string[],
  format: KeywordFormat,
  targetCount: number = 49,
  contextHints: string[] = []
): string[] {
  if (!Array.isArray(rawKeywords)) return [];

  // 1. Initial cleanup and deduplication
  const cleanedList: string[] = [];
  const seenRaw = new Set<string>();

  for (const raw of rawKeywords) {
    if (!raw || typeof raw !== 'string') continue;
    // Remove unwanted punctuation except hyphens inside words
    const clean = raw
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (clean && clean.length >= 2 && !seenRaw.has(clean)) {
      seenRaw.add(clean);
      cleanedList.push(clean);
    }
  }

  // 2. Build a rich bank of distinct single words from the raw keywords & context hints
  const singleWordBank: string[] = [];
  const singleSeen = new Set<string>();

  const addWordToBank = (w: string) => {
    const word = w.trim().toLowerCase().replace(/[^\w-]/g, '');
    // Ignore pure numbers or single characters
    if (word.length >= 2 && !/^\d+$/.test(word) && !singleSeen.has(word)) {
      singleSeen.add(word);
      singleWordBank.push(word);
    }
  };

  for (const item of cleanedList) {
    const parts = item.split(/\s+/);
    for (const p of parts) addWordToBank(p);
  }

  for (const hint of contextHints) {
    if (typeof hint === 'string') {
      const parts = hint.split(/[\s,._-]+/);
      for (const p of parts) addWordToBank(p);
    }
  }

  const result: string[] = [];
  const resultSet = new Set<string>();

  const addFinal = (kw: string): boolean => {
    const cleanKw = kw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (cleanKw && cleanKw.length >= 2 && !resultSet.has(cleanKw)) {
      resultSet.add(cleanKw);
      result.push(cleanKw);
      return true;
    }
    return false;
  };

  // FORMAT: SINGLE (Strictly 1 word per keyword, no spaces)
  if (format === 'single') {
    // Process all items: if item contains spaces, split into single words
    for (const item of cleanedList) {
      const words = item.split(/\s+/);
      for (const w of words) {
        if (w.length >= 2 && !/^\d+$/.test(w)) {
          addFinal(w);
          if (result.length >= targetCount) break;
        }
      }
      if (result.length >= targetCount) break;
    }

    // If still under target count, pull from singleWordBank
    if (result.length < targetCount) {
      for (const w of singleWordBank) {
        addFinal(w);
        if (result.length >= targetCount) break;
      }
    }

    // If still under target count, pull from standard microstock words
    if (result.length < targetCount) {
      for (const m of STOCK_MODIFIERS) {
        addFinal(m);
        if (result.length >= targetCount) break;
      }
    }

    return result.filter((k) => !k.includes(' ')).slice(0, targetCount);
  }

  // FORMAT: DOUBLE (Strictly 2 words per keyword separated by single space)
  if (format === 'double') {
    // 1. Process items that are already 2 words
    for (const item of cleanedList) {
      const words = item.split(/\s+/).filter(Boolean);
      if (words.length === 2) {
        addFinal(`${words[0]} ${words[1]}`);
      } else if (words.length > 2) {
        // Truncate 3+ words to the first 2 words
        addFinal(`${words[0]} ${words[1]}`);
      }
      if (result.length >= targetCount) break;
    }

    // 2. For single words, pair with another meaningful word or stock modifier
    for (const item of cleanedList) {
      if (result.length >= targetCount) break;
      const words = item.split(/\s+/).filter(Boolean);
      if (words.length === 1) {
        const base = words[0];
        // Try pairing with words from the single word bank
        for (const w of singleWordBank) {
          if (w !== base) {
            const pair = `${base} ${w}`;
            if (addFinal(pair)) {
              if (result.length >= targetCount) break;
            }
          }
        }
      }
    }

    // 3. If still under target count, synthesize two-word pairs from single word bank and modifiers
    if (result.length < targetCount) {
      for (let i = 0; i < singleWordBank.length && result.length < targetCount; i++) {
        const word = singleWordBank[i];
        for (const mod of STOCK_MODIFIERS) {
          if (word !== mod) {
            if (addFinal(`${word} ${mod}`)) {
              if (result.length >= targetCount) break;
            }
          }
        }
      }
    }

    // 4. Ensure 100% of keywords have exactly 2 words
    return result.filter((k) => k.split(' ').length === 2).slice(0, targetCount);
  }

  // FORMAT: MIXED (Balanced 50% single words and 50% two-word phrases)
  if (format === 'mixed') {
    const singles: string[] = [];
    const doubles: string[] = [];
    const singleSet = new Set<string>();
    const doubleSet = new Set<string>();

    for (const item of cleanedList) {
      const words = item.split(/\s+/).filter(Boolean);
      if (words.length === 1) {
        if (!singleSet.has(words[0])) {
          singleSet.add(words[0]);
          singles.push(words[0]);
        }
      } else if (words.length >= 2) {
        const phrase = words.slice(0, 2).join(' ');
        if (!doubleSet.has(phrase)) {
          doubleSet.add(phrase);
          doubles.push(phrase);
        }
      }
    }

    // Populate singles from bank
    for (const w of singleWordBank) {
      if (!singleSet.has(w)) {
        singleSet.add(w);
        singles.push(w);
      }
    }

    // Populate doubles from singles + modifiers
    for (const s of singles) {
      for (const mod of STOCK_MODIFIERS) {
        if (s !== mod) {
          const phrase = `${s} ${mod}`;
          if (!doubleSet.has(phrase)) {
            doubleSet.add(phrase);
            doubles.push(phrase);
          }
        }
      }
    }

    // Interleave single and double keywords
    let sIdx = 0;
    let dIdx = 0;
    while (result.length < targetCount && (sIdx < singles.length || dIdx < doubles.length)) {
      if (sIdx < singles.length) {
        addFinal(singles[sIdx++]);
      }
      if (result.length < targetCount && dIdx < doubles.length) {
        addFinal(doubles[dIdx++]);
      }
    }

    return result.slice(0, targetCount);
  }

  // FORMAT: AUTO (Microstock SEO optimization)
  for (const item of cleanedList) {
    const words = item.split(/\s+/).filter(Boolean);
    if (words.length <= 3) {
      addFinal(words.join(' '));
    } else {
      addFinal(words.slice(0, 2).join(' '));
    }
    if (result.length >= targetCount) break;
  }

  // Fill up with single bank if still under target count
  if (result.length < targetCount) {
    for (const w of singleWordBank) {
      addFinal(w);
      if (result.length >= targetCount) break;
    }
  }

  return result.slice(0, targetCount);
}
