import { safeHref, formatWindow, formatTime, hourLabel, scopeLabel, isFresh, countdown } from "./lib.js";

const grid = document.getElementById("grid");
const nav = document.getElementById("cities");
const updatedEl = document.getElementById("updated");
const nextEl = document.getElementById("next");
const lightbox = document.getElementById("lightbox");
const lightboxImg = lightbox.querySelector("img");
const lightboxCaption = lightbox.querySelector("figcaption");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function openLightbox(city, painting) {
  lightboxImg.src = painting.image;
  lightboxImg.alt = `${city.name}: ${painting.topics.map((t) => t.headline).join("; ")}`;
  lightboxCaption.replaceChildren(
    el("span", "lightbox-city", city.name),
    el("span", "", formatWindow(painting.window_start, painting.window_end)),
    el("span", "lightbox-style", city.style),
  );
  lightbox.showModal();
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
  imageButton.addEventListener("click", () => openLightbox(city, current));

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

function renderNav(cities) {
  nav.replaceChildren(...cities.map((city) => {
    const link = el("a", "", city.name);
    link.href = `#${city.id}`;
    return link;
  }));
}

async function load() {
  try {
    const response = await fetch(`manifest.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    renderNav(manifest.cities);
    grid.replaceChildren(...manifest.cities.map((city) => renderCard(city, manifest.updated)));
    updatedEl.textContent = `Updated ${formatTime(manifest.updated)}`;
    const tick = () => {
      const left = countdown(manifest.next_update, Date.now());
      nextEl.textContent = left === "0m" ? "New paintings any minute" : `Next paintings in ${left}`;
    };
    tick();
    setInterval(tick, 30000);
  } catch (error) {
    console.error(error);
    grid.replaceChildren(el("p", "error", "The paintings could not be loaded. Please try again later."));
  }
}

lightbox.querySelector(".close").addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});
load();
