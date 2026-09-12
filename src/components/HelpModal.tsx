import React from 'react';
import { X, BookOpen, UploadCloud, Cpu, FileText, Download } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold">GenMeta Quick Guide</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-600 leading-relaxed overflow-y-auto">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-blue-600" /> Upload Images or Folders
                </h4>
                <p className="mt-0.5 text-slate-500">
                  Select one or multiple images (or an entire directory of photos/illustrations). Supported formats: JPG,
                  JPEG, PNG, WEBP.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-600" /> Multimodal Vision Analysis
                </h4>
                <p className="mt-0.5 text-slate-500">
                  Click <strong>Generate</strong>. Gemini analyzes visible objects, lighting, colors, style, composition,
                  and perspectives directly from the real image pixels.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" /> Image-to-Prompt (No Filenames)
                </h4>
                <p className="mt-0.5 text-slate-500">
                  Receive a professional recreation prompt crafted strictly without any filename reference. Copy with 1-click
                  or export all prompts as a clean <code>.txt</code> file.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                4
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-blue-600" /> Microstock CSV Export
                </h4>
                <p className="mt-0.5 text-slate-500">
                  Download ready-to-upload CSV metadata formatted for <strong>Adobe Stock</strong>,{' '}
                  <strong>Shutterstock</strong>, <strong>Freepik</strong>, <strong>Dreamstime</strong>,{' '}
                  <strong>123RF</strong>, and <strong>Alamy</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
