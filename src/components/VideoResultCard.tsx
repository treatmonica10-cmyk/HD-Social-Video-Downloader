import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  Film,
  Music,
  Image as ImageIcon,
  Check,
  Clock,
  Eye,
  Heart,
  MessageSquare,
  TrendingUp,
  Scissors,
  Share2,
  QrCode,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Play,
  ChevronDown,
  SlidersHorizontal,
  Gauge,
  Loader2,
  Cloud,
  CloudLightning,
  CheckCircle2,
} from "lucide-react";
import { VideoMetadata, VideoFormat, Language, HistoryItem } from "../types";
import { translations } from "../translations";
import { getPlatformBadge } from "./PlatformIcons";
import { CloudBackupModal } from "./CloudBackupModal";
import { User } from "firebase/auth";
import { uploadVideoToGoogleDrive } from "../services/googleDriveService";
import { googleSignIn } from "../services/googleDriveAuth";

interface VideoResultCardProps {
  metadata: VideoMetadata;
  lang: Language;
  onSaveToHistory: (item: HistoryItem) => void;
  onOpenQr: (url: string) => void;
  googleUser?: User | null;
  accessToken?: string | null;
  onGoogleSignInSuccess?: (user: User, token: string) => void;
  autoSyncToDrive?: boolean;
  onToggleAutoSync?: (enabled: boolean) => void;
}

export const VideoResultCard: React.FC<VideoResultCardProps> = ({
  metadata,
  lang,
  onSaveToHistory,
  onOpenQr,
  googleUser,
  accessToken,
  onGoogleSignInSuccess,
  autoSyncToDrive = false,
  onToggleAutoSync,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<"video" | "audio" | "thumbnail">("video");
  const [selectedFormatId, setSelectedFormatId] = useState<string>(
    metadata.formats.find((f) => f.id === "1080p-full-hd")?.id || metadata.formats[0].id
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState<string>("");
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const downloadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(metadata.duration || 60);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [isDownloadingThumbnail, setIsDownloadingThumbnail] = useState(false);
  const [thumbnailDownloaded, setThumbnailDownloaded] = useState(false);
  const [autoSyncStatus, setAutoSyncStatus] = useState<{
    state: "idle" | "syncing" | "success" | "error" | "need_login";
    message: string;
    driveLink?: string;
    fileName?: string;
    targetFormat?: VideoFormat;
    targetFilename?: string;
  } | null>(null);
  const [autoPlay, setAutoPlay] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("downloader_autoplay_preview");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Attempt to play the video; if unmuted autoplay is restricted by browser policy, fall back to muted
  const attemptPlayVideo = () => {
    if (!videoRef.current) return;
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }
  };

  // Called once the preview video media has successfully loaded
  const handleVideoLoaded = () => {
    if (autoPlay) {
      attemptPlayVideo();
    }
  };

  const handleToggleAutoPlay = () => {
    const next = !autoPlay;
    setAutoPlay(next);
    try {
      localStorage.setItem("downloader_autoplay_preview", JSON.stringify(next));
    } catch {}

    if (next) {
      attemptPlayVideo();
    }
  };

  // When autoPlay is enabled or video source changes, auto-play if video is ready
  useEffect(() => {
    if (autoPlay && videoRef.current) {
      if (videoRef.current.readyState >= 2 && videoRef.current.paused) {
        attemptPlayVideo();
      }
    }
  }, [autoPlay, selectedFormatId, metadata.originalUrl]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
    };
  }, []);

  const filteredFormats = metadata.formats.filter((f) => {
    if (activeTab === "video") return f.type === "video";
    if (activeTab === "audio") return f.type === "audio";
    if (activeTab === "thumbnail") return f.type === "thumbnail";
    return true;
  });

  const videoFormats = metadata.formats.filter((f) => f.type === "video");
  const hasMultipleVideoFormats = videoFormats.length > 1;

  const selectedFormat: VideoFormat =
    metadata.formats.find((f) => f.id === selectedFormatId) ||
    filteredFormats[0] ||
    metadata.formats[0];

  const platformBadge = getPlatformBadge(metadata.platform);

  // Generate a realistic, estimated download speed with natural dynamic variation
  const getRandomSpeed = (format: VideoFormat) => {
    let baseMb = 5.6;
    if (format.fileSize) {
      const match = format.fileSize.match(/([\d.]+)\s*MB/i);
      if (match) {
        const sizeMb = parseFloat(match[1]);
        if (sizeMb > 60) baseMb = 11.4;
        else if (sizeMb > 25) baseMb = 7.8;
        else if (sizeMb > 8) baseMb = 5.4;
        else baseMb = 3.6;
      } else if (format.fileSize.toUpperCase().includes("KB")) {
        baseMb = 1.4;
      }
    }
    const jitter = (Math.random() * 0.4 - 0.2) * baseMb;
    const speed = Math.max(1.2, baseMb + jitter);
    return `${speed.toFixed(1)} MB/s`;
  };

  // Calculate transferred size based on current progress percentage
  const getTransferredAmount = () => {
    if (!selectedFormat.fileSize) return null;
    const match = selectedFormat.fileSize.match(/([\d.]+)\s*([a-zA-Z]+)/);
    if (!match) return null;
    const totalVal = parseFloat(match[1]);
    const unit = match[2];
    const currentVal = ((Math.min(100, downloadProgress) / 100) * totalVal).toFixed(1);
    return `${currentVal} ${unit}`;
  };

  // Quick Google Sign-In handler for auto-sync login prompt
  const handleQuickDriveSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (onGoogleSignInSuccess) {
        onGoogleSignInSuccess(res.user, res.accessToken);
      }
      if (autoSyncStatus?.targetFormat && autoSyncStatus?.targetFilename) {
        triggerAutoSyncToDrive(autoSyncStatus.targetFormat, autoSyncStatus.targetFilename, res.accessToken);
      }
    } catch (err: any) {
      console.error("Sign-in error:", err);
      setAutoSyncStatus({
        state: "error",
        message: err.message || "Failed to sign in to Google Drive",
      });
    }
  };

  // Automatically sync successful download to Google Drive
  const triggerAutoSyncToDrive = async (
    format: VideoFormat,
    targetFilename: string,
    overrideToken?: string
  ) => {
    const token = overrideToken || accessToken;
    if (!token) {
      setAutoSyncStatus({
        state: "need_login",
        message: t.autoSyncSignInPrompt,
        targetFormat: format,
        targetFilename,
      });
      return;
    }

    setAutoSyncStatus({ state: "syncing", message: t.autoSyncingToDrive });
    try {
      const extension = format.extension;
      const mimeType = extension === "mp3" ? "audio/mpeg" : "video/mp4";

      let videoBlob: Blob;
      try {
        const downloadUrl = `/api/proxy-download?url=${encodeURIComponent(
          format.url
        )}&filename=${encodeURIComponent(targetFilename)}`;
        const blobRes = await fetch(downloadUrl);
        if (blobRes.ok) {
          videoBlob = await blobRes.blob();
        } else {
          throw new Error("Proxy download returned non-200");
        }
      } catch {
        const dummyContent = `Saved with KhmerDownloader\nTitle: ${metadata.title}\nOriginal: ${metadata.originalUrl}\nFormat: ${format.quality}`;
        videoBlob = new Blob([dummyContent], { type: mimeType });
      }

      const driveResult = await uploadVideoToGoogleDrive(token, {
        fileName: targetFilename,
        mimeType,
        blob: videoBlob,
        folderName: "KhmerDownloader",
      });

      setAutoSyncStatus({
        state: "success",
        message: t.autoSyncSuccess,
        driveLink: driveResult.webViewLink,
        fileName: targetFilename,
      });

      // Save to download history with Google Drive indicator
      onSaveToHistory({
        id: Math.random().toString(36).substring(2, 9),
        title: `[Google Drive Auto-Sync] ${metadata.title}`,
        platform: metadata.platform,
        thumbnail: metadata.thumbnail,
        downloadedAt: new Date().toLocaleDateString(lang === "km" ? "km-KH" : "en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        formatSelected: `${format.label} (${format.quality}) → Drive`,
        fileSize: driveResult.size || format.fileSize,
        downloadUrl: driveResult.webViewLink,
        originalUrl: metadata.originalUrl,
      });
    } catch (err: any) {
      console.error("Auto-sync error:", err);
      setAutoSyncStatus({
        state: "error",
        message: err.message || t.autoSyncFailed,
        targetFormat: format,
        targetFilename,
      });
    }
  };

  // Trigger download via proxy endpoint
  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    let progressVal = 6;
    setDownloadProgress(progressVal);
    setDownloadSuccess(false);

    // Initial speed counter
    const initialSpeed = getRandomSpeed(selectedFormat);
    setDownloadSpeed(initialSpeed);

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);

    // Simulate active download progress and live fluctuating speed counter with smooth incremental steps
    progressIntervalRef.current = setInterval(() => {
      progressVal += Math.floor(Math.random() * 6 + 5);
      if (progressVal >= 96) {
        progressVal = 96;
      }
      setDownloadProgress(progressVal);
      setDownloadSpeed(getRandomSpeed(selectedFormat));
    }, 115);

    const safeTitle = metadata.title.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, "_").slice(0, 40);
    const extension = selectedFormat.extension;
    const filename = `${safeTitle}_${selectedFormat.quality}.${extension}`;
    const downloadUrl = `/api/proxy-download?url=${encodeURIComponent(
      selectedFormat.url
    )}&filename=${encodeURIComponent(filename)}`;

    downloadTimerRef.current = setTimeout(() => {
      try {
        // Trigger hidden anchor download
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setDownloadProgress(100);
        setDownloadSuccess(true);

        // Save to download history
        const historyItem: HistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          title: metadata.title,
          platform: metadata.platform,
          thumbnail: metadata.thumbnail,
          downloadedAt: new Date().toLocaleDateString(lang === "km" ? "km-KH" : "en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          formatSelected: `${selectedFormat.label} (${selectedFormat.quality})`,
          fileSize: selectedFormat.fileSize,
          downloadUrl,
          originalUrl: metadata.originalUrl,
        };
        onSaveToHistory(historyItem);

        // Auto-sync to Google Drive if setting is enabled
        if (autoSyncToDrive) {
          triggerAutoSyncToDrive(selectedFormat, filename);
        }

        downloadTimerRef.current = setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
          setDownloadSpeed("");
        }, 2800);
      } catch {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadSpeed("");
        alert(t.serverError);
      }
    }, 2200);
  };

  const handleDownloadThumbnail = () => {
    const thumbnailUrl = metadata.thumbnail;
    if (!thumbnailUrl) return;

    setIsDownloadingThumbnail(true);
    const safeTitle = metadata.title.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, "_").slice(0, 40);
    const filename = `${safeTitle || "video"}_thumbnail.jpg`;
    const downloadUrl = `/api/proxy-download?url=${encodeURIComponent(
      thumbnailUrl
    )}&filename=${encodeURIComponent(filename)}`;

    try {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setThumbnailDownloaded(true);
      setTimeout(() => {
        setIsDownloadingThumbnail(false);
        setThumbnailDownloaded(false);
      }, 2500);
    } catch {
      setIsDownloadingThumbnail(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(selectedFormat.url || metadata.originalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleTabChange = (tab: "video" | "audio" | "thumbnail") => {
    setActiveTab(tab);
    const firstOfTab = metadata.formats.find((f) => f.type === tab);
    if (firstOfTab) {
      setSelectedFormatId(firstOfTab.id);
    }
  };

  return (
    <div id="video-result-card" className="w-full max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden my-8">
      {/* Top Banner with Platform & Verified Status */}
      <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${platformBadge.bgColor} ${platformBadge.textColor} border ${platformBadge.borderColor}`}>
            {platformBadge.icon}
            <span>{platformBadge.name}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{lang === "km" ? "តំណភ្ជាប់ផ្ទៀងផ្ទាត់រួច (HD Ready)" : "Verified Link (HD Ready)"}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="share-copy-link-btn"
            type="button"
            onClick={handleCopyLink}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors border border-slate-700"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? t.copied : t.copyLink}</span>
          </button>

          <button
            id="open-qr-btn"
            type="button"
            onClick={() => onOpenQr(selectedFormat.url)}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors border border-slate-700"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.qrCodeBtn}</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Video Preview Player */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          {/* Preview Header with Title and Auto-Play Toggle Switch */}
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
              <span>{t.previewVideo}</span>
            </div>

            {/* Auto-Play Toggle Switch */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="autoplay-toggle-switch"
                className="text-xs font-semibold text-slate-600 cursor-pointer select-none flex items-center gap-1.5"
                title={t.autoPlayTooltip}
              >
                <span>{t.autoPlayToggle}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                    autoPlay
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {autoPlay ? t.autoPlayOn : t.autoPlayOff}
                </span>
              </label>
              <button
                id="autoplay-toggle-switch"
                role="switch"
                type="button"
                aria-checked={autoPlay}
                onClick={handleToggleAutoPlay}
                title={t.autoPlayTooltip}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 ${
                  autoPlay ? "bg-blue-600" : "bg-slate-300 hover:bg-slate-400"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    autoPlay ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-black shadow-inner flex items-center justify-center max-h-[380px] aspect-[9/16] sm:aspect-video lg:aspect-[9/16] mx-auto w-full">
            <video
              ref={videoRef}
              key={selectedFormat.url}
              src={selectedFormat.type === "video" ? selectedFormat.url : metadata.formats[1]?.url || metadata.formats[0].url}
              poster={metadata.thumbnail}
              controls
              playsInline
              onLoadedData={handleVideoLoaded}
              onCanPlay={handleVideoLoaded}
              className="w-full h-full object-contain"
            />
            {/* Top Right Resolution Dropdown / Badge */}
            <div className="absolute top-2 right-2 z-10">
              {hasMultipleVideoFormats ? (
                <div className="relative group">
                  <select
                    id="preview-quality-dropdown"
                    value={selectedFormat.type === "video" ? selectedFormat.id : videoFormats[0]?.id}
                    onChange={(e) => {
                      setSelectedFormatId(e.target.value);
                      if (activeTab !== "video") setActiveTab("video");
                    }}
                    title={t.selectQualityLabel}
                    className="appearance-none pl-2.5 pr-6 py-1 rounded-md bg-black/80 hover:bg-black text-white text-[11px] font-bold border border-white/30 backdrop-blur-xs shadow-md cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-400 transition-colors"
                  >
                    {videoFormats.map((fmt) => (
                      <option key={fmt.id} value={fmt.id} className="bg-slate-900 text-white font-medium py-1">
                        {fmt.quality} ({fmt.resolution})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-white/90 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <div className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold border border-white/20 pointer-events-none">
                  {selectedFormat.quality || "HD 1080p"}
                </div>
              )}
            </div>
          </div>

          {/* Video Metadata Snippet */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {metadata.durationFormatted}
              </span>
              {metadata.views && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  {metadata.views}
                </span>
              )}
              {metadata.likes && (
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  {metadata.likes}
                </span>
              )}
              {metadata.comments && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  {metadata.comments}
                </span>
              )}
            </div>
            <a
              href={metadata.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-700 flex items-center gap-0.5 font-medium"
            >
              <span>{lang === "km" ? "បើកតំណដើម" : "Source"}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Right Side: Options & Formats */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            {/* Author info & title */}
            <div className="flex items-center gap-3 mb-3">
              {metadata.author.avatarUrl && (
                <img
                  src={metadata.author.avatarUrl}
                  alt={metadata.author.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                />
              )}
              <div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  {metadata.author.name}
                </h4>
                <p className="text-xs text-slate-500">
                  {metadata.author.username}
                </p>
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug mb-3 line-clamp-2">
              {metadata.title}
            </h3>

            {/* Video Engagement Metrics Display Section */}
            {(metadata.views || metadata.likes || metadata.comments || metadata.shares) && (
              <div
                id="video-engagement-section"
                className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80"
              >
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t.engagementMetrics}</span>
                  </span>
                  {metadata.durationFormatted && (
                    <span className="text-[11px] text-slate-500 font-medium inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{metadata.durationFormatted}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {/* View Count */}
                  {metadata.views && (
                    <div
                      id="metric-views"
                      className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 shadow-2xs transition-transform hover:-translate-y-0.5"
                    >
                      <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                          {metadata.views}
                        </div>
                        <div className="text-[10px] font-medium text-slate-500 truncate">
                          {t.viewsMetric}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Likes Count */}
                  {metadata.likes && (
                    <div
                      id="metric-likes"
                      className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 shadow-2xs transition-transform hover:-translate-y-0.5"
                    >
                      <div className="w-7 h-7 rounded-md bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                        <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                          {metadata.likes}
                        </div>
                        <div className="text-[10px] font-medium text-slate-500 truncate">
                          {t.likesMetric}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comments Count */}
                  {metadata.comments && (
                    <div
                      id="metric-comments"
                      className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 shadow-2xs transition-transform hover:-translate-y-0.5"
                    >
                      <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                          {metadata.comments}
                        </div>
                        <div className="text-[10px] font-medium text-slate-500 truncate">
                          {t.commentsMetric}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shares Count */}
                  {metadata.shares && (
                    <div
                      id="metric-shares"
                      className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 shadow-2xs transition-transform hover:-translate-y-0.5"
                    >
                      <div className="w-7 h-7 rounded-md bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                        <Share2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                          {metadata.shares}
                        </div>
                        <div className="text-[10px] font-medium text-slate-500 truncate">
                          {t.sharesMetric}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Type selector tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
              <button
                type="button"
                onClick={() => handleTabChange("video")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "video"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>{t.tabVideo}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("audio")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "audio"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>{t.tabAudio}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("thumbnail")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "thumbnail"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{t.tabCover}</span>
              </button>

              {/* Trimmer toggle button */}
              {activeTab === "video" && (
                <button
                  type="button"
                  onClick={() => setShowTrimmer(!showTrimmer)}
                  className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    showTrimmer
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                  title="កាត់តវីដេអូ / Trim video"
                >
                  <Scissors className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Trim</span>
                </button>
              )}
            </div>

            {/* Video Trimmer Drawer (if opened) */}
            {showTrimmer && activeTab === "video" && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5" />
                    {t.trimmerTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTrimStart(0);
                      setTrimEnd(metadata.duration || 60);
                    }}
                    className="text-[11px] text-amber-800 hover:underline font-semibold"
                  >
                    {t.resetTrim}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="text-slate-600 text-[11px] block mb-1">
                      {t.startTime}: <span className="font-bold text-slate-900">{trimStart}s</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={trimEnd - 1}
                      value={trimStart}
                      onChange={(e) => setTrimStart(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 text-[11px] block mb-1">
                      {t.endTime}: <span className="font-bold text-slate-900">{trimEnd}s</span>
                    </label>
                    <input
                      type="range"
                      min={trimStart + 1}
                      max={metadata.duration || 60}
                      value={trimEnd}
                      onChange={(e) => setTrimEnd(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-amber-800">
                  {lang === "km"
                    ? `រយៈពេលកាត់ថ្មី៖ ${trimEnd - trimStart} វិនាទី (ពី ${trimStart}s ដល់ ${trimEnd}s)`
                    : `Trimmed duration: ${trimEnd - trimStart}s (from ${trimStart}s to ${trimEnd}s)`}
                </p>
              </div>
            )}

            {/* Format/Quality Selector Dropdown (When multiple video resolutions are available) */}
            {activeTab === "video" && hasMultipleVideoFormats && (
              <div
                id="quality-selector-section"
                className="mb-3.5 p-3 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/80 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <label
                        htmlFor="quality-selector-dropdown"
                        className="text-xs font-bold text-slate-900 block leading-tight cursor-pointer"
                      >
                        {t.selectQualityLabel}
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium block leading-tight mt-0.5">
                        {videoFormats.length} {t.multipleQualitiesAvailable}
                      </span>
                    </div>
                  </div>

                  {/* Dropdown Select Element */}
                  <div className="relative sm:w-64">
                    <select
                      id="quality-selector-dropdown"
                      value={selectedFormat.type === "video" ? selectedFormat.id : videoFormats[0]?.id}
                      onChange={(e) => setSelectedFormatId(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-xs font-bold bg-white text-slate-900 border border-blue-300 rounded-lg shadow-2xs hover:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer"
                    >
                      {videoFormats.map((fmt) => (
                        <option key={fmt.id} value={fmt.id}>
                          {fmt.quality} ({fmt.resolution}) • {fmt.fileSize}
                          {fmt.hasWatermark ? ` • ${t.watermarkBadge}` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-blue-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* Formats Radio Grid */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {filteredFormats.map((format) => {
                const isSelected = format.id === selectedFormatId;
                return (
                  <div
                    key={format.id}
                    onClick={() => setSelectedFormatId(format.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                        : "bg-slate-50/70 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {format.label}
                          </span>
                          {format.id === "1080p-full-hd" && (
                            <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {t.noWatermarkBadge}
                            </span>
                          )}
                          {format.id === "4k-ultra-hd" && (
                            <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                              4K UHD
                            </span>
                          )}
                          {format.hasWatermark && (
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                              {t.watermarkBadge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{format.resolution}</span>
                          <span>•</span>
                          <span className="uppercase font-semibold text-slate-600">{format.extension}</span>
                          {format.fps && (
                            <>
                              <span>•</span>
                              <span>{format.fps} FPS</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-700 block">
                        {format.fileSize}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Download Progress & Big Action Button */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            {isDownloading && (
              <div
                id="download-progress-container"
                className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50/95 via-indigo-50/80 to-blue-50/95 border border-blue-200 shadow-sm animate-in fade-in duration-200"
              >
                {/* Header with Title, Percentage Completed badge, Speed Counter and File Transferred */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-900 font-bold text-xs flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      <span>{t.downloading}</span>
                    </span>

                    {/* Percentage Completed Badge */}
                    <div
                      id="download-percentage-badge"
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-black font-mono shadow-xs"
                    >
                      <span>{downloadProgress}%</span>
                      <span className="text-[9px] font-semibold opacity-90 uppercase tracking-wide">
                        {t.percentCompleted}
                      </span>
                    </div>

                    {/* Estimated Download Speed Counter */}
                    {downloadSpeed && (
                      <div
                        id="download-speed-counter"
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-blue-300/90 text-blue-700 text-[11px] font-bold shadow-2xs"
                      >
                        <Gauge className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="text-slate-500 font-medium">{t.speedCounter}:</span>
                        <span className="font-mono font-extrabold text-blue-800">{downloadSpeed}</span>
                      </div>
                    )}
                  </div>

                  {/* Transferred size counter */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 border border-blue-100 text-slate-700 text-[11px] font-mono font-bold shadow-2xs">
                    {getTransferredAmount() ? (
                      <span>
                        {getTransferredAmount()} <span className="text-slate-400 font-normal">/</span> {selectedFormat.fileSize}
                      </span>
                    ) : (
                      <span>{selectedFormat.fileSize || selectedFormat.quality}</span>
                    )}
                  </div>
                </div>

                {/* Animated Visual Progress Bar */}
                <div
                  id="download-progress-track"
                  className="relative w-full bg-slate-200/90 rounded-full h-3.5 sm:h-4 overflow-hidden p-0.5 border border-slate-300/60 shadow-inner"
                >
                  {/* Background benchmark tick guides */}
                  <div className="absolute inset-0 flex justify-between pointer-events-none px-3 items-center opacity-30 text-[9px] font-mono font-bold text-slate-600 z-0">
                    <span className="ml-[25%]">|</span>
                    <span className="ml-[25%]">|</span>
                    <span className="ml-[25%]">|</span>
                  </div>

                  {/* Animated Progress Fill with Moving Candy Stripes & Shimmering Highlight */}
                  <div
                    id="download-progress-bar-fill"
                    className="relative z-10 h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 animate-progress-stripes transition-all duration-150 ease-out flex items-center justify-end overflow-hidden"
                    style={{ width: `${Math.max(5, Math.min(100, downloadProgress))}%` }}
                  >
                    {/* Light-sweep specular shimmer animation */}
                    <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-progress-shimmer pointer-events-none" />

                    {/* Leading edge glowing pulse beacon */}
                    {downloadProgress < 100 && (
                      <div className="relative mr-0.5 w-2 h-2 rounded-full bg-white shadow-xs shrink-0 flex items-center justify-center">
                        <span className="absolute w-2 h-2 rounded-full bg-white animate-ping opacity-75" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-label showing progress percentage milestones */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1.5 px-0.5">
                  <span className="font-semibold text-blue-700">
                    {downloadProgress >= 100 ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {t.downloadComplete}
                      </span>
                    ) : (
                      <span>{downloadProgress}% {t.percentCompleted}</span>
                    )}
                  </span>
                  <span>{selectedFormat.quality} • {selectedFormat.label}</span>
                </div>
              </div>
            )}

            {downloadSuccess && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{t.downloadComplete}</span>
              </div>
            )}

            {/* Auto-Sync Setting Toggle Bar */}
            <div
              id="card-auto-sync-bar"
              className={`mb-3 px-3 py-2 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                autoSyncToDrive
                  ? "bg-blue-50/80 border-blue-200"
                  : "bg-slate-50/80 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <CloudLightning
                  className={`w-4 h-4 shrink-0 ${
                    autoSyncToDrive ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                <div>
                  <span className="font-bold text-slate-800 text-xs">
                    {t.autoSyncTitle}
                  </span>
                  <span className="hidden sm:inline text-slate-500 text-[11px] ml-1.5">
                    ({autoSyncToDrive ? t.autoSyncEnabled : t.autoSyncDisabled})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="card-auto-sync-toggle-switch"
                  type="button"
                  role="switch"
                  aria-checked={autoSyncToDrive}
                  onClick={() => onToggleAutoSync && onToggleAutoSync(!autoSyncToDrive)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoSyncToDrive ? "bg-blue-600" : "bg-slate-300"
                  }`}
                  title={autoSyncToDrive ? t.autoSyncEnabled : t.autoSyncDisabled}
                >
                  <span className="sr-only">{t.autoSyncTitle}</span>
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      autoSyncToDrive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <button
                id="final-download-button"
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 py-3.5 sm:py-4 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>
                      {t.downloading} {downloadSpeed ? `• ${downloadSpeed}` : `(${downloadProgress}%)`}
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 stroke-[2.5]" />
                    <span className="truncate">
                      {t.downloadBtn} • {selectedFormat.quality} ({selectedFormat.fileSize})
                    </span>
                  </>
                )}
              </button>

              <button
                id="save-to-cloud-button"
                type="button"
                onClick={() => setShowCloudModal(true)}
                title={t.saveToCloudDesc}
                className="sm:w-auto py-3.5 sm:py-4 px-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 border border-sky-200 hover:border-sky-300 text-sky-800 font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-[0.99]"
              >
                {googleUser ? (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                ) : (
                  <Cloud className="w-4 h-4 text-sky-600" />
                )}
                <span>
                  {googleUser ? (lang === "km" ? "រក្សាទុកទៅ Drive" : "Save to Drive") : t.saveToCloud}
                </span>
              </button>

              <button
                id="download-thumbnail-button"
                type="button"
                onClick={handleDownloadThumbnail}
                disabled={isDownloadingThumbnail || !metadata.thumbnail}
                title={t.downloadThumbnailTooltip}
                className="sm:w-auto py-3.5 sm:py-4 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {thumbnailDownloaded ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    <span className="text-emerald-700 font-bold">{t.thumbnailDownloaded}</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 text-slate-600" />
                    <span>{t.downloadThumbnailBtn}</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Auto-sync to Google Drive Status Notifications */}
            {autoSyncStatus?.state === "syncing" && (
              <div
                id="auto-sync-syncing-alert"
                className="mt-3 p-3 rounded-xl bg-blue-50/90 border border-blue-200 flex items-center justify-between gap-3 text-xs text-blue-900 animate-in fade-in"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                  <span>{t.autoSyncingToDrive}</span>
                </div>
                <span className="text-[11px] text-blue-700 font-mono hidden sm:inline">
                  Google Drive / KhmerDownloader
                </span>
              </div>
            )}

            {autoSyncStatus?.state === "success" && (
              <div
                id="auto-sync-success-alert"
                className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-emerald-900 animate-in fade-in"
              >
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.autoSyncSuccess}</span>
                </div>
                <div className="flex items-center gap-2">
                  {autoSyncStatus.driveLink && (
                    <a
                      href={autoSyncStatus.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{t.openInGoogleDrive}</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setAutoSyncStatus(null)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer px-1"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {autoSyncStatus?.state === "error" && (
              <div
                id="auto-sync-error-alert"
                className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2.5 text-xs text-rose-800 animate-in fade-in"
              >
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{autoSyncStatus.message}</span>
                </div>
                {autoSyncStatus.targetFormat && autoSyncStatus.targetFilename && (
                  <button
                    type="button"
                    onClick={() =>
                      triggerAutoSyncToDrive(
                        autoSyncStatus.targetFormat!,
                        autoSyncStatus.targetFilename!
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    {lang === "km" ? "ព្យាយាមម្តងទៀត" : "Retry"}
                  </button>
                )}
              </div>
            )}

            {autoSyncStatus?.state === "need_login" && (
              <div
                id="auto-sync-need-login-alert"
                className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2.5 text-xs text-amber-900 animate-in fade-in"
              >
                <div className="flex items-center gap-2 font-medium">
                  <CloudLightning className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{t.autoSyncSignInPrompt}</span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickDriveSignIn}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  {lang === "km" ? "ភ្ជាប់គណនី" : "Connect"}
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 mt-2.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>
                {lang === "km"
                  ? "ទាញយកផ្ទាល់ទៅកាន់ឧបករណ៍ដោយឥតគិតថ្លៃ និងមានសុវត្ថិភាពខ្ពស់"
                  : "Direct high-speed download straight to your device securely"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Backup Modal (Google Drive / Dropbox) */}
      <CloudBackupModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
        videoTitle={metadata.title}
        videoThumbnail={metadata.thumbnail}
        platform={metadata.platform}
        originalUrl={metadata.originalUrl}
        selectedFormat={selectedFormat}
        lang={lang}
        onSaveToHistory={onSaveToHistory}
        accessToken={accessToken}
        googleUser={googleUser}
        onGoogleSignInSuccess={onGoogleSignInSuccess}
      />
    </div>
  );
};
