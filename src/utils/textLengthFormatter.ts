/**
 * Utility to strictly enforce Title and Description character lengths
 * and strip all commas, dots, fullstops, and punctuation as requested by user.
 */

export interface TextLengthOptions {
  titleLengthMode?: 'fixed' | 'auto';
  titleLength?: number | 'auto';
  descriptionLength?: number;
}

/**
 * Strips all commas, dots, periods, full stops, Bengali dari (। / ॥), colons, semicolons,
 * exclamation marks, question marks, quotes, brackets, slashes, and dangling punctuation
 * from Title and Description. Retains clean words, numbers, and single spaces.
 */
export function stripPunctuation(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    // Replace commas, dots/periods, Bengali dari/dori, colons, semicolons, quotes, etc. with space
    .replace(/[,.।॥;:!?"'“”‘’`~*^()[\]{}/\\|<>_+=]/g, ' ')
    // Replace hyphens surrounded by spaces or at word boundaries
    .replace(/\s+-\s+/g, ' ')
    .replace(/^-+|-+$/g, '')
    // Collapse any sequence of multiple whitespace characters to a single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cleanly truncates and formats a string so that its character count does not exceed targetLength,
 * completely strips all punctuation (commas, dots, periods, dori, fullstops),
 * and avoids mid-word cutoffs and trailing orphan prepositions.
 */
export function fitTextToCharLimit(
  text: string,
  targetLength: number,
  mode: 'title' | 'description' = 'title'
): string {
  if (!text || typeof text !== 'string') return '';
  
  // 1. Strip all commas, periods, dots, full stops, and punctuation
  let cleaned = stripPunctuation(text);

  if (targetLength <= 0 || cleaned.length <= targetLength) {
    return cleanHangingWords(cleaned);
  }

  // 2. Slice up to targetLength
  let cut = cleaned.slice(0, targetLength);

  // If the next character in original was not a space, we cut in the middle of a word
  if (cleaned[targetLength] && cleaned[targetLength] !== ' ') {
    const lastSpace = cut.lastIndexOf(' ');
    // If the last space is reasonably close (within 30% of target), truncate at word boundary
    if (lastSpace > Math.floor(targetLength * 0.7)) {
      cut = cut.slice(0, lastSpace);
    }
  }

  return cleanHangingWords(cut);
}

/**
 * Strips dangling prepositions or conjunctions at the end of a truncated sentence
 * and ensures no punctuation remains.
 */
function cleanHangingWords(text: string): string {
  let cleaned = stripPunctuation(text);

  // Strip dangling prepositions or conjunctions at the end
  cleaned = cleaned.replace(/\s+(and|with|in|on|of|to|for|by|a|an|the|at|from|or|as|is|are)$/i, '').trim();
  
  // Final punctuation strip to guarantee zero dots, commas, etc.
  return stripPunctuation(cleaned);
}

/**
 * Generates prompt instructions for Title and Description character limits
 * and strictly prohibits commas, dots, fullstops, and punctuation.
 */
export function getTextLengthPromptInstructions(
  titleLengthMode: 'fixed' | 'auto',
  titleLength: number | 'auto',
  descriptionLength: number
): { titlePrompt: string; descPrompt: string } {
  const punctuationRule = 'STRICT PUNCTUATION PROHIBITION: DO NOT include ANY commas (,), periods (.), dots, full stops (.), Bengali dori (।), colons (:), or semicolons (;). Use ONLY words and single spaces.';

  let titlePrompt = '';
  if (titleLengthMode === 'auto' || titleLength === 'auto') {
    titlePrompt = `Commercial SEO stock title, natural length (between 70 and 130 characters). ${punctuationRule}`;
  } else {
    const target = Number(titleLength) || 130;
    titlePrompt = `EXACT CHARACTER COUNT REQUIREMENT: The title MUST be EXACTLY around ${target} CHARACTERS in total length (target between ${Math.max(25, target - 5)} and ${target} characters). Provide enough descriptive detail to reach this length. ${punctuationRule}`;
  }

  const descTarget = Number(descriptionLength) || 60;
  const descPrompt = `EXACT CHARACTER COUNT REQUIREMENT: The description MUST be EXACTLY around ${descTarget} CHARACTERS in total length (target between ${Math.max(20, descTarget - 6)} and ${descTarget} characters). ${punctuationRule}`;

  return { titlePrompt, descPrompt };
}
