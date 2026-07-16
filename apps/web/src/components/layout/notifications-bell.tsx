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

const NOTIFICATIONS_SSE_PATH = "/api/proxy/notifications/stream";

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
    const es = new EventSource(NOTIFICATIONS_SSE_PATH);
    es.onmessage = (ev: MessageEvent) => {
      try {
        const p = JSON.parse(ev.data as string) as { type?: string; count?: number };
        if (p.type === "unread_count" && typeof p.count === "number") {
          setUnread(p.count);
        }
      } catch {}
    };
    return () => {
      es.close();
    };
  }, [currentOrganizationId]);

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
        className="h-10 w-10 rounded-lg"
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
        className="relative h-10 w-10 rounded-lg"
        aria-label="Notificações"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--color-destructive)] px-1 text-[10px] font-medium text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-[min(100vw-2rem,22rem)] rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] py-2 shadow-lg"
          role="dialog"
          aria-label="Notificações"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 pb-2">
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
