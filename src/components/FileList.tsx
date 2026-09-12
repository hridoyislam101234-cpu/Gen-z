import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileEdit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Plus,
  RefreshCw,
  Film,
  PenTool,
} from 'lucide-react';
import { ImageItem, CsvPlatform } from '../types';

interface FileListProps {
  files: ImageItem[];
  selectedId: string | null;
  onSelectFile: (id: string) => void;
  onRemoveFile: (id: string) => void;
  onClearAll: () => void;
  onExportPrompts: () => void;
  onExportCsv: (platform?: CsvPlatform) => void;
  onRenameFiles: () => void;
  isRenaming?: boolean;
  onAddMoreFiles: () => void;
  activePlatform: CsvPlatform;
  onChangePlatform: (platform: CsvPlatform) => void;
  isProcessing: boolean;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedId,
  onSelectFile,
  onRemoveFile,
  onClearAll,
  onExportPrompts,
  onExportCsv,
  onRenameFiles,
  isRenaming,
  onAddMoreFiles,
  activePlatform,
  onChangePlatform,
  isProcessing,
}) => {
  const completedCount = files.filter((f) => f.status === 'completed').length;
  const analyzingCount = files.filter((f) => f.status === 'analyzing').length;
  const promptCount = files.filter(
    (f) => f.status === 'completed' && f.result?.prompt && f.result.prompt.trim().length > 0
  ).length;
  const metadataCount = files.filter(
    (f) => f.status === 'completed' && f.result?.metadata && f.result.metadata.title
  ).length;

  return (
    <div className="w-full max-w-5xl mx-auto mb-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Action Toolbar */}
      <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800 text-sm">
            Queue ({files.length})
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            {completedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {completedCount} Done
              </span>
            )}
            {analyzingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
                <Loader2 className="w-3 h-3 text-blue-600 animate-spin" /> {analyzingCount} Analyzing
              </span>
            )}
          </div>
        </div>

        {/* Download & Actions Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Prompts (.txt) */}
          <button
            type="button"
            disabled={promptCount === 0}
            onClick={onExportPrompts}
            title="Download all generated prompts as .txt (no filenames)"
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              promptCount > 0
                ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Download Prompts (.txt)</span>
          </button>

          {/* Platform Preset Selector for CSV */}
          <div className="relative">
            <select
              aria-label="Stock platform CSV preset"
              value={activePlatform}
              onChange={(e) => onChangePlatform(e.target.value as CsvPlatform)}
              className="py-1.5 pl-2.5 pr-7 text-xs font-medium bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="adobe">Adobe Stock</option>
              <option value="shutterstock">Shutterstock</option>
              <option value="freepik">Freepik</option>
              <option value="dreamstime">Dreamstime</option>
              <option value="123rf">123RF</option>
              <option value="alamy">Alamy</option>
              <option value="universal">Universal (All Fields)</option>
            </select>
          </div>

          {/* Export Metadata (.csv) */}
          <button
            type="button"
            disabled={metadataCount === 0}
            onClick={() => onExportCsv(activePlatform)}
            title="Download microstock metadata as CSV"
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              metadataCount > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
            <span>Download Metadata (.csv)</span>
          </button>

          {/* Rename File Button */}
          <button
            type="button"
            disabled={metadataCount === 0 || isRenaming}
            onClick={onRenameFiles}
            title="Rename original files to generated Title and embed Title, Description & Keywords metadata"
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              metadataCount > 0 && !isRenaming
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            {isRenaming ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                <span>Renaming...</span>
              </>
            ) : (
              <>
                <FileEdit className="w-3.5 h-3.5 text-white" />
                <span>Rename File</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onAddMoreFiles}
            title="Add more images"
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={onClearAll}
            title="Clear all files"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Thumbnails / Queue Strip */}
      <div className="p-3 overflow-x-auto flex items-center gap-3 no-scrollbar">
        {files.map((file, idx) => {
          const isSelected = selectedId === file.id;
          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`group relative shrink-0 w-28 md:w-32 rounded-xl p-2 border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {/* Thumbnail */}
              <div className="w-full h-20 md:h-22 rounded-lg bg-slate-100 overflow-hidden relative border border-slate-200/60 mb-1.5 flex items-center justify-center">
                <img
                  src={file.dataUrl}
                  alt={file.filename}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />

                {/* Format badge (Video / Vector / Image) */}
                {file.mediaKind === 'video' && (
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-slate-900/85 text-white flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase">
                    <Film className="w-2.5 h-2.5 text-rose-400" />
                    {file.videoDuration ? `${Math.round(file.videoDuration)}s` : 'Video'}
                  </span>
                )}
                {file.mediaKind === 'vector' && (
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-slate-900/85 text-amber-400 flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase">
                    <PenTool className="w-2.5 h-2.5 text-amber-400" />
                    {file.filename.endsWith('.eps') ? 'EPS' : 'SVG'}
                  </span>
                )}

                {/* Status indicator tag */}
                <div className="absolute top-1 right-1">
                  {file.status === 'completed' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {file.status === 'analyzing' && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </span>
                  )}
                  {file.status === 'error' && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {file.status === 'idle' && (
                    <span className="w-5 h-5 rounded-full bg-slate-700/70 text-white flex items-center justify-center text-[10px] font-mono">
                      #{idx + 1}
                    </span>
                  )}
                </div>

                {/* Remove button on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                  className="absolute bottom-1 right-1 p-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Filename & size */}
              <div className="text-[11px] font-medium text-slate-700 truncate" title={file.filename}>
                {file.filename}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {(file.size / 1024).toFixed(0)} KB
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
