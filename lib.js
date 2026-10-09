// Pure helpers shared by app.js and the tests. No DOM access here.

export function safeHref(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function dayMonth(date, timeZone) {
  // Built from parts: en-GB's short month is "Sept" in current ICU, en-US gives "Sep".
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric", month: "short" }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("day")} ${get("month")}`;
}

function hourMinute(date, timeZone) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

function zoneName(date, timeZone) {
  if (timeZone === "UTC") return "UTC";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName").value;
}

export function formatWindow(startIso, endIso, timeZone = "UTC") {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${dayMonth(start, timeZone)}, ${hourMinute(start, timeZone)}–${hourMinute(end, timeZone)} ${zoneName(end, timeZone)}`;
}

export function formatTime(iso) {
  const date = new Date(iso);
  return `${dayMonth(date, "UTC")}, ${hourMinute(date, "UTC")} UTC`;
}

export function hourLabel(iso) {
  return hourMinute(new Date(iso), "UTC");
}

const SCOPES = { local: "Local", national: "National", global: "World" };

export function scopeLabel(scope) {
  return SCOPES[scope] ?? "";
}

export function isFresh(painting, updatedIso) {
  return painting.window_end === updatedIso;
}

export function countdown(nextIso, nowMs) {
  const minutes = Math.max(0, Math.round((Date.parse(nextIso) - nowMs) / 60000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

// --- v2: routes, archive days, daily subjects -------------------------------------------

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// "#/", "#/ai", "#/health", "#/archive", "#/archive/2026-09-29" -> {view, id?, day?}
export function parseRoute(hash) {
  const parts = (hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "ai" || parts[0] === "health") return { view: "subject", id: parts[0] };
  if (parts[0] === "archive") return { view: "archive", day: DAY_RE.test(parts[1] || "") ? parts[1] : null };
  return { view: "cities" };
}

function dateParts(dateStr, options) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).formatToParts(new Date(`${dateStr}T12:00:00Z`));
  return (type) => parts.find((p) => p.type === type).value;
}

// "2026-09-29" -> "Tuesday, 29 September 2026"
export function dayLabel(dateStr) {
  const get = dateParts(dateStr, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${get("weekday")}, ${get("day")} ${get("month")} ${get("year")}`;
}

// "2026-09-29" -> {weekday: "Tue", day: "29"}
export function shortDay(dateStr) {
  const get = dateParts(dateStr, { weekday: "short", day: "numeric" });
  return { weekday: get("weekday"), day: get("day") };
}

// "2026-09-29" -> "September 2026"
export function monthLabel(dateStr) {
  const get = dateParts(dateStr, { month: "long", year: "numeric" });
  return `${get("month")} ${get("year")}`;
}

// Archive days (newest first) that have a painting of this subject, excluding `exceptDate`.
export function previousDays(index, subjectId, exceptDate, limit = 6) {
  return (index?.days ?? [])
    .filter((d) => d.date !== exceptDate && d.subjects && d.subjects[subjectId])
    .slice(0, limit)
    .map((d) => ({ date: d.date, image: d.subjects[subjectId] }));
}

// Time until the next painting at any of `hours` (UTC), e.g. "9h 40m".
export function nextCountdown(nowMs, hours = [18]) {
  const now = new Date(nowMs);
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const times = [...hours, ...hours.map((h) => h + 24)].map((h) => midnight + h * 3600 * 1000);
  const next = Math.min(...times.filter((t) => t > nowMs));
  return countdown(new Date(next).toISOString(), nowMs);
}

// "Painted once a day · 18:00 UTC" / "Painted every 12 hours · 06:00 and 18:00 UTC"
export function cadenceLabel(hours = [18]) {
  const when = hours.map((h) => `${String(h).padStart(2, "0")}:00`).join(" and ");
  const often = hours.length === 1 ? "once a day" : `every ${24 / hours.length} hours`;
  return `Painted ${often} · ${when} UTC`;
}

// "06:00" or "2026-09-30T06Z" -> "morning"; 12:00 -> "afternoon"; 18:00 -> "evening"; 00:00 -> "night"
export function partOfDay(slot) {
  const hour = Number(slot.length > 5 ? slot.slice(11, 13) : slot.slice(0, 2));
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  return hour < 17 ? "afternoon" : "evening";
}
