import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Sparkles, ArrowDown, ArrowUp, Globe, Check, ExternalLink } from 'lucide-react';

interface SoftwareSellingViewProps {
  isOpen: boolean;
  onClose: () => void;
  appearance?: 'light' | 'dark';
}

export const SoftwareSellingView: React.FC<SoftwareSellingViewProps> = ({
  isOpen,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'all' | 'bn' | 'en'>('all');

  const mainScrollRef = useRef<HTMLDivElement>(null);
  const notice1BnRef = useRef<HTMLDivElement>(null);
  const notice2BnRef = useRef<HTMLDivElement>(null);
  const notice1EnRef = useRef<HTMLDivElement>(null);
  const notice2EnRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-screen h-screen bg-slate-100 text-slate-900 select-text animate-in fade-in duration-150">
      {/* Top Full Window Navigation Header */}
      <header className="h-16 shrink-0 px-4 sm:px-6 md:px-8 border-b border-slate-200 bg-white shadow-xs flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                Software Selling — Licensed & Custom Version
              </h1>
              <span className="hidden sm:inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Official Developer Notice
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden md:block">
              Private Branding • Independent Admin & User Control System • No Third-Party Backend Lock-in
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick View Filter: All / বাংলা / English */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              উভয় ভাষা (All)
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('bn');
                if (mainScrollRef.current) mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'bn'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              🇧🇩 শুধু বাংলা
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('en');
                if (mainScrollRef.current) mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'en'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:text-blue-900'
              }`}
            >
              🇬🇧 English Only
            </button>
          </div>

          <a
            href="https://t.me/hridoystockdesigner"
            target="_blank"
            rel="noopener noreferrer"
            title="Contact Developer on Telegram"
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl transition-all shadow-sm shadow-sky-600/20 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Contact Developer</span>
            <span className="sm:hidden">Contact</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            title="Back to App (Esc)"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
          >
            <X className="w-4 h-4 text-rose-500" />
            <span>Back to App</span>
          </button>
        </div>
      </header>

      {/* Main Scrollable Canvas: Supports Smooth Scrolling for Entire Height */}
      <main
        ref={mainScrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8 overscroll-contain [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-slate-200 [&::-webkit-scrollbar-thumb]:bg-slate-400 hover:[&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
          {/* ================= LEFT COLUMN: NOTICE 1 ================= */}
          <section className="bg-white border-2 border-amber-300 rounded-2xl shadow-md shadow-slate-200/80 overflow-hidden flex flex-col">
            {/* Notice 1 Sticky Header */}
            <div className="sticky top-0 z-10 bg-amber-50/95 backdrop-blur-md px-5 sm:px-6 py-4 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🚀</span>
                <div>
                  <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
                    IMAGE TO PROMPT METADATA — LICENSED & CUSTOM VERSION
                  </h2>
                  <p className="text-xs text-amber-900 font-bold">
                    Notice 1: Brand Customization & License Management
                  </p>
                </div>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {viewMode === 'all' && (
                  <>
                    <button
                      type="button"
                      onClick={() => scrollToSection(notice1EnRef)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200 cursor-pointer flex items-center gap-1"
                    >
                      <span>🇬🇧 En</span>
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection(notice1BnRef)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 cursor-pointer flex items-center gap-1"
                    >
                      <span>🇧🇩 বাংলা</span>
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </>
                )}
                <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-amber-200 text-amber-900 border border-amber-300">
                  Notice 1
                </span>
              </div>
            </div>

            {/* Notice 1 Body */}
            <div className="p-5 sm:p-7 space-y-6">
              {/* ENGLISH PART (NOTICE 1) */}
              {(viewMode === 'all' || viewMode === 'en') && (
                <div ref={notice1EnRef} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-blue-200">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100 border border-blue-300 text-blue-900 font-black text-xs uppercase tracking-wider">
                      <span>🇬🇧</span>
                      <span>ENGLISH VERSION</span>
                    </div>
                    {viewMode === 'all' && (
                      <button
                        type="button"
                        onClick={() => scrollToSection(notice1BnRef)}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                      >
                        <span>👇 নিচে বাংলা সংস্করণ পড়ুন</span>
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 text-sm sm:text-base leading-relaxed text-slate-800 font-medium">
                    <p>
                      The <strong className="text-slate-900 font-black">Image to Prompt Metadata</strong> tool is currently available{' '}
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black border border-emerald-300">
                        FREE for everyone
                      </span>.
                    </p>
                    <p>
                      If you want to use this software as <strong className="text-amber-800 font-black">your own branded platform</strong>, a fully customized{' '}
                      <strong className="text-slate-900 font-black">Licensed Version</strong> is also available.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3">
                    <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <span>✨</span>
                      <span>With a Licensed Version, you can:</span>
                    </h3>
                    <ul className="space-y-2.5 text-sm sm:text-[15px] font-semibold text-slate-800">
                      <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-base shrink-0">✅</span>
                        <span>Change the software name and branding to your own</span>
                      </li>
                      <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-base shrink-0">✅</span>
                        <span>Fully customize the interface and platform identity</span>
                      </li>
                      <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-base shrink-0">✅</span>
                        <span>Manage users and licenses through the <strong className="text-slate-900 font-black">Admin Panel</strong></span>
                      </li>
                      <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-base shrink-0">✅</span>
                        <span>Add, activate, manage, and control License Keys from the Admin Panel</span>
                      </li>
                      <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-base shrink-0">✅</span>
                        <span>Have complete administrative control over your licensed platform</span>
                      </li>
                      <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-base shrink-0">✅</span>
                        <span>Use the software under your own brand and business identity</span>
                      </li>
                    </ul>
                  </div>

                  {/* English Pricing & Note */}
                  <div className="space-y-2.5">
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-sm sm:text-[15px] font-bold leading-relaxed flex items-start gap-2.5">
                      <span className="text-xl shrink-0">💰</span>
                      <div>
                        <strong className="text-amber-900 font-black">Pricing:</strong> License and customization pricing depends on your requirements.
                      </div>
                    </div>
                    <div className="text-sm sm:text-[15px] text-slate-800 font-bold px-1">
                      For pricing, licensing, customization, and other details, please{' '}
                      <a
                        href="https://t.me/hridoystockdesigner"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-700 hover:text-sky-800 underline font-black"
                      >
                        contact the Developer
                      </a>.
                    </div>
                    <div className="text-xs sm:text-sm text-slate-700 bg-slate-100 p-3.5 rounded-xl border border-slate-300 font-medium leading-relaxed">
                      <strong className="text-slate-900 font-bold">Note:</strong> The FREE Version remains available for everyone. The Licensed Version is intended for users who want a{' '}
                      <strong className="text-slate-900 font-bold">private, branded, customized, and fully controlled version</strong> of the software.
                    </div>
                  </div>

                  {/* Action Jump to Bengali (if viewMode === 'all') */}
                  {viewMode === 'all' && (
                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={() => scrollToSection(notice1BnRef)}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <span>👇 নিচে Notice 1-এর সম্পূর্ণ বাংলা সংস্করণ দেওয়া হলো (ক্লিক করুন)</span>
                        <ArrowDown className="w-4 h-4 animate-bounce" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* BENGALI PART (NOTICE 1) - DIRECTLY UNDERNEATH ENGLISH */}
              {(viewMode === 'all' || viewMode === 'bn') && (
                <div
                  ref={notice1BnRef}
                  className={`space-y-4 ${
                    viewMode === 'all' ? 'pt-8 mt-6 border-t-4 border-emerald-300' : ''
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-200">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-100 border-2 border-emerald-400 text-emerald-950 font-black text-sm uppercase tracking-wider shadow-xs">
                      <span>🇧🇩</span>
                      <span>বাংলা সংস্করণ</span>
                    </div>
                    {viewMode === 'all' && (
                      <button
                        type="button"
                        onClick={() => scrollToSection(notice1EnRef)}
                        className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 hover:bg-blue-100 cursor-pointer"
                      >
                        <span>👆 উপরে English পড়ুন</span>
                        <ArrowUp className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 text-sm sm:text-base leading-relaxed text-slate-900 font-semibold">
                    <p>
                      <strong className="text-slate-950 font-black text-base sm:text-lg">Image to Prompt Metadata</strong> বর্তমানে সবার জন্য{' '}
                      <span className="inline-block px-3 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black border border-emerald-300">
                        সম্পূর্ণ ফ্রি
                      </span>{' '}
                      ব্যবহার করা যাচ্ছে।
                    </p>
                    <p>
                      তবে আপনি চাইলে এই সফটওয়্যারটি{' '}
                      <strong className="text-amber-900 font-black">নিজের নামে, নিজের ব্র্যান্ড ও পরিচয়ে</strong> ব্যবহার করার জন্য একটি সম্পূর্ণ{' '}
                      <strong className="text-slate-950 font-black">Licensed & Custom Version</strong> নিতে পারবেন।
                    </p>
                  </div>

                  <div className="bg-emerald-50/70 p-4 sm:p-5 rounded-xl border-2 border-emerald-200 space-y-3">
                    <h3 className="font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
                      <span>🌟</span>
                      <span>লাইসেন্সকৃত ভার্সনে আপনি পারবেন:</span>
                    </h3>
                    <ul className="space-y-2.5 text-sm sm:text-[15px] font-bold text-slate-800">
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-lg shrink-0">✅</span>
                        <span>সফটওয়্যারের নাম ও ব্র্যান্ডিং নিজের নামে পরিবর্তন করতে</span>
                      </li>
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-lg shrink-0">✅</span>
                        <span>নিজের প্রয়োজন অনুযায়ী সম্পূর্ণ UI ও প্ল্যাটফর্ম কাস্টমাইজ করতে</span>
                      </li>
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-lg shrink-0">✅</span>
                        <span><strong className="text-slate-950 font-black">Admin Panel</strong> থেকে সম্পূর্ণ সিস্টেম নিয়ন্ত্রণ করতে</span>
                      </li>
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-lg shrink-0">✅</span>
                        <span>Admin Panel থেকেই User-এর জন্য License Key তৈরি, যোগ, সক্রিয় ও পরিচালনা করতে</span>
                      </li>
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-lg shrink-0">✅</span>
                        <span>নিজের লাইসেন্সকৃত প্ল্যাটফর্মের উপর সম্পূর্ণ প্রশাসনিক নিয়ন্ত্রণ রাখতে</span>
                      </li>
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-lg shrink-0">✅</span>
                        <span>নিজের ব্র্যান্ড ও ব্যবসায়িক পরিচয়ে সফটওয়্যারটি ব্যবহার করতে</span>
                      </li>
                    </ul>
                  </div>

                  {/* Bengali Pricing & Note */}
                  <div className="space-y-2.5">
                    <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-sm sm:text-base font-bold leading-relaxed flex items-start gap-2.5">
                      <span className="text-xl shrink-0">💰</span>
                      <div>
                        <strong className="text-amber-950 font-black">মূল্য:</strong> লাইসেন্স ও কাস্টমাইজেশনের মূল্য আপনার প্রয়োজন ও চাহিদার উপর নির্ভর করবে।
                      </div>
                    </div>
                    <div className="text-sm sm:text-base text-slate-900 font-black px-1">
                      মূল্য, লাইসেন্স, কাস্টমাইজেশন এবং অন্যান্য বিস্তারিত তথ্যের জন্য{' '}
                      <a
                        href="https://t.me/hridoystockdesigner"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-700 hover:text-sky-900 underline"
                      >
                        Developer-এর সাথে যোগাযোগ করুন
                      </a>।
                    </div>
                    <div className="text-xs sm:text-sm text-slate-800 bg-slate-100 p-3.5 rounded-xl border border-slate-300 font-medium leading-relaxed">
                      <strong className="text-slate-950 font-bold">বিশেষ দ্রষ্টব্য:</strong> FREE Version সবার জন্য উন্মুক্ত থাকবে। Licensed Version তাদের জন্য, যারা সফটওয়্যারটি{' '}
                      <strong className="text-slate-950 font-black">নিজের নামে, নিজের ব্র্যান্ডে, সম্পূর্ণ কাস্টমাইজেশন ও নিয়ন্ত্রণসহ</strong> ব্যবহার করতে চান।
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Card Footer Action */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Turnkey Branded Edition</span>
                <a
                  href="https://t.me/hridoystockdesigner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm text-sky-700 hover:text-sky-900 font-black flex items-center gap-1.5 hover:underline"
                >
                  <span>Contact on Telegram</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </section>

          {/* ================= RIGHT COLUMN: NOTICE 2 ================= */}
          <section className="bg-white border-2 border-emerald-300 rounded-2xl shadow-md shadow-slate-200/80 overflow-hidden flex flex-col">
            {/* Notice 2 Sticky Header */}
            <div className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur-md px-5 sm:px-6 py-4 border-b border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🔐</span>
                <div>
                  <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
                    PREMIUM ADMIN & USER CONTROL SYSTEM
                  </h2>
                  <p className="text-xs text-emerald-900 font-bold">
                    Notice 2: Independent Code-Based Architecture
                  </p>
                </div>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {viewMode === 'all' && (
                  <>
                    <button
                      type="button"
                      onClick={() => scrollToSection(notice2EnRef)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200 cursor-pointer flex items-center gap-1"
                    >
                      <span>🇬🇧 En</span>
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection(notice2BnRef)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 cursor-pointer flex items-center gap-1"
                    >
                      <span>🇧🇩 বাংলা</span>
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </>
                )}
                <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-200 text-emerald-900 border border-emerald-300">
                  Notice 2
                </span>
              </div>
            </div>

            {/* Notice 2 Body */}
            <div className="p-5 sm:p-7 space-y-6">
              {/* ENGLISH PART (NOTICE 2) */}
              {(viewMode === 'all' || viewMode === 'en') && (
                <div ref={notice2EnRef} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-blue-200">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100 border border-blue-300 text-blue-900 font-black text-xs uppercase tracking-wider">
                      <span>🇬🇧</span>
                      <span>ENGLISH VERSION</span>
                    </div>
                    {viewMode === 'all' && (
                      <button
                        type="button"
                        onClick={() => scrollToSection(notice2BnRef)}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                      >
                        <span>👇 নিচে বাংলা সংস্করণ পড়ুন</span>
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="text-sm sm:text-base leading-relaxed text-slate-800 font-medium">
                    <p>
                      The Licensed Version includes a <strong className="text-slate-900 font-black">Premium Quality Admin Panel & User Panel</strong> that provides complete control and management of the entire platform.
                    </p>
                  </div>

                  {/* Architecture Highlight Box */}
                  <div className="p-4 sm:p-5 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 text-sm sm:text-[15px] font-semibold leading-relaxed shadow-2xs">
                    The system is{' '}
                    <strong className="text-emerald-900 font-black underline decoration-emerald-500">
                      NOT controlled or dependent on Firebase, Supabase, or any third-party backend/database service
                    </strong>. The complete management system is controlled through its own{' '}
                    <strong className="text-slate-900 font-black">Source Code, Backend Logic, Configuration Files, and Internal Data Management System</strong>.
                  </div>

                  <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3">
                    <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <span>🛡️</span>
                      <span>The Admin Panel allows the platform owner to:</span>
                    </h3>
                    <ul className="space-y-2.5 text-sm sm:text-[15px] font-semibold text-slate-800">
                      <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-base shrink-0">✅</span>
                        <span>Manage Users & User Accounts</span>
                      </li>
                      <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-base shrink-0">✅</span>
                        <span>Add, Activate, Deactivate & Manage License Keys</span>
                      </li>
                      <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-base shrink-0">✅</span>
                        <span>Control User Access & Permissions</span>
                      </li>
                      <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-base shrink-0">✅</span>
                        <span>Manage Platform Settings & Configurations</span>
                      </li>
                      <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-base shrink-0">✅</span>
                        <span>Control User Panel Features & Availability</span>
                      </li>
                      <li className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-base shrink-0">✅</span>
                        <span>Manage System Data and Core Management Functions</span>
                      </li>
                    </ul>
                  </div>

                  {/* Summary Callout */}
                  <div className="p-4 rounded-xl bg-teal-50 border border-teal-300 text-teal-950 text-sm sm:text-[15px] font-bold leading-relaxed">
                    🎯 This provides a{' '}
                    <strong className="text-teal-900 font-black">Fully Independent, Private, Customizable, and Code-Based Management System</strong>{' '}
                    with complete administrative control.
                  </div>

                  {/* Action Jump to Bengali (if viewMode === 'all') */}
                  {viewMode === 'all' && (
                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={() => scrollToSection(notice2BnRef)}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <span>👇 নিচে Notice 2-এর সম্পূর্ণ বাংলা সংস্করণ দেওয়া হলো (ক্লিক করুন)</span>
                        <ArrowDown className="w-4 h-4 animate-bounce" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* BENGALI PART (NOTICE 2) - DIRECTLY UNDERNEATH ENGLISH */}
              {(viewMode === 'all' || viewMode === 'bn') && (
                <div
                  ref={notice2BnRef}
                  className={`space-y-4 ${
                    viewMode === 'all' ? 'pt-8 mt-6 border-t-4 border-emerald-300' : ''
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-200">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-100 border-2 border-emerald-400 text-emerald-950 font-black text-sm uppercase tracking-wider shadow-xs">
                      <span>🇧🇩</span>
                      <span>বাংলা সংস্করণ</span>
                    </div>
                    {viewMode === 'all' && (
                      <button
                        type="button"
                        onClick={() => scrollToSection(notice2EnRef)}
                        className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 hover:bg-blue-100 cursor-pointer"
                      >
                        <span>👆 উপরে English পড়ুন</span>
                        <ArrowUp className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="text-sm sm:text-base leading-relaxed text-slate-900 font-semibold">
                    <p>
                      Licensed Version-এর সাথে থাকবে একটি{' '}
                      <strong className="text-slate-950 font-black text-base sm:text-lg">Premium Quality Admin Panel & User Panel</strong>, যার মাধ্যমে পুরো platform সম্পূর্ণভাবে নিয়ন্ত্রণ ও পরিচালনা করা যাবে।
                    </p>
                  </div>

                  {/* Highlight Box Bengali */}
                  <div className="p-4 sm:p-5 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-sm sm:text-base font-bold leading-relaxed shadow-xs">
                    এই system{' '}
                    <strong className="text-emerald-900 font-black underline decoration-emerald-500">
                      Firebase, Supabase অথবা কোনো third-party backend/database service দ্বারা controlled বা dependent নয়
                    </strong>। সম্পূর্ণ management system software-এর নিজস্ব{' '}
                    <strong className="text-slate-950 font-black">Source Code, Backend Logic, Configuration Files এবং Internal Data Management System</strong>-এর মাধ্যমে পরিচালিত হবে।
                  </div>

                  <div className="bg-emerald-50/70 p-4 sm:p-5 rounded-xl border-2 border-emerald-200 space-y-3">
                    <h3 className="font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
                      <span>🛡️</span>
                      <span>Admin Panel থেকে platform owner সম্পূর্ণভাবে:</span>
                    </h3>
                    <ul className="space-y-2.5 text-sm sm:text-[15px] font-bold text-slate-800">
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-lg shrink-0">✅</span>
                        <span>User ও User Account Manage করতে পারবেন</span>
                      </li>
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-lg shrink-0">✅</span>
                        <span>License Key Add, Activate, Deactivate ও Manage করতে পারবেন</span>
                      </li>
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-lg shrink-0">✅</span>
                        <span>User Access ও Permissions Control করতে পারবেন</span>
                      </li>
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-lg shrink-0">✅</span>
                        <span>Platform Settings ও Configurations Manage করতে পারবেন</span>
                      </li>
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-lg shrink-0">✅</span>
                        <span>User Panel-এর Features ও Availability Control করতে পারবেন</span>
                      </li>
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-600 font-black text-lg shrink-0">✅</span>
                        <span>System Data ও Core Management Functions পরিচালনা করতে পারবেন</span>
                      </li>
                    </ul>
                  </div>

                  {/* Bottom Bengali Summary Callout */}
                  <div className="p-4 rounded-xl bg-teal-50 border-2 border-teal-300 text-teal-950 text-sm sm:text-base font-bold leading-relaxed">
                    🎯 অর্থাৎ এটি একটি{' '}
                    <strong className="text-teal-950 font-black">Fully Independent, Private, Customizable এবং Code-Based Management System</strong>, যেখানে platform owner-এর থাকবে সম্পূর্ণ administrative control।
                  </div>
                </div>
              )}

              {/* Bottom Card Footer Action */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">100% Self-Hosted & Secure</span>
                <a
                  href="https://t.me/hridoystockdesigner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm text-emerald-700 hover:text-emerald-900 font-black flex items-center gap-1.5 hover:underline"
                >
                  <span>Inquire Architecture</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
