export type SanitizedQueryParam = { key: string; value: string };

const SENSITIVE_KEYS = new Set([
  "access_token",
  "refresh_token",
  "id_token",
  "token",
  "auth",
]);

function mask(value: string): string {
  const v = value ?? "";
  if (!v) return "";
  if (v.length <= 8) return "***";
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

function looksLikeJwt(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 3 && parts.every((p) => p.length >= 10);
}

export function sanitizeSearchParams(search: string): SanitizedQueryParam[] {
  const sp = new URLSearchParams(search);
  const out: SanitizedQueryParam[] = [];

  for (const [key, rawValue] of sp.entries()) {
    const value = rawValue ?? "";

    const lowerKey = key.toLowerCase();
    const isSensitiveKey = SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes("token");
    const isSensitiveValue = looksLikeJwt(value);

    out.push({
      key,
      value: isSensitiveKey || isSensitiveValue ? mask(value) : value,
    });
  }

  return out;
}
