import React, { useState, useEffect } from "react";
import {
  X,
  HardDrive,
  ExternalLink,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Folder,
  Film,
  AlertTriangle,
  Loader2,
  LogOut,
  Sparkles,
  CloudLightning,
  CheckCircle2,
} from "lucide-react";
import { Language } from "../types";
import { translations } from "../translations";
import {
  getDriveStorageQuota,
  listDriveSavedFiles,
  deleteDriveFile,
  DriveUserInfo,
  DriveFileItem,
  formatBytes,
} from "../services/googleDriveService";
import { googleSignIn, logoutGoogleDrive } from "../services/googleDriveAuth";
import { User } from "firebase/auth";

interface GoogleDriveManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accessToken: string | null;
  lang: Language;
  onLoginSuccess: (user: User, token: string) => void;
  onLogoutSuccess: () => void;
  autoSyncToDrive: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
}

export const GoogleDriveManagerModal: React.FC<GoogleDriveManagerModalProps> = ({
  isOpen,
  onClose,
  user,
  accessToken,
  lang,
  onLoginSuccess,
  onLogoutSuccess,
  autoSyncToDrive,
  onToggleAutoSync,
}) => {
  const t = translations[lang];
  const [userInfo, setUserInfo] = useState<DriveUserInfo | null>(null);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Destructive Confirmation Dialog State (Mandatory per Workspace guideline)
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDriveData = async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [info, filesList] = await Promise.all([
        getDriveStorageQuota(token).catch((err) => {
          console.warn("Storage quota fetch error:", err);
          return null;
        }),
        listDriveSavedFiles(token).catch((err) => {
          console.warn("Files list fetch error:", err);
          return [];
        }),
      ]);
      if (info) setUserInfo(info);
      setFiles(filesList);
    } catch (err: any) {
      setError(err.message || "Failed to load Google Drive files");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      fetchDriveData(accessToken);
    } else if (!accessToken) {
      setUserInfo(null);
      setFiles([]);
    }
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const result = await googleSignIn();
      onLoginSuccess(result.user, result.accessToken);
      fetchDriveData(result.accessToken);
    } catch (err: any) {
      setError(err.message || "Sign-in to Google Drive was cancelled or failed.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogleDrive();
    onLogoutSuccess();
    setUserInfo(null);
    setFiles([]);
  };

  const handleToggleAutoSyncClick = async () => {
    if (!user || !accessToken) {
      setIsSigningIn(true);
      setError(null);
      try {
        const result = await googleSignIn();
        onLoginSuccess(result.user, result.accessToken);
        onToggleAutoSync(true);
        fetchDriveData(result.accessToken);
      } catch (err: any) {
        setError(err.message || "Sign-in to Google Drive was cancelled or failed.");
      } finally {
        setIsSigningIn(false);
      }
    } else {
      onToggleAutoSync(!autoSyncToDrive);
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Perform verified deletion after user confirms dialog
  const executeDelete = async () => {
    if (!confirmDeleteFile || !accessToken) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(accessToken, confirmDeleteFile.id);
      setFiles((prev) => prev.filter((f) => f.id !== confirmDeleteFile.id));
      setConfirmDeleteFile(null);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate storage percentage
  const storageUsageBytes = userInfo?.storageQuota?.usage
    ? parseInt(userInfo.storageQuota.usage, 10)
    : 0;
  const storageLimitBytes = userInfo?.storageQuota?.limit
    ? parseInt(userInfo.storageQuota.limit, 10)
    : 15 * 1024 * 1024 * 1024;
  const storagePercent = Math.min(
    100,
    Math.round((storageUsageBytes / (storageLimitBytes || 1)) * 100)
  );

  return (
    <div
      id="google-drive-manager-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 via-sky-50/50 to-indigo-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white border border-blue-200 shadow-sm flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  Google Drive
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold uppercase">
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {lang === "km"
                  ? "គ្រប់គ្រង និងទាញយកវីដេអូដែលបានរក្សាទុកក្នុង Google Drive"
                  : "Manage videos saved directly to your Google Drive"}
              </p>
            </div>
          </div>

          <button
            id="close-drive-manager-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* If Not Authenticated */}
          {!accessToken ? (
            <div className="text-center py-10 px-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                <HardDrive className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {lang === "km"
                    ? "ភ្ជាប់ជាមួយគណនី Google Drive របស់អ្នក"
                    : "Connect your Google Drive Account"}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  {lang === "km"
                    ? "អនុញ្ញាតឱ្យកម្មវិធីរក្សាទុកវីដេអូគុណភាពច្បាស់ដោយផ្ទាល់ទៅកាន់ Google Drive របស់អ្នកដោយសុវត្ថិភាព។"
                    : "Authorize the app to back up and manage your high-definition video downloads directly inside Google Drive."}
                </p>
              </div>

              {error && (
                <div className="max-w-md mx-auto p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {error}
                </div>
              )}

              {/* Official Google Sign-In Button */}
              <div className="pt-2 flex justify-center">
                <button
                  id="google-drive-sign-in-btn"
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white border border-slate-300 hover:border-slate-400 hover:shadow-md text-slate-700 font-bold text-sm transition-all shadow-xs cursor-pointer active:scale-98 disabled:opacity-70"
                >
                  {isSigningIn ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  )}
                  <span>
                    {isSigningIn
                      ? lang === "km"
                        ? "កំពុងភ្ជាប់..."
                        : "Connecting..."
                      : lang === "km"
                      ? "ភ្ជាប់ជាមួយ Google Drive"
                      : "Sign in with Google Drive"}
                  </span>
                </button>
              </div>

              {/* Auto-Sync Preview Setting for Not-Signed-In users */}
              <div
                id="auto-sync-preview-card"
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 mt-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                    <CloudLightning className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {t.autoSyncTitle}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {t.autoSyncSignInPrompt}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  id="auto-sync-enable-signin-btn"
                  onClick={handleToggleAutoSyncClick}
                  disabled={isSigningIn}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs shrink-0 cursor-pointer transition-colors"
                >
                  {lang === "km" ? "បើកដំណើរការ" : "Enable"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Connected Account & Quota Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "Google"}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full border border-slate-200 shadow-xs object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {user?.displayName ? user.displayName[0].toUpperCase() : "G"}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {userInfo?.displayName || user?.displayName || "Google Drive User"}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      {userInfo?.emailAddress || user?.email || ""}
                    </p>
                  </div>
                </div>

                {/* Storage Quota Bar */}
                <div className="w-full sm:w-56 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-blue-600" />
                      <span>{lang === "km" ? "ទំហំផ្ទុក" : "Storage"}</span>
                    </span>
                    <span className="font-mono text-slate-700">
                      {formatBytes(storageUsageBytes)} / {formatBytes(storageLimitBytes)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        storagePercent > 85 ? "bg-amber-500" : "bg-blue-600"
                      }`}
                      style={{ width: `${storagePercent}%` }}
                    />
                  </div>
                </div>

                {/* Actions: Refresh & Sign Out */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => accessToken && fetchDriveData(accessToken)}
                    title={lang === "km" ? "ផ្ទុកឡើងវិញ" : "Refresh"}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    id="google-drive-signout-btn"
                    type="button"
                    onClick={handleSignOut}
                    title={lang === "km" ? "ចាកចេញ" : "Sign Out"}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 transition-colors shadow-2xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Destination Folder Notification */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-blue-800 font-semibold">
                  <Folder className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    {lang === "km"
                      ? "ថតផ្ទុកស្វ័យប្រវត្តិ៖ Google Drive / KhmerDownloader"
                      : "Target Folder: Google Drive / KhmerDownloader"}
                  </span>
                </div>
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline"
                >
                  <span>drive.google.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Auto-Sync Setting Card */}
              <div
                id="auto-sync-drive-card"
                className={`p-4 rounded-2xl border transition-all ${
                  autoSyncToDrive && user
                    ? "bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-sky-50/70 border-blue-200/90 shadow-xs"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                        autoSyncToDrive && user
                          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      <CloudLightning className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {t.autoSyncTitle}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            autoSyncToDrive && user
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {autoSyncToDrive && user
                            ? lang === "km"
                              ? "បើក (ON)"
                              : "ON"
                            : lang === "km"
                            ? "បិទ (OFF)"
                            : "OFF"}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
                        {t.autoSyncDesc}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="shrink-0 flex items-center">
                    <button
                      id="auto-sync-drive-toggle-btn"
                      type="button"
                      role="switch"
                      aria-checked={autoSyncToDrive && !!user}
                      onClick={handleToggleAutoSyncClick}
                      disabled={isSigningIn}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                        autoSyncToDrive && user
                          ? "bg-blue-600"
                          : "bg-slate-300 hover:bg-slate-400"
                      }`}
                    >
                      <span className="sr-only">{t.autoSyncTitle}</span>
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          autoSyncToDrive && user ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Saved Files List */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {lang === "km"
                        ? `វីដេអូដែលបានរក្សាទុក (${files.length})`
                        : `Saved Videos (${files.length})`}
                    </span>
                  </h4>
                </div>

                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-xs font-medium">
                      {lang === "km" ? "កំពុងទាញយកបញ្ជីវីដេអូពី Google Drive..." : "Loading videos from Google Drive..."}
                    </span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6 space-y-2">
                    <Film className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">
                      {lang === "km"
                        ? "មិនទាន់មានវីដេអូដែលបានរក្សាទុកក្នុង Google Drive នៅឡើយទេ"
                        : "No videos saved in your Google Drive yet"}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      {lang === "km"
                        ? "ចុចប៊ូតុង «រក្សាទុកទៅ Cloud» នៅលើវីដេអូណាមួយ ដើម្បីផ្ទុកឡើងដោយផ្ទាល់ទៅ Google Drive។"
                        : "Click 'Save to Cloud' on any downloaded video to upload it directly to your Google Drive."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 rounded-xl bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <Film className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                              {file.name}
                            </h5>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>{file.size || "Unknown size"}</span>
                              {file.createdTime && (
                                <>
                                  <span>•</span>
                                  <span>{new Date(file.createdTime).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {file.webViewLink && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(file.webViewLink!, file.id)}
                                title={lang === "km" ? "ចម្លងតំណភ្ជាប់" : "Copy Link"}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              >
                                {copiedId === file.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={lang === "km" ? "បើកមើលក្នុង Google Drive" : "Open in Google Drive"}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}

                          {/* Trigger Mandatory Destructive Confirmation Dialog */}
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteFile(file)}
                            title={lang === "km" ? "លុបចេញពី Drive" : "Delete from Drive"}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Google Drive API v3</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            {lang === "km" ? "បិទ" : "Close"}
          </button>
        </div>
      </div>

      {/* MANDATORY USER CONFIRMATION DIALOG FOR DESTRUCTIVE ACTION (per Workspace Skill) */}
      {confirmDeleteFile && (
        <div
          id="drive-delete-confirmation-dialog"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === "km"
                    ? "តើអ្នកប្រាកដថាចង់លុបឯកសារនេះទេ?"
                    : "Delete file from Google Drive?"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === "km"
                    ? "សកម្មភាពនេះនឹងលុបឯកសារវីដេអូចេញពីគណនី Google Drive របស់អ្នកជាអចិន្ត្រៃយ៍។"
                    : "This will permanently remove the video file from your Google Drive storage."}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 truncate font-semibold">
              {confirmDeleteFile.name}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteFile(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                {lang === "km" ? "បោះបង់" : "Cancel"}
              </button>
              <button
                id="confirm-delete-drive-file-btn"
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-rose-500/20"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{lang === "km" ? "កំពុងលុប..." : "Deleting..."}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === "km" ? "លុបចេញ" : "Delete File"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
