import { AnalysisResult, GenerationMode, KeywordFormat } from '../types';
import { getKeywordFormatPromptInstructions, formatKeywordsByMode } from '../utils/keywordFormatter';
import { getTextLengthPromptInstructions, fitTextToCharLimit, stripPunctuation } from '../utils/textLengthFormatter';
import { sanitizeAiResult } from '../utils/trademarkSanitizer';

export type SupportedThirdPartyProvider =
  | 'openrouter'
  | 'deepseek'
  | 'groq'
  | 'openai'
  | 'zai'
  | 'thehive'
  | 'huggingface'
  | 'github'
  | 'sambanova'
  | 'cerebras';

export interface ThirdPartyModelInfo {
  id: string;
  name: string;
  badge: string;
  description: string;
}

export const OPENROUTER_MODELS: ThirdPartyModelInfo[] = [
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash (OpenRouter)',
    badge: 'Fast & Cheap',
    description: 'Ultra fast multimodal vision model',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini (OpenRouter)',
    badge: 'Efficient',
    description: 'High performance multimodal vision from OpenAI',
  },
  {
    id: 'meta-llama/llama-3.2-11b-vision-instruct',
    name: 'Llama 3.2 Vision 11B (OpenRouter)',
    badge: 'Open Weights',
    description: 'Llama vision model via OpenRouter',
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3 (OpenRouter)',
    badge: 'Popular',
    description: 'DeepSeek flagship model on OpenRouter',
  },
];

export const GROQ_MODELS: ThirdPartyModelInfo[] = [
  {
    id: 'llama-3.2-11b-vision-preview',
    name: 'Llama 3.2 11B Vision',
    badge: 'Lightning Fast',
    description: 'Fastest vision inference by Groq LPU',
  },
  {
    id: 'llama-3.2-90b-vision-preview',
    name: 'Llama 3.2 90B Vision',
    badge: 'High Detail',
    description: 'High capacity vision inference on Groq',
  },
];

export const OPENAI_MODELS: ThirdPartyModelInfo[] = [
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    badge: 'Recommended',
    description: 'Fast, cost-effective vision model for stock metadata',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    badge: 'Flagship',
    description: 'OpenAI flagship multimodal flagship vision model',
  },
];

export const DEEPSEEK_MODELS: ThirdPartyModelInfo[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat (V3)',
    badge: 'Official',
    description: 'Official DeepSeek V3 API (platform.deepseek.com)',
  },
];

export const ZAI_MODELS: ThirdPartyModelInfo[] = [
  {
    id: 'glm-4v-flash',
    name: 'GLM-4V Flash (Z.AI)',
    badge: 'Fast & Free',
    description: 'High-speed multimodal vision model for stock metadata recreation',
  },
  {
    id: 'glm-4v-plus',
    name: 'GLM-4V Plus (Z.AI)',
    badge: 'Flagship Vision',
    description: 'High precision vision analysis and creative prompt engineering',
  },
  {
    id: 'glm-4v',
    name: 'GLM-4V (Z.AI)',
    badge: 'Standard Vision',
    description: 'Accurate vision understanding and detailed commercial tagging',
  },
];

export const THEHIVE_MODELS: ThirdPartyModelInfo[] = [
  {
    id: 'hive-vision-language-model',
    name: 'Hive Vision Language Model',
    badge: 'Visual AI',
    description: 'TheHive multimodal vision intelligence and commercial tagging',
  },
  {
    id: 'deepseek-v4.1-flash',
    name: 'DeepSeek V4.1 Flash (Hive)',
    badge: 'High Speed',
    description: 'Fast multimodal reasoning on TheHive infrastructure',
  },
  {
    id: 'glm-5.3-flash',
    name: 'GLM 5.3 Flash (Hive)',
    badge: 'Efficient',
    description: 'Low-latency vision inference via TheHive platform',
  },
];

export const HUGGINGFACE_MODELS: ThirdPartyModelInfo[] = [
  {
    id: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
    name: 'Llama 3.2 11B Vision',
    badge: 'Free Vision',
    description: 'Meta open-weights vision-language model for image tagging & prompts',
  },
  {
    id: 'Qwen/Qwen2.5-VL-7B-Instruct',
    name: 'Qwen 2.5-VL 7B',
    badge: 'Top Vision',
    description: 'Cutting-edge vision-language intelligence for stock image analysis',
  },
  {
    id: 'microsoft/Phi-3.5-vision-instruct',
    name: 'Phi-3.5 Vision',
    badge: 'Microsoft Vision',
    description: 'Compact & highly accurate visual reasoning model',
  },
];

export const GITHUB_MODELS: ThirdPartyModelInfo[] = [
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini (GitHub)',
    badge: 'Free Tier',
    description: 'Free Microsoft Azure-hosted GPT-4o mini for GitHub users',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o (GitHub)',
    badge: 'Flagship',
    description: 'Flagship multimodal vision model via GitHub Models Marketplace',
  },
  {
    id: 'meta/Llama-3.2-11B-Vision-Instruct',
    name: 'Llama 3.2 11B Vision (GitHub)',
    badge: 'Meta Vision',
    description: 'High performance open multimodal vision on GitHub Models',
  },
];

export const SAMBANOVA_MODELS: ThirdPartyModelInfo[] = [
  {
    id: 'Llama-3.2-11B-Vision-Instruct',
    name: 'Llama 3.2 11B Vision (SambaNova)',
    badge: 'Ultra Fast',
    description: 'World-record speed inference on SambaNova SN40L AI chips',
  },
  {
    id: 'Llama-3.2-90B-Vision-Instruct',
    name: 'Llama 3.2 90B Vision (SambaNova)',
    badge: 'High Precision',
    description: 'Massive 90B multimodal model with ultra-fast inference speed',
  },
  {
    id: 'Meta-Llama-3.1-70B-Instruct',
    name: 'Llama 3.1 70B (SambaNova)',
    badge: 'Deep Reasoning',
    description: 'Comprehensive commercial stock metadata reasoning and keywords',
  },
];

export const CEREBRAS_MODELS: ThirdPartyModelInfo[] = [
  {
    id: 'llama3.1-8b',
    name: 'Llama 3.1 8B (Cerebras)',
    badge: 'Instant Speed',
    description: '2,000+ tokens/sec fastest wafer-scale AI inference for metadata',
  },
  {
    id: 'llama3.1-70b',
    name: 'Llama 3.1 70B (Cerebras)',
    badge: 'Fast Flagship',
    description: 'Extreme speed 70B intelligence for stock title, description & keywords',
  },
];

const CATEGORY_MAP: Record<number, string> = {
  1: 'Animals',
  2: 'Buildings and Architecture',
  3: 'Business',
  4: 'Drinks',
  5: 'The Environment',
  6: 'States of Mind',
  7: 'Food',
  8: 'Graphic Resources',
  9: 'Hobbies and Leisure',
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
 * Tests an API Key for OpenRouter, DeepSeek, Groq, or OpenAI
 */
export async function testThirdPartyApiKey(
  provider: SupportedThirdPartyProvider,
  apiKey: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '').trim();
  if (!cleanKey) {
    return { ok: false, error: `Please enter an API key for ${provider.toUpperCase()}.` };
  }

  try {
    const res = await fetch('/api/test-provider-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey: cleanKey }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, error: err?.message || `Failed to verify ${provider} API key.` };
  }
}

export interface ThirdPartyAnalyzeOptions {
  generationMode: GenerationMode;
  titleLength: number | 'auto';
  titleLengthMode?: 'fixed' | 'auto';
  descriptionLength: number;
  keywordCount: number;
  keywordFormat: KeywordFormat;
  model?: string;
  temperature?: number;
}

/**
 * Calls third-party AI provider (OpenRouter, DeepSeek, Groq, OpenAI)
 */
export async function analyzeImageWithThirdParty(
  provider: SupportedThirdPartyProvider,
  imageDataUrl: string,
  mimeType: string,
  filename: string,
  options: ThirdPartyAnalyzeOptions,
  apiKeys: string[]
): Promise<AnalysisResult> {
  const cleanKeys = apiKeys
    .map((k) => k.trim().replace(/^["']|["']$/g, '').trim())
    .filter(Boolean);

  if (cleanKeys.length === 0) {
    throw new Error(`No ${provider.toUpperCase()} API key provided.`);
  }

  const savedLicKey = localStorage.getItem('genmeta_license_key') || '';
  const savedLicToken = localStorage.getItem('genmeta_license_token') || '';

  let lastError: string = '';
  for (const currentKey of cleanKeys) {
    try {
      const response = await fetch('/api/analyze-thirdparty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-license-key': savedLicKey,
          'x-license-token': savedLicToken,
        },
        body: JSON.stringify({
          provider,
          image: imageDataUrl,
          mimeType,
          filename,
          options,
          apiKey: currentKey,
        }),
      });

      const data = await response.json();
      if (response.ok && (data.prompt || data.metadata || data.analysis)) {
        return data as AnalysisResult;
      }

      lastError = data.error || `HTTP ${response.status}`;
      if (data.quotaExceeded || response.status === 429) {
        // Continue to next key if available
        continue;
      }
    } catch (err: any) {
      lastError = err?.message || 'Network error';
    }
  }

  throw new Error(`${provider.toUpperCase()} analysis failed: ${lastError}`);
}
