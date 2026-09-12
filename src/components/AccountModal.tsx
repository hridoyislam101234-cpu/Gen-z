import React from 'react';
import { X, CheckCircle2, AlertCircle, Key, Cpu, ShieldCheck } from 'lucide-react';
import { AppSettings } from '../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  serverHasApiKey: boolean;
  onOpenSettings: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  settings,
  serverHasApiKey,
  onOpenSettings,
}) => {
  if (!isOpen) return null;

  const totalKeys = (serverHasApiKey ? 1 : 0) + settings.apiKeys.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">System & API Status</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                totalKeys > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
              }`}
            >
              {totalKeys > 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">
                {totalKeys > 0 ? 'Gemini Vision Online' : 'API Key Required'}
              </div>
              <div className="text-slate-500 text-xs">
                {totalKeys > 0 ? `${totalKeys} API key source(s) available` : 'Please configure an API key to analyze'}
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-slate-700 py-1">
              <span className="flex items-center gap-2 text-slate-500">
                <Cpu className="w-3.5 h-3.5 text-blue-500" /> Active Vision Model
              </span>
              <span className="font-mono font-medium text-slate-900">gemini-3.8-flash</span>
            </div>

            <div className="flex items-center justify-between text-slate-700 py-1">
              <span className="flex items-center gap-2 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Server Secret Key
              </span>
              <span className={`font-semibold ${serverHasApiKey ? 'text-emerald-600' : 'text-slate-400'}`}>
                {serverHasApiKey ? 'Injected & Ready' : 'None'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700 py-1">
              <span className="flex items-center gap-2 text-slate-500">
                <Key className="w-3.5 h-3.5 text-blue-500" /> Custom Rotation Keys
              </span>
              <span className="font-semibold text-slate-900">{settings.apiKeys.length} keys</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            Manage API Keys in Settings
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
