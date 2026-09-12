import React from 'react';
import { Settings, HelpCircle, User, Bell, Square, Send, Key, Sun, Moon, Sparkles } from 'lucide-react';
import { ImageItem } from '../types';

interface HeaderProps {
  files: ImageItem[];
  selectedId: string | null;
  onSelectFile: (id: string | null) => void;
  isProcessing: boolean;
  onAbort: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenNotice: () => void;
  onOpenAccount: () => void;
  onOpenLicense: () => void;
  onOpenSoftwareSelling?: () => void;
  isLicenseActive?: boolean;
  licenseDaysRemaining?: number;
  hasApiKey: boolean;
  appearance?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  files,
  selectedId,
  onSelectFile,
  isProcessing,
  onAbort,
  onOpenSettings,
  onOpenHelp,
  onOpenNotice,
  onOpenAccount,
  onOpenLicense,
  onOpenSoftwareSelling,
  isLicenseActive = false,
  licenseDaysRemaining,
  hasApiKey,
  appearance = 'light',
  onToggleTheme,
}) => {
  const isDark = appearance === 'dark';

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors">
      {/* Left side: Brand (No logo as requested) + Update Version Badge + File counter + Selector */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => onSelectFile(null)}
          title="Gen-z Ai Studio - Home Overview"
        >
          {/* Logo completely removed as instructed */}
          <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Gen-z Ai Studio
          </span>
          <span
            className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 tracking-wide"
            title="Update: v2.5 - Trademark Safe & Dark Mode Edition"
          >
            v2.5 (Stock Safe)
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-xs font-mono">
            {files.length} {files.length === 1 ? 'File' : 'Files'}
          </span>

          <div className="relative min-w-[150px] sm:min-w-[170px] max-w-[260px] hidden md:block">
            <select
              aria-label="Select uploaded file to inspect"
              value={selectedId || ''}
              onChange={(e) => onSelectFile(e.target.value || null)}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 pl-2.5 pr-7 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 truncate cursor-pointer transition-colors"
            >
              <option value="">{files.length === 0 ? 'No Selection' : `All Files Overview (${files.length})`}</option>
              {files.map((file, idx) => (
                <option key={file.id} value={file.id}>
                  #{idx + 1} {file.filename} {file.status === 'completed' ? '✓' : file.status === 'analyzing' ? '⏳' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Right side buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {isProcessing && (
          <button
            type="button"
            onClick={onAbort}
            title="Stop processing"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-rose-600 dark:fill-rose-400" />
            <span className="hidden sm:inline">Stop</span>
          </button>
        )}

        {/* Software Selling Button (Located directly in front of the Dark button) */}
        <button
          type="button"
          onClick={onOpenSoftwareSelling}
          title="Software Selling — Licensed & Custom Version Details"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 bg-linear-to-r from-amber-100 via-amber-200 to-amber-100 dark:from-amber-950/80 dark:via-amber-900/60 dark:to-amber-950/80 hover:from-amber-200 hover:to-amber-300 dark:hover:from-amber-900 dark:hover:to-amber-800 border border-amber-300/80 dark:border-amber-700/80 rounded-lg shadow-2xs transition-all cursor-pointer hover:shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500/20" />
          <span>Software Selling</span>
        </button>

        {/* 1-Click Dark Mode / Light Mode Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* Developer Support (Telegram) */}
        <a
          href="https://t.me/hridoystockdesigner"
          target="_blank"
          rel="noopener noreferrer"
          title="Developer Support on Telegram"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-800 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/80 border border-sky-200 dark:border-sky-800 rounded-lg transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span className="hidden sm:inline">Developer Support</span>
        </a>

        {/* License Key Button */}
        <button
          type="button"
          onClick={onOpenLicense}
          title={isLicenseActive ? `Active License: ${licenseDaysRemaining ?? 30} days left` : 'License activation required. Click to activate or open admin.'}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
            isLicenseActive
              ? 'text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border-emerald-200 dark:border-emerald-800 shadow-2xs'
              : 'text-amber-800 dark:text-amber-200 hover:text-amber-900 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 border-amber-300 dark:border-amber-700 shadow-2xs animate-pulse'
          }`}
        >
          <Key className="w-3.5 h-3.5 text-current" />
          <span>License Key</span>
          {isLicenseActive ? (
            <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-200/80 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 rounded-full text-[10px] font-bold">
              {licenseDaysRemaining ?? 30}d
            </span>
          ) : (
            <span className="ml-0.5 px-1.5 py-0.2 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-full text-[10px] font-bold">
              Locked
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <button
          type="button"
          onClick={onOpenHelp}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Help</span>
        </button>

        <button
          type="button"
          onClick={onOpenAccount}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer relative"
        >
          <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Status</span>
          <span
            className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-500' : 'bg-amber-500'}`}
            title={hasApiKey ? 'Gemini API Connected' : 'API Key Setup Needed'}
          />
        </button>

        <button
          type="button"
          onClick={onOpenNotice}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>Notice</span>
        </button>
      </div>
    </header>
  );
};
