import React from "react";
import { Download, History, Sparkles, Layers, Globe, HardDrive } from "lucide-react";
import { Language } from "../types";
import { translations } from "../translations";
import { User } from "firebase/auth";

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  isBatchMode: boolean;
  onToggleBatchMode: () => void;
  historyCount: number;
  onOpenHistory: () => void;
  googleUser?: User | null;
  onOpenGoogleDrive: () => void;
  autoSyncToDrive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  isBatchMode,
  onToggleBatchMode,
  historyCount,
  onOpenHistory,
  googleUser,
  onOpenGoogleDrive,
  autoSyncToDrive = false,
}) => {
  const t = translations[lang];

  return (
    <header id="main-header" className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Download className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
                {t.appName}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Sparkles className="w-3 h-3 text-blue-600" />
                HD 4K
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden md:block">
              {t.appSubname}
            </p>
          </div>
        </div>

        {/* Actions right */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Google Drive Integration Button */}
          <button
            id="open-google-drive-btn"
            type="button"
            onClick={onOpenGoogleDrive}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              googleUser
                ? "bg-white border-blue-300 text-slate-800 hover:border-blue-400 hover:shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
            }`}
            title={lang === "km" ? "Google Drive រក្សាទុកវីដេអូ" : "Google Drive Backup"}
          >
            {googleUser?.photoURL ? (
              <img
                src={googleUser.photoURL}
                alt={googleUser.displayName || "Google"}
                referrerPolicy="no-referrer"
                className="w-4 h-4 rounded-full object-cover"
              />
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
            )}
            <span className="hidden sm:inline">Drive</span>
            {googleUser && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          {/* Mode Switch: Single / Batch */}
          <button
            id="toggle-batch-mode-btn"
            type="button"
            onClick={onToggleBatchMode}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border cursor-pointer ${
              isBatchMode
                ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isBatchMode ? t.singleMode : t.batchMode}</span>
            <span className="sm:hidden">{isBatchMode ? "Single" : "Batch"}</span>
          </button>

          {/* Download History Button */}
          <button
            id="open-history-btn"
            type="button"
            onClick={onOpenHistory}
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
            title={t.historyTitle}
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">{t.historyTitle}</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {/* Language Toggle */}
          <button
            id="toggle-language-btn"
            type="button"
            onClick={onToggleLang}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
            title="ប្តូរភាសា / Change Language"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{lang === "km" ? "ភាសាខ្មែរ" : "English"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
