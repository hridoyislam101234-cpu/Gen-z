import React, { useState } from 'react';
import {
  X,
  Sliders,
  Key,
  FileSpreadsheet,
  Palette,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Check,
  RotateCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  Sparkles,
  Cpu,
  Layers,
  Zap,
  Bot,
  BrainCircuit,
  Globe,
  Hexagon,
  Smile,
  GitBranch,
  CloudLightning,
  Boxes,
} from 'lucide-react';
import { AppSettings, ApiKeyItem, CsvPlatform, AiProvider, MistralVisionModel } from '../types';
import { testGeminiApiKey } from '../services/geminiClient';
import { testMistralApiKey, MISTRAL_VISION_MODELS } from '../services/mistralClient';
import {
  testThirdPartyApiKey,
  SupportedThirdPartyProvider,
  OPENROUTER_MODELS,
  GROQ_MODELS,
  OPENAI_MODELS,
  DEEPSEEK_MODELS,
  ZAI_MODELS,
  THEHIVE_MODELS,
  HUGGINGFACE_MODELS,
  GITHUB_MODELS,
  SAMBANOVA_MODELS,
  CEREBRAS_MODELS,
} from '../services/thirdPartyClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  serverHasApiKey: boolean;
  defaultTab?: 'ai' | 'api' | 'csv' | 'appearance';
}

interface ProviderMeta {
  id: AiProvider;
  name: string;
  badge: string;
  badgeColor: string;
  subBadgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  keyUrl: string;
  keyUrlLabel: string;
  keyPlaceholder: string;
  colorBorder: string;
  colorText: string;
  colorBg: string;
  description: string;
}

const PROVIDERS_CONFIG: ProviderMeta[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Multimodal Flash',
    badgeColor: 'bg-blue-100 text-blue-800',
    subBadgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Sparkles,
    keyUrl: 'https://aistudio.google.com/app/api-keys',
    keyUrlLabel: 'aistudio.google.com',
    keyPlaceholder: 'AIzaSy... from Google AI Studio',
    colorBorder: 'border-blue-600',
    colorText: 'text-blue-600',
    colorBg: 'bg-blue-600',
    description: 'High precision Gemini 3.8 Flash multimodal vision model.',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    badge: 'Pixtral Vision',
    badgeColor: 'bg-indigo-100 text-indigo-800',
    subBadgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Cpu,
    keyUrl: 'https://console.mistral.ai/api-keys',
    keyUrlLabel: 'console.mistral.ai',
    keyPlaceholder: 'Mistral API key (from console.mistral.ai)',
    colorBorder: 'border-indigo-600',
    colorText: 'text-indigo-600',
    colorBg: 'bg-indigo-600',
    description: 'Pixtral 12B & Mistral Small/Medium/Large vision capability.',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Multi-Model Routing',
    badgeColor: 'bg-purple-100 text-purple-800',
    subBadgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Layers,
    keyUrl: 'https://openrouter.ai/workspaces/default/keys',
    keyUrlLabel: 'openrouter.ai/workspaces/default/keys',
    keyPlaceholder: 'sk-or-v1-... from OpenRouter',
    colorBorder: 'border-purple-600',
    colorText: 'text-purple-600',
    colorBg: 'bg-purple-600',
    description: 'Unified gateway to 100+ vision models with automatic failover.',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'DeepSeek V3',
    badgeColor: 'bg-cyan-100 text-cyan-800',
    subBadgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    icon: BrainCircuit,
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyUrlLabel: 'platform.deepseek.com/api_keys',
    keyPlaceholder: 'sk-... from DeepSeek Platform',
    colorBorder: 'border-cyan-600',
    colorText: 'text-cyan-600',
    colorBg: 'bg-cyan-600',
    description: 'DeepSeek intelligent image classification & commercial keywords.',
  },
  {
    id: 'groq',
    name: 'Groq',
    badge: 'LPU Ultra-Fast',
    badgeColor: 'bg-amber-100 text-amber-800',
    subBadgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Zap,
    keyUrl: 'https://console.groq.com/keys',
    keyUrlLabel: 'console.groq.com/keys',
    keyPlaceholder: 'gsk_... from Groq Console',
    colorBorder: 'border-amber-600',
    colorText: 'text-amber-600',
    colorBg: 'bg-amber-600',
    description: 'Sub-second inference powered by Groq LPU with Llama 3.2 Vision.',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    badge: 'GPT-4o Vision',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    subBadgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Bot,
    keyUrl: 'https://platform.openai.com/api-keys',
    keyUrlLabel: 'platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-... from OpenAI Platform',
    colorBorder: 'border-emerald-600',
    colorText: 'text-emerald-600',
    colorBg: 'bg-emerald-600',
    description: 'Official OpenAI GPT-4o and GPT-4o mini multimodal vision.',
  },
  {
    id: 'zai',
    name: 'Z.AI',
    badge: 'GLM-4V Vision',
    badgeColor: 'bg-teal-100 text-teal-800',
    subBadgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: Globe,
    keyUrl: 'https://z.ai/manage-apikey/apikey-list',
    keyUrlLabel: 'z.ai/manage-apikey/apikey-list',
    keyPlaceholder: 'Z.AI API key (from z.ai/manage-apikey/apikey-list)',
    colorBorder: 'border-teal-600',
    colorText: 'text-teal-600',
    colorBg: 'bg-teal-600',
    description: 'GLM-4V multimodal vision for stock titles, descriptions & keywords.',
  },
  {
    id: 'thehive',
    name: 'TheHive.ai',
    badge: 'Hive AI Vision',
    badgeColor: 'bg-amber-100 text-amber-800',
    subBadgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Hexagon,
    keyUrl: 'https://thehive.ai/explore?api_keys=1',
    keyUrlLabel: 'thehive.ai/explore?api_keys=1',
    keyPlaceholder: 'TheHive API key (from thehive.ai/explore?api_keys=1)',
    colorBorder: 'border-amber-600',
    colorText: 'text-amber-600',
    colorBg: 'bg-amber-600',
    description: 'Specialized visual intelligence, image understanding & tagging.',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    badge: 'Open Vision',
    badgeColor: 'bg-yellow-100 text-yellow-800',
    subBadgeColor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: Smile,
    keyUrl: 'https://huggingface.co/settings/tokens',
    keyUrlLabel: 'huggingface.co/settings/tokens',
    keyPlaceholder: 'hf_... Access Token (from huggingface.co/settings/tokens)',
    colorBorder: 'border-yellow-500',
    colorText: 'text-yellow-600',
    colorBg: 'bg-yellow-500',
    description: 'Llama 3.2 Vision, Qwen 2.5-VL & community multimodal models.',
  },
  {
    id: 'github',
    name: 'GitHub Models',
    badge: 'Free Tier',
    badgeColor: 'bg-slate-200 text-slate-800',
    subBadgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: GitBranch,
    keyUrl: 'https://github.com/settings/tokens',
    keyUrlLabel: 'github.com/settings/tokens',
    keyPlaceholder: 'ghp_... Personal Access Token (from github.com/settings/tokens)',
    colorBorder: 'border-slate-800',
    colorText: 'text-slate-800',
    colorBg: 'bg-slate-800',
    description: 'Free Azure-hosted GPT-4o, GPT-4o-mini & Llama 3.2 via GitHub Token.',
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    badge: 'Ultra Fast',
    badgeColor: 'bg-orange-100 text-orange-800',
    subBadgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: CloudLightning,
    keyUrl: 'https://cloud.sambanova.ai/apis',
    keyUrlLabel: 'cloud.sambanova.ai/apis',
    keyPlaceholder: 'SambaNova API key (from cloud.sambanova.ai/apis)',
    colorBorder: 'border-orange-500',
    colorText: 'text-orange-600',
    colorBg: 'bg-orange-500',
    description: 'World record speed Llama 3.2 11B & 90B Vision on SambaNova chips.',
  },
  {
    id: 'cerebras',
    name: 'Cerebras AI',
    badge: 'Wafer Scale',
    badgeColor: 'bg-rose-100 text-rose-800',
    subBadgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: Boxes,
    keyUrl: 'https://cloud.cerebras.ai/platform',
    keyUrlLabel: 'cloud.cerebras.ai/platform',
    keyPlaceholder: 'csk-... Cerebras API key (from cloud.cerebras.ai/platform)',
    colorBorder: 'border-rose-500',
    colorText: 'text-rose-600',
    colorBg: 'bg-rose-500',
    description: 'Ultra fast 2,000+ tokens/sec Llama 3.1 8B & 70B stock metadata inference.',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  serverHasApiKey,
  defaultTab = 'api',
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'api' | 'csv' | 'appearance'>(defaultTab);
  const [apiProviderTab, setApiProviderTab] = useState<AiProvider>(settings.activeProvider || 'gemini');

  // Input states per provider
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<Record<string, { ok?: boolean; message?: string; error?: string }>>({});

  // Add Key Form state per provider
  const [showAddForm, setShowAddForm] = useState<Record<AiProvider, boolean>>({
    gemini: false,
    mistral: false,
    openrouter: false,
    deepseek: false,
    groq: false,
    openai: false,
    zai: false,
    thehive: false,
    huggingface: false,
    github: false,
    sambanova: false,
    cerebras: false,
  });
  const [newKeyInputs, setNewKeyInputs] = useState<Record<AiProvider, string>>({
    gemini: '',
    mistral: '',
    openrouter: '',
    deepseek: '',
    groq: '',
    openai: '',
    zai: '',
    thehive: '',
    huggingface: '',
    github: '',
    sambanova: '',
    cerebras: '',
  });
  const [newKeyLabels, setNewKeyLabels] = useState<Record<AiProvider, string>>({
    gemini: '',
    mistral: '',
    openrouter: '',
    deepseek: '',
    groq: '',
    openai: '',
    zai: '',
    thehive: '',
    huggingface: '',
    github: '',
    sambanova: '',
    cerebras: '',
  });
  const [newKeyTesting, setNewKeyTesting] = useState<Record<AiProvider, boolean>>({
    gemini: false,
    mistral: false,
    openrouter: false,
    deepseek: false,
    groq: false,
    openai: false,
    zai: false,
    thehive: false,
    huggingface: false,
    github: false,
    sambanova: false,
    cerebras: false,
  });
  const [newKeyResults, setNewKeyResults] = useState<Record<AiProvider, { ok?: boolean; message?: string; error?: string } | null>>({
    gemini: null,
    mistral: null,
    openrouter: null,
    deepseek: null,
    groq: null,
    openai: null,
    zai: null,
    thehive: null,
    huggingface: null,
    github: null,
    sambanova: null,
    cerebras: null,
  });

  React.useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  // Key retrieval helper
  const getKeysForProvider = (provider: AiProvider): ApiKeyItem[] => {
    switch (provider) {
      case 'gemini':
        return settings.apiKeys || [];
      case 'mistral':
        return settings.mistralKeys || [];
      case 'openrouter':
        return settings.openrouterKeys || [];
      case 'deepseek':
        return settings.deepseekKeys || [];
      case 'groq':
        return settings.groqKeys || [];
      case 'openai':
        return settings.openaiKeys || [];
      case 'zai':
        return settings.zaiKeys || [];
      case 'thehive':
        return settings.thehiveKeys || [];
      case 'huggingface':
        return settings.huggingfaceKeys || [];
      case 'github':
        return settings.githubKeys || [];
      case 'sambanova':
        return settings.sambanovaKeys || [];
      case 'cerebras':
        return settings.cerebrasKeys || [];
      default:
        return [];
    }
  };

  // Test single key for any provider
  const testAnyKey = async (provider: AiProvider, apiKey: string, id?: string) => {
    const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '').trim();
    if (!cleanKey) return;

    if (id) {
      setTestingKeyId(id);
    } else {
      setNewKeyTesting((prev) => ({ ...prev, [provider]: true }));
      setNewKeyResults((prev) => ({ ...prev, [provider]: null }));
    }

    try {
      let result: { ok: boolean; message?: string; error?: string };
      if (provider === 'gemini') {
        result = await testGeminiApiKey(cleanKey);
      } else if (provider === 'mistral') {
        result = await testMistralApiKey(cleanKey);
      } else {
        result = await testThirdPartyApiKey(provider as SupportedThirdPartyProvider, cleanKey);
      }

      if (id) {
        setKeyStatus((prev) => ({ ...prev, [id]: result }));
      } else {
        setNewKeyResults((prev) => ({ ...prev, [provider]: result }));
      }
    } catch (err: any) {
      const result = { ok: false, error: err?.message || `Failed to verify ${provider} API key.` };
      if (id) {
        setKeyStatus((prev) => ({ ...prev, [id]: result }));
      } else {
        setNewKeyResults((prev) => ({ ...prev, [provider]: result }));
      }
    } finally {
      if (id) {
        setTestingKeyId(null);
      } else {
        setNewKeyTesting((prev) => ({ ...prev, [provider]: false }));
      }
    }
  };

  const handleSaveNewKey = (provider: AiProvider) => {
    const inputVal = newKeyInputs[provider];
    if (!inputVal || !inputVal.trim()) return;
    const cleanKey = inputVal.trim().replace(/^["']|["']$/g, '').trim();

    const currentKeys = getKeysForProvider(provider);
    const labelVal = newKeyLabels[provider]?.trim() || `${provider.toUpperCase()} Key #${currentKeys.length + 1}`;

    const newItem: ApiKeyItem = {
      id: Math.random().toString(36).substring(2, 9),
      key: cleanKey,
      label: labelVal,
      createdAt: Date.now(),
      provider,
    };

    const updateMap: Partial<AppSettings> = {};
    if (provider === 'gemini') {
      updateMap.apiKeys = [...currentKeys, newItem];
    } else if (provider === 'mistral') {
      updateMap.mistralKeys = [...currentKeys, newItem];
    } else if (provider === 'openrouter') {
      updateMap.openrouterKeys = [...currentKeys, newItem];
    } else if (provider === 'deepseek') {
      updateMap.deepseekKeys = [...currentKeys, newItem];
    } else if (provider === 'groq') {
      updateMap.groqKeys = [...currentKeys, newItem];
    } else if (provider === 'openai') {
      updateMap.openaiKeys = [...currentKeys, newItem];
    } else if (provider === 'zai') {
      updateMap.zaiKeys = [...currentKeys, newItem];
    } else if (provider === 'thehive') {
      updateMap.thehiveKeys = [...currentKeys, newItem];
    } else if (provider === 'huggingface') {
      updateMap.huggingfaceKeys = [...currentKeys, newItem];
    } else if (provider === 'github') {
      updateMap.githubKeys = [...currentKeys, newItem];
    } else if (provider === 'sambanova') {
      updateMap.sambanovaKeys = [...currentKeys, newItem];
    } else if (provider === 'cerebras') {
      updateMap.cerebrasKeys = [...currentKeys, newItem];
    }
    updateMap.activeProvider = provider;

    onUpdateSettings(updateMap);

    // Reset form for this provider
    setNewKeyInputs((prev) => ({ ...prev, [provider]: '' }));
    setNewKeyLabels((prev) => ({ ...prev, [provider]: '' }));
    setShowAddForm((prev) => ({ ...prev, [provider]: false }));
    setNewKeyResults((prev) => ({ ...prev, [provider]: null }));
  };

  const handleDeleteProviderKey = (provider: AiProvider, id: string) => {
    const currentKeys = getKeysForProvider(provider);
    const filtered = currentKeys.filter((k) => k.id !== id);

    const updateMap: Partial<AppSettings> = {};
    if (provider === 'gemini') updateMap.apiKeys = filtered;
    else if (provider === 'mistral') updateMap.mistralKeys = filtered;
    else if (provider === 'openrouter') updateMap.openrouterKeys = filtered;
    else if (provider === 'deepseek') updateMap.deepseekKeys = filtered;
    else if (provider === 'groq') updateMap.groqKeys = filtered;
    else if (provider === 'openai') updateMap.openaiKeys = filtered;
    else if (provider === 'zai') updateMap.zaiKeys = filtered;
    else if (provider === 'thehive') updateMap.thehiveKeys = filtered;
    else if (provider === 'huggingface') updateMap.huggingfaceKeys = filtered;
    else if (provider === 'github') updateMap.githubKeys = filtered;
    else if (provider === 'sambanova') updateMap.sambanovaKeys = filtered;
    else if (provider === 'cerebras') updateMap.cerebrasKeys = filtered;

    onUpdateSettings(updateMap);

    setKeyStatus((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const toggleRevealKey = (id: string) => {
    setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (key: string) => {
    if (key.length <= 10) return '••••••••••••';
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
  };

  const currentProviderConfig = PROVIDERS_CONFIG.find((p) => p.id === apiProviderTab) || PROVIDERS_CONFIG[0];
  const activeKeys = getKeysForProvider(apiProviderTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Settings & AI Configuration</h2>
            <p className="text-xs text-slate-500">Manage multiple AI keys, vision models, failover protection & microstock presets</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Tab List & Right Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 border-r border-slate-200 bg-slate-50/70 p-3 space-y-1 select-none shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>AI Parameters</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('api')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors cursor-pointer ${
                activeTab === 'api'
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>API Configuration</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('csv')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors cursor-pointer ${
                activeTab === 'csv'
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV Export</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors cursor-pointer ${
                activeTab === 'appearance'
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Appearance</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* AI PARAMETERS */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    AI Parameters & Active Provider
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select your active AI provider and fine-tune vision model parameters for prompt recreation & stock metadata.
                  </p>
                </div>

                {/* AI Provider Selector Grid (12 Models: 3 rows of 4) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Active AI Provider ({PROVIDERS_CONFIG.length} Models)
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">Top 8 models + 4 New Providers</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PROVIDERS_CONFIG.map((p) => {
                      const Icon = p.icon;
                      const isActive = (settings.activeProvider || 'gemini') === p.id;
                      const keyCount = getKeysForProvider(p.id).length + (p.id === 'gemini' && serverHasApiKey ? 1 : 0);

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onUpdateSettings({ activeProvider: p.id })}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            isActive
                              ? `${p.colorBorder} bg-slate-50 ring-2 ring-indigo-500/20 shadow-xs`
                              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 truncate">
                                <Icon className={`w-4 h-4 shrink-0 ${p.colorText}`} />
                                <span className="truncate">{p.name}</span>
                              </div>
                              {isActive && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                            </div>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md inline-block mb-1 ${p.badgeColor}`}>
                              {p.badge}
                            </span>
                            <p className="text-[10.5px] text-slate-500 leading-snug line-clamp-2">{p.description}</p>
                          </div>
                          <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <span className={keyCount > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-400 font-medium'}>
                              {keyCount} key{keyCount !== 1 ? 's' : ''}
                            </span>
                            {isActive && <span className="text-blue-600 font-bold">Selected</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Provider-Specific Model Details */}
                {(settings.activeProvider || 'gemini') === 'gemini' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Gemini Vision Model
                    </label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 flex items-center justify-between">
                      <span className="font-semibold">gemini-3.8-flash</span>
                      <span className="text-[11px] bg-blue-100 text-blue-800 font-sans px-2 py-0.5 rounded font-medium">
                        Multimodal Vision Native
                      </span>
                    </div>
                  </div>
                )}

                {settings.activeProvider === 'mistral' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Mistral AI Vision Models
                      </label>
                      <span className="text-[11px] text-indigo-600 font-semibold">100% Vision Capable</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {MISTRAL_VISION_MODELS.map((model) => {
                        const isSelected = (settings.mistralModel || 'mistral-small-latest') === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => onUpdateSettings({ mistralModel: model.id as MistralVisionModel })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/80 shadow-xs ring-1 ring-indigo-500'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-900">{model.name}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {model.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{model.description}</p>
                            <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                              ID: {model.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settings.activeProvider === 'openrouter' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        OpenRouter Vision Models
                      </label>
                      <span className="text-[11px] text-purple-600 font-semibold">Multi-Provider Gateway</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {OPENROUTER_MODELS.map((model) => {
                        const isSelected = (settings.openrouterModel || 'google/gemini-2.0-flash-001') === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => onUpdateSettings({ openrouterModel: model.id })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-purple-600 bg-purple-50/80 shadow-xs ring-1 ring-purple-500'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-900">{model.name}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {model.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{model.description}</p>
                            <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                              ID: {model.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settings.activeProvider === 'deepseek' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        DeepSeek Model
                      </label>
                      <span className="text-[11px] text-cyan-600 font-semibold">DeepSeek Platform</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {DEEPSEEK_MODELS.map((model) => {
                        const isSelected = (settings.deepseekModel || 'deepseek-chat') === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => onUpdateSettings({ deepseekModel: model.id })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-cyan-600 bg-cyan-50/80 shadow-xs ring-1 ring-cyan-500'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-900">{model.name}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {model.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{model.description}</p>
                            <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                              ID: {model.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settings.activeProvider === 'groq' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Groq Vision Models
                      </label>
                      <span className="text-[11px] text-amber-600 font-semibold">Ultra-Low Latency LPU</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {GROQ_MODELS.map((model) => {
                        const isSelected = (settings.groqModel || 'llama-3.2-11b-vision-preview') === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => onUpdateSettings({ groqModel: model.id })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-amber-600 bg-amber-50/80 shadow-xs ring-1 ring-amber-500'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-900">{model.name}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {model.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{model.description}</p>
                            <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                              ID: {model.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settings.activeProvider === 'openai' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        OpenAI Vision Models
                      </label>
                      <span className="text-[11px] text-emerald-600 font-semibold">Official OpenAI API</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {OPENAI_MODELS.map((model) => {
                        const isSelected = (settings.openaiModel || 'gpt-4o-mini') === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => onUpdateSettings({ openaiModel: model.id })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-900">{model.name}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {model.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{model.description}</p>
                            <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                              ID: {model.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settings.activeProvider === 'zai' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Z.AI (GLM-4V) Vision Models
                      </label>
                      <span className="text-[11px] text-teal-600 font-semibold">Official z.ai API</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {ZAI_MODELS.map((model) => {
                        const isSelected = (settings.zaiModel || 'glm-4v-flash') === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => onUpdateSettings({ zaiModel: model.id })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-teal-600 bg-teal-50/80 shadow-xs ring-1 ring-teal-500'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-900">{model.name}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {model.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{model.description}</p>
                            <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                              ID: {model.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settings.activeProvider === 'thehive' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        TheHive.ai Vision Models
                      </label>
                      <span className="text-[11px] text-amber-600 font-semibold">TheHive Platform</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {THEHIVE_MODELS.map((model) => {
                        const isSelected = (settings.thehiveModel || 'hive-vision-language-model') === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => onUpdateSettings({ thehiveModel: model.id })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-amber-600 bg-amber-50/80 shadow-xs ring-1 ring-amber-500'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-900">{model.name}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {model.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{model.description}</p>
                            <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                              ID: {model.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settings.activeProvider === 'huggingface' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Hugging Face Vision Models
                      </label>
                      <span className="text-[11px] text-yellow-600 font-semibold">HF Inference API</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {HUGGINGFACE_MODELS.map((model) => {
                        const isSelected = (settings.huggingfaceModel || 'meta-llama/Llama-3.2-11B-Vision-Instruct') === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => onUpdateSettings({ huggingfaceModel: model.id })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-yellow-600 bg-yellow-50/80 shadow-xs ring-1 ring-yellow-500'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-900">{model.name}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {model.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{model.description}</p>
                            <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                              ID: {model.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settings.activeProvider === 'github' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        GitHub Models (Free Tier)
                      </label>
                      <span className="text-[11px] text-slate-700 font-semibold">GitHub Marketplace</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {GITHUB_MODELS.map((model) => {
                        const isSelected = (settings.githubModel || 'gpt-4o-mini') === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => onUpdateSettings({ githubModel: model.id })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-slate-800 bg-slate-100/90 shadow-xs ring-1 ring-slate-700'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-900">{model.name}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {model.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{model.description}</p>
                            <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                              ID: {model.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settings.activeProvider === 'sambanova' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        SambaNova Cloud Vision Models
                      </label>
                      <span className="text-[11px] text-orange-600 font-semibold">SambaNova Cloud</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {SAMBANOVA_MODELS.map((model) => {
                        const isSelected = (settings.sambanovaModel || 'Llama-3.2-11B-Vision-Instruct') === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => onUpdateSettings({ sambanovaModel: model.id })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-orange-600 bg-orange-50/80 shadow-xs ring-1 ring-orange-500'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-900">{model.name}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {model.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{model.description}</p>
                            <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                              ID: {model.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settings.activeProvider === 'cerebras' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Cerebras AI Models
                      </label>
                      <span className="text-[11px] text-rose-600 font-semibold">Cerebras Wafer Cloud</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {CEREBRAS_MODELS.map((model) => {
                        const isSelected = (settings.cerebrasModel || 'llama3.1-8b') === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => onUpdateSettings({ cerebrasModel: model.id })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-rose-600 bg-rose-50/80 shadow-xs ring-1 ring-rose-500'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-900">{model.name}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {model.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{model.description}</p>
                            <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                              ID: {model.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Temperature slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Temperature ({settings.temperature})
                    </label>
                    <span className="text-xs text-slate-500">Lower = Factual Precision</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.05"
                    value={settings.temperature}
                    onChange={(e) => onUpdateSettings({ temperature: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-900">Strict Visual Grounding</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      All models are instructed to evaluate visible elements (lighting, composition, subject matter, color tones).
                      Invisible attributes or non-existent brands are never fabricated.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* API CONFIGURATION */}
            {activeTab === 'api' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-600" />
                    API Key Configuration & Failover Rotation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure API keys for 12 AI Providers: Google Gemini, Mistral AI, OpenRouter, DeepSeek, Groq, OpenAI, Z.AI, TheHive.ai, Hugging Face, GitHub Models, SambaNova, and Cerebras AI.
                    Keys rotate automatically, and smart auto-failover switches providers if a quota is reached!
                  </p>
                </div>

                {/* Provider Sub-tabs (12 providers: 3 rows of 4) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PROVIDERS_CONFIG.map((p) => {
                    const Icon = p.icon;
                    const isTabSelected = apiProviderTab === p.id;
                    const keyCount = getKeysForProvider(p.id).length;
                    const isGlobalActive = (settings.activeProvider || 'gemini') === p.id;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setApiProviderTab(p.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                          isTabSelected
                            ? `${p.colorBorder} bg-slate-50 shadow-xs ring-1 ring-blue-500/30 font-bold`
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${p.colorText}`} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1">
                              <span>{p.name}</span>
                              {isGlobalActive && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold shrink-0">
                                  Active
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] block ${keyCount > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                              {keyCount} {keyCount === 1 ? 'key' : 'keys'}
                            </span>
                          </div>
                        </div>
                        {isTabSelected && (
                          <span className={`w-2 h-2 rounded-full ${p.colorBg} shrink-0`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Smart Auto-Failover Switch & Protection Banner */}
                <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/90 to-purple-50/90 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Smart Auto-Failover Protection Across All Providers</span>
                      {settings.autoFailover !== false && (
                        <span className="px-1.5 py-0.2 text-[10px] bg-emerald-100 text-emerald-800 font-bold rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      If one provider's rate limit or quota runs out (HTTP 429), the queue automatically and seamlessly failovers to any other configured provider (Gemini, Mistral, OpenRouter, DeepSeek, Groq, OpenAI, Z.AI, TheHive.ai, Hugging Face, GitHub, SambaNova, Cerebras) without interrupting your metadata processing.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.autoFailover !== false}
                      onChange={(e) => onUpdateSettings({ autoFailover: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* ACTIVE PROVIDER SUBTAB VIEW */}
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <currentProviderConfig.icon className={`w-4 h-4 ${currentProviderConfig.colorText}`} />
                      <span className="text-xs font-medium text-slate-700">
                        {currentProviderConfig.name} API Keys ({activeKeys.length} configured)
                      </span>
                    </div>

                    {settings.activeProvider !== apiProviderTab ? (
                      <button
                        type="button"
                        onClick={() => onUpdateSettings({ activeProvider: apiProviderTab })}
                        className={`text-[11px] text-white font-semibold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${currentProviderConfig.colorBg} hover:opacity-90`}
                      >
                        Set as Active AI
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Currently Active AI
                      </span>
                    )}
                  </div>

                  {/* Action buttons & Get Key link */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setShowAddForm((prev) => ({
                          ...prev,
                          [apiProviderTab]: !prev[apiProviderTab],
                        }))
                      }
                      className={`flex-1 py-2 px-4 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer ${currentProviderConfig.colorBg} hover:opacity-90`}
                    >
                      <Plus className="w-4 h-4" />
                      Add {currentProviderConfig.name} Key
                    </button>

                    <a
                      href={currentProviderConfig.keyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {currentProviderConfig.keyUrlLabel}
                    </a>
                  </div>

                  {/* Add Key Form */}
                  {showAddForm[apiProviderTab] && (
                    <div className="p-4 border border-slate-200 bg-slate-50/70 rounded-xl space-y-3 animate-in fade-in duration-150">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Add New {currentProviderConfig.name} API Key
                      </h4>
                      <input
                        type="text"
                        placeholder={`Label (optional, e.g. ${currentProviderConfig.name} Key #1)`}
                        value={newKeyLabels[apiProviderTab]}
                        onChange={(e) =>
                          setNewKeyLabels((prev) => ({
                            ...prev,
                            [apiProviderTab]: e.target.value,
                          }))
                        }
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="password"
                        placeholder={currentProviderConfig.keyPlaceholder}
                        value={newKeyInputs[apiProviderTab]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewKeyInputs((prev) => ({ ...prev, [apiProviderTab]: val }));
                          setNewKeyResults((prev) => ({ ...prev, [apiProviderTab]: null }));
                        }}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />

                      {newKeyResults[apiProviderTab] && (
                        <div
                          className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                            newKeyResults[apiProviderTab]?.ok
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {newKeyResults[apiProviderTab]?.ok ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <span className="leading-tight">
                            {newKeyResults[apiProviderTab]?.ok
                              ? newKeyResults[apiProviderTab]?.message
                              : newKeyResults[apiProviderTab]?.error}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          disabled={!newKeyInputs[apiProviderTab].trim() || newKeyTesting[apiProviderTab]}
                          onClick={() => testAnyKey(apiProviderTab, newKeyInputs[apiProviderTab])}
                          className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {newKeyTesting[apiProviderTab] ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 text-blue-600" />
                              <span>Test Key</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddForm((prev) => ({ ...prev, [apiProviderTab]: false }));
                              setNewKeyResults((prev) => ({ ...prev, [apiProviderTab]: null }));
                            }}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-md font-medium cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!newKeyInputs[apiProviderTab].trim()}
                            onClick={() => handleSaveNewKey(apiProviderTab)}
                            className={`px-3 py-1.5 text-xs text-white rounded-md font-semibold cursor-pointer ${currentProviderConfig.colorBg} hover:opacity-90 disabled:opacity-50`}
                          >
                            Save Key
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key List */}
                  <div className="space-y-2">
                    {activeKeys.length === 0 ? (
                      <div className="p-4 border border-slate-200 bg-slate-50/70 rounded-xl text-slate-600 text-center space-y-2">
                        <p className="text-xs font-medium text-slate-700">No {currentProviderConfig.name} API keys registered yet.</p>
                        <p className="text-[11px] text-slate-500">
                          Click "{currentProviderConfig.keyUrlLabel}" to generate a key, then click "Add {currentProviderConfig.name} Key".
                        </p>
                      </div>
                    ) : (
                      activeKeys.map((k) => {
                        const status = keyStatus[k.id];
                        const isTesting = testingKeyId === k.id;

                        return (
                          <div
                            key={k.id}
                            className="p-3 border border-slate-200 rounded-lg bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-start gap-2.5 overflow-hidden">
                              <currentProviderConfig.icon className={`w-4 h-4 ${currentProviderConfig.colorText} shrink-0 mt-1`} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-800 truncate">{k.label}</span>
                                  {status?.ok && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Active
                                    </span>
                                  )}
                                  {status && !status.ok && (
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold flex items-center gap-1"
                                      title={status.error}
                                    >
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                      Error
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-mono text-slate-500">
                                  {revealedKeys[k.id] ? k.key : maskKey(k.key)}
                                </div>
                                {status && !status.ok && (
                                  <p className="text-[11px] text-rose-600 mt-1 leading-snug">{status.error}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                disabled={isTesting}
                                onClick={() => testAnyKey(apiProviderTab, k.key, k.id)}
                                className="px-2.5 py-1 text-xs text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                title={`Verify this key against ${currentProviderConfig.name}`}
                              >
                                {isTesting ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                    <span>Testing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 text-blue-600" />
                                    <span>Test</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleRevealKey(k.id)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 cursor-pointer"
                                title={revealedKeys[k.id] ? 'Hide key' : 'Show key'}
                              >
                                {revealedKeys[k.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProviderKey(apiProviderTab, k.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                                title="Delete key"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500 flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <RotateCw className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    Multiple keys per provider are automatically rotated with each image request. If any provider hits a rate limit or quota exhaustion, smart failover immediately routes to an available alternate model.
                  </span>
                </div>
              </div>
            )}

            {/* CSV EXPORT */}
            {activeTab === 'csv' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    CSV Export Presets
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure the standard microstock format for 1-click batch download.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Target Stock Platform
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'adobe', label: 'Adobe Stock', cols: 'Filename, Title, Keywords, Category' },
                      { id: 'shutterstock', label: 'Shutterstock', cols: 'Filename, Description, Keywords, Categories' },
                      { id: 'freepik', label: 'Freepik', cols: 'Filename, Title, Keywords' },
                      { id: 'dreamstime', label: 'Dreamstime', cols: 'Filename, Title, Description, Keywords, Category' },
                      { id: '123rf', label: '123RF', cols: 'Filename, Title, Description, Keywords, Country' },
                      { id: 'alamy', label: 'Alamy', cols: 'Filename, Title, Description, Tags, Category' },
                      { id: 'universal', label: 'Universal (All)', cols: 'Filename, Title, Description, Keywords, Category, Prompt' },
                    ].map((platform) => (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => onUpdateSettings({ csvPlatformPreset: platform.id as CsvPlatform })}
                        className={`p-3 text-left border rounded-lg transition-all cursor-pointer ${
                          settings.csvPlatformPreset === platform.id
                            ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">{platform.label}</span>
                          {settings.csvPlatformPreset === platform.id && (
                            <Check className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 block mt-1 truncate">
                          {platform.cols}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  💡 <strong>Microstock Tip:</strong> All generated CSV files use RFC 4180 quotation rules and UTF-8 BOM
                  so special characters and commas import seamlessly into Adobe Stock Contributor Portal, Shutterstock
                  Catalog Manager, and spreadsheet editors.
                </div>
              </div>
            )}

            {/* APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-blue-600" />
                    Appearance & Layout
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Customize visual workspace style.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ appearance: 'light' })}
                    className={`p-4 border rounded-xl text-left transition-all cursor-pointer ${
                      settings.appearance === 'light'
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-full h-16 rounded-md bg-slate-100 border border-slate-200 mb-2 flex items-center justify-center text-xs font-medium text-slate-600">
                      Crisp White UI
                    </div>
                    <span className="text-sm font-semibold text-slate-800">GenMeta Light (Default)</span>
                    <span className="text-xs text-slate-500 block mt-0.5">High clarity for commercial work</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ appearance: 'dark' })}
                    className={`p-4 border rounded-xl text-left transition-all cursor-pointer ${
                      settings.appearance === 'dark'
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-full h-16 rounded-md bg-slate-800 border border-slate-700 mb-2 flex items-center justify-center text-xs font-medium text-slate-300">
                      Slate Dark UI
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Slate Dark Mode</span>
                    <span className="text-xs text-slate-500 block mt-0.5">Low-glare night session</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
