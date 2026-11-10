import React from "react";
import { Video, Youtube, Instagram, Facebook, Twitter, Film, Share2 } from "lucide-react";
import { PlatformType } from "../types";

export function getPlatformBadge(platform: PlatformType): {
  name: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ReactNode;
} {
  switch (platform) {
    case "tiktok":
      return {
        name: "TikTok",
        bgColor: "bg-black/90",
        textColor: "text-white",
        borderColor: "border-cyan-400/40",
        icon: <Film className="w-4 h-4 text-cyan-400" />
      };
    case "facebook":
      return {
        name: "Facebook",
        bgColor: "bg-blue-600",
        textColor: "text-white",
        borderColor: "border-blue-500",
        icon: <Facebook className="w-4 h-4 text-white" />
      };
    case "instagram":
      return {
        name: "Instagram",
        bgColor: "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500",
        textColor: "text-white",
        borderColor: "border-pink-500",
        icon: <Instagram className="w-4 h-4 text-white" />
      };
    case "youtube":
      return {
        name: "YouTube",
        bgColor: "bg-red-600",
        textColor: "text-white",
        borderColor: "border-red-500",
        icon: <Youtube className="w-4 h-4 text-white" />
      };
    case "twitter":
      return {
        name: "X (Twitter)",
        bgColor: "bg-neutral-900",
        textColor: "text-white",
        borderColor: "border-neutral-700",
        icon: <Twitter className="w-4 h-4 text-white" />
      };
    case "pinterest":
      return {
        name: "Pinterest",
        bgColor: "bg-rose-700",
        textColor: "text-white",
        borderColor: "border-rose-600",
        icon: <Share2 className="w-4 h-4 text-white" />
      };
    case "threads":
      return {
        name: "Threads",
        bgColor: "bg-neutral-800",
        textColor: "text-white",
        borderColor: "border-neutral-600",
        icon: <Share2 className="w-4 h-4 text-white" />
      };
    default:
      return {
        name: "Video",
        bgColor: "bg-slate-700",
        textColor: "text-white",
        borderColor: "border-slate-600",
        icon: <Video className="w-4 h-4 text-white" />
      };
  }
}
