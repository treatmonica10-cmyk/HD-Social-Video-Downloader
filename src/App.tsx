import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { UrlInputSection } from "./components/UrlInputSection";
import { VideoResultCard } from "./components/VideoResultCard";
import { BatchDownloader } from "./components/BatchDownloader";
import { PlatformGuide } from "./components/PlatformGuide";
import { FeaturesFaq } from "./components/FeaturesFaq";
import { DownloadHistory } from "./components/DownloadHistory";
import { QrCodeModal } from "./components/QrCodeModal";
import { GoogleDriveManagerModal } from "./components/GoogleDriveManagerModal";
import { VideoMetadata, HistoryItem, Language } from "./types";
import { translations } from "./translations";
import { AlertCircle, Shield, Heart } from "lucide-react";
import { initAuth } from "./services/googleDriveAuth";
import { User } from "firebase/auth";

export default function App() {
  const [lang, setLang] = useState<Language>("km");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);

  // Google Drive state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDriveManagerOpen, setIsDriveManagerOpen] = useState(false);

  const t = translations[lang];

  // Initialize Firebase Auth listener for Google Drive
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        if (token) setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      unsubscribe();
    };
  }, []);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hd_video_downloader_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save history to localStorage
  const saveHistoryList = (newList: HistoryItem[]) => {
    setHistory(newList);
    try {
      localStorage.setItem("hd_video_downloader_history", JSON.stringify(newList));
    } catch {
      // Ignore storage errors
    }
  };

  const handleSaveToHistory = (item: HistoryItem) => {
    const updated = [item, ...history.filter((h) => h.id !== item.id)].slice(0, 50);
    saveHistoryList(updated);
  };

  const handleClearHistory = () => {
    saveHistoryList([]);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    saveHistoryList(updated);
  };

  // Analyze URL handler
  const handleAnalyze = async (targetUrl?: string) => {
    const analyzeUrl = (targetUrl || url).trim();
    if (!analyzeUrl) return;

    if (!analyzeUrl.startsWith("http://") && !analyzeUrl.startsWith("https://")) {
      setErrorMsg(t.invalidUrlError);
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: analyzeUrl }),
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        setMetadata(resData.data);
        setErrorMsg(null);
        // Smooth scroll to video card
        setTimeout(() => {
          document.getElementById("video-result-card")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 150);
      } else {
        setErrorMsg(resData.error || t.serverError);
      }
    } catch {
      setErrorMsg(t.serverError);
    } finally {
      setIsLoading(false);
    }
  };

  // Immediate 1-click test with sample URL
  const handleSelectSample = (sampleUrl: string) => {
    setUrl(sampleUrl);
    handleAnalyze(sampleUrl);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <Header
        lang={lang}
        onToggleLang={() => setLang(lang === "km" ? "en" : "km")}
        isBatchMode={isBatchMode}
        onToggleBatchMode={() => setIsBatchMode(!isBatchMode)}
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        googleUser={googleUser}
        onOpenGoogleDrive={() => setIsDriveManagerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-10 pb-16">
        {/* URL Input Section OR Batch Section */}
        {isBatchMode ? (
          <BatchDownloader
            lang={lang}
            onSaveToHistory={handleSaveToHistory}
          />
        ) : (
          <UrlInputSection
            lang={lang}
            url={url}
            onChangeUrl={setUrl}
            onAnalyze={() => handleAnalyze()}
            isLoading={isLoading}
            onSelectSample={handleSelectSample}
          />
        )}

        {/* Error Notification Banner */}
        {errorMsg && (
          <div className="max-w-3xl mx-auto mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Video Result Preview & Download Card */}
        {metadata && !isBatchMode && (
          <VideoResultCard
            metadata={metadata}
            lang={lang}
            onSaveToHistory={handleSaveToHistory}
            onOpenQr={(qrUrl) => setQrModalUrl(qrUrl)}
            googleUser={googleUser}
            accessToken={accessToken}
            onGoogleSignInSuccess={(user, token) => {
              setGoogleUser(user);
              setAccessToken(token);
            }}
          />
        )}

        {/* Step-by-Step User Instructions */}
        <PlatformGuide lang={lang} />

        {/* Features Highlights and FAQs */}
        <FeaturesFaq lang={lang} />
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              HD
            </div>
            <span className="font-bold text-slate-800">
              {t.appName}
            </span>
            <span>•</span>
            <span>{t.appSubname}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {lang === "km"
                ? "រក្សាសិទ្ធិគ្រប់យ៉ាង ២០២៦ • សម្រាប់តែការទាញយកផ្ទាល់ខ្លួនប៉ុណ្ណោះ"
                : "All Rights Reserved 2026 • For personal use only"}
            </span>
          </div>
        </div>
      </footer>

      {/* History Modal Drawer */}
      <DownloadHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        lang={lang}
        onClearHistory={handleClearHistory}
        onDeleteItem={handleDeleteHistoryItem}
      />

      {/* Google Drive Files & Storage Manager Modal */}
      <GoogleDriveManagerModal
        isOpen={isDriveManagerOpen}
        onClose={() => setIsDriveManagerOpen(false)}
        user={googleUser}
        accessToken={accessToken}
        lang={lang}
        onLoginSuccess={(user, token) => {
          setGoogleUser(user);
          setAccessToken(token);
        }}
        onLogoutSuccess={() => {
          setGoogleUser(null);
          setAccessToken(null);
        }}
      />

      {/* Mobile QR Code Modal */}
      <QrCodeModal
        isOpen={!!qrModalUrl}
        onClose={() => setQrModalUrl(null)}
        url={qrModalUrl || ""}
        lang={lang}
      />
    </div>
  );
}
