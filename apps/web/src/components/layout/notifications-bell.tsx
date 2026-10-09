"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  ENERGIVIA_NOTIFICATIONS_REFRESH_EVENT,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotificationDto,
} from "@/lib/notifications-api";

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function NotificationsBell(): JSX.Element {
  const { currentOrganizationId } = useOrganization();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    if (!currentOrganizationId) {
      setUnread(0);
      return;
    }
    try {
      const c = await getUnreadNotificationCount(currentOrganizationId);
      setUnread(c);
    } catch {}
  }, [currentOrganizationId]);

  const loadList = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);
    try {
      const list = await listNotifications(currentOrganizationId, { limit: 25 });
      setItems(list);
      await refreshCount();
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId, refreshCount]);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (!currentOrganizationId) return;

    // Utilize polling em vez de SSE para evitar timeout de 300s da Vercel
    const interval = setInterval(() => {
      void refreshCount();
    }, 60000); // a cada 60 segundos

    return () => clearInterval(interval);
  }, [currentOrganizationId, refreshCount]);

  useEffect(() => {
    const onFocus = () => void refreshCount();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshCount]);

  useEffect(() => {
    const onRefresh = () => {
      void refreshCount();
      if (open) void loadList();
    };
    window.addEventListener(ENERGIVIA_NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(ENERGIVIA_NOTIFICATIONS_REFRESH_EVENT, onRefresh);
  }, [refreshCount, loadList, open, currentOrganizationId]);

  useEffect(() => {
    if (!open) return;
    void loadList();
  }, [open, loadList]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  async function onItemNavigate(n: UserNotificationDto) {
    if (!currentOrganizationId) return;
    if (!n.readAt) {
      try {
        await markNotificationRead(currentOrganizationId, n.id);
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
        );
        await refreshCount();
      } catch {}
    }
    setOpen(false);
  }

  async function onMarkAllRead() {
    if (!currentOrganizationId) return;
    try {
      await markAllNotificationsRead(currentOrganizationId);
      setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
      setUnread(0);
    } catch {}
  }

  if (!currentOrganizationId) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.04] text-[var(--color-muted-foreground)] opacity-50"
        disabled
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-xl border border-white/10 dark:border-white/15 bg-white/[0.04] dark:bg-white/[0.06] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-white/[0.10] hover:border-white/25 backdrop-blur-md transition-all duration-200"
        aria-label="Notificações"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--color-destructive)] px-1 text-[10px] font-bold text-white shadow-xs">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          className="fixed left-2 right-2 top-16 z-50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:w-[22rem] rounded-2xl border border-white/10 bg-[#161d22]/95 py-2 shadow-2xl backdrop-blur-2xl"
          role="dialog"
          aria-label="Notificações"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-3 pb-2">
            <span className="text-sm font-medium text-[var(--color-foreground)]">Notificações</span>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs text-[var(--color-primary)] hover:underline"
                onClick={() => void onMarkAllRead()}
              >
                Marcar todas como lidas
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
                Carregando…
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
                Nenhuma notificação
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {items.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.linkPath}
                      className={`block px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-muted)]/40 ${
                        !n.readAt ? "bg-[var(--color-muted)]/25" : ""
                      }`}
                      onClick={() => void onItemNavigate(n)}
                    >
                      <p className="text-sm font-medium text-[var(--color-foreground)]">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">
                        {formatWhen(n.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
