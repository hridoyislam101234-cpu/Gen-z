import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { FileList } from './components/FileList';
import { ResultView } from './components/ResultView';
import { SettingsModal } from './components/SettingsModal';
import { NoticeModal } from './components/NoticeModal';
import { HelpModal } from './components/HelpModal';
import { AccountModal } from './components/AccountModal';
import { LicenseModal } from './components/LicenseModal';
import { LockedScreen } from './components/LockedScreen';
import { SoftwareSellingView } from './components/SoftwareSellingView';
import {
  ImageItem,
  GenerationOptions,
  AppSettings,
  CsvPlatform,
  AnalysisResult,
  AiProvider,
  ClientLicenseInfo,
} from './types';
import { generateStockCsv, generatePromptsTextFile, triggerFileDownload } from './utils/csvExporter';
import { analyzeImageDirectClient } from './services/geminiClient';
import { analyzeImageWithMistral } from './services/mistralClient';
import { analyzeImageWithThirdParty, SupportedThirdPartyProvider } from './services/thirdPartyClient';
import { sanitizeAiResult } from './utils/trademarkSanitizer';
import { isSupportedMedia, processMediaFile, ensureBase64DataUrl } from './utils/mediaProcessor';
import { executeRenameFiles } from './utils/fileRenamer';

const DEFAULT_OPTIONS: GenerationOptions = {
  generationMode: 'both',
  titleLengthMode: 'fixed',
  titleLength: 130,
  descriptionLength: 60,
  keywordCount: 49,
  keywordFormat: 'single',
};

const DEFAULT_SETTINGS: AppSettings = {
  apiKeys: [],
  mistralKeys: [],
  openrouterKeys: [],
  deepseekKeys: [],
  groqKeys: [],
  openaiKeys: [],
  activeProvider: 'gemini',
  mistralModel: 'mistral-small-latest',
  openrouterModel: 'google/gemini-2.0-flash-001',
  deepseekModel: 'deepseek-chat',
  groqModel: 'llama-3.2-11b-vision-preview',
  openaiModel: 'gpt-4o-mini',
  autoFailover: true,
  activeKeyIndex: 0,
  temperature: 0.2,
  strictVisionMode: true,
  csvPlatformPreset: 'adobe',
  appearance: 'light',
};

export default function App() {
  const [files, setFiles] = useState<ImageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [options, setOptions] = useState<GenerationOptions>(() => {
    const saved = localStorage.getItem('genmeta_options');
    return saved ? { ...DEFAULT_OPTIONS, ...JSON.parse(saved) } : DEFAULT_OPTIONS;
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('genmeta_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const cleanMistral = Array.isArray(parsed.mistralKeys)
          ? parsed.mistralKeys.filter((k: any) => k?.key && k.key !== 'Do2setlZ9uPwqW6XLPRhEb6vhJGZXtjR')
          : [];
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          autoFailover: parsed.autoFailover ?? true,
          mistralKeys: cleanMistral,
        };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [serverHasApiKey, setServerHasApiKey] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameProgress, setRenameProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
  const [renameNotification, setRenameNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failoverNotification, setFailoverNotification] = useState<string | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<'ai' | 'api' | 'csv' | 'appearance'>('api');
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [isSoftwareSellingOpen, setIsSoftwareSellingOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [licenseModalDefaultTab, setLicenseModalDefaultTab] = useState<'activate' | 'admin'>('activate');
  const [licenseInfo, setLicenseInfo] = useState<ClientLicenseInfo | null>(null);

  const abortRef = useRef<boolean>(false);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  // Verify license key on load
  const verifyLicense = async () => {
    const savedKey = localStorage.getItem('genmeta_license_key');
    const savedToken = localStorage.getItem('genmeta_license_token');
    const savedExpires = localStorage.getItem('genmeta_license_expires');
    const savedActivated = localStorage.getItem('genmeta_license_activated');
    const clientId = localStorage.getItem('genmeta_client_id') || 'dev_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('genmeta_client_id', clientId);

    if (!savedKey && !savedToken) {
      setLicenseInfo({ isValid: false, error: 'A valid 30-day license key is required to use this application.' });
      return;
    }

    try {
      const res = await fetch('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: savedKey, token: savedToken, clientId }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.valid && data.license) {
        if (data.token) {
          localStorage.setItem('genmeta_license_token', data.token);
        }
        if (data.license.key) {
          localStorage.setItem('genmeta_license_key', data.license.key);
        }
        if (data.license.expiresAt) {
          localStorage.setItem('genmeta_license_expires', data.license.expiresAt);
        }
        if (data.license.activatedAt) {
          localStorage.setItem('genmeta_license_activated', data.license.activatedAt);
        }
        setLicenseInfo({
          isValid: true,
          key: data.license.key,
          status: data.license.status,
          expiresAt: data.license.expiresAt,
          activatedAt: data.license.activatedAt,
          daysRemaining: data.license.daysRemaining,
          hoursRemaining: data.license.hoursRemaining,
        });
      } else {
        if (savedExpires && new Date(savedExpires).getTime() > Date.now() && (savedToken || savedKey)) {
          const now = Date.now();
          const exp = new Date(savedExpires).getTime();
          const diffMs = Math.max(0, exp - now);
          const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
          setLicenseInfo({
            isValid: true,
            key: savedKey || 'ACTIVE-LICENSE',
            status: 'active',
            expiresAt: savedExpires,
            activatedAt: savedActivated || new Date().toISOString(),
            daysRemaining,
            hoursRemaining,
          });
        } else {
          setLicenseInfo({
            isValid: false,
            key: savedKey || undefined,
            error: data.error || 'License expired or invalid.',
          });
        }
      }
    } catch (err) {
      if (savedExpires && new Date(savedExpires).getTime() > Date.now() && (savedToken || savedKey)) {
        const now = Date.now();
        const exp = new Date(savedExpires).getTime();
        const diffMs = Math.max(0, exp - now);
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
        setLicenseInfo({
          isValid: true,
          key: savedKey || 'ACTIVE-LICENSE',
          status: 'active',
          expiresAt: savedExpires,
          activatedAt: savedActivated || new Date().toISOString(),
          daysRemaining,
          hoursRemaining,
        });
      } else {
        setLicenseInfo({
          isValid: false,
          key: savedKey || undefined,
          error: 'Unable to connect to license validation server.',
        });
      }
    }
  };

  useEffect(() => {
    verifyLicense();
  }, []);

  // Check server health on load
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.hasDefaultApiKey === 'boolean') {
          setServerHasApiKey(data.hasDefaultApiKey);
        }
      })
      .catch((err) => {
        console.warn('Health check failed:', err);
      });
  }, []);

  // Save options and settings to localStorage
  useEffect(() => {
    localStorage.setItem('genmeta_options', JSON.stringify(options));
  }, [options]);

  useEffect(() => {
    localStorage.setItem('genmeta_settings', JSON.stringify(settings));
  }, [settings]);

  // Synchronize documentElement dark mode class with appearance setting
  useEffect(() => {
    if (settings.appearance === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.appearance]);

  const toggleTheme = () => {
    setSettings((prev) => {
      const next = prev.appearance === 'dark' ? 'light' : 'dark';
      return { ...prev, appearance: next };
    });
  };

  // Handle file addition (Images: JPG, PNG, WEBP; Vectors: EPS, SVG; Videos: MP4, MOV)
  const handleFilesSelected = async (newFiles: File[]) => {
    setErrorMessage(null);
    const supportedFiles = newFiles.filter(isSupportedMedia);

    if (supportedFiles.length === 0) {
      setErrorMessage('Please upload supported files: Images (JPG, PNG, WEBP), Vectors (EPS, SVG), or Videos (MP4, MOV).');
      return;
    }

    const items: ImageItem[] = [];

    for (const file of supportedFiles) {
      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      try {
        const processed = await processMediaFile(file);
        items.push({
          id,
          file,
          filename: file.name,
          size: file.size,
          mimeType: processed.mimeType,
          dataUrl: processed.dataUrl,
          mediaKind: processed.mediaKind,
          dimensions: processed.dimensions,
          videoDuration: processed.videoDuration,
          status: 'idle',
        });
      } catch (err: any) {
        console.error(`Error preparing file ${file.name}:`, err);
      }
    }

    if (items.length > 0) {
      setFiles((prev) => {
        const updated = [...prev, ...items];
        if (!selectedId && updated.length > 0) {
          setSelectedId(updated[0].id);
        }
        return updated;
      });
    }
  };

  // Auto-dismiss failover toast notification after 7 seconds
  useEffect(() => {
    if (failoverNotification) {
      const timer = setTimeout(() => {
        setFailoverNotification(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [failoverNotification]);

  // Execute Mistral AI Vision analysis
  const executeMistralAnalysis = async (
    item: ImageItem,
    keyIndex: number
  ): Promise<{ result?: AnalysisResult; error?: string; quotaExceeded?: boolean; invalidKey?: boolean }> => {
    const mistralKeys = (settings.mistralKeys || []).map((k) => k.key).filter(Boolean);
    const selectedModel = settings.mistralModel || 'mistral-small-latest';
    const validDataUrl = await ensureBase64DataUrl(item.dataUrl);

    // 1. Direct browser client execution first (bypasses server, handles model fallback)
    if (mistralKeys.length > 0) {
      try {
        const clientResult = await analyzeImageWithMistral(
          validDataUrl,
          item.mimeType,
          item.filename,
          {
            generationMode: options.generationMode || 'both',
            titleLength: options.titleLengthMode === 'auto' ? 'auto' : options.titleLength,
            titleLengthMode: options.titleLengthMode,
            descriptionLength: options.descriptionLength,
            keywordCount: options.keywordCount,
            keywordFormat: options.keywordFormat,
            model: selectedModel,
          },
          mistralKeys
        );

        if (clientResult && (clientResult.prompt || clientResult.metadata)) {
          return { result: clientResult as AnalysisResult };
        }
      } catch (clientErr: any) {
        const errMsg = String(clientErr?.message || clientErr || '');
        const isQuota =
          errMsg.includes('429') ||
          errMsg.toLowerCase().includes('quota') ||
          errMsg.toLowerCase().includes('rate limit') ||
          errMsg.toLowerCase().includes('capacity');
        if (isQuota) {
          return { error: errMsg, quotaExceeded: true };
        }
        console.warn('Direct Mistral client encountered an issue, trying backend fallback:', errMsg);
      }
    }

    // 2. Backend proxy fallback (/api/analyze-mistral)
    let customMistralKey: string | undefined = undefined;
    if (mistralKeys.length > 0) {
      customMistralKey = mistralKeys[keyIndex % mistralKeys.length];
    }

    try {
      const currentLicKey = licenseInfo?.key || localStorage.getItem('genmeta_license_key') || '';
      const currentLicToken = localStorage.getItem('genmeta_license_token') || '';
      const response = await fetch('/api/analyze-mistral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-license-key': currentLicKey,
          'x-license-token': currentLicToken,
        },
        body: JSON.stringify({
          image: validDataUrl,
          mimeType: item.mimeType,
          filename: item.filename,
          options: {
            generationMode: options.generationMode || 'both',
            titleLength: options.titleLengthMode === 'auto' ? 'auto' : options.titleLength,
            titleLengthMode: options.titleLengthMode,
            descriptionLength: options.descriptionLength,
            keywordCount: options.keywordCount,
            keywordFormat: options.keywordFormat,
            temperature: settings.temperature,
            apiKey: customMistralKey,
            apiKeys: mistralKeys,
            model: selectedModel,
            licenseKey: currentLicKey,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403 || data.requiresLicense) {
          setLicenseInfo({ isValid: false, error: data.error || 'A valid 30-day License Key is required.' });
          setIsLicenseModalOpen(true);
        }
        return {
          error: data.error || 'Failed to analyze image with Mistral AI',
          quotaExceeded: Boolean(data.quotaExceeded || response.status === 429),
          invalidKey: Boolean(data.invalidKey || response.status === 401),
        };
      }

      return { result: data };
    } catch (err: any) {
      return { error: err.message || 'Mistral analysis error' };
    }
  };

  // Execute Google Gemini Vision analysis
  const executeGeminiAnalysis = async (
    item: ImageItem,
    keyIndex: number
  ): Promise<{ result?: AnalysisResult; error?: string; quotaExceeded?: boolean; invalidKey?: boolean }> => {
    const userKeys = settings.apiKeys.map((k) => k.key).filter(Boolean);
    const validDataUrl = await ensureBase64DataUrl(item.dataUrl);

    if (userKeys.length > 0) {
      try {
        const clientResult = await analyzeImageDirectClient(
          validDataUrl,
          item.mimeType,
          item.filename,
          {
            generationMode: options.generationMode || 'both',
            titleLength: options.titleLengthMode === 'auto' ? 'auto' : options.titleLength,
            titleLengthMode: options.titleLengthMode,
            descriptionLength: options.descriptionLength,
            keywordCount: options.keywordCount,
            keywordFormat: options.keywordFormat,
          },
          userKeys
        );

        if (clientResult && (clientResult.prompt || clientResult.metadata)) {
          return { result: clientResult as AnalysisResult };
        }
      } catch (clientErr: any) {
        const errMsg = String(clientErr?.message || clientErr || '');
        const isQuota =
          errMsg.includes('429') ||
          errMsg.toLowerCase().includes('quota') ||
          errMsg.toLowerCase().includes('resource exhausted');
        if (isQuota) {
          return { error: errMsg, quotaExceeded: true };
        }
        console.warn('Direct browser generation encountered an issue, trying backend fallback:', errMsg);
      }
    }

    let customKey: string | undefined = undefined;
    if (settings.apiKeys.length > 0) {
      customKey = settings.apiKeys[keyIndex % settings.apiKeys.length].key;
    }

    try {
      const currentLicKey = licenseInfo?.key || localStorage.getItem('genmeta_license_key') || '';
      const currentLicToken = localStorage.getItem('genmeta_license_token') || '';
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-license-key': currentLicKey,
          'x-license-token': currentLicToken,
        },
        body: JSON.stringify({
          image: validDataUrl,
          mimeType: item.mimeType,
          filename: item.filename,
          options: {
            generationMode: options.generationMode || 'both',
            titleLength: options.titleLengthMode === 'auto' ? 'auto' : options.titleLength,
            titleLengthMode: options.titleLengthMode,
            descriptionLength: options.descriptionLength,
            keywordCount: options.keywordCount,
            keywordFormat: options.keywordFormat,
            temperature: settings.temperature,
            apiKey: customKey,
            apiKeys: settings.apiKeys.map((k) => k.key),
            licenseKey: currentLicKey,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403 || data.requiresLicense) {
          setLicenseInfo({ isValid: false, error: data.error || 'A valid 30-day License Key is required.' });
          setIsLicenseModalOpen(true);
        }
        return {
          error: data.error || 'Failed to analyze image with Gemini',
          quotaExceeded: Boolean(data.quotaExceeded || response.status === 429),
          invalidKey: Boolean(data.invalidKey || response.status === 401),
        };
      }

      return { result: data };
    } catch (err: any) {
      return { error: err.message || 'Analysis error' };
    }
  };

  // Execute Third-Party Vision analysis (OpenRouter, DeepSeek, Groq, OpenAI)
  const executeThirdPartyAnalysis = async (
    provider: SupportedThirdPartyProvider,
    item: ImageItem,
    keyIndex: number
  ): Promise<{ result?: AnalysisResult; error?: string; quotaExceeded?: boolean; invalidKey?: boolean }> => {
    let keyList: string[] = [];
    let selectedModel: string | undefined = undefined;

    if (provider === 'openrouter') {
      keyList = (settings.openrouterKeys || []).map((k) => k.key).filter(Boolean);
      selectedModel = settings.openrouterModel || 'google/gemini-2.0-flash-001';
    } else if (provider === 'deepseek') {
      keyList = (settings.deepseekKeys || []).map((k) => k.key).filter(Boolean);
      selectedModel = settings.deepseekModel || 'deepseek-chat';
    } else if (provider === 'groq') {
      keyList = (settings.groqKeys || []).map((k) => k.key).filter(Boolean);
      selectedModel = settings.groqModel || 'llama-3.2-11b-vision-preview';
    } else if (provider === 'openai') {
      keyList = (settings.openaiKeys || []).map((k) => k.key).filter(Boolean);
      selectedModel = settings.openaiModel || 'gpt-4o-mini';
    } else if (provider === 'zai') {
      keyList = (settings.zaiKeys || []).map((k) => k.key).filter(Boolean);
      selectedModel = settings.zaiModel || 'glm-4v-flash';
    } else if (provider === 'thehive') {
      keyList = (settings.thehiveKeys || []).map((k) => k.key).filter(Boolean);
      selectedModel = settings.thehiveModel || 'hive-vision-language-model';
    } else if (provider === 'huggingface') {
      keyList = (settings.huggingfaceKeys || []).map((k) => k.key).filter(Boolean);
      selectedModel = settings.huggingfaceModel || 'meta-llama/Llama-3.2-11B-Vision-Instruct';
    } else if (provider === 'github') {
      keyList = (settings.githubKeys || []).map((k) => k.key).filter(Boolean);
      selectedModel = settings.githubModel || 'gpt-4o-mini';
    } else if (provider === 'sambanova') {
      keyList = (settings.sambanovaKeys || []).map((k) => k.key).filter(Boolean);
      selectedModel = settings.sambanovaModel || 'Llama-3.2-11B-Vision-Instruct';
    } else if (provider === 'cerebras') {
      keyList = (settings.cerebrasKeys || []).map((k) => k.key).filter(Boolean);
      selectedModel = settings.cerebrasModel || 'llama3.1-8b';
    }

    if (keyList.length === 0) {
      return { error: `No API keys configured for ${provider.toUpperCase()}` };
    }

    const validDataUrl = await ensureBase64DataUrl(item.dataUrl);
    // Rotate keys based on keyIndex
    const rotatedKeys = [...keyList.slice(keyIndex % keyList.length), ...keyList.slice(0, keyIndex % keyList.length)];

    try {
      const result = await analyzeImageWithThirdParty(
        provider,
        validDataUrl,
        item.mimeType,
        item.filename,
        {
          generationMode: options.generationMode || 'both',
          titleLength: options.titleLengthMode === 'auto' ? 'auto' : options.titleLength,
          titleLengthMode: options.titleLengthMode,
          descriptionLength: options.descriptionLength,
          keywordCount: options.keywordCount,
          keywordFormat: options.keywordFormat,
          model: selectedModel,
          temperature: settings.temperature,
        },
        rotatedKeys
      );

      if (result) {
        return { result };
      }
      return { error: `Failed to analyze image with ${provider.toUpperCase()}` };
    } catch (err: any) {
      const errMsg = err?.message || `${provider} analysis error`;
      const isQuota = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate limit');
      const isInvalid = errMsg.includes('401') || errMsg.toLowerCase().includes('invalid key');
      return {
        error: errMsg,
        quotaExceeded: isQuota,
        invalidKey: isInvalid,
      };
    }
  };

  // Helper to get available keys count per provider
  const getProviderKeyCount = (prov: AiProvider): number => {
    if (prov === 'gemini') return settings.apiKeys.length + (serverHasApiKey ? 1 : 0);
    if (prov === 'mistral') return (settings.mistralKeys || []).length;
    if (prov === 'openrouter') return (settings.openrouterKeys || []).length;
    if (prov === 'deepseek') return (settings.deepseekKeys || []).length;
    if (prov === 'groq') return (settings.groqKeys || []).length;
    if (prov === 'openai') return (settings.openaiKeys || []).length;
    if (prov === 'zai') return (settings.zaiKeys || []).length;
    if (prov === 'thehive') return (settings.thehiveKeys || []).length;
    if (prov === 'huggingface') return (settings.huggingfaceKeys || []).length;
    if (prov === 'github') return (settings.githubKeys || []).length;
    if (prov === 'sambanova') return (settings.sambanovaKeys || []).length;
    if (prov === 'cerebras') return (settings.cerebrasKeys || []).length;
    return 0;
  };

  // Analyze a single image item with smart automatic failover between available providers
  const analyzeSingleImage = async (
    item: ImageItem,
    keyIndex: number,
    providerOverride?: AiProvider
  ): Promise<{
    result?: AnalysisResult;
    error?: string;
    quotaExceeded?: boolean;
    invalidKey?: boolean;
    switchedProvider?: AiProvider;
  }> => {
    const activeProv = providerOverride || settings.activeProvider || 'gemini';
    const autoFailoverEnabled = settings.autoFailover !== false;

    const executeByProvider = async (p: AiProvider, kIdx: number) => {
      if (p === 'gemini') return await executeGeminiAnalysis(item, kIdx);
      if (p === 'mistral') return await executeMistralAnalysis(item, kIdx);
      return await executeThirdPartyAnalysis(p as SupportedThirdPartyProvider, item, kIdx);
    };

    // 1. Try active provider
    const primaryRes = await executeByProvider(activeProv, keyIndex);
    if (primaryRes.result) {
      return primaryRes;
    }

    // 2. Check if failover is required due to quota/rate limits
    const isQuota = Boolean(
      primaryRes.quotaExceeded ||
      primaryRes.error?.includes('429') ||
      primaryRes.error?.toLowerCase().includes('quota') ||
      primaryRes.error?.toLowerCase().includes('rate limit') ||
      primaryRes.error?.toLowerCase().includes('resource exhausted')
    );

    if (isQuota && autoFailoverEnabled) {
      // Find candidate alternate providers that have keys configured
      const allProviders: AiProvider[] = [
        'gemini',
        'mistral',
        'openrouter',
        'deepseek',
        'groq',
        'openai',
        'zai',
        'thehive',
        'huggingface',
        'github',
        'sambanova',
        'cerebras',
      ];
      const alternates = allProviders.filter((p) => p !== activeProv && getProviderKeyCount(p) > 0);

      for (const altProv of alternates) {
        console.warn(`${activeProv} quota reached. Seamlessly switching to ${altProv} to continue processing...`);
        setFailoverNotification(
          `${activeProv.toUpperCase()} quota limit reached. Seamlessly switched to ${altProv.toUpperCase()} to continue processing!`
        );

        setSettings((prev) => {
          const updated = { ...prev, activeProvider: altProv };
          localStorage.setItem('genmeta_settings', JSON.stringify(updated));
          return updated;
        });

        const altRes = await executeByProvider(altProv, 0);
        if (altRes.result) {
          return { ...altRes, switchedProvider: altProv };
        }
        if (!altRes.quotaExceeded) {
          return { ...altRes, switchedProvider: altProv };
        }
      }

      return {
        error: `All configured AI provider quotas have been reached. Please add or rotate your API keys.`,
        quotaExceeded: true,
      };
    }

    return primaryRes;
  };

  // Start batch or pending generation
  const handleStartGeneration = async () => {
    if (files.length === 0) return;

    let currentProvider: AiProvider = settings.activeProvider || 'gemini';
    const allProviders: AiProvider[] = [
      'gemini',
      'mistral',
      'openrouter',
      'deepseek',
      'groq',
      'openai',
      'zai',
      'thehive',
      'huggingface',
      'github',
      'sambanova',
      'cerebras',
    ];
    const providersWithKeys = allProviders.filter((p) => getProviderKeyCount(p) > 0);

    if (providersWithKeys.length === 0) {
      setErrorMessage('At least one API key is required. Please configure your key in Settings.');
      setSettingsDefaultTab('api');
      setIsSettingsOpen(true);
      return;
    }

    // Auto-select provider with keys if current has none
    if (getProviderKeyCount(currentProvider) === 0) {
      currentProvider = providersWithKeys[0];
      setSettings((prev) => ({ ...prev, activeProvider: currentProvider }));
    }

    setIsProcessing(true);
    setErrorMessage(null);
    abortRef.current = false;

    // Determine which files to process (pending or error ones, or all if none completed)
    const targets = files.filter((f) => f.status !== 'completed');
    const toProcess = targets.length > 0 ? targets : files;

    let currentRotationKeyIndex = 0;

    for (let i = 0; i < toProcess.length; i++) {
      if (abortRef.current) break;

      const currentItem = toProcess[i];
      setSelectedId(currentItem.id);

      // Mark current item analyzing
      setFiles((prev) =>
        prev.map((f) => (f.id === currentItem.id ? { ...f, status: 'analyzing', error: undefined } : f))
      );

      const { result, error, quotaExceeded, switchedProvider } = await analyzeSingleImage(
        currentItem,
        currentRotationKeyIndex,
        currentProvider
      );
      currentRotationKeyIndex++;

      // If auto-failover occurred, keep the new provider active for subsequent items
      if (switchedProvider) {
        currentProvider = switchedProvider;
      }

      if (abortRef.current) break;

      if (result) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === currentItem.id
              ? { ...f, status: 'completed', result, error: undefined }
              : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === currentItem.id
              ? { ...f, status: 'error', error: error || 'Failed to analyze' }
              : f
          )
        );

        if (quotaExceeded) {
          setErrorMessage(error || 'All available AI provider quotas have been exhausted. Please add or rotate your API keys in Settings.');
          setSettingsDefaultTab('api');
          setIsSettingsOpen(true);
          break; // Stop remaining queue when both providers are completely exhausted
        }
      }
    }

    setIsProcessing(false);
  };

  // Re-analyze a single specific file
  const handleReanalyzeSingle = async (id: string) => {
    const item = files.find((f) => f.id === id);
    if (!item || isProcessing) return;

    setIsProcessing(true);
    setSelectedId(id);
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'analyzing', error: undefined } : f))
    );

    const { result, error } = await analyzeSingleImage(item, 0);

    if (result) {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'completed', result, error: undefined } : f))
      );
    } else {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'error', error: error || 'Failed to analyze' } : f))
      );
    }

    setIsProcessing(false);
  };

  const handleAbort = () => {
    abortRef.current = true;
    setIsProcessing(false);
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (selectedId === id) {
        setSelectedId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  };

  const handleClearAll = () => {
    if (isProcessing) return;
    setFiles([]);
    setSelectedId(null);
    setErrorMessage(null);
  };

  // Export prompts as .txt (strictly NO filename inside prompts!)
  const handleExportPrompts = () => {
    const textContent = generatePromptsTextFile(files);
    if (!textContent) {
      setErrorMessage('No completed prompts available to download.');
      return;
    }
    const timestamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(textContent, `GenMeta_Prompts_${timestamp}.txt`, 'text/plain');
  };

  // Export metadata as CSV
  const handleExportCsv = (platform?: CsvPlatform) => {
    const targetPlatform = platform || settings.csvPlatformPreset;
    const csvContent = generateStockCsv(files, targetPlatform);
    if (!csvContent) {
      setErrorMessage('No completed metadata available to download.');
      return;
    }
    const timestamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      csvContent,
      `GenMeta_${targetPlatform.toUpperCase()}_Metadata_${timestamp}.csv`,
      'text/csv'
    );
  };

  // Rename Files and embed generated Title, Description & Keywords metadata
  const handleRenameFiles = async () => {
    if (isRenaming) return;
    const completedWithMeta = files.filter((f) => f.status === 'completed' && f.result?.metadata?.title);
    if (completedWithMeta.length === 0) {
      setErrorMessage('Please generate metadata for your files before renaming.');
      return;
    }

    setIsRenaming(true);
    setRenameNotification(null);

    try {
      const result = await executeRenameFiles(files, (current, total, filename) => {
        setRenameProgress({ current, total, filename });
      });

      if (result.success) {
        const msg = result.method === 'filesystem'
          ? `Successfully renamed and saved ${result.count} file(s) with embedded Title, Description & Keywords into your folder!`
          : result.method === 'zip'
          ? `Successfully renamed and packaged ${result.count} file(s) with embedded metadata (ZIP downloaded)!`
          : `Successfully renamed and downloaded ${result.count} file with embedded metadata!`;
        setRenameNotification({ type: 'success', message: msg });
      } else if (result.error) {
        setRenameNotification({ type: 'error', message: result.error });
      }
    } catch (err: any) {
      setRenameNotification({ type: 'error', message: err?.message || 'Failed to rename files.' });
    } finally {
      setIsRenaming(false);
      setRenameProgress(null);
    }
  };

  // Rename a single specific file
  const handleRenameSingleFile = async (item: ImageItem) => {
    if (isRenaming || !item.result?.metadata?.title) return;
    setIsRenaming(true);
    setRenameNotification(null);
    try {
      const result = await executeRenameFiles([item]);
      if (result.success) {
        setRenameNotification({
          type: 'success',
          message: `Successfully renamed "${item.filename}" to "${item.result.metadata.title}" with embedded metadata!`,
        });
      } else if (result.error) {
        setRenameNotification({ type: 'error', message: result.error });
      }
    } catch (err: any) {
      setRenameNotification({ type: 'error', message: err?.message || 'Failed to rename file.' });
    } finally {
      setIsRenaming(false);
    }
  };

  const selectedItem = files.find((f) => f.id === selectedId) || null;
  const completedCount = files.filter((f) => f.status === 'completed').length;
  const hasValidKey = serverHasApiKey || settings.apiKeys.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 transition-colors">
      {/* Hidden file input for "Add More" */}
      <input
        type="file"
        ref={addMoreInputRef}
        multiple
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Top Header */}
      <Header
        files={files}
        selectedId={selectedId}
        onSelectFile={setSelectedId}
        isProcessing={isProcessing}
        onAbort={handleAbort}
        onOpenSettings={() => {
          setSettingsDefaultTab('api');
          setIsSettingsOpen(true);
        }}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenNotice={() => setIsNoticeOpen(true)}
        onOpenSoftwareSelling={() => setIsSoftwareSellingOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenLicense={() => {
          setLicenseModalDefaultTab('admin');
          setIsLicenseModalOpen(true);
        }}
        isLicenseActive={Boolean(licenseInfo?.isValid)}
        licenseDaysRemaining={licenseInfo?.daysRemaining}
        hasApiKey={settings.apiKeys.length > 0}
        appearance={settings.appearance}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
        {/* If License is not valid, lock the application interface */}
        {!licenseInfo?.isValid ? (
          <LockedScreen
            onActivateSuccess={(info) => {
              setLicenseInfo(info);
              setErrorMessage(null);
            }}
            onOpenLicenseModal={() => {
              setLicenseModalDefaultTab('admin');
              setIsLicenseModalOpen(true);
            }}
            currentError={licenseInfo?.error}
          />
        ) : files.length === 0 ? (
          <div className="py-6 md:py-12">
            <UploadZone
              fileCount={files.length}
              onFilesSelected={handleFilesSelected}
              options={options}
              onChangeOptions={(newOpts) => setOptions((prev) => ({ ...prev, ...newOpts }))}
              onStartGeneration={handleStartGeneration}
              isProcessing={isProcessing}
              canGenerate={files.length > 0 && !isProcessing}
              errorMessage={errorMessage}
              hasApiKeys={settings.apiKeys.length > 0}
              onOpenApiKeySettings={() => {
                setSettingsDefaultTab('api');
                setIsSettingsOpen(true);
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Queue / Thumbnail File List */}
            <FileList
              files={files}
              selectedId={selectedId}
              onSelectFile={setSelectedId}
              onRemoveFile={handleRemoveFile}
              onClearAll={handleClearAll}
              onExportPrompts={handleExportPrompts}
              onExportCsv={handleExportCsv}
              onRenameFiles={handleRenameFiles}
              isRenaming={isRenaming}
              onAddMoreFiles={() => addMoreInputRef.current?.click()}
              activePlatform={settings.csvPlatformPreset}
              onChangePlatform={(platform) => setSettings((prev) => ({ ...prev, csvPlatformPreset: platform }))}
              isProcessing={isProcessing}
            />

            {/* If not completed yet, show upload controls bar or action */}
            {completedCount === 0 && !isProcessing && (
              <div className="w-full max-w-5xl mx-auto mb-6">
                <UploadZone
                  fileCount={files.length}
                  onFilesSelected={handleFilesSelected}
                  options={options}
                  onChangeOptions={(newOpts) => setOptions((prev) => ({ ...prev, ...newOpts }))}
                  onStartGeneration={handleStartGeneration}
                  isProcessing={isProcessing}
                  canGenerate={files.length > 0 && !isProcessing}
                  errorMessage={errorMessage}
                  hasApiKeys={settings.apiKeys.length > 0}
                  onOpenApiKeySettings={() => {
                    setSettingsDefaultTab('api');
                    setIsSettingsOpen(true);
                  }}
                />
              </div>
            )}

            {/* Detailed Inspector for Selected Image */}
            {selectedItem && (
              <ResultView
                item={selectedItem}
                onReanalyze={handleReanalyzeSingle}
                isProcessing={isProcessing}
                activePlatform={settings.csvPlatformPreset}
                onRenameSingle={handleRenameSingleFile}
                isRenaming={isRenaming}
                onOpenSettings={() => {
                  setSettingsDefaultTab('api');
                  setIsSettingsOpen(true);
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Rename File Notification Toast */}
      {renameNotification && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md p-4 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border ${
            renameNotification.type === 'error' ? 'border-rose-500/60' : 'border-emerald-500/60'
          } flex items-start justify-between gap-3 text-xs animate-in slide-in-from-bottom-3 duration-200`}
        >
          <div className="flex items-start gap-2.5">
            {renameNotification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-white">
                {renameNotification.type === 'error' ? 'Rename File Error' : 'Rename File Complete'}
              </p>
              <p className="text-slate-300 mt-0.5 leading-relaxed">{renameNotification.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRenameNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Renaming Progress Toast */}
      {isRenaming && renameProgress && (
        <div className="fixed bottom-6 left-6 z-50 max-w-md p-4 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-blue-500/60 flex items-center gap-3 text-xs animate-in slide-in-from-bottom-3 duration-200">
          <Loader2 className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
          <div>
            <p className="font-semibold text-white">Renaming & Embedding Metadata...</p>
            <p className="text-slate-300 mt-0.5">
              Processing {renameProgress.current} of {renameProgress.total}: {renameProgress.filename}
            </p>
          </div>
        </div>
      )}

      {/* Smart Auto-Failover Notification Toast */}
      {failoverNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-indigo-500/40 flex items-start justify-between gap-3 text-xs animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start gap-2.5">
            <RotateCw className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '4s' }} />
            <div>
              <p className="font-semibold text-white">Smart Auto-Failover Triggered</p>
              <p className="text-slate-300 mt-0.5 leading-relaxed">{failoverNotification}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFailoverNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings((prev) => ({ ...prev, ...newSettings }))}
        serverHasApiKey={serverHasApiKey}
        defaultTab={settingsDefaultTab}
      />

      <NoticeModal isOpen={isNoticeOpen} onClose={() => setIsNoticeOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        settings={settings}
        serverHasApiKey={serverHasApiKey}
        onOpenSettings={() => {
          setIsAccountOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* License Key & Admin Portal Modal */}
      <LicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        licenseInfo={licenseInfo}
        onActivateSuccess={(info) => {
          setLicenseInfo(info);
          setErrorMessage(null);
        }}
        defaultTab={licenseModalDefaultTab}
      />

      {/* Full Window Software Selling — Licensed & Custom Platform View */}
      <SoftwareSellingView
        isOpen={isSoftwareSellingOpen}
        onClose={() => setIsSoftwareSellingOpen(false)}
        appearance={settings.appearance}
      />
    </div>
  );
}
