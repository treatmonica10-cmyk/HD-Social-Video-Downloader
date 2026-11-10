import React, { useState } from "react";
import { Search, Clipboard, X, ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Language, PlatformType } from "../types";
import { translations } from "../translations";
import { getPlatformBadge } from "./PlatformIcons";

interface UrlInputSectionProps {
  lang: Language;
  url: string;
  onChangeUrl: (val: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  onSelectSample: (sampleUrl: string) => void;
}

const SAMPLE_LINKS: { platform: PlatformType; title: string; url: string }[] = [
  {
    platform: "tiktok",
    title: "TikTok Reel (HD)",
    url: "https://www.tiktok.com/@creative_artist/video/734891283749281729",
  },
  {
    platform: "facebook",
    title: "Facebook 4K Nature",
    url: "https://www.facebook.com/watch/?v=987123654123456",
  },
  {
    platform: "instagram",
    title: "Instagram Food Reel",
    url: "https://www.instagram.com/reel/C3-q2WnLz1A/",
  },
  {
    platform: "youtube",
    title: "YouTube Tech Shorts",
    url: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
  },
  {
    platform: "twitter",
    title: "X (Twitter) Trending",
    url: "https://x.com/tech_insider/status/1765432198765432100",
  },
];

const PLATFORMS: PlatformType[] = [
  "tiktok",
  "facebook",
  "instagram",
  "youtube",
  "twitter",
  "pinterest",
  "threads",
];

export const UrlInputSection: React.FC<UrlInputSectionProps> = ({
  lang,
  url,
  onChangeUrl,
  onAnalyze,
  isLoading,
  onSelectSample,
}) => {
  const t = translations[lang];
  const [pasteFeedback, setPasteFeedback] = useState(false);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          onChangeUrl(text.trim());
          setPasteFeedback(true);
          setTimeout(() => setPasteFeedback(false), 2000);
        }
      }
    } catch {
      // Clipboard read blocked by browser permissions
      const promptText = prompt(t.pastePlaceholder);
      if (promptText) {
        onChangeUrl(promptText.trim());
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading && url.trim()) {
      onAnalyze();
    }
  };

  return (
    <div id="url-input-container" className="w-full">
      {/* Hero Headline */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-200 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>{lang === "km" ? "ទាញយកគុណភាព 1080p & 4K គ្មាន Watermark" : "1080p & 4K High Quality Without Watermark"}</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight mb-3">
          {t.appName}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          {t.tagline}
        </p>
      </div>

      {/* Input Box Card */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-2 sm:p-3 transition-all duration-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {/* Input field with icon */}
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <Search className="w-5 h-5" />
            </div>
            <input
              id="video-url-input"
              type="url"
              value={url}
              onChange={(e) => onChangeUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.pastePlaceholder}
              className="w-full pl-11 pr-20 py-3.5 sm:py-4 bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base rounded-xl focus:outline-none"
              disabled={isLoading}
            />

            {/* Clear button if has text */}
            {url && (
              <button
                id="clear-url-btn"
                type="button"
                onClick={() => onChangeUrl("")}
                className="absolute right-12 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                title={t.clearBtn}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Quick Paste Button */}
            <button
              id="paste-url-btn"
              type="button"
              onClick={handlePaste}
              className="absolute right-2 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1"
              title={t.pasteBtn}
            >
              {pasteFeedback ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">OK</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.pasteBtn}</span>
                </>
              )}
            </button>
          </div>

          {/* Download/Analyze Trigger Button */}
          <button
            id="start-analyze-btn"
            type="button"
            onClick={onAnalyze}
            disabled={isLoading || !url.trim()}
            className="w-full sm:w-auto px-6 py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm sm:text-base rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t.analyzing}</span>
              </>
            ) : (
              <>
                <span>{t.analyzeBtn}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Platform Badges */}
      <div className="max-w-3xl mx-auto mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs font-medium text-slate-500 mr-1">
          {t.supportedPlatforms}
        </span>
        {PLATFORMS.map((platform) => {
          const badge = getPlatformBadge(platform);
          return (
            <span
              key={platform}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.bgColor} ${badge.textColor} ${badge.borderColor} shadow-2xs opacity-90`}
            >
              {badge.icon}
              <span>{badge.name}</span>
            </span>
          );
        })}
      </div>

      {/* Quick Test Samples Ribbon */}
      <div className="max-w-3xl mx-auto mt-5 p-3 rounded-xl bg-slate-100/80 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.trySamples}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_LINKS.map((sample) => (
              <button
                key={sample.platform}
                type="button"
                onClick={() => onSelectSample(sample.url)}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 rounded-lg border border-slate-200 font-medium transition-all shadow-2xs"
              >
                {sample.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
