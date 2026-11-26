import english from "./en.mjs";

export const LANGUAGE_KEY = "lc-arcade-language";
export const normalizeText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
const listeners = new Set();
let language = "zh";
try {
  if (
    typeof window !== "undefined" &&
    localStorage.getItem(LANGUAGE_KEY) === "en"
  )
    language = "en";
} catch {
  /* Language switching still works when storage is unavailable. */
}
export const getLanguage = () => language;
export const getLocale = () => (language === "en" ? "en-US" : "zh-CN");
export function onLanguageChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
export function setLanguage(next, { persist = true } = {}) {
  if (!["zh", "en"].includes(next)) return false;
  if (persist) {
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      /* Optional persistence. */
    }
  }
  if (language === next) return true;
  language = next;
  for (const callback of listeners) callback(next);
  return true;
}
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = Object.entries(english)
  .filter(([source]) => /\{\d+\}/.test(source))
  .sort(
    (a, b) =>
      b[0].replace(/\{\d+\}/g, "").length - a[0].replace(/\{\d+\}/g, "").length,
  )
  .map(([source, target]) => {
    const slots = [];
    const chunks = source.split(/(\{\d+\})/).map((chunk) => {
      if (/^\{\d+\}$/.test(chunk)) {
        slots.push(chunk);
        return "(.+?)";
      }
      return escapeRegex(chunk);
    });
    return {
      regex: new RegExp("^" + chunks.join("") + "$", "u"),
      target,
      slots,
    };
  });

// View strings use their Chinese source as a stable key. Pattern entries handle
// interpolated values without putting translated labels into saved game state.
export function translate(value, targetLanguage = language) {
  const source = String(value ?? "");
  if (targetLanguage !== "en") return source;
  const key = normalizeText(source);
  const prefix = source.match(/^\s*/)[0],
    suffix = source.match(/\s*$/)[0];
  const exact = english[key];
  if (exact !== undefined && !/\{\d+\}/.test(key))
    return prefix + exact + suffix;
  if (!/\p{Script=Han}/u.test(key)) return source;
  for (const { regex, target, slots } of patterns) {
    const match = key.match(regex);
    if (!match) continue;
    const values = Object.fromEntries(
      slots.map((slot, i) => [slot, translate(match[i + 1], targetLanguage)]),
    );
    return (
      prefix +
      target.replace(/\{\d+\}/g, (slot) => values[slot] ?? slot) +
      suffix
    );
  }
  // Composed UI labels and legacy saved rewards retain stable source strings.
  for (const separator of [" · ", " / ", "、"]) {
    if (key.includes(separator))
      return (
        prefix +
        key
          .split(separator)
          .map((part) => translate(part, targetLanguage))
          .join(separator === "、" ? ", " : separator) +
        suffix
      );
  }
  return source;
}
export const t = translate;
