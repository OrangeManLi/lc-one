import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  translate,
  getLanguage,
  setLanguage,
  onLanguageChange,
  LANGUAGE_KEY,
} from "../shared/i18n.mjs";
import {
  STOCKS,
  CARDS,
  ACHIEVEMENTS,
  newGame,
  eventFor,
  encounterFor,
  trade,
  useCard,
  nextDay,
  traderRank,
  rivalsOf,
} from "../games/trader-quest/game.mjs";
const noChinese = (text) =>
  assert.doesNotMatch(
    translate(text, "en"),
    /\p{Script=Han}/u,
    `Untranslated: ${text}`,
  );

test("all three pages have complete English text and accessible labels", async () => {
  for (const file of [
    "index.html",
    "games/trader-quest/index.html",
    "games/bull-run/index.html",
  ]) {
    const html = await readFile(new URL("../" + file, import.meta.url), "utf8");
    for (const [, text] of html.matchAll(/>([^<>]+)</g))
      if (/\p{Script=Han}/u.test(text)) noChinese(text);
    for (const [, text] of html.matchAll(
      /(?:aria-label|title|alt|placeholder|content)="([^"]+)"/g,
    ))
      if (/\p{Script=Han}/u.test(text)) noChinese(text);
    assert.match(html, /data-language-switch/);
    assert.match(html, /\/shared\/language.css/);
  }
});

test("stocks, news, cards, achievements, rivals and encounters translate in every chapter", () => {
  const strings = [];
  for (const s of STOCKS) strings.push(s.name, s.letter, s.sector);
  for (const c of Object.values(CARDS))
    strings.push(c.name, c.subtitle, c.description);
  for (const a of Object.values(ACHIEVEMENTS))
    strings.push(a.title, a.description, `${CARDS[a.card].name} +1`);
  const state = newGame(87);
  for (let i = 0; i < 30; i++) {
    const news = eventFor(state),
      event = encounterFor(state);
    strings.push(
      news.title,
      news.body,
      news.tag,
      event.title,
      event.description,
      traderRank(state),
    );
    for (const r of rivalsOf(state)) strings.push(r.name, r.face, r.style);
    if (state.report)
      strings.push(`奖励到账 · ${state.report.rewards.join(" / ")}`);
    nextDay(state);
  }
  strings.forEach(noChinese);
});

test("interpolated UI messages translate names and numbers without losing their values", () => {
  const examples = [
    ["街区排名第 2 · 已解锁 3 / 4 个成就", "Rank #2 · Achievements 3/4"],
    [
      "可卖 100 股 · 200 股待解锁",
      "Can sell 100 shares · 200 shares locked until next session",
    ],
    [
      "雷达预测：星河科技 明日涨 6.31%（按当前已用策略）",
      "Radar: Nova Tech will go up 6.31% tomorrow (current cards).",
    ],
    [
      "买入成功 · 星河科技 100 股 · 成就解锁：开张大吉，策略卡已到账",
      "Buy filled · Nova Tech 100 shares · Achievement unlocked: First Trade. Your card is ready.",
    ],
    ["最高积分 001200", "Best score 001200"],
    ["游戏积分 001200 · 收益筹码 7", "Score 001200 · Profit chips 7"],
    ["还有 2 次机会。", "2 lives left."],
  ];
  for (const [source, expected] of examples)
    assert.equal(translate(source, "en"), expected);
  [
    "星河科技 +3.00% · 你看涨，判断正确！",
    "奖励到账 · 第 5 天补给：每种策略卡 +1 / 雨露均沾",
    "先知雷达，剩余 2 张，偷看一眼明天",
    "牛市号角：星河科技已加成",
    "作用股票：星河科技 · 立即获得预测",
  ].forEach(noChinese);
});

test("game action and error messages have English equivalents", () => {
  const state = newGame(42);
  [
    trade(state, "nova", "buy", 0),
    trade(state, "nova", "buy", 99999900),
    trade(state, "nova", "sell", 100),
    trade(state, "nova", "buy", 100),
    useCard(state, "radar", "nova"),
    useCard(state, "shield", "nova"),
    useCard(state, "rally", "nova"),
    useCard(state, "rally", "nova"),
  ].forEach((result) => noChinese(result.message));
});

test("switching back restores Chinese and never mutates saved game state", () => {
  const state = newGame(42);
  trade(state, "nova", "buy", 100);
  nextDay(state);
  const snapshot = JSON.stringify(state),
    notifications = [];
  const unsubscribe = onLanguageChange((lang) => notifications.push(lang));
  setLanguage("en", { persist: false });
  assert.equal(getLanguage(), "en");
  assert.equal(translate("游戏大厅"), "Lobby");
  eventFor(state);
  rivalsOf(state);
  translate(state.report.rewards.join(" / "));
  setLanguage("zh", { persist: false });
  assert.equal(translate("游戏大厅"), "游戏大厅");
  assert.equal(JSON.stringify(state), snapshot);
  assert.deepEqual(notifications, ["en", "zh"]);
  assert.equal(setLanguage("fr"), false);
  assert.equal(getLanguage(), "zh");
  unsubscribe();
});

test("one persisted preference is shared by page reloads and tolerates blocked storage", async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const values = new Map([["market-play-v1", "existing-game"]]);
  try {
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
      },
      configurable: true,
    });
    setLanguage("en");
    assert.equal(values.get(LANGUAGE_KEY), "en");
    const reloaded = await import("../shared/i18n.mjs?reload-preference");
    assert.equal(reloaded.getLanguage(), "en");
    assert.equal(values.get("market-play-v1"), "existing-game");
    Object.defineProperty(globalThis, "localStorage", {
      get() {
        throw new Error("Storage blocked");
      },
      configurable: true,
    });
    assert.doesNotThrow(() => setLanguage("zh"));
    assert.equal(getLanguage(), "zh");
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
    if (previousStorage)
      Object.defineProperty(globalThis, "localStorage", previousStorage);
    else delete globalThis.localStorage;
    setLanguage("zh", { persist: false });
  }
});

test("translations preserve placeholders, numeric values and inline word spacing", async () => {
  const { default: english } = await import("../shared/en.mjs");
  for (const [source, target] of Object.entries(english)) {
    const slots = (text) =>
      [...text.matchAll(/\{\d+\}/g)].map((match) => match[0]).sort();
    assert.deepEqual(
      slots(target),
      slots(source),
      `Placeholder mismatch: ${source}`,
    );
  }
  assert.equal(
    translate("换个方式，", "en") + translate("玩市场。", "en"),
    "A new way to play the market.",
  );
  assert.equal(
    translate("结局由你", "en") + translate("操盘。", "en"),
    "The next move is yours.",
  );
  assert.equal(translate("。", "en"), ".");
});
