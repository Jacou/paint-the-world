// The Cities view: today's card for every city (the v1 page).
import { safeHref, formatWindow, hourLabel, scopeLabel, isFresh } from "./lib.js";
import { el, openViewer } from "./viewer.js";

function openPainting(city, painting) {
  openViewer({
    image: painting.image,
    alt: `${city.name}: ${painting.topics.map((t) => t.headline).join("; ")}`,
    title: city.name,
    meta: formatWindow(painting.window_start, painting.window_end),
    style: city.style,
  });
}

function renderCaption(caption, city, painting) {
  const heading = el("div", "card-heading");
  heading.append(el("h2", "", city.name), el("p", "card-style", city.style));

  const when = el("time", "card-window", formatWindow(painting.window_start, painting.window_end));
  when.dateTime = painting.window_end;
  when.title = `Local time: ${formatWindow(painting.window_start, painting.window_end, city.timezone)}`;

  const list = el("ul", "topics");
  for (const topic of painting.topics) {
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
    item.append(el("p", "scope", scopeLabel(topic.scope)), line);
    list.append(item);
  }
  caption.replaceChildren(heading, when, list);
}

function renderCard(city, updated) {
  const card = el("article", "card");
  card.id = city.id;
  if (!city.paintings.length) {
    card.append(el("h2", "card-empty-title", city.name), el("p", "empty", "No painting yet."));
    return card;
  }

  let current = city.paintings[0];
  const imageButton = el("button", "painting-button");
  imageButton.type = "button";
  const img = el("img", "painting");
  img.width = 1216;
  img.height = 832;
  img.loading = "lazy";
  imageButton.append(img);
  imageButton.addEventListener("click", () => openPainting(city, current));

  const newest = city.paintings[0];
  const stale = el("p", "stale", `No fresh news this window — showing the ${hourLabel(newest.window_end)} painting.`);
  stale.hidden = isFresh(newest, updated);

  const caption = el("div", "caption");
  const history = el("div", "history");
  const strip = el("div", "earlier");

  const show = (painting) => {
    current = painting;
    img.src = painting.image;
    img.alt = `${city.name}: ${painting.topics.map((t) => t.headline).join("; ")}`;
    imageButton.setAttribute("aria-label", `Open the ${city.name} painting full size`);
    renderCaption(caption, city, painting);
    strip.querySelectorAll("button").forEach((button, i) => {
      button.setAttribute("aria-pressed", String(city.paintings[i] === painting));
    });
  };

  if (city.paintings.length > 1) {
    for (const painting of city.paintings) {
      const button = el("button", "thumb");
      button.type = "button";
      const label = hourLabel(painting.window_end);
      button.setAttribute("aria-label", `Show the ${label} painting`);
      const thumb = el("img");
      thumb.src = painting.image;
      thumb.alt = "";
      thumb.loading = "lazy";
      button.append(thumb, el("span", "", label));
      button.addEventListener("click", () => show(painting));
      strip.append(button);
    }
    history.append(el("p", "history-label", "Last 24 hours"), strip);
  }

  card.append(imageButton, stale, caption, history);
  show(newest);
  return card;
}

export function renderCities(view, manifest) {
  const grid = el("div", "grid");
  grid.append(...manifest.cities.map((city) => renderCard(city, manifest.updated)));
  view.replaceChildren(grid);
}

// City links scroll to the card (the URL hash is used for routing, so no #city anchors).
export function renderCityNav(nav, cities) {
  nav.replaceChildren(...cities.map((city) => {
    const link = el("a", "", city.name);
    link.href = "#/";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.getElementById(city.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return link;
  }));
}
