import React from "react";
import { QrCode, X, Smartphone, Download, Copy, Check } from "lucide-react";
import { Language } from "../types";
import { translations } from "../translations";

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  lang: Language;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  lang,
}) => {
  const t = translations[lang];
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !url) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
    url
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 flex flex-col items-center text-center">
        {/* Close button */}
        <div className="w-full flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-1">
          {t.qrModalTitle}
        </h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          {t.qrModalDesc}
        </p>

        {/* QR Code Graphic */}
        <div className="p-3 bg-white rounded-xl border-2 border-dashed border-slate-200 shadow-xs mb-4">
          <img
            src={qrImageUrl}
            alt="Download QR Code"
            className="w-48 h-48 rounded-lg"
          />
        </div>

        <div className="w-full flex items-center gap-2 mb-2">
          <div className="flex-1 p-2 bg-slate-100 rounded-lg text-[11px] font-mono text-slate-600 truncate text-left">
            {url}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
            title="Copy link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span>iOS Camera & Android QR Scanner</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
        >
          {t.closeBtn}
        </button>
      </div>
    </div>
  );
};
