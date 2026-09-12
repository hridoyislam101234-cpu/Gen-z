import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Send,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ClientLicenseInfo, LicenseItem, LicenseStatus } from '../types';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  licenseInfo: ClientLicenseInfo | null;
  onActivateSuccess: (info: ClientLicenseInfo) => void;
  defaultTab?: 'activate' | 'admin';
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  licenseInfo,
  onActivateSuccess,
  defaultTab = 'activate',
}) => {
  const [activeTab, setActiveTab] = useState<'activate' | 'admin'>(defaultTab);

  // User Activation state
  const [inputKey, setInputKey] = useState('');
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Admin state
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLicenses, setAdminLicenses] = useState<LicenseItem[]>([]);
  const [isLoadingLicenses, setIsLoadingLicenses] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unused' | 'active' | 'expired'>('all');
  const [lastGeneratedKey, setLastGeneratedKey] = useState<string | null>(null);

  // Keep tab in sync with defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setActivationError(null);
      setActivationSuccess(null);
      setAdminError(null);
      setLastGeneratedKey(null);
    }
  }, [isOpen, defaultTab]);

  // Load licenses if admin authenticated
  const fetchAdminLicenses = async (password: string) => {
    setIsLoadingLicenses(true);
    setAdminError(null);
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAdminLicenses(data.licenses || []);
        setIsAdminAuthenticated(true);
      } else {
        setAdminError(data.error || 'Failed to fetch licenses.');
        setIsAdminAuthenticated(false);
      }
    } catch (err: any) {
      setAdminError(err.message || 'Network error fetching licenses.');
    } finally {
      setIsLoadingLicenses(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setAdminError('Please enter the secret password.');
      return;
    }
    setAdminError(null);
    setIsLoadingLicenses(true);
    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIsAdminAuthenticated(true);
        fetchAdminLicenses(adminPassword.trim());
      } else {
        setAdminError(data.error || 'Incorrect secret password.');
      }
    } catch (err: any) {
      setAdminError(err.message || 'Error verifying admin password.');
    } finally {
      setIsLoadingLicenses(false);
    }
  };

  const handleGenerateLicense = async () => {
    if (!adminPassword) return;
    setIsGenerating(true);
    setAdminError(null);
    try {
      const res = await fetch('/api/admin/generate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.license) {
        setAdminLicenses((prev) => [data.license, ...prev]);
        setLastGeneratedKey(data.license.key);
      } else {
        setAdminError(data.error || 'Failed to generate license.');
      }
    } catch (err: any) {
      setAdminError(err.message || 'Error generating license.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteLicense = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete license ${key}?`)) return;
    try {
      const res = await fetch('/api/admin/delete-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword.trim(), key }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAdminLicenses((prev) => prev.filter((l) => l.key !== key));
      } else {
        setAdminError(data.error || 'Failed to delete license.');
      }
    } catch (err: any) {
      setAdminError(err.message || 'Error deleting license.');
    }
  };

  const handleActivateUserKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputKey.trim().toUpperCase();
    if (!clean) {
      setActivationError('Please enter a license key.');
      return;
    }

    setIsActivating(true);
    setActivationError(null);
    setActivationSuccess(null);

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
        setActivationSuccess(data.message || 'License activated successfully for 30 days!');
        onActivateSuccess(info);
        setInputKey('');
      } else {
        setActivationError(data.error || 'Activation failed. Please check the license key.');
      }
    } catch (err: any) {
      setActivationError(err.message || 'Network error activating license.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const filteredLicenses = adminLicenses.filter((l) => {
    if (filterStatus === 'all') return true;
    return l.status === filterStatus;
  });

  const unusedCount = adminLicenses.filter((l) => l.status === 'unused').length;
  const activeCount = adminLicenses.filter((l) => l.status === 'active').length;
  const expiredCount = adminLicenses.filter((l) => l.status === 'expired').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-sm">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                License Management
                {licenseInfo?.isValid && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs rounded-full font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Active ({licenseInfo.daysRemaining ?? 30}d left)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Gen-z Ai Studio 30-Day License Activation & Key Generator
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('activate')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
              activeTab === 'activate'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            User Activation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
              activeTab === 'admin'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/60'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Admin / Developer Portal
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: User Activation */}
          {activeTab === 'activate' && (
            <div className="space-y-6">
              {/* Current Status Card */}
              {licenseInfo?.isValid ? (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      Active 30-Day License
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-full text-xs font-bold">
                      {licenseInfo.daysRemaining ?? 30} Days Left
                    </span>
                  </div>

                  <div className="bg-white/90 border border-emerald-200/80 rounded-lg p-3 flex items-center justify-between">
                    <div className="font-mono text-sm tracking-wider font-bold text-slate-800">
                      {licenseInfo.key}
                    </div>
                    <button
                      type="button"
                      onClick={() => licenseInfo.key && handleCopy(licenseInfo.key)}
                      className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      {copiedKey === licenseInfo.key ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Activated: {licenseInfo.activatedAt ? new Date(licenseInfo.activatedAt).toLocaleDateString() : 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Expires: {licenseInfo.expiresAt ? new Date(licenseInfo.expiresAt).toLocaleDateString() : 'In 30 days'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 space-y-1">
                    <p className="font-semibold text-sm text-amber-900">License Required to Unlock Tools</p>
                    <p>
                      Enter your 30-day license key below to activate unlimited AI vision prompt generation, metadata creation, and microstock CSV exports.
                    </p>
                  </div>
                </div>
              )}

              {/* Enter License Key Form */}
              <form onSubmit={handleActivateUserKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {licenseInfo?.isValid ? 'Activate Another / Renew License Key' : 'Enter 16-Character License Key'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputKey}
                      onChange={(e) => {
                        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                        setInputKey(val);
                      }}
                      placeholder="e.g. NXGP-8KQ4-M7XZ-2P9L"
                      maxLength={19}
                      className="w-full pl-3 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono tracking-wider text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-2xs"
                    />
                    <button
                      type="submit"
                      disabled={isActivating || !inputKey.trim()}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                    >
                      {isActivating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Activate</span>
                    </button>
                  </div>
                </div>

                {activationError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{activationError}</span>
                  </div>
                )}

                {activationSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{activationSuccess}</span>
                  </div>
                )}
              </form>

              {/* Developer Support Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Don't have a License Key?</p>
                  <p className="text-[11px] text-slate-500">
                    Contact developer support on Telegram to get or renew your 30-day activation key.
                  </p>
                </div>
                <a
                  href="https://t.me/hridoystockdesigner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0 ml-3"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram Support</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: Admin / Developer Portal */}
          {activeTab === 'admin' && (
            <div className="space-y-6">
              {!isAdminAuthenticated ? (
                /* Admin Secret Password Verification */
                <form onSubmit={handleAdminLogin} className="space-y-4 max-w-md mx-auto py-4">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-2 shadow-xs">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Admin Authentication</h3>
                    <p className="text-xs text-slate-500">
                      Enter the private secret password to access license generation and manage all activation keys.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Secret Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter secret password"
                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {adminError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{adminError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoadingLicenses || !adminPassword.trim()}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isLoadingLicenses ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                    <span>Unlock Admin Portal</span>
                  </button>
                </form>
              ) : (
                /* Authenticated Admin Management Interface */
                <div className="space-y-5">
                  {/* Top Bar: Generate Key & Logout */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-indigo-50 to-blue-50/50 border border-indigo-100 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        Admin License Generator
                      </p>
                      <p className="text-[11px] text-indigo-700">
                        Generate 1-time 30-day activation keys for clients & users.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateLicense}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Generate License Key</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdminAuthenticated(false);
                          setAdminPassword('');
                        }}
                        className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Lock
                      </button>
                    </div>
                  </div>

                  {/* Just Generated Key Banner */}
                  {lastGeneratedKey && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between animate-in zoom-in-95 duration-150">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs text-emerald-900 font-medium">New Key Created:</span>
                        <span className="font-mono text-xs font-bold tracking-wider text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded">
                          {lastGeneratedKey}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(lastGeneratedKey)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer"
                      >
                        {copiedKey === lastGeneratedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === lastGeneratedKey ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}

                  {/* Filter & Counter Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1 text-xs">
                      {(['all', 'unused', 'active', 'expired'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setFilterStatus(status)}
                          className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors cursor-pointer ${
                            filterStatus === status
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {status} (
                          {status === 'all'
                            ? adminLicenses.length
                            : status === 'unused'
                            ? unusedCount
                            : status === 'active'
                            ? activeCount
                            : expiredCount}
                          )
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => fetchAdminLicenses(adminPassword)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 p-1 cursor-pointer"
                      title="Refresh list"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLicenses ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {/* License Items List */}
                  {filteredLicenses.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No licenses found under '{filterStatus}'. Click "Generate License Key" above to create one.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {filteredLicenses.map((lic) => (
                        <div
                          key={lic.key}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs hover:border-slate-300 transition-colors"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold tracking-wider text-slate-900 text-sm">
                                {lic.key}
                              </span>
                              {lic.status === 'unused' && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[10px] font-bold">
                                  Unused (1-Time)
                                </span>
                              )}
                              {lic.status === 'active' && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold">
                                  Active (30 Days)
                                </span>
                              )}
                              {lic.status === 'expired' && (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-[10px] font-bold">
                                  Expired
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3">
                              <span>Created: {new Date(lic.createdAt).toLocaleDateString()}</span>
                              {lic.activatedAt && (
                                <span>Activated: {new Date(lic.activatedAt).toLocaleDateString()}</span>
                              )}
                              {lic.expiresAt && (
                                <span>Expires: {new Date(lic.expiresAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopy(lic.key)}
                              title="Copy License Key"
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              {copiedKey === lic.key ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLicense(lic.key)}
                              title="Delete License"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Secure Server Validation • 30-Day Expiration</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
