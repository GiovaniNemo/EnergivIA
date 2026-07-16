import type { ProposalDocumentJson } from "@/components/proposals/editor/types";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

type ThumbnailRenderSession = {
  title: string;
  documentState: ProposalDocumentJson;
  expiresAt: number;
};

const store = new Map<string, ThumbnailRenderSession>();
const STORAGE_DIR = join(tmpdir(), "energivia-thumbnail-render-sessions");

function ensureStorageDir(): void {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function filePathFor(id: string): string {
  return join(STORAGE_DIR, `${id}.json`);
}

export function setThumbnailRenderSession(
  id: string,
  payload: { title: string; documentState: ProposalDocumentJson },
  ttlMs = 2 * 60 * 1000
): void {
  const now = Date.now();
  cleanupExpiredSessions(now);
  const session: ThumbnailRenderSession = {
    title: payload.title,
    documentState: payload.documentState,
    expiresAt: now + ttlMs,
  };
  store.set(id, session);
  ensureStorageDir();
  writeFileSync(filePathFor(id), JSON.stringify(session), "utf8");
  console.info("[thumbnail-store] session saved", {
    id,
    expiresAt: session.expiresAt,
    filePath: filePathFor(id),
    sectionCount: payload.documentState.sections?.length ?? 0,
  });
}

export function getThumbnailRenderSession(id: string): ThumbnailRenderSession | null {
  let entry = store.get(id);
  if (entry) {
    console.info("[thumbnail-store] session hit memory", { id, expiresAt: entry.expiresAt });
  }
  if (!entry) {
    try {
      ensureStorageDir();
      const raw = readFileSync(filePathFor(id), "utf8");
      entry = JSON.parse(raw) as ThumbnailRenderSession;
      store.set(id, entry);
      console.info("[thumbnail-store] session loaded from file", { id, filePath: filePathFor(id) });
    } catch {
      console.warn("[thumbnail-store] session not found", { id, filePath: filePathFor(id) });
      return null;
    }
  }
  if (entry.expiresAt <= Date.now()) {
    store.delete(id);
    try {
      unlinkSync(filePathFor(id));
    } catch {}
    console.warn("[thumbnail-store] session expired", { id, expiresAt: entry.expiresAt });
    return null;
  }
  return entry;
}

function cleanupExpiredSessions(now = Date.now()): void {
  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) store.delete(key);
  }
  try {
    ensureStorageDir();
    for (const fileName of readdirSync(STORAGE_DIR)) {
      if (!fileName.endsWith(".json")) continue;
      const fullPath = join(STORAGE_DIR, fileName);
      try {
        const raw = readFileSync(fullPath, "utf8");
        const parsed = JSON.parse(raw) as ThumbnailRenderSession;
        if (parsed.expiresAt <= now) unlinkSync(fullPath);
      } catch {
        unlinkSync(fullPath);
      }
    }
  } catch {}
}
