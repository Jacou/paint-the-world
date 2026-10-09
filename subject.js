// A daily subject page (AI, Health science): today's painting, its stories, previous days.
import { safeHref, dayLabel, shortDay, previousDays, nextCountdown, cadenceLabel, partOfDay } from "./lib.js";
import { el, openViewer } from "./viewer.js";

const TITLES = { ai: "Artificial intelligence", health: "Health science" };
const NAMES = { ai: "AI", health: "Health science" };
const DEFAULT_HOURS = { ai: [6, 18], health: [18] };  // for manifests written before `hours` existed
const STORY_LABELS = { ai: "The top AI stories", health: "The day’s top health science stories" };

function storyList(topics) {
  const list = el("ol", "story-list");
  topics.forEach((topic, n) => {
    const item = el("li");
    const line = el("p", "topic");
    line.append(el("strong", "", topic.headline), " ", el("span", "summary", `— ${topic.summary}`), " ");
    const href = safeHref(topic.source_url);
    if (href) {
      const link = el("a", "source", "↗");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Source: ${topic.headline}`);
      line.append(link);
    }
    item.append(el("span", "story-number", String(n + 1)), line);
    list.append(item);
  });
  return list;
}

function previousStrip(index, id, today) {
  const section = el("section", "previous");
  section.setAttribute("aria-label", "Previous days");
  const bar = el("div", "previous-bar");
  const all = el("a", "", "See every day in the archive →");
  all.href = "#/archive";
  bar.append(el("p", "history-label", "Previous days"), all);
  section.append(bar);
  const days = previousDays(index, id, today);
  if (!days.length) {
    section.append(el("p", "empty", "Earlier days appear here once they are archived."));
    return section;
  }
  const strip = el("div", "previous-strip");
  for (const day of days) {
    const { weekday, day: dayNumber } = shortDay(day.date);
    const link = el("a", "previous-day");
    link.href = `#/archive/${day.date}`;
    const thumb = el("img");
    thumb.src = day.image;
    thumb.alt = "";
    thumb.loading = "lazy";
    link.append(thumb, el("span", "", `${weekday} ${dayNumber}`));
    strip.append(link);
  }
  section.append(strip);
  return section;
}

export function renderSubject(view, manifest, id, index) {
  const subject = (manifest.subjects || []).find((s) => s.id === id) || { id, name: NAMES[id], style: "", painting: null };
  const painting = subject.painting;
  const page = el("section", "subject");

  const head = el("div", "subject-head");
  const titles = el("div");
  const hours = subject.hours || DEFAULT_HOURS[id] || [18];
  titles.append(el("p", "subject-kicker", cadenceLabel(hours)), el("h2", "", TITLES[id] || subject.name));
  const meta = el("p", "subject-meta");
  const when = painting ? (hours.length > 1 ? `${dayLabel(painting.date)}, ${partOfDay(painting.slot)}` : dayLabel(painting.date)) : "";
  if (painting) meta.append(`${when} · `, el("em", "", subject.style), el("br"));
  meta.append(el("span", "subject-next", `Next painting in ${nextCountdown(Date.now(), hours)}`));
  head.append(titles, meta);
  page.append(head);

  if (!painting) {
    page.append(el("p", "empty", "The first painting arrives at 18:00 UTC."));
  } else {
    const feature = el("div", "feature");
    const imageButton = el("button", "painting-button");
    imageButton.type = "button";
    imageButton.setAttribute("aria-label", `Open the ${subject.name} painting full size`);
    const img = el("img", "painting");
    img.src = painting.image;
    img.width = 1216;
    img.height = 832;
    img.alt = `${subject.name}: ${painting.topics.map((t) => t.headline).join("; ")}`;
    imageButton.append(img);
    imageButton.addEventListener("click", () => openViewer({
      image: painting.image, alt: img.alt, title: subject.name, meta: when, style: subject.style,
    }));
    const stories = el("div", "stories");
    stories.append(el("p", "history-label", STORY_LABELS[id] || "The day’s top stories"), storyList(painting.topics));
    feature.append(imageButton, stories);
    page.append(feature);
  }

  page.append(previousStrip(index, id, painting ? painting.date : null));
  view.replaceChildren(page);
}
