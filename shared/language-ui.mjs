import {
  t,
  translate,
  getLanguage,
  setLanguage,
  onLanguageChange,
  LANGUAGE_KEY,
} from "./i18n.mjs";
const attributes = ["aria-label", "title", "alt", "placeholder"];
function translateSubtree(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest("script, style, [data-no-translate]"))
      continue;
    node.nodeValue = t(node.nodeValue);
  }
  root.querySelectorAll?.("*").forEach((element) => {
    for (const attribute of attributes)
      if (element.hasAttribute(attribute))
        element.setAttribute(attribute, t(element.getAttribute(attribute)));
  });
}
export function localizeHTML(source) {
  const html = String(source ?? "");
  if (getLanguage() === "zh" || !/\p{Script=Han}/u.test(html)) return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  translateSubtree(template.content);
  return template.innerHTML;
}

// Capture only the original static nodes once. Dynamic views explicitly call t
// or localizeHTML while rendering; no mutation observer touches gameplay DOM.
const originals = [];
const walker = document.createTreeWalker(
  document.documentElement,
  NodeFilter.SHOW_TEXT,
);
let node;
while ((node = walker.nextNode())) {
  if (node.parentElement?.closest("script, style, [data-no-translate]"))
    continue;
  if (
    /\p{Script=Han}/u.test(node.nodeValue) ||
    translate(node.nodeValue, "en") !== node.nodeValue
  )
    originals.push({ node, source: node.nodeValue });
}
const originalAttributes = [];
document.querySelectorAll("*").forEach((element) => {
  for (const name of attributes) {
    const source = element.getAttribute(name);
    if (source && /\p{Script=Han}/u.test(source))
      originalAttributes.push({ element, name, source });
  }
  if (element.matches('meta[name="description"]'))
    originalAttributes.push({
      element,
      name: "content",
      source: element.content,
    });
});
for (const dialog of document.querySelectorAll("dialog")) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "language-switch";
  button.dataset.languageSwitch = "";
  dialog.append(button);
}
const buttons = [...document.querySelectorAll("[data-language-switch]")];
export function renderLanguageUI() {
  document.documentElement.lang = getLanguage() === "en" ? "en" : "zh-CN";
  for (const { node, source } of originals)
    if (node.isConnected) node.nodeValue = t(source);
  for (const { element, name, source } of originalAttributes)
    if (element.isConnected) element.setAttribute(name, t(source));
  for (const button of buttons) {
    button.textContent = getLanguage() === "en" ? "中文" : "EN";
    button.lang = getLanguage() === "en" ? "zh-CN" : "en";
    button.title = getLanguage() === "en" ? "切换为中文" : "Switch to English";
    button.setAttribute(
      "aria-label",
      getLanguage() === "en" ? "切换为中文" : "Switch to English",
    );
  }
}
buttons.forEach((button) =>
  button.addEventListener("click", () =>
    setLanguage(getLanguage() === "en" ? "zh" : "en"),
  ),
);
onLanguageChange(renderLanguageUI);
window.addEventListener("storage", (event) => {
  if (event.key === LANGUAGE_KEY && ["zh", "en"].includes(event.newValue))
    setLanguage(event.newValue, { persist: false });
});
renderLanguageUI();
