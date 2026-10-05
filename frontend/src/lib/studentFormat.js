export function initials(value) {
  const parts = String(value || "?").trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[1]?.[0] : null;
  return `${first ?? "?"}${second ?? ""}`.toUpperCase();
}

export function clampPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function formatLastActivity(value) {
  if (!value) return "No quiz activity yet";
  const ts = new Date(value);
  if (Number.isNaN(ts.getTime())) return "No quiz activity yet";
  const diffMs = Date.now() - ts.getTime();
  if (diffMs < 0) return "Scheduled";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return ts.toLocaleDateString();
}

export function formatPercent(value) {
  const cleaned = typeof value === "string" ? value.replace(/%$/, "") : value;
  let numeric = typeof cleaned === "number" ? cleaned : Number(cleaned);
  if (Number.isNaN(numeric)) return "0%";
  if (numeric > 0 && numeric <= 1) {
    numeric *= 100;
  }
  return `${clampPercent(numeric)}%`;
}

export function formatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}
