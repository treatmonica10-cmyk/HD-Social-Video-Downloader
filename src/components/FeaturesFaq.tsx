import React, { useState } from "react";
import { Sparkles, ShieldCheck, Zap, Music2, ChevronDown, HelpCircle } from "lucide-react";
import { Language } from "../types";
import { translations } from "../translations";

interface FeaturesFaqProps {
  lang: Language;
}

export const FeaturesFaq: React.FC<FeaturesFaqProps> = ({ lang }) => {
  const t = translations[lang];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const features = [
    {
      title: t.feature1Title,
      desc: t.feature1Desc,
      icon: <Sparkles className="w-5 h-5 text-blue-600" />,
      badge: "4K / 1080p",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      title: t.feature2Title,
      desc: t.feature2Desc,
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      badge: "No Logo",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      title: t.feature3Title,
      desc: t.feature3Desc,
      icon: <Music2 className="w-5 h-5 text-purple-600" />,
      badge: "320 kbps",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      title: t.feature4Title,
      desc: t.feature4Desc,
      icon: <Zap className="w-5 h-5 text-amber-600" />,
      badge: "Free 100%",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    },
  ];

  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq3Q, a: t.faq3A },
  ];

  return (
    <div id="features-and-faq-section" className="w-full max-w-5xl mx-auto my-12 px-4">
      {/* Features Grid */}
      <div className="mb-14">
        <div className="text-center mb-8">
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
            {t.featuresTitle}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            {lang === "km"
              ? "បច្ចេកវិទ្យាទាញយកវីដេអូលឿនរហ័ស គុណភាពច្បាស់ និងងាយស្រួលបំផុត"
              : "Advanced media extractor providing best-in-class resolution and speed"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feat, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                    {feat.icon}
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${feat.badgeColor}`}
                  >
                    {feat.badge}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">
                  {feat.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs Section */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <h3 className="text-xl font-extrabold text-slate-900">
            {t.faqTitle}
          </h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
