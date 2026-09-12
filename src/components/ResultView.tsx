import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  Layers,
  Palette,
  Eye,
  Camera,
  Sun,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Key,
  ExternalLink,
  Tags,
  Film,
  PenTool,
  FileEdit,
} from 'lucide-react';
import { ImageItem, CsvPlatform } from '../types';
import { generateStockCsv, generatePromptsTextFile, triggerFileDownload } from '../utils/csvExporter';

interface ResultViewProps {
  item: ImageItem;
  onReanalyze: (id: string) => void;
  isProcessing: boolean;
  activePlatform: CsvPlatform;
  onOpenSettings?: () => void;
  onRenameSingle?: (item: ImageItem) => void;
  isRenaming?: boolean;
}

export const ResultView: React.FC<ResultViewProps> = ({
  item,
  onReanalyze,
  isProcessing,
  activePlatform,
  onOpenSettings,
  onRenameSingle,
  isRenaming,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  if (item.status === 'analyzing') {
    return (
      <div className="w-full max-w-5xl mx-auto p-12 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <Sparkles className="w-6 h-6 text-blue-600 absolute inset-0 m-auto" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Analyzing {item.filename}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Gemini Vision is inspecting visible subjects, textures, lighting, colors, style, and composition...
          </p>
        </div>
      </div>
    );
  }

  if (item.status === 'error') {
    const isQuotaError = item.error?.includes('quota') || item.error?.includes('429') || item.error?.includes('rate limit');
    return (
      <div className="w-full max-w-5xl mx-auto p-8 bg-white rounded-2xl border border-rose-200 shadow-sm space-y-5 animate-in fade-in">
        <div className="flex items-start gap-3.5 text-rose-700">
          <div className="p-2.5 bg-rose-100 rounded-xl text-rose-600 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-rose-950">Analysis Failed for {item.filename}</h3>
            <p className="text-xs md:text-sm text-rose-700 leading-relaxed">
              {item.error || 'An unexpected error occurred during image analysis.'}
            </p>
          </div>
        </div>

        {isQuotaError && (
          <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-xl text-xs text-amber-900 space-y-2">
            <p className="font-semibold flex items-center gap-1.5 text-amber-950">
              <Key className="w-4 h-4 text-amber-600" />
              <span>Why am I seeing a Quota or Rate Limit error?</span>
            </p>
            <p className="text-amber-800 leading-relaxed">
              Google Gemini enforces per-minute and daily rate limits. When multiple requests occur, shared or free project quotas can be temporarily exhausted.
            </p>
            <p className="text-amber-900 font-medium">
              👉 <strong>Solution:</strong> Open <strong>Manage API Keys</strong> to add your own free Gemini API key from Google AI Studio. You can also add multiple keys for automatic rotation.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>Add / Manage Gemini API Keys</span>
            </button>
          )}

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onReanalyze(item.id)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Analysis</span>
          </button>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-blue-600 transition-colors ml-auto"
          >
            <span>Get free API key</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  if (!item.result) {
    return null;
  }

  const { analysis, prompt, metadata } = item.result;
  const keywordsString = metadata?.keywords ? metadata.keywords.join(', ') : '';
  const mode = item.result.generationMode || (prompt && metadata?.keywords?.length ? 'both' : prompt ? 'image_to_prompt' : 'metadata');
  const hasPrompt = Boolean(prompt && prompt.trim().length > 0 && mode !== 'metadata');
  const hasMetadata = Boolean(metadata && metadata.title && Array.isArray(metadata.keywords) && metadata.keywords.length > 0 && mode !== 'image_to_prompt');

  const handleDownloadSinglePrompt = () => {
    if (!prompt) return;
    triggerFileDownload(
      prompt,
      `${item.filename.replace(/\.[^/.]+$/, '')}_prompt.txt`,
      'text/plain'
    );
  };

  const handleDownloadSingleCsv = () => {
    const csvContent = generateStockCsv([item], activePlatform);
    triggerFileDownload(
      csvContent,
      `${item.filename.replace(/\.[^/.]+$/, '')}_metadata.csv`,
      'text/csv'
    );
  };

  const handleCopyAllMetadata = () => {
    if (!metadata) return;
    const allMetaText = `Filename: ${metadata.filename}\nTitle: ${metadata.title}\nDescription: ${metadata.description}\nKeywords: ${keywordsString}\nCategory: ${metadata.category} (${metadata.categoryName || 'Standard'})`;
    copyToClipboard(allMetaText, 'all_meta');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Banner: Image Preview & Fast Action Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
            <img
              src={item.dataUrl}
              alt={item.filename}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{item.filename}</span>
              {item.mediaKind === 'video' && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold flex items-center gap-1">
                  <Film className="w-3 h-3 text-purple-600" />
                  Video Footage
                </span>
              )}
              {item.mediaKind === 'vector' && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold flex items-center gap-1">
                  <PenTool className="w-3 h-3 text-amber-600" />
                  Vector Graphic
                </span>
              )}
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                Analyzed
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                {mode === 'image_to_prompt' ? 'Prompt only' : mode === 'metadata' ? 'Metadata only' : 'Prompt & Metadata'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
              {hasMetadata && (
                <>
                  <span>Category: <strong className="text-slate-700">#{metadata.category} {metadata.categoryName}</strong></span>
                  <span>•</span>
                  <span>Keywords: <strong className="text-slate-700">{metadata.keywords.length}</strong></span>
                  <span>•</span>
                </>
              )}
              <span>Size: <strong className="text-slate-700">{(item.size / 1024).toFixed(0)} KB</strong></span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
          {hasPrompt && (
            <button
              type="button"
              onClick={handleDownloadSinglePrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Prompt (.txt)
            </button>
          )}

          {hasMetadata && (
            <button
              type="button"
              onClick={handleDownloadSingleCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              CSV Row (.csv)
            </button>
          )}

          {hasMetadata && onRenameSingle && (
            <button
              type="button"
              disabled={isRenaming}
              onClick={() => onRenameSingle(item)}
              title="Rename this original file with generated Title and embed metadata"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <FileEdit className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rename File</span>
            </button>
          )}

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onReanalyze(item.id)}
            title="Re-analyze image"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1. IMAGE-TO-PROMPT SECTION */}
      {hasPrompt ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold text-slate-900">
                  1. Image-to-Prompt (Recreation Prompt)
                </h2>
                <span className="text-[11px] text-slate-500 block">
                  Pure visual recreation prompt — no filenames included. Optimized for Midjourney, FLUX & Stable Diffusion.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(prompt, 'prompt')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              {copiedSection === 'prompt' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>
          </div>

          {/* Prompt Output Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs md:text-sm leading-relaxed font-sans select-all whitespace-pre-wrap">
            {prompt}
          </div>

          {/* Collapsible Detailed Visual Analysis */}
          <div className="border border-slate-200/80 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                Deep Gemini Vision Analysis Breakdown
              </span>
              {showAnalysisDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAnalysisDetails && (
              <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                    Main Subject
                  </span>
                  <p className="text-slate-800 font-medium">{analysis.main_subject}</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                    Artistic Medium & Style
                  </span>
                  <p className="text-slate-800 font-medium">{analysis.style}</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                    Composition & Perspective
                  </span>
                  <p className="text-slate-700">{analysis.composition} ({analysis.perspective || 'Standard angle'})</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                    Lighting & Shadows
                  </span>
                  <p className="text-slate-700">{analysis.lighting || 'Balanced illumination'}</p>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                    Visible Colors
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.colors?.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                    Identified Objects
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.objects?.map((obj, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px]">
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* 2. MICROSTOCK METADATA SECTION */}
      {hasMetadata && metadata ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-900">
                2. Image-to-Microstock Metadata
              </h2>
              <span className="text-[11px] text-slate-500 block">
                Commercially optimized for Adobe Stock, Shutterstock, Freepik, Dreamstime, 123RF, and Alamy.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyAllMetadata}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            {copiedSection === 'all_meta' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>All Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All Metadata</span>
              </>
            )}
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              Title
              <span className="text-[11px] font-mono text-slate-400 font-normal">
                ({metadata.title.length} characters)
              </span>
            </label>
            <button
              type="button"
              onClick={() => copyToClipboard(metadata.title, 'title')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              {copiedSection === 'title' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSection === 'title' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-800 select-all">
            {metadata.title}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              Description
              <span className="text-[11px] font-mono text-slate-400 font-normal">
                ({metadata.description.length} characters)
              </span>
            </label>
            <button
              type="button"
              onClick={() => copyToClipboard(metadata.description, 'description')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              {copiedSection === 'description' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSection === 'description' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-700 leading-relaxed select-all">
            {metadata.description}
          </div>
        </div>

        {/* Keywords */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              Keywords
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                {metadata.keywords.length} tags
              </span>
            </label>
            <button
              type="button"
              onClick={() => copyToClipboard(keywordsString, 'keywords')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              {copiedSection === 'keywords' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSection === 'keywords' ? 'Copied' : 'Copy Keywords'}</span>
            </button>
          </div>

          {/* Interactive Tag Cloud */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {metadata.keywords.map((kw, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {kw}
              </span>
            ))}
          </div>

          {/* Raw comma-separated string for microstock form pasting */}
          <div className="p-2.5 bg-slate-100/70 border border-slate-200/80 rounded-lg text-[11px] font-mono text-slate-600 select-all leading-normal">
            {keywordsString}
          </div>
        </div>

        {/* Category & Filename Info */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Stock Category</span>
            <div className="font-semibold text-slate-800 text-sm mt-0.5">
              Category #{metadata.category}: {metadata.categoryName || 'Graphic Resources'}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">Standard taxonomy code for microstock CSV</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Preserved Filename</span>
            <div className="font-mono font-semibold text-slate-800 text-sm mt-0.5 truncate">
              {metadata.filename}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">Matches image asset in stock CSV upload</span>
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
};
