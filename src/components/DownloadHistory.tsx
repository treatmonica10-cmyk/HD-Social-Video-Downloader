import React from "react";
import { History, Trash2, Download, ExternalLink, X } from "lucide-react";
import { HistoryItem, Language } from "../types";
import { translations } from "../translations";
import { getPlatformBadge } from "./PlatformIcons";

interface DownloadHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  lang: Language;
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

export const DownloadHistory: React.FC<DownloadHistoryProps> = ({
  isOpen,
  onClose,
  history,
  lang,
  onClearHistory,
  onDeleteItem,
}) => {
  const t = translations[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {t.historyTitle} ({history.length})
              </h3>
              <p className="text-xs text-slate-500">
                {lang === "km"
                  ? "វីដេអូដែលបានទាញយករួចនៅលើឧបករណ៍នេះ"
                  : "Downloaded videos saved in this browser session"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(t.confirmClear)) {
                    onClearHistory();
                  }
                }}
                className="text-xs px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.clearHistory}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-1" />
              <p className="text-sm font-medium">{t.historyEmpty}</p>
            </div>
          ) : (
            history.map((item) => {
              const badge = getPlatformBadge(item.platform);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 gap-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-200"
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${badge.bgColor} ${badge.textColor}`}
                        >
                          {badge.name}
                        </span>
                        <span className="text-[11px] text-slate-400">{item.downloadedAt}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate mb-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {item.formatSelected} • {item.fileSize}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={item.downloadUrl}
                      download
                      className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      title={t.reDownload}
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    <a
                      href={item.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                      title="Open source link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title={t.deleteItem}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
