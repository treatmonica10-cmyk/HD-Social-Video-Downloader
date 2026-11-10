import React, { useState, useRef, useEffect } from "react";
import { Layers, Play, Download, Loader2, CheckCircle2, AlertTriangle, Trash2, ListFilter } from "lucide-react";
import { Language, BatchItem, HistoryItem } from "../types";
import { translations } from "../translations";
import { getPlatformBadge } from "./PlatformIcons";

interface BatchDownloaderProps {
  lang: Language;
  onSaveToHistory: (item: HistoryItem) => void;
}

export const BatchDownloader: React.FC<BatchDownloaderProps> = ({ lang, onSaveToHistory }) => {
  const t = translations[lang];
  const [inputText, setInputText] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemoveAllChecked, setIsRemoveAllChecked] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const sampleBatch = [
    "https://www.tiktok.com/@creator/video/734891283749281729",
    "https://www.facebook.com/watch/?v=987123654123456",
    "https://www.instagram.com/reel/C3-q2WnLz1A/",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ"
  ].join("\n");

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < items.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRemoveAllToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (items.length === 0) return;
    const checked = e.target.checked;
    if (checked) {
      setIsRemoveAllChecked(true);
      const confirmed = window.confirm(t.removeAllConfirm);
      if (confirmed) {
        setItems([]);
        setSelectedIds(new Set());
        setInputText("");
      }
      setIsRemoveAllChecked(false);
    }
  };

  const handleRemoveSelected = () => {
    if (selectedIds.size === 0) return;
    const remaining = items.filter((item) => !selectedIds.has(item.id));
    setItems(remaining);
    setSelectedIds(new Set());
    setInputText(remaining.map((i) => i.url).join("\n"));
  };

  const handleRemoveSingle = (id: string) => {
    const remaining = items.filter((item) => item.id !== id);
    setItems(remaining);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setInputText(remaining.map((i) => i.url).join("\n"));
  };

  const handleInsertSamples = () => {
    setInputText(sampleBatch);
    const urls = sampleBatch.split("\n").map((u) => u.trim());
    const sampleItems: BatchItem[] = urls.map((url) => ({
      id: Math.random().toString(36).substring(2, 9),
      url,
      status: "pending",
    }));
    setItems(sampleItems);
    setSelectedIds(new Set(sampleItems.map((i) => i.id)));
  };

  const handleLoadLinksFromInput = () => {
    const urls = inputText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"));

    if (urls.length === 0) {
      alert(t.invalidUrlError);
      return;
    }

    const newItems: BatchItem[] = urls.map((url) => ({
      id: Math.random().toString(36).substring(2, 9),
      url,
      status: "pending",
    }));

    setItems(newItems);
    setSelectedIds(new Set(newItems.map((i) => i.id)));
  };

  const handleStartBatch = async () => {
    let currentBatch = items;

    if (currentBatch.length === 0) {
      const urls = inputText
        .split("\n")
        .map((u) => u.trim())
        .filter((u) => u.startsWith("http"));

      if (urls.length === 0) {
        alert(t.invalidUrlError);
        return;
      }

      currentBatch = urls.map((url) => ({
        id: Math.random().toString(36).substring(2, 9),
        url,
        status: "pending",
      }));

      setItems(currentBatch);
      setSelectedIds(new Set(currentBatch.map((i) => i.id)));
    }

    // Determine target items to process: selected items that are pending, or all pending if none selected
    const targetItems = currentBatch.filter(
      (item) => item.status === "pending" && (selectedIds.size === 0 || selectedIds.has(item.id))
    );

    if (targetItems.length === 0) {
      return;
    }

    setIsProcessing(true);

    for (let i = 0; i < targetItems.length; i++) {
      const item = targetItems[i];
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "extracting" } : it))
      );

      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: item.url }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: "ready", metadata: data.data } : it
            )
          );
        } else {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? { ...it, status: "error", errorMessage: data.error || "Failed" }
                : it
            )
          );
        }
      } catch {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: "error", errorMessage: "Connection Error" }
              : it
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const handleDownloadSingle = (item: BatchItem) => {
    if (!item.metadata) return;
    const bestFormat =
      item.metadata.formats.find((f) => f.id === "1080p-full-hd") || item.metadata.formats[0];
    const safeTitle = item.metadata.title.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, "_").slice(0, 30);
    const filename = `${safeTitle}_HD.${bestFormat.extension}`;
    const downloadUrl = `/api/proxy-download?url=${encodeURIComponent(
      bestFormat.url
    )}&filename=${encodeURIComponent(filename)}`;

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    onSaveToHistory({
      id: Math.random().toString(36).substring(2, 9),
      title: item.metadata.title,
      platform: item.metadata.platform,
      thumbnail: item.metadata.thumbnail,
      downloadedAt: new Date().toLocaleTimeString(),
      formatSelected: `${bestFormat.label}`,
      fileSize: bestFormat.fileSize,
      downloadUrl,
      originalUrl: item.url,
    });
  };

  const handleDownloadAllReady = () => {
    // If specific items are selected, download only selected ready items; otherwise all ready
    const readyItems = items.filter(
      (i) => i.status === "ready" && i.metadata && (selectedIds.size === 0 || selectedIds.has(i.id))
    );
    readyItems.forEach((item, index) => {
      setTimeout(() => {
        handleDownloadSingle(item);
      }, index * 800);
    });
  };

  const pendingSelectedCount = items.filter(
    (i) => i.status === "pending" && selectedIds.has(i.id)
  ).length;
  const readySelectedCount = items.filter(
    (i) => i.status === "ready" && i.metadata && selectedIds.has(i.id)
  ).length;

  return (
    <div id="batch-downloader-container" className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 my-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {t.batchMode}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === "km" ? "ដាក់តំណភ្ជាប់ច្រើនក្នុងពេលតែមួយដើម្បីទាញយកជាជង់" : "Download multiple video links simultaneously"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInsertSamples}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
        >
          {lang === "km" ? "បញ្ចូលតំណគំរូ ៤" : "Insert 4 Sample Links"}
        </button>
      </div>

      <textarea
        id="batch-urls-textarea"
        rows={4}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={t.batchPlaceholder}
        className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
        disabled={isProcessing}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            id="start-batch-analysis-btn"
            type="button"
            onClick={handleStartBatch}
            disabled={isProcessing || (!inputText.trim() && items.length === 0)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.analyzing}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {items.length > 0 && selectedIds.size > 0 && pendingSelectedCount > 0
                    ? `${t.analyzeSelected} (${pendingSelectedCount})`
                    : t.startBatch}
                </span>
              </>
            )}
          </button>

          {inputText.trim().length > 0 && items.length === 0 && (
            <button
              id="load-batch-links-btn"
              type="button"
              onClick={handleLoadLinksFromInput}
              disabled={isProcessing}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <ListFilter className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.loadLinks}</span>
            </button>
          )}
        </div>

        {items.some((i) => i.status === "ready") && (
          <button
            id="download-all-batch-btn"
            type="button"
            onClick={handleDownloadAllReady}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>
              {selectedIds.size > 0 && readySelectedCount > 0
                ? `${t.downloadSelected} (${readySelectedCount})`
                : t.downloadAll}
            </span>
          </button>
        )}
      </div>

      {/* Batch Results List */}
      {items.length > 0 && (
        <div className="mt-6 border-t border-slate-200 pt-4 space-y-3">
          {/* Header toolbar with Select All and Remove All checkboxes */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/90 p-2.5 sm:p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Select All Checkbox */}
              <label
                htmlFor="batch-select-all-checkbox"
                className="inline-flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm font-bold text-slate-800 hover:text-indigo-600 transition-colors"
              >
                <input
                  type="checkbox"
                  id="batch-select-all-checkbox"
                  ref={selectAllRef}
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  disabled={isProcessing}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                />
                <span>{t.selectAll}</span>
                <span className="text-[11px] font-medium text-slate-500 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">
                  {selectedIds.size}/{items.length} {t.selectedOf}
                </span>
              </label>

              {/* Remove All Checkbox */}
              <label
                htmlFor="batch-remove-all-checkbox"
                className="inline-flex items-center gap-1.5 cursor-pointer select-none text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-700 transition-colors"
              >
                <input
                  type="checkbox"
                  id="batch-remove-all-checkbox"
                  checked={isRemoveAllChecked}
                  onChange={handleRemoveAllToggle}
                  disabled={isProcessing}
                  className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                />
                <span>{t.removeAll}</span>
              </label>
            </div>

            {/* Remove Selected Button if subset is checked */}
            {selectedIds.size > 0 && selectedIds.size < items.length && (
              <button
                id="batch-remove-selected-btn"
                type="button"
                onClick={handleRemoveSelected}
                disabled={isProcessing}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {t.removeSelected} ({selectedIds.size})
                </span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => {
              const badge = item.metadata ? getPlatformBadge(item.metadata.platform) : null;
              const isSelected = selectedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all gap-3 ${
                    isSelected
                      ? "bg-indigo-50/40 border-indigo-200 shadow-xs"
                      : "bg-slate-50 border-slate-200 opacity-85 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Individual Checkbox */}
                    <input
                      type="checkbox"
                      id={`batch-item-checkbox-${item.id}`}
                      checked={isSelected}
                      onChange={() => handleToggleItem(item.id)}
                      disabled={isProcessing}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600 shrink-0"
                    />

                    <span className="text-xs font-bold text-slate-400 w-4">
                      {idx + 1}
                    </span>

                    {item.metadata?.thumbnail ? (
                      <img
                        src={item.metadata.thumbnail}
                        alt="Thumbnail"
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                        <Layers className="w-5 h-5 text-slate-400" />
                      </div>
                    )}

                    <div className="truncate">
                      <div className="flex items-center gap-2 mb-0.5">
                        {badge && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${badge.bgColor} ${badge.textColor}`}
                          >
                            {badge.name}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {item.metadata?.title || item.url}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate font-mono">{item.url}</p>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    {item.status === "pending" && (
                      <span className="text-xs text-slate-400">
                        {lang === "km" ? "រង់ចាំ..." : "Pending"}
                      </span>
                    )}
                    {item.status === "extracting" && (
                      <span className="text-xs text-indigo-600 flex items-center gap-1 font-semibold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{lang === "km" ? "វិភាគ..." : "Parsing..."}</span>
                      </span>
                    )}
                    {item.status === "ready" && (
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(item)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>1080p</span>
                      </button>
                    )}
                    {item.status === "error" && (
                      <span className="text-xs text-rose-500 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{item.errorMessage || "Failed"}</span>
                      </span>
                    )}

                    {/* Single remove button */}
                    <button
                      id={`batch-remove-item-${item.id}`}
                      type="button"
                      onClick={() => handleRemoveSingle(item.id)}
                      disabled={isProcessing}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title={lang === "km" ? "លុបតំណនេះចេញ" : "Remove this link"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

