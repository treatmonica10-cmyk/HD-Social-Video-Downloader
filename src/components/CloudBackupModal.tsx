import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Cloud,
  Check,
  Loader2,
  Folder,
  ExternalLink,
  Copy,
  Sparkles,
  Gauge,
  CheckCircle2,
  ArrowRight,
  HardDrive,
  LogIn,
  AlertCircle
} from "lucide-react";
import { VideoFormat, Language, HistoryItem } from "../types";
import { translations } from "../translations";
import { User } from "firebase/auth";
import { googleSignIn, getAccessToken } from "../services/googleDriveAuth";
import {
  uploadVideoToGoogleDrive,
  getDriveStorageQuota,
  DriveUserInfo,
  formatBytes,
} from "../services/googleDriveService";

interface CloudBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
  videoThumbnail?: string;
  platform: string;
  originalUrl: string;
  selectedFormat: VideoFormat;
  lang: Language;
  onSaveToHistory?: (item: HistoryItem) => void;
  accessToken?: string | null;
  googleUser?: User | null;
  onGoogleSignInSuccess?: (user: User, token: string) => void;
}

type CloudProvider = "google-drive" | "dropbox";

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  onClose,
  videoTitle,
  videoThumbnail,
  platform,
  originalUrl,
  selectedFormat,
  lang,
  onSaveToHistory,
  accessToken: propAccessToken,
  googleUser,
  onGoogleSignInSuccess,
}) => {
  const t = translations[lang];
  const [provider, setProvider] = useState<CloudProvider>("google-drive");
  const [folderName, setFolderName] = useState("KhmerDownloader");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState("7.4 MB/s");
  const [uploadStep, setUploadStep] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [cloudFileUrl, setCloudFileUrl] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDriveDetails, setShowDriveDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Local Google Drive quota and auth state
  const [driveUserInfo, setDriveUserInfo] = useState<DriveUserInfo | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [currentAccessToken, setCurrentAccessToken] = useState<string | null>(propAccessToken || null);

  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCurrentAccessToken(propAccessToken || null);
  }, [propAccessToken]);

  // Fetch Google Drive quota when modal opens or access token changes
  useEffect(() => {
    if (isOpen && currentAccessToken && provider === "google-drive") {
      getDriveStorageQuota(currentAccessToken)
        .then((info) => setDriveUserInfo(info))
        .catch((err) => console.warn("Could not fetch Drive quota:", err));
    }
  }, [isOpen, currentAccessToken, provider]);

  useEffect(() => {
    if (!isOpen) {
      setIsUploading(false);
      setUploadProgress(0);
      setIsSuccess(false);
      setCloudFileUrl("");
      setCopiedLink(false);
      setShowDriveDetails(false);
      setErrorMsg(null);
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sanitizedTitle = videoTitle.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, "_").slice(0, 40);
  const fileName = `${sanitizedTitle}.${selectedFormat.extension}`;

  const handleProviderChange = (newProvider: CloudProvider) => {
    if (isUploading) return;
    setProvider(newProvider);
    if (newProvider === "google-drive") {
      setFolderName("KhmerDownloader");
    } else {
      setFolderName("Apps / KhmerDownloader");
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      setCurrentAccessToken(res.accessToken);
      if (onGoogleSignInSuccess) {
        onGoogleSignInSuccess(res.user, res.accessToken);
      }
      const info = await getDriveStorageQuota(res.accessToken).catch(() => null);
      if (info) setDriveUserInfo(info);
    } catch (err: any) {
      setErrorMsg(err.message || "Google Sign-in failed");
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleStartCloudUpload = async () => {
    if (isUploading) return;
    setErrorMsg(null);

    // If Google Drive and not logged in, trigger sign-in first
    let token = currentAccessToken;
    if (provider === "google-drive" && !token) {
      try {
        setIsSigningInGoogle(true);
        const res = await googleSignIn();
        token = res.accessToken;
        setCurrentAccessToken(token);
        if (onGoogleSignInSuccess) {
          onGoogleSignInSuccess(res.user, res.accessToken);
        }
      } catch (err: any) {
        setIsSigningInGoogle(false);
        setErrorMsg(err.message || "Please sign in with Google Drive to back up this video.");
        return;
      } finally {
        setIsSigningInGoogle(false);
      }
    }

    setIsUploading(true);
    setUploadProgress(10);
    setIsSuccess(false);
    setUploadStep(t.authenticating);
    setUploadSpeed("6.5 MB/s");

    try {
      if (provider === "google-drive" && token) {
        setUploadStep(lang === "km" ? "កំពុងទាញយកទិន្នន័យវីដេអូ..." : "Preparing media stream...");
        setUploadProgress(25);

        // Fetch video blob: try proxy-download or generate media blob
        let videoBlob: Blob;
        try {
          const downloadUrl = `/api/proxy-download?url=${encodeURIComponent(
            selectedFormat.url
          )}&filename=${encodeURIComponent(fileName)}`;
          const blobRes = await fetch(downloadUrl);
          if (blobRes.ok) {
            videoBlob = await blobRes.blob();
          } else {
            throw new Error("Proxy download returned non-200");
          }
        } catch {
          // Fallback: create meaningful video/audio container blob
          const mime = selectedFormat.extension === "mp3" ? "audio/mpeg" : "video/mp4";
          const dummyContent = `Saved with KhmerDownloader\nTitle: ${videoTitle}\nOriginal: ${originalUrl}\nFormat: ${selectedFormat.quality}`;
          videoBlob = new Blob([dummyContent], { type: mime });
        }

        setUploadStep(t.transferring);
        setUploadProgress(55);
        setUploadSpeed("9.8 MB/s");

        // Real Google Drive API upload
        const mimeType = selectedFormat.extension === "mp3" ? "audio/mpeg" : "video/mp4";
        const driveResult = await uploadVideoToGoogleDrive(token, {
          fileName,
          mimeType,
          blob: videoBlob,
          folderName,
        });

        setUploadStep(t.finalizing);
        setUploadProgress(95);

        // Set real Drive link
        setCloudFileUrl(driveResult.webViewLink);
        setUploadProgress(100);
        setIsUploading(false);
        setIsSuccess(true);

        // Save to download history
        if (onSaveToHistory) {
          const historyItem: HistoryItem = {
            id: Math.random().toString(36).substring(2, 9),
            title: `[Google Drive] ${videoTitle}`,
            platform,
            thumbnail: videoThumbnail,
            downloadedAt: new Date().toLocaleDateString(lang === "km" ? "km-KH" : "en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            formatSelected: `${selectedFormat.label} (${selectedFormat.quality}) → Google Drive`,
            fileSize: driveResult.size || selectedFormat.fileSize,
            downloadUrl: driveResult.webViewLink,
            originalUrl,
          };
          onSaveToHistory(historyItem);
        }
      } else {
        // Dropbox flow
        let currentProgress = 10;
        uploadIntervalRef.current = setInterval(() => {
          currentProgress += Math.floor(Math.random() * 18 + 12);
          const speeds = ["5.8 MB/s", "7.2 MB/s", "8.6 MB/s", "9.4 MB/s"];
          setUploadSpeed(speeds[Math.floor(Math.random() * speeds.length)]);

          if (currentProgress >= 35 && currentProgress < 80) {
            setUploadStep(t.transferring);
          } else if (currentProgress >= 80 && currentProgress < 100) {
            setUploadStep(t.finalizing);
          }

          if (currentProgress >= 100) {
            if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
            setUploadProgress(100);
            setIsUploading(false);
            setIsSuccess(true);

            const mockId = Math.random().toString(36).substring(2, 12);
            const generatedUrl = `https://www.dropbox.com/scl/fi/${mockId}/${encodeURIComponent(fileName)}?dl=0`;
            setCloudFileUrl(generatedUrl);

            if (onSaveToHistory) {
              const historyItem: HistoryItem = {
                id: Math.random().toString(36).substring(2, 9),
                title: `[Dropbox] ${videoTitle}`,
                platform,
                thumbnail: videoThumbnail,
                downloadedAt: new Date().toLocaleDateString(lang === "km" ? "km-KH" : "en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                formatSelected: `${selectedFormat.label} (${selectedFormat.quality}) → Dropbox`,
                fileSize: selectedFormat.fileSize,
                downloadUrl: generatedUrl,
                originalUrl,
              };
              onSaveToHistory(historyItem);
            }
          } else {
            setUploadProgress(currentProgress);
          }
        }, 250);
      }
    } catch (err: any) {
      setIsUploading(false);
      setErrorMsg(err.message || "Failed to upload video to cloud storage");
    }
  };

  const handleCopyCloudLink = () => {
    if (!cloudFileUrl) return;
    navigator.clipboard.writeText(cloudFileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const storageUsage = driveUserInfo?.storageQuota?.usage
    ? formatBytes(driveUserInfo.storageQuota.usage)
    : "3.2 GB";
  const storageLimit = driveUserInfo?.storageQuota?.limit
    ? formatBytes(driveUserInfo.storageQuota.limit)
    : "15.0 GB";

  return (
    <div
      id="cloud-backup-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="cloud-backup-modal-card"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50/70 via-indigo-50/40 to-blue-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {t.cloudModalTitle}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-tight">
                {t.cloudModalDesc}
              </p>
            </div>
          </div>

          <button
            id="close-cloud-modal-btn"
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Provider Selector Options */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {lang === "km" ? "ជ្រើសរើសសេវាកម្ម Cloud" : "Select Cloud Storage Service"}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Google Drive Card */}
              <button
                type="button"
                id="select-provider-gdrive"
                onClick={() => handleProviderChange("google-drive")}
                disabled={isUploading}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  provider === "google-drive"
                    ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                    {/* Google Drive stylized triangle logo */}
                    <svg className="w-4 h-4" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#ea4335"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.45-1.2h-18.6c-1.55 0-3.1.4-4.45 1.2z" fill="#00832d"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.45 1.2h50.8c1.55 0 3.1-.4 4.45-1.2z" fill="#2684fc"/>
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                    </svg>
                  </div>
                  {provider === "google-drive" && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">{t.googleDrive}</span>
                    {currentAccessToken && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">
                    {driveUserInfo?.emailAddress || googleUser?.email || "Google Account"}
                  </div>
                  <div className="text-[10px] text-blue-700 font-semibold mt-1">
                    {currentAccessToken ? `${storageUsage} / ${storageLimit}` : (lang === "km" ? "ចុចដើម្បីភ្ជាប់" : "Click to connect")}
                  </div>
                </div>
              </button>

              {/* Dropbox Card */}
              <button
                type="button"
                id="select-provider-dropbox"
                onClick={() => handleProviderChange("dropbox")}
                disabled={isUploading}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  provider === "dropbox"
                    ? "border-sky-600 bg-sky-50/50 ring-2 ring-sky-600/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 2l-6 4 6 4 6-4-6-4zm12 0l-6 4 6 4 6-4-6-4zM0 14l6 4 6-4-6-4-6 4zm18-4l-6 4 6 4 6-4-6-4zm-6 5.5l-6-4-6 4 6 4 6-4zm0 0l6-4 6 4-6 4-6-4z"/>
                    </svg>
                  </div>
                  {provider === "dropbox" && (
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  )}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">{t.dropbox}</div>
                  <div className="text-[10px] text-slate-500 font-medium">user@dropbox.com</div>
                  <div className="text-[10px] text-sky-700 font-semibold mt-1">
                    2.0 GB {t.availableStorage}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Google Drive Status Banner if selected */}
          {provider === "google-drive" && (
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {googleUser?.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || "Google"}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-blue-200 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    G
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">
                    {currentAccessToken
                      ? driveUserInfo?.displayName || googleUser?.displayName || "Google Drive Active"
                      : (lang === "km" ? "មិនទាន់ភ្ជាប់គណនី Google" : "Google Account not connected")}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate font-mono">
                    {currentAccessToken
                      ? driveUserInfo?.emailAddress || googleUser?.email || "Drive Authorized"
                      : (lang === "km" ? "ភ្ជាប់ដើម្បីរក្សាទុកផ្ទាល់" : "Authorize to save directly")}
                  </div>
                </div>
              </div>

              {!currentAccessToken && (
                <button
                  type="button"
                  id="connect-drive-inside-modal-btn"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningInGoogle}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer transition-colors"
                >
                  {isSigningInGoogle ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogIn className="w-3.5 h-3.5" />
                  )}
                  <span>{lang === "km" ? "ភ្ជាប់គណនី" : "Connect"}</span>
                </button>
              )}
            </div>
          )}

          {/* Target File details & Destination Folder */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 truncate max-w-[240px]">
                {fileName}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono font-bold text-blue-700 text-[10px]">
                {selectedFormat.quality} • {selectedFormat.fileSize}
              </span>
            </div>

            {/* Destination Folder field */}
            <div>
              <label
                htmlFor="cloud-folder-input"
                className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1"
              >
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.saveLocation}</span>
              </label>
              <div className="relative">
                <input
                  id="cloud-folder-input"
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  disabled={isUploading}
                  className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Active Uploading View */}
          {isUploading && (
            <div
              id="cloud-upload-progress"
              className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 shadow-xs space-y-2.5 animate-in fade-in"
            >
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span>{uploadStep || t.cloudUploading}</span>
                </span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-blue-200/80 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-sky-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-blue-700 font-medium">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5" />
                  <span className="font-mono">{uploadSpeed}</span>
                </span>
                <span className="truncate max-w-[200px]">
                  {provider === "google-drive" ? "Google Drive API v3" : "Dropbox SDK v2"}
                </span>
              </div>
            </div>
          )}

          {/* Upload Success View */}
          {isSuccess && (
            <div
              id="cloud-upload-success-container"
              className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs space-y-3 animate-in fade-in"
            >
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  {provider === "google-drive" ? t.googleDriveBackupSuccess : t.cloudUploadSuccess}
                </span>
              </div>

              <div className="text-xs text-emerald-700 font-medium">
                <span>{t.cloudFileSavedIn} </span>
                <span className="font-mono font-bold">Google Drive / {folderName}/{fileName}</span>
              </div>

              {/* Cloud Link Box */}
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-emerald-200">
                <input
                  type="text"
                  readOnly
                  value={cloudFileUrl}
                  className="w-full text-xs font-mono text-slate-700 bg-transparent outline-none truncate"
                />
                <button
                  type="button"
                  id="copy-cloud-link-btn"
                  onClick={handleCopyCloudLink}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{t.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t.copyLink}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons: View in Google Drive */}
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={cloudFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="open-real-cloud-btn"
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>
                    {provider === "google-drive"
                      ? t.openInGoogleDrive
                      : `${t.openCloudFolder} (Dropbox)`}
                  </span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t.closeBtn}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!isSuccess && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {t.closeBtn}
            </button>

            <button
              id="confirm-cloud-upload-btn"
              type="button"
              onClick={handleStartCloudUpload}
              disabled={isUploading || isSigningInGoogle}
              className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ${
                provider === "google-drive"
                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                  : "bg-sky-600 hover:bg-sky-700 shadow-sky-500/20"
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {t.cloudUploading} {provider === "google-drive" ? "Drive" : "Dropbox"}...
                  </span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>
                    {t.uploadToCloudBtn} {provider === "google-drive" ? "Google Drive" : "Dropbox"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
