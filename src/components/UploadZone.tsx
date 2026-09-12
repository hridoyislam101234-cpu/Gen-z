import React, { useRef, useState } from 'react';
import {
  Upload,
  FolderUp,
  FileImage,
  Zap,
  Tag,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  Key,
  Sparkles,
  Tags,
  Layers,
  Wand2,
} from 'lucide-react';
import { GenerationOptions, KeywordFormat } from '../types';
import { isSupportedMedia } from '../utils/mediaProcessor';

interface UploadZoneProps {
  fileCount: number;
  onFilesSelected: (files: File[]) => void;
  options: GenerationOptions;
  onChangeOptions: (newOptions: Partial<GenerationOptions>) => void;
  onStartGeneration: () => void;
  isProcessing: boolean;
  canGenerate: boolean;
  errorMessage?: string | null;
  hasApiKeys?: boolean;
  onOpenApiKeySettings?: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  fileCount,
  onFilesSelected,
  options,
  onChangeOptions,
  onStartGeneration,
  isProcessing,
  canGenerate,
  errorMessage,
  hasApiKeys = true,
  onOpenApiKeySettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files) as File[];
      const validFiles = droppedFiles.filter(isSupportedMedia);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const keywordFormats: { id: KeywordFormat; label: string; icon: string }[] = [
    { id: 'single', label: 'Single', icon: '🏷' },
    { id: 'double', label: 'Double', icon: '🏷' },
    { id: 'mixed', label: 'Mixed', icon: '📚' },
    { id: 'auto', label: 'Auto', icon: '✏' },
  ];

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full max-w-5xl mx-auto rounded-2xl transition-all duration-200 p-6 md:p-10 ${
        isDragOver
          ? 'bg-blue-50/80 border-2 border-dashed border-blue-500 shadow-md ring-4 ring-blue-100'
          : 'bg-white border border-slate-200/90 shadow-xs'
      }`}
    >
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/jpeg,image/png,image/webp,image/jpg,image/svg+xml,.svg,.eps,video/mp4,video/quicktime,.mp4,.mov"
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFileChange}
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
      />

      {/* Top Upload Icon & Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-3 border border-blue-100 shadow-2xs">
          <Upload className="w-6 h-6 stroke-[2.5]" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
          Select Files or Folder & Generate SEO-friendly Metadata
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
          Deep visual comprehension to produce accurate recreation prompts & microstock-compliant CSV metadata.
        </p>
      </div>

      {/* Primary Generation Mode Buttons (Image to Prompt vs Metadata vs Both) */}
      <div className="mb-8 max-w-2xl mx-auto">
        <div className="text-center mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Generation Mode (Select output to generate)
          </span>
        </div>
        <div className="grid grid-cols-3 p-1.5 bg-slate-100/90 border border-slate-200/90 rounded-2xl gap-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => onChangeOptions({ generationMode: 'image_to_prompt' })}
            className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              (options.generationMode || 'both') === 'image_to_prompt'
                ? 'bg-white text-blue-700 shadow-sm border border-blue-200 font-bold scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Sparkles className={`w-4 h-4 shrink-0 ${(options.generationMode || 'both') === 'image_to_prompt' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Image to Prompt</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeOptions({ generationMode: 'metadata' })}
            className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              (options.generationMode || 'both') === 'metadata'
                ? 'bg-white text-blue-700 shadow-sm border border-blue-200 font-bold scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Tags className={`w-4 h-4 shrink-0 ${(options.generationMode || 'both') === 'metadata' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Metadata</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeOptions({ generationMode: 'both' })}
            className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              (options.generationMode || 'both') === 'both'
                ? 'bg-white text-blue-700 shadow-sm border border-blue-200 font-bold scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Layers className={`w-4 h-4 shrink-0 ${(options.generationMode || 'both') === 'both' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Both (All-in-One)</span>
          </button>
        </div>

        {/* Dynamic Mode Helper Description */}
        <p className="text-center text-xs text-slate-500 mt-2 font-medium">
          {(options.generationMode || 'both') === 'image_to_prompt' && (
            <span>🎨 <strong>Image to Prompt only:</strong> Fast visual analysis & accurate recreation prompt for Midjourney, FLUX, SDXL.</span>
          )}
          {(options.generationMode || 'both') === 'metadata' && (
            <span>🏷️ <strong>Microstock Metadata only:</strong> Commercial SEO title, description, 49-50 keywords & category.</span>
          )}
          {(options.generationMode || 'both') === 'both' && (
            <span>✨ <strong>Full Generation:</strong> Generates AI recreation prompt AND microstock metadata.</span>
          )}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-3xl mx-auto animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Analysis Notice</p>
              <p className="text-rose-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          {onOpenApiKeySettings && (
            <button
              type="button"
              onClick={onOpenApiKeySettings}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
            >
              Configure API Key
            </button>
          )}
        </div>
      )}

      {/* Split layout: Left Upload controls | Right Parameter Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Column: File selection & Generate button */}
        <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-5 h-full">
          <div className="text-center">
            <span className="text-base md:text-lg font-bold text-blue-600">
              {fileCount} {fileCount === 1 ? 'file' : 'files'} selected
            </span>
            <span className="block text-xs text-slate-400 mt-0.5">
              Drag and drop images, vectors (EPS, SVG) or videos (MP4, MOV) anywhere
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <FileImage className="w-4 h-4 text-blue-600" />
              <span>Select Files</span>
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <FolderUp className="w-4 h-4 text-amber-600" />
              <span>Select Folder</span>
            </button>
          </div>

          <button
            type="button"
            disabled={!canGenerate || isProcessing}
            onClick={onStartGeneration}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
              canGenerate && !isProcessing
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer active:scale-[0.99]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Analyzing Media with Multimodal Vision...</span>
              </>
            ) : (
              <>
                {(options.generationMode || 'both') === 'image_to_prompt' ? (
                  <Sparkles className="w-4 h-4 text-white" />
                ) : (options.generationMode || 'both') === 'metadata' ? (
                  <Tags className="w-4 h-4 text-white" />
                ) : (
                  <Zap className="w-4 h-4 fill-white" />
                )}
                <span>
                  {fileCount === 0
                    ? 'Upload Files to Generate'
                    : (options.generationMode || 'both') === 'image_to_prompt'
                    ? `Generate Prompt (${fileCount} File${fileCount > 1 ? 's' : ''})`
                    : (options.generationMode || 'both') === 'metadata'
                    ? `Generate Metadata (${fileCount} File${fileCount > 1 ? 's' : ''})`
                    : `Generate (${fileCount} File${fileCount > 1 ? 's' : ''})`}
                </span>
              </>
            )}
          </button>

          {!hasApiKeys && (
            <div className="w-full p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs animate-in fade-in">
              <span className="text-amber-900 font-medium flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Gemini API key recommended for continuous access</span>
              </span>
              <button
                type="button"
                onClick={onOpenApiKeySettings}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                Add Key
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Title, Description, Keyword Count sliders & Keyword Format (Always directly visible) */}
        <div className="p-6 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Output Parameters & Sliders
            </span>
            <span className="text-[11px] text-blue-700 font-semibold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
              {(options.generationMode || 'both') === 'image_to_prompt'
                ? 'Mode: Prompt only'
                : (options.generationMode || 'both') === 'metadata'
                ? 'Mode: Metadata only'
                : 'Mode: Both'}
            </span>
          </div>

          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Title Length */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Title Length</label>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => onChangeOptions({ titleLengthMode: 'fixed' })}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        options.titleLengthMode === 'fixed'
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Fixed
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeOptions({ titleLengthMode: 'auto' })}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        options.titleLengthMode === 'auto'
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Auto
                    </button>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-700 min-w-12 text-right">
                    {options.titleLengthMode === 'auto' ? 'Auto' : `${options.titleLength} ch`}
                  </span>
                </div>
              </div>

              {options.titleLengthMode === 'fixed' && (
                <input
                  type="range"
                  min="40"
                  max="200"
                  step="5"
                  value={options.titleLength}
                  onChange={(e) => onChangeOptions({ titleLength: parseInt(e.target.value, 10) })}
                  className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
              )}
            </div>

            {/* Description Length */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Description Length</label>
                <span className="text-xs font-mono font-semibold text-slate-700">{options.descriptionLength} ch</span>
              </div>
              <input
                type="range"
                min="30"
                max="250"
                step="5"
                value={options.descriptionLength}
                onChange={(e) => onChangeOptions({ descriptionLength: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>

            {/* Keyword Count */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Keyword Count</label>
                <span className="text-xs font-mono font-semibold text-slate-700">{options.keywordCount}</span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                step="1"
                value={options.keywordCount}
                onChange={(e) => onChangeOptions({ keywordCount: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>

            {/* Keyword Format */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Keyword Format</label>
              <div className="grid grid-cols-4 gap-1.5">
                {keywordFormats.map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => onChangeOptions({ keywordFormat: fmt.id })}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      options.keywordFormat === fmt.id
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs">{fmt.icon}</span>
                    <span>{fmt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {(options.generationMode || 'both') === 'image_to_prompt' && (
              <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Prompt only mode is active:</strong> An ultra-detailed recreation prompt will be generated for Midjourney, FLUX & SDXL. The Title & Keyword sliders above will apply when you choose <strong>Metadata</strong> or <strong>Both</strong>.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Notes (matching screenshot) */}
      <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-1 text-[11px] text-slate-400">
        <p>Supported formats: Images (JPG, JPEG, PNG, WEBP), Vectors (EPS, SVG), Videos (MP4, MOV)</p>
        <p className="text-slate-500 font-medium">
          ⚠️ <strong>Note:</strong> Avoid using non-ASCII characters in file names, as it may cause issues with some microstock platforms.
        </p>
      </div>
    </div>
  );
};
