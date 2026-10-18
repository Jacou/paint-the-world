// The full-size painting viewer (one <dialog> shared by every view) and the DOM helper.
// News text only ever goes through textContent.

const dialog = document.getElementById("lightbox");
const image = dialog.querySelector("img");
const caption = dialog.querySelector("figcaption");
const aside = dialog.querySelector(".viewer-aside");

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text, onClick) {
  const node = el("button", "", text);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

// item: {image, alt, title, meta, style,
//        headlines?: string[], slots?: [{label, active, open}], prev?: {label, open}, next?: {label, open}}
export function openViewer(item) {
  image.src = item.image;
  image.alt = item.alt;
  caption.replaceChildren(
    el("span", "lightbox-city", item.title),
    el("span", "", item.meta),
    el("span", "lightbox-style", item.style),
  );

  const parts = [];
  if (item.slots && item.slots.length > 1) {
    const group = el("div", "viewer-slots");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Painting of the day");
    for (const slot of item.slots) {
      const b = button(slot.label, slot.open);
      b.setAttribute("aria-pressed", String(Boolean(slot.active)));
      group.append(b);
    }
    parts.push(group);
  }
  if (item.headlines && item.headlines.length) {
    const list = el("ul", "viewer-headlines");
    for (const headline of item.headlines) list.append(el("li", "", headline));
    parts.push(el("p", "viewer-label", "Headlines behind this painting"), list);
  }
  if (item.prev || item.next) {
    const nav = el("div", "viewer-nav");
    nav.append(item.prev ? button(`‹ ${item.prev.label}`, item.prev.open) : el("span"));
    nav.append(item.next ? button(`${item.next.label} ›`, item.next.open) : el("span"));
    parts.push(nav);
  }
  aside.replaceChildren(...parts);
  aside.hidden = parts.length === 0;
  if (!dialog.open) dialog.showModal();
}

dialog.querySelector(".close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
