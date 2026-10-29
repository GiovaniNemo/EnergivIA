export const REFERRAL_STORAGE_KEY = "energivia_ref_code";
export const REFERRAL_COOKIE_NAME = "energivia_ref";

export function sanitizeReferralCode(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  return cleaned.length >= 2 && cleaned.length <= 100 ? cleaned : null;
}

export function captureReferralCode(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("r");
    const sanitized = sanitizeReferralCode(ref);

    if (sanitized) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, sanitized);
      // Salva cookie persistente por 30 dias (2592000 segundos)
      document.cookie = `${REFERRAL_COOKIE_NAME}=${sanitized}; path=/; max-age=2592000; SameSite=Lax`;
      return sanitized;
    }
  } catch {
    // Fail-safe silencioso
  }

  return getStoredReferralCode();
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const fromStorage = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (fromStorage) {
      const sanitized = sanitizeReferralCode(fromStorage);
      if (sanitized) return sanitized;
    }

    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === REFERRAL_COOKIE_NAME && value) {
        return sanitizeReferralCode(decodeURIComponent(value));
      }
    }
  } catch {
    // Fail-safe silencioso
  }

  return null;
}

export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    document.cookie = `${REFERRAL_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // Fail-safe silencioso
  }
}

export function storeReferralCodeExplicit(code?: string | null): string | null {
  if (typeof window === "undefined") return null;
  const sanitized = sanitizeReferralCode(code);
  if (!sanitized) return null;
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, sanitized);
    document.cookie = `${REFERRAL_COOKIE_NAME}=${sanitized}; path=/; max-age=2592000; SameSite=Lax`;
    return sanitized;
  } catch {
    return null;
  }
}
