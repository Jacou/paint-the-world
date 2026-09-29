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
