export type PlatformType =
  | "tiktok"
  | "facebook"
  | "instagram"
  | "youtube"
  | "twitter"
  | "pinterest"
  | "threads"
  | "vimeo"
  | "other";

export interface VideoFormat {
  id: string;
  label: string;
  quality: string;
  resolution: string;
  extension: "mp4" | "mp3" | "jpg" | "webm";
  type: "video" | "audio" | "thumbnail";
  fileSize: string;
  estimatedBytes: number;
  url: string;
  hasWatermark?: boolean;
  bitrate?: string;
  fps?: number;
}

export interface VideoMetadata {
  id: string;
  platform: PlatformType;
  originalUrl: string;
  title: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  duration: number;
  durationFormatted: string;
  thumbnail: string;
  views?: string;
  likes?: string;
  comments?: string;
  shares?: string;
  formats: VideoFormat[];
  aspectRatio: "9:16" | "16:9" | "1:1";
  createdAt?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  platform: PlatformType;
  thumbnail: string;
  downloadedAt: string;
  formatSelected: string;
  fileSize: string;
  downloadUrl: string;
  originalUrl: string;
}

export interface BatchItem {
  id: string;
  url: string;
  status: "pending" | "extracting" | "ready" | "error";
  metadata?: VideoMetadata;
  errorMessage?: string;
}

export type Language = "km" | "en";
