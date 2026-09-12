export interface VisualAnalysis {
  main_subject: string;
  objects: string[];
  composition: string;
  colors: string[];
  lighting: string;
  background: string;
  perspective: string;
  style: string;
  important_details: string[];
}

export interface MicrostockMetadata {
  filename: string;
  title: string;
  description: string;
  keywords: string[];
  category: number;
  categoryName: string;
}

export type GenerationMode = 'image_to_prompt' | 'metadata' | 'both';

export interface AnalysisResult {
  analysis: VisualAnalysis;
  prompt?: string;
  metadata?: MicrostockMetadata;
  generationMode?: GenerationMode;
}

export type KeywordFormat = 'single' | 'double' | 'mixed' | 'auto';

export interface GenerationOptions {
  generationMode: GenerationMode;
  titleLengthMode: 'fixed' | 'auto';
  titleLength: number;
  descriptionLength: number;
  keywordCount: number;
  keywordFormat: KeywordFormat;
}

export interface ImageItem {
  id: string;
  file: File;
  filename: string;
  size: number;
  mimeType: string;
  dataUrl: string; // Image data URL or video keyframe snapshot data URL
  mediaKind?: 'image' | 'vector' | 'video'; // image (jpg, png, webp), vector (eps, svg), video (mp4, mov)
  dimensions?: { width: number; height: number };
  videoDuration?: number; // Duration in seconds if video
  status: 'idle' | 'analyzing' | 'completed' | 'error';
  progress?: number;
  error?: string;
  result?: AnalysisResult;
}

export interface ApiKeyItem {
  id: string;
  key: string;
  label: string;
  createdAt: number;
  provider?: AiProvider;
}

export type CsvPlatform = 'adobe' | 'shutterstock' | 'dreamstime' | '123rf' | 'alamy' | 'freepik' | 'universal';

export type AiProvider =
  | 'gemini'
  | 'mistral'
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

export type MistralVisionModel =
  | 'mistral-large-latest'
  | 'mistral-medium-latest'
  | 'mistral-small-latest'
  | 'pixtral-large-latest';

export interface AppSettings {
  apiKeys: ApiKeyItem[];
  mistralKeys?: ApiKeyItem[];
  openrouterKeys?: ApiKeyItem[];
  deepseekKeys?: ApiKeyItem[];
  groqKeys?: ApiKeyItem[];
  openaiKeys?: ApiKeyItem[];
  zaiKeys?: ApiKeyItem[];
  thehiveKeys?: ApiKeyItem[];
  huggingfaceKeys?: ApiKeyItem[];
  githubKeys?: ApiKeyItem[];
  sambanovaKeys?: ApiKeyItem[];
  cerebrasKeys?: ApiKeyItem[];
  activeProvider?: AiProvider;
  mistralModel?: MistralVisionModel;
  openrouterModel?: string;
  deepseekModel?: string;
  groqModel?: string;
  openaiModel?: string;
  zaiModel?: string;
  thehiveModel?: string;
  huggingfaceModel?: string;
  githubModel?: string;
  sambanovaModel?: string;
  cerebrasModel?: string;
  autoFailover?: boolean;
  activeKeyIndex: number;
  temperature: number;
  strictVisionMode: boolean;
  csvPlatformPreset: CsvPlatform;
  appearance: 'light' | 'dark';
}

export type LicenseStatus = 'unused' | 'active' | 'expired';

export interface LicenseItem {
  key: string;
  createdAt: string;
  status: LicenseStatus;
  activatedAt?: string | null;
  expiresAt?: string | null;
  activatedBy?: string | null;
}

export interface ClientLicenseInfo {
  isValid: boolean;
  key?: string;
  status?: LicenseStatus;
  expiresAt?: string;
  daysRemaining?: number;
  hoursRemaining?: number;
  activatedAt?: string;
  error?: string;
}
