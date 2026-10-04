// The Archive view: past days, newest first, loaded three at a time.
import { dayLabel, shortDay, monthLabel, formatWindow, partOfDay } from "./lib.js";
import { el, openViewer } from "./viewer.js";

const DAYS_PER_BATCH = 3;
const dayCache = new Map();

function loadDay(date) {
  if (!dayCache.has(date)) {
    dayCache.set(date, fetch(`archive/${date}.json`, { cache: "no-cache" }).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }));
  }
  return dayCache.get(date);
}

function openCity(doc, cityIndex, slotIndex) {
  const city = doc.cities[cityIndex];
  const painting = city.paintings[slotIndex];
  const prev = doc.cities[cityIndex - 1];
  const next = doc.cities[cityIndex + 1];
  openViewer({
    image: painting.image,
    alt: `${city.name}, ${painting.slot} UTC: ${painting.headlines.join("; ")}`,
    title: city.name,
    meta: `${dayLabel(doc.date)} · ${formatWindow(painting.window_start, painting.window_end)}`,
    style: city.style,
    headlines: painting.headlines,
    slots: city.paintings.map((p, i) => ({ label: p.slot, active: i === slotIndex, open: () => openCity(doc, cityIndex, i) })),
    prev: prev && { label: prev.name, open: () => openCity(doc, cityIndex - 1, 0) },
    next: next && { label: next.name, open: () => openCity(doc, cityIndex + 1, 0) },
  });
}

function subjectCard(doc, subject) {
  // A day with two paintings of the same subject (AI) labels them morning / evening.
  const twice = doc.subjects.filter((s) => s.id === subject.id).length > 1;
  const name = twice && subject.slot ? `${subject.name} · ${partOfDay(subject.slot)}` : subject.name;
  const card = el("button", "day-subject");
  card.type = "button";
  const thumb = el("img");
  thumb.src = subject.image;
  thumb.alt = "";
  thumb.loading = "lazy";
  const extra = subject.headlines.length > 2 ? ` · +${subject.headlines.length - 2}` : "";
  const text = el("div");
  text.append(
    el("p", "day-subject-name", name),
    el("p", "day-subject-meta", subject.style),
    el("p", "day-subject-lead", subject.headlines.slice(0, 2).join(" · ") + extra),
  );
  card.append(thumb, text);
  card.addEventListener("click", () => openViewer({
    image: subject.image, alt: `${name}: ${subject.headlines.join("; ")}`, title: name,
    meta: dayLabel(doc.date), style: subject.style, headlines: subject.headlines,
  }));
  return card;
}

function cityTile(doc, city, cityIndex) {
  const tile = el("article", "tile");
  const quad = el("div", "quad");
  city.paintings.forEach((painting, slotIndex) => {
    const cell = el("button", "quad-cell");
    cell.type = "button";
    cell.title = painting.headlines.join("\n");  // headlines on hover
    cell.setAttribute("aria-label", `${city.name}, ${painting.slot} UTC: ${painting.headlines.join("; ")}`);
    const thumb = el("img");
    thumb.src = painting.image;
    thumb.alt = "";
    thumb.loading = "lazy";
    cell.append(thumb);
    cell.addEventListener("click", () => openCity(doc, cityIndex, slotIndex));
    quad.append(cell);
  });
  const name = el("div", "tile-name");
  name.append(el("span", "", city.name), el("em", "", city.style));
  tile.append(quad, name);
  return tile;
}

function renderDay(doc) {
  const section = el("section", "day");
  section.id = `day-${doc.date}`;
  const count = doc.subjects.length + doc.cities.reduce((n, c) => n + c.paintings.length, 0);
  const head = el("div", "day-head");
  head.append(el("h3", "", dayLabel(doc.date)), el("p", "day-count", `${count} paintings`));
  section.append(head);
  if (doc.subjects.length) {
    const row = el("div", "day-subjects");
    row.append(...doc.subjects.map((subject) => subjectCard(doc, subject)));
    section.append(row);
  }
  const tiles = el("div", "tiles");
  tiles.append(...doc.cities.map((city, i) => cityTile(doc, city, i)));
  section.append(tiles);
  return section;
}

function jumpNav(days, current) {
  const nav = el("nav", "day-jump");
  nav.setAttribute("aria-label", "Jump to a day");
  for (const day of days.slice(0, 6)) {
    const { weekday, day: dayNumber } = shortDay(day.date);
    const link = el("a", "day-chip");
    link.href = `#/archive/${day.date}`;
    if (day.date === current) link.setAttribute("aria-current", "date");
    link.append(el("span", "", weekday), el("span", "day-chip-day", dayNumber));
    nav.append(link);
  }
  const newestPerMonth = new Map();
  for (const day of days) {
    const month = day.date.slice(0, 7);
    if (!newestPerMonth.has(month)) newestPerMonth.set(month, day.date);
  }
  if (days.length > 6) {
    const select = el("select", "month-select");
    select.setAttribute("aria-label", "Jump to a month");
    select.append(new Option("Month…", ""));
    for (const date of newestPerMonth.values()) select.append(new Option(monthLabel(date), date));
    select.addEventListener("change", () => {
      if (select.value) location.hash = `#/archive/${select.value}`;
    });
    nav.append(select);
  }
  return nav;
}

export async function renderArchive(view, index, day) {
  const days = (index && index.days) || [];
  const page = el("section", "archive");
  const head = el("div", "archive-head");
  const intro = el("div");
  intro.append(el("h2", "", "Archive"), el("p", "archive-intro",
    "Every painting after its 24 hours on the front page, grouped by day. Hover a painting to see the headlines behind it."));
  head.append(intro);
  if (days.length) head.append(jumpNav(days, day));
  page.append(head);
  view.replaceChildren(page);
  if (!days.length) {
    page.append(el("p", "empty", "Paintings move here after their 24 hours on the front page."));
    return;
  }

  const found = day ? days.findIndex((d) => d.date === day) : 0;
  if (found === -1) page.append(el("p", "empty", `${dayLabel(day)} is not in the archive. Showing the latest days.`));
  let next = Math.max(0, found);
  const list = el("div", "days");
  const more = el("button", "more", "Show older days");
  more.type = "button";
  page.append(list, more);

  async function showMore() {
    more.disabled = true;
    const batch = days.slice(next, next + DAYS_PER_BATCH);
    next += batch.length;
    for (const entry of batch) {
      try {
        list.append(renderDay(await loadDay(entry.date)));
      } catch (error) {
        console.error(error);
        list.append(el("p", "error", `${dayLabel(entry.date)} could not be loaded.`));
      }
    }
    more.disabled = false;
    more.hidden = next >= days.length;
  }
  more.addEventListener("click", showMore);
  await showMore();
}
