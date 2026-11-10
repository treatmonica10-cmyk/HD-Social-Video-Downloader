import React, { useState } from "react";
import { Copy, Sparkles, CheckCircle2, Film, Facebook, Instagram, Youtube, Twitter } from "lucide-react";
import { Language, PlatformType } from "../types";
import { translations } from "../translations";

interface PlatformGuideProps {
  lang: Language;
}

export const PlatformGuide: React.FC<PlatformGuideProps> = ({ lang }) => {
  const t = translations[lang];
  const [activePlatform, setActivePlatform] = useState<PlatformType>("tiktok");

  const platformGuides: Record<
    string,
    { title: string; tipKm: string; tipEn: string; icon: React.ReactNode }
  > = {
    tiktok: {
      title: "TikTok",
      tipKm: "ចុចប៊ូតុង Share (ចែករំលែក) នៅខាងស្តាំវីដេអូ > ជ្រើសរើស 'Copy Link' រួចបិទភ្ជាប់ក្នុងប្រអប់ខាងលើដើម្បីទទួលបានវីដេអូគ្មាន Watermark",
      tipEn: "Tap the Share arrow icon on TikTok > Select 'Copy Link' and paste here to download without watermark in 1080p.",
      icon: <Film className="w-4 h-4 text-cyan-500" />,
    },
    facebook: {
      title: "Facebook",
      tipKm: "ចុចសញ្ញាចុច ៣ (...) ឬប៊ូតុង Share លើវីដេអូ ឬ Facebook Reel > ជ្រើសរើស 'Copy Link' ដើម្បីទាញយកកម្រិត HD 1080p",
      tipEn: "Click the 3 dots (...) or Share button on Facebook Video/Reels > Select 'Copy Link' for 1080p HD quality.",
      icon: <Facebook className="w-4 h-4 text-blue-600" />,
    },
    instagram: {
      title: "Instagram",
      tipKm: "ចុចសញ្ញាផ្ញើ (Paper Plane) ឬសញ្ញាចុច ៣ លើ Reels ឬ Post > ចុច 'Copy Link' ដើម្បីទាញយកវីដេអូ ឬសំឡេង MP3",
      tipEn: "Tap the paper plane Share icon or 3 dots on Instagram Reel > Copy link and download clean video or audio.",
      icon: <Instagram className="w-4 h-4 text-pink-600" />,
    },
    youtube: {
      title: "YouTube",
      tipKm: "ចុច 'Share' លើវីដេអូ YouTube ឬ YouTube Shorts > ចម្លងតំណភ្ជាប់ (Copy link) ដើម្បីទាញយក 4K / 1080p / MP3",
      tipEn: "Click 'Share' on any YouTube video or Shorts > Copy URL to download in 4K, 1080p, or high-bitrate MP3.",
      icon: <Youtube className="w-4 h-4 text-red-600" />,
    },
    twitter: {
      title: "X (Twitter)",
      tipKm: "ចុចប៊ូតុង Share លើ Tweet ដែលមានវីដេអូ > ជ្រើសរើស 'Copy link to Post' ដើម្បីទាញយក MP4",
      tipEn: "Click the Share icon under the tweet > Select 'Copy link to Post' to save video in MP4.",
      icon: <Twitter className="w-4 h-4 text-slate-800" />,
    },
  };

  return (
    <div id="user-guide-section" className="w-full max-w-5xl mx-auto my-12 px-4">
      <div className="text-center mb-8">
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
          {t.guideTitle}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500">
          {lang === "km"
            ? "ទាញយកវីដេអូគុណភាពខ្ពស់ដោយមិនបាច់ដំឡើង App បន្ថែម ឬបង្កើតគណនី"
            : "No software installation or account sign-up needed. Fast & simple."}
        </p>
      </div>

      {/* 3 Steps Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Step 1 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-sm mb-3">
              01
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1.5">
              {t.step1Title}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.step1Desc}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold">
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Video URL</span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-sm mb-3">
              02
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1.5">
              {t.step2Title}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.step2Desc}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-indigo-600 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Paste & Analyze</span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold text-sm mb-3">
              03
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1.5">
              {t.step3Title}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.step3Desc}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save MP4 / MP3</span>
          </div>
        </div>
      </div>

      {/* Platform-Specific Hint Box */}
      <div className="bg-slate-100/80 rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-bold text-slate-700 mr-2">
            {lang === "km" ? "ការណែនាំតាមបណ្តាញនីមួយៗ៖" : "Platform Tips:"}
          </span>
          {Object.entries(platformGuides).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActivePlatform(key as PlatformType)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activePlatform === key
                  ? "bg-white text-slate-900 shadow-xs border border-slate-300"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.icon}
              <span>{item.title}</span>
            </button>
          ))}
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
          {lang === "km"
            ? platformGuides[activePlatform]?.tipKm
            : platformGuides[activePlatform]?.tipEn}
        </div>
      </div>
    </div>
  );
};
