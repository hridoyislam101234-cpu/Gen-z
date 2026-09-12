import { AnalysisResult, GenerationMode, KeywordFormat, MistralVisionModel } from '../types';
import { getKeywordFormatPromptInstructions, formatKeywordsByMode } from '../utils/keywordFormatter';
import { getTextLengthPromptInstructions, fitTextToCharLimit, stripPunctuation } from '../utils/textLengthFormatter';

export interface MistralModelInfo {
  id: MistralVisionModel;
  name: string;
  badge: string;
  description: string;
  actualModelId: string;
}

export const MISTRAL_VISION_MODELS: MistralModelInfo[] = [
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large 3',
    badge: 'Flagship',
    description: 'Flagship - Most powerful vision model',
    actualModelId: 'mistral-large-latest',
  },
  {
    id: 'mistral-medium-latest',
    name: 'Mistral Medium 3.5',
    badge: 'Frontier-Class',
    description: 'Frontier-class, agentic & coding',
    actualModelId: 'mistral-medium-latest',
  },
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small 4',
    badge: 'Fast & Cheap',
    description: 'Fast & cheap - unified vision',
    actualModelId: 'mistral-small-latest',
  },
  {
    id: 'pixtral-large-latest',
    name: 'Pixtral Large',
    badge: 'Vision Specialist',
    description: 'Dedicated vision specialist',
    actualModelId: 'pixtral-12b-2409',
  },
];

const CATEGORY_MAP: Record<number, string> = {
  1: 'Animals',
  2: 'Architecture',
  3: 'Business',
  4: 'Drinks',
  5: 'Environment',
  6: 'States of Mind',
  7: 'Food',
  8: 'Graphic Resources',
  9: 'Hobbies',
  10: 'Industry',
  11: 'Landscapes',
  12: 'Lifestyle',
  13: 'People',
  14: 'Plants and Flowers',
  15: 'Culture and Religion',
  16: 'Science',
  17: 'Social Issues',
  18: 'Sports',
  19: 'Technology',
  20: 'Transport',
  21: 'Travel',
};

/**
 * Validates a Mistral AI API Key
 */
export async function testMistralApiKey(apiKey: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '').trim();
  if (!cleanKey) {
    return { ok: false, error: 'Please enter a Mistral API key.' };
  }

  // 1. Direct browser test against Mistral API
  try {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cleanKey}`,
      },
    });

    if (response.ok) {
      return { ok: true, message: 'Mistral API key is active and verified successfully!' };
    }

    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || data.message?.includes('Unauthorized') || data.detail?.includes('Invalid')) {
      return { ok: false, error: 'Invalid Mistral API key. Check https://console.mistral.ai/api-keys' };
    }
    if (response.status === 429) {
      return { ok: false, error: 'Mistral rate limit exceeded or quota exhausted.' };
    }
    return { ok: false, error: data.message || data.detail || `Mistral error (${response.status})` };
  } catch (browserErr) {
    // 2. Server fallback if browser direct fetch had network or CORS issue
    try {
      const res = await fetch('/api/test-mistral-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Could not verify Mistral API key.' };
    }
  }
}

export interface MistralAnalyzeOptions {
  generationMode: GenerationMode;
  titleLength: number | 'auto';
  titleLengthMode?: 'fixed' | 'auto';
  descriptionLength: number;
  keywordCount: number;
  keywordFormat: KeywordFormat;
  model?: MistralVisionModel;
}

/**
 * Calls Mistral Vision models to analyze an image and return Prompt and/or Metadata
 */
export async function analyzeImageWithMistral(
  imageDataUrl: string,
  mimeType: string,
  filename: string,
  options: MistralAnalyzeOptions,
  apiKeys: string[]
): Promise<AnalysisResult> {
  const cleanKeys = apiKeys
    .map((k) => k.trim().replace(/^["']|["']$/g, '').trim())
    .filter(Boolean);

  if (cleanKeys.length === 0) {
    throw new Error('No Mistral API key provided.');
  }

  const apiKey = cleanKeys[0];
  const generationMode = options.generationMode || 'both';
  const titleLengthMode = (options as any).titleLengthMode || (options.titleLength === 'auto' ? 'auto' : 'fixed');
  const targetTitleLength = options.titleLength === 'auto' ? 'auto' : (Number(options.titleLength) || 130);
  const targetDescLength = Math.min(Math.max(Number(options.descriptionLength) || 60, 20), 500);
  const { titlePrompt, descPrompt } = getTextLengthPromptInstructions(titleLengthMode, targetTitleLength, targetDescLength);
  const kwCount = options.keywordCount || 35;
  const kwFormat = (options.keywordFormat || 'single') as KeywordFormat;
  const kwInstructions = getKeywordFormatPromptInstructions(kwFormat, kwCount);

  let systemPrompt = '';
  if (generationMode === 'image_to_prompt') {
    systemPrompt = `You are an elite AI image prompt engineer and creative director.
Analyze this image using multimodal vision.
TASK:
1. Conduct visual analysis: main subject, composition, style, dominant colors, lighting, background, camera angle.
2. Generate an accurate IMAGE-TO-PROMPT for AI recreation (Midjourney v6, FLUX.1, Stable Diffusion XL).
CRITICAL RULE: DO NOT include filename or file extensions (.jpg, .png) in the prompt!

Respond strictly in valid JSON with this exact structure:
{
  "analysis": {
    "main_subject": "...",
    "objects": ["..."],
    "composition": "...",
    "colors": ["..."],
    "lighting": "...",
    "background": "...",
    "perspective": "...",
    "style": "...",
    "important_details": ["..."]
  },
  "prompt": "Detailed AI recreation prompt here..."
} `;
  } else if (generationMode === 'metadata') {
    systemPrompt = `You are an expert microstock metadata specialist (Adobe Stock, Shutterstock, Freepik, Getty).
Analyze this image and generate commercial stock metadata:
1. Title: ${titlePrompt}. High commercial appeal, descriptive, no spam.
2. Description: ${descPrompt}. Clear visual description of the scene and main subject.
3. Exactly ${kwCount} keywords.
${kwInstructions}
4. Category: ID from 1 to 21 (1:Animals, 2:Architecture, 3:Business, 4:Drinks, 5:Environment, 6:States of Mind, 7:Food, 8:Graphic Resources, 9:Hobbies, 10:Industry, 11:Landscapes, 12:Lifestyle, 13:People, 14:Plants, 15:Culture, 16:Science, 17:Social Issues, 18:Sports, 19:Technology, 20:Transport, 21:Travel).

Respond strictly in valid JSON with this exact structure:
{
  "analysis": {
    "main_subject": "...",
    "objects": ["..."],
    "composition": "...",
    "colors": ["..."],
    "lighting": "...",
    "background": "...",
    "perspective": "...",
    "style": "...",
    "important_details": ["..."]
  },
  "metadata": {
    "title": "Commercial title here",
    "description": "Stock description here...",
    "keywords": ["keyword1", "keyword2", "..."],
    "category": 8,
    "categoryName": "Graphic Resources"
  }
} `;
  } else {
    // Both
    systemPrompt = `You are an elite microstock metadata specialist and AI prompt engineer.
Analyze this image using multimodal vision:
1. Visual analysis: main subject, style, composition, lighting, colors.
2. Generate an accurate IMAGE-TO-PROMPT for AI recreation (Midjourney v6, FLUX.1). DO NOT include filename or file extensions in prompt!
3. Generate commercial stock metadata: Title (${titlePrompt}), Description (${descPrompt}), ${kwCount} keywords.
${kwInstructions}
Category ID (1-21).

Respond strictly in valid JSON with this exact structure:
{
  "analysis": {
    "main_subject": "...",
    "objects": ["..."],
    "composition": "...",
    "colors": ["..."],
    "lighting": "...",
    "background": "...",
    "perspective": "...",
    "style": "...",
    "important_details": ["..."]
  },
  "prompt": "Detailed AI recreation prompt here...",
  "metadata": {
    "title": "Commercial title here",
    "description": "Stock description here...",
    "keywords": ["keyword1", "keyword2", "..."],
    "category": 8,
    "categoryName": "Graphic Resources"
  }
}`;
  }

  // Model selection with intelligent fallbacks
  let preferredModel = options.model || 'mistral-small-latest';
  if (preferredModel === 'pixtral-large-latest') {
    preferredModel = 'pixtral-12b-2409' as any;
  }

  const candidateModels = [
    preferredModel,
    'mistral-medium-latest',
    'mistral-small-latest',
    'pixtral-12b-2409',
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastError = '';

  for (const modelId of candidateModels) {
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: systemPrompt },
                {
                  type: 'image_url',
                  image_url: imageDataUrl,
                },
              ],
            },
          ],
          max_tokens: 1500,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMessage = errData.message || errData.detail || `Mistral error ${response.status}`;
        lastError = errMessage;

        // If tier doesn't allow this model (e.g. mistral-large on standard tier), try next model
        if (response.status === 403 || response.status === 400 || response.status === 404) {
          console.warn(`Mistral model ${modelId} unavailable, trying fallback: ${errMessage}`);
          continue;
        }

        throw new Error(errMessage);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from Mistral API.');
      }

      // Parse JSON
      let cleanJson = content.trim();
      if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
      if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
      if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
      cleanJson = cleanJson.trim();

      const parsed = JSON.parse(cleanJson);
      parsed.generationMode = generationMode;

      // Handle mode strictly
      if (generationMode === 'image_to_prompt') {
        delete parsed.metadata;
        if (!parsed.prompt) {
          parsed.prompt = `${parsed.analysis?.style || 'High quality'} depiction of ${parsed.analysis?.main_subject || filename}`;
        }
      } else if (generationMode === 'metadata') {
        delete parsed.prompt;
        if (parsed.metadata) {
          parsed.metadata.filename = filename || 'image.jpg';
          if (!parsed.metadata.categoryName) {
            parsed.metadata.categoryName = CATEGORY_MAP[parsed.metadata.category] || 'Graphic Resources';
          }
          if (!Array.isArray(parsed.metadata.keywords)) {
            parsed.metadata.keywords = [];
          }
        }
      } else {
        // Both
        if (!parsed.prompt) {
          parsed.prompt = `${parsed.analysis?.style || 'High quality'} depiction of ${parsed.analysis?.main_subject || filename}`;
        }
        if (!parsed.metadata) {
          parsed.metadata = {
            filename: filename || 'image.jpg',
            title: parsed.analysis?.main_subject || 'Stock image',
            description: parsed.prompt ? parsed.prompt.slice(0, 160) : 'High quality commercial stock visual.',
            keywords: parsed.analysis?.objects || ['stock', 'photo', 'design', 'graphic', 'isolated'],
            category: 8,
            categoryName: 'Graphic Resources',
          };
        } else {
          parsed.metadata.filename = filename || 'image.jpg';
          if (!parsed.metadata.categoryName) {
            parsed.metadata.categoryName = CATEGORY_MAP[parsed.metadata.category] || 'Graphic Resources';
          }
        }
      }

      // Sanitize prompt: remove filename or extension if present
      if (filename && parsed.prompt) {
        const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const filenameRegex = new RegExp(escapedFilename, 'gi');
        parsed.prompt = parsed.prompt.replace(filenameRegex, '').replace(/\s{2,}/g, ' ').trim();
      }

      if (parsed.metadata && Array.isArray(parsed.metadata.keywords)) {
        const contextHints = [
          parsed.metadata.title || '',
          parsed.metadata.description || '',
          parsed.analysis?.main_subject || '',
          ...(parsed.analysis?.objects || []),
        ];
        parsed.metadata.keywords = formatKeywordsByMode(
          parsed.metadata.keywords,
          kwFormat,
          kwCount,
          contextHints
        );
      }

      // Strictly enforce Title and Description character limits and strip all punctuation
      if (parsed.metadata) {
        if (parsed.metadata.title) {
          if (targetTitleLength !== 'auto') {
            parsed.metadata.title = fitTextToCharLimit(parsed.metadata.title, Number(targetTitleLength), 'title');
          } else {
            parsed.metadata.title = stripPunctuation(parsed.metadata.title);
          }
        }
        if (parsed.metadata.description) {
          parsed.metadata.description = fitTextToCharLimit(parsed.metadata.description, targetDescLength, 'description');
        }
      }

      return parsed as AnalysisResult;
    } catch (err: any) {
      lastError = err?.message || 'Unknown Mistral error';
    }
  }

  // If direct calls failed, try server proxy fallback
  try {
    const savedLicKey = localStorage.getItem('genmeta_license_key') || '';
    const savedLicToken = localStorage.getItem('genmeta_license_token') || '';
    const serverRes = await fetch('/api/analyze-mistral', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-license-key': savedLicKey,
        'x-license-token': savedLicToken,
      },
      body: JSON.stringify({
        image: imageDataUrl,
        mimeType,
        filename,
        options,
        apiKey,
      }),
    });
    if (serverRes.ok) {
      const serverData = await serverRes.json();
      return serverData;
    }
  } catch (proxyErr) {
    // ignore
  }

  throw new Error(`Mistral Analysis failed: ${lastError}`);
}
