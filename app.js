// Loads the data once and routes between the four views by the URL hash.
import { parseRoute, formatTime, countdown } from "./lib.js";
import { el } from "./viewer.js";
import { renderCities, renderCityNav } from "./cities.js";
import { renderSubject } from "./subject.js";
import { renderArchive } from "./archive.js";

const view = document.getElementById("view");
const citiesBar = document.getElementById("cities-bar");
const cityNav = document.getElementById("cities");
const updatedEl = document.getElementById("updated");
const nextEl = document.getElementById("next");
const tabs = document.querySelectorAll(".sections a");

let manifest = null;
let archiveIndex = { days: [] };

async function getJson(url) {
  const response = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

function updateStatus() {
  updatedEl.textContent = `Updated ${formatTime(manifest.updated)}`;
  const left = countdown(manifest.next_update, Date.now());
  nextEl.textContent = left === "0m" ? "New paintings any minute" : `Next paintings in ${left}`;
}

async function route() {
  const target = parseRoute(location.hash);
  const tab = target.view === "subject" ? target.id : target.view;
  tabs.forEach((link) => {
    if (link.dataset.view === tab) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  citiesBar.hidden = target.view !== "cities";
  if (target.view === "cities") {
    renderCities(view, manifest);
  } else {
    window.scrollTo(0, 0);
    if (target.view === "subject") renderSubject(view, manifest, target.id, archiveIndex);
    else await renderArchive(view, archiveIndex, target.day);
  }
}

async function start() {
  try {
    manifest = await getJson("manifest.json");
  } catch (error) {
    console.error(error);
    view.replaceChildren(el("p", "error", "The paintings could not be loaded. Please try again later."));
    return;
  }
  try {
    archiveIndex = await getJson("archive/index.json");
  } catch {
    archiveIndex = { days: [] };  // no archive yet
  }
  renderCityNav(cityNav, manifest.cities);
  updateStatus();
  setInterval(updateStatus, 30000);
  window.addEventListener("hashchange", route);
  await route();
}

start();
