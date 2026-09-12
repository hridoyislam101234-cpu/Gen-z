import React, { useState } from 'react';
import { Shield, Key, Send, AlertTriangle, Check, RefreshCw, Lock } from 'lucide-react';
import { ClientLicenseInfo } from '../types';

interface LockedScreenProps {
  onActivateSuccess: (info: ClientLicenseInfo) => void;
  onOpenLicenseModal: () => void;
  currentError?: string | null;
}

export const LockedScreen: React.FC<LockedScreenProps> = ({
  onActivateSuccess,
  onOpenLicenseModal,
  currentError,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(currentError || null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputKey.trim().toUpperCase();
    if (!clean) {
      setError('Please enter a 16-character license key.');
      return;
    }

    setIsActivating(true);
    setError(null);
    setSuccess(null);

    const clientId = localStorage.getItem('genmeta_client_id') || 'dev_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('genmeta_client_id', clientId);

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: clean, clientId }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.license) {
        const info: ClientLicenseInfo = {
          isValid: true,
          key: data.license.key,
          status: data.license.status,
          expiresAt: data.license.expiresAt,
          activatedAt: data.license.activatedAt,
          daysRemaining: data.license.daysRemaining,
          hoursRemaining: data.license.hoursRemaining,
        };
        localStorage.setItem('genmeta_license_key', clean);
        if (data.token) {
          localStorage.setItem('genmeta_license_token', data.token);
        }
        if (data.license.expiresAt) {
          localStorage.setItem('genmeta_license_expires', data.license.expiresAt);
        }
        if (data.license.activatedAt) {
          localStorage.setItem('genmeta_license_activated', data.license.activatedAt);
        }
        setSuccess(data.message || 'License activated successfully! 30-day access unlocked.');
        onActivateSuccess(info);
      } else {
        setError(data.error || 'Activation failed. Invalid license key.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error connecting to activation server.');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-10 text-center space-y-6 relative">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-indigo-200/50 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Lock Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <Lock className="w-8 h-8" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-slate-900 shadow-xs">
            <Key className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Application Locked — License Key Required
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Welcome to <strong className="text-slate-900 font-semibold">Gen-z Ai Studio</strong>. A valid 30-day activation key is required to access the multimodal vision prompt generator, metadata tools, and microstock CSV export.
          </p>
        </div>

        {/* Activation Form */}
        <form onSubmit={handleActivate} className="max-w-md mx-auto space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={inputKey}
              onChange={(e) => {
                let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                setInputKey(val);
              }}
              placeholder="NXGP-8KQ4-M7XZ-2P9L"
              maxLength={19}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-center sm:text-left font-mono text-sm tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all shadow-2xs"
            />
            <button
              type="submit"
              disabled={isActivating || !inputKey.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {isActivating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              <span>Activate 30 Days</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2 text-left animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 text-left animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}
        </form>

        {/* Assistance / Telegram & Owner Links */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>Don't have a license key?</span>
            <a
              href="https://t.me/hridoystockdesigner"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1 hover:underline"
            >
              <Send className="w-3 h-3" />
              Contact Developer
            </a>
          </div>

          <button
            type="button"
            onClick={onOpenLicenseModal}
            className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer hover:underline"
          >
            <Key className="w-3 h-3" />
            Admin / Owner Login
          </button>
        </div>
      </div>
    </div>
  );
};
