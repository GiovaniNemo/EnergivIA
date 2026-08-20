"use client";

import React, { useEffect, useState } from "react";
import { Info, Wrench, Sparkles, AlertCircle, X, ExternalLink } from "lucide-react";

export interface SystemAnnouncement {
  id: string;
  active: boolean;
  type: "info" | "warning" | "maintenance" | "critical" | "success";
  title: string;
  message: string;
  category?: string;
  actionText?: string;
  actionUrl?: string;
  dismissible: boolean;
  showInSidebar: boolean;
}

interface SidebarNoticeProps {
  collapsed?: boolean;
}

export function SidebarNotice({ collapsed = false }: SidebarNoticeProps): JSX.Element | null {
  const [announcement, setAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAnnouncement() {
      try {
        // Fetch from API
        const res = await fetch("/api/system/announcements", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const item: SystemAnnouncement = data.announcement;

          if (isMounted && item && item.active && item.showInSidebar) {
            setAnnouncement(item);

            // Check if dismissed in localStorage
            const isDismissed = localStorage.getItem(`dismissed_notice_${item.id}`);
            setDismissed(isDismissed === "true");
          } else if (isMounted) {
            setAnnouncement(null);
          }
        }
      } catch (err) {
        console.warn("Não foi possível carregar o aviso do sistema:", err);
      } finally {
        if (isMounted) setLoaded(true);
      }
    }

    loadAnnouncement();

    // Listen for custom event or periodic check
    const interval = setInterval(loadAnnouncement, 30000);

    const handleRefresh = () => loadAnnouncement();
    window.addEventListener("system_announcement_updated", handleRefresh);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("system_announcement_updated", handleRefresh);
    };
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!announcement) return;
    localStorage.setItem(`dismissed_notice_${announcement.id}`, "true");
    setDismissed(true);
  };

  if (!loaded || !announcement || !announcement.active || dismissed) {
    return null;
  }

  const getTypeConfig = (type: SystemAnnouncement["type"]) => {
    switch (type) {
      case "maintenance":
        return {
          icon: Wrench,
          bg: "bg-amber-500/10 dark:bg-amber-950/40",
          border: "border-amber-500/30 dark:border-amber-600/40",
          text: "text-amber-700 dark:text-amber-300",
          titleColor: "text-amber-900 dark:text-amber-100",
          badgeBg: "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30",
          iconColor: "text-amber-500",
        };
      case "critical":
      case "warning":
        return {
          icon: AlertCircle,
          bg: "bg-red-500/10 dark:bg-red-950/40",
          border: "border-red-500/30 dark:border-red-600/40",
          text: "text-red-700 dark:text-red-300",
          titleColor: "text-red-900 dark:text-red-100",
          badgeBg: "bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30",
          iconColor: "text-red-500",
        };
      case "success":
        return {
          icon: Sparkles,
          bg: "bg-emerald-500/10 dark:bg-emerald-950/40",
          border: "border-emerald-500/30 dark:border-emerald-600/40",
          text: "text-emerald-700 dark:text-emerald-300",
          titleColor: "text-emerald-900 dark:text-emerald-100",
          badgeBg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
          iconColor: "text-emerald-500",
        };
      case "info":
      default:
        return {
          icon: Info,
          bg: "bg-blue-500/10 dark:bg-blue-950/40",
          border: "border-blue-500/30 dark:border-blue-600/40",
          text: "text-blue-700 dark:text-blue-300",
          titleColor: "text-blue-900 dark:text-blue-100",
          badgeBg: "bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30",
          iconColor: "text-blue-500",
        };
    }
  };

  const config = getTypeConfig(announcement.type);
  const IconComponent = config.icon;

  if (collapsed) {
    return (
      <div className="px-2 py-2 flex justify-center">
        <div
          title={`${announcement.title}: ${announcement.message}`}
          className={`relative p-2.5 rounded-xl border ${config.bg} ${config.border} transition-all duration-200 hover:scale-105 cursor-pointer shadow-sm`}
        >
          <IconComponent className={`h-4 w-4 ${config.iconColor} animate-pulse`} />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 pt-1">
      <div
        className={`relative overflow-hidden rounded-xl border p-3.5 shadow-sm transition-all duration-300 ${config.bg} ${config.border} backdrop-blur-sm`}
      >
        {/* Dismiss Button */}
        {announcement.dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dispensar aviso"
            className="absolute top-2.5 right-2.5 rounded-md p-1 text-gray-400 hover:bg-black/10 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-start gap-2.5 pr-4">
          <div className={`mt-0.5 rounded-lg p-1.5 ${config.bg} ${config.border} shrink-0`}>
            <IconComponent className={`h-4 w-4 ${config.iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {announcement.category && (
                <span
                  className={`text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-md border ${config.badgeBg}`}
                >
                  {announcement.category}
                </span>
              )}
            </div>
            <h5 className={`text-xs font-semibold mt-1 leading-snug ${config.titleColor}`}>
              {announcement.title}
            </h5>
          </div>
        </div>

        {/* Message */}
        <p className={`text-[11px] mt-2 leading-relaxed ${config.text} line-clamp-3`}>
          {announcement.message}
        </p>

        {/* Action Link */}
        {announcement.actionUrl && (
          <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
            <a
              href={announcement.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 text-[11px] font-medium underline underline-offset-2 ${config.text} hover:opacity-80 transition-opacity`}
            >
              {announcement.actionText || "Ver detalhes"}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
