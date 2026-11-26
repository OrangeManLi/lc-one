import test from "node:test";
import assert from "node:assert/strict";
import {
  STOCKS,
  newGame,
  trade,
  nextDay,
  maxShares,
  priceOf,
  feeOf,
  assetsOf,
  restoreGame,
} from "../game.mjs";

test("a new round has 100,000 cash and reproducible, valid fictional history", () => {
  const state = newGame(42);
  assert.deepEqual(state, newGame(42));
  assert.equal(assetsOf(state), 100000);
  assert.equal(state.day, 1);
  assert.equal(Object.keys(state.market).length, 6);
  assert.ok(restoreGame(JSON.stringify(state)));
});
test("buy deducts exact fee, records cost and locks newly bought stock until next day", () => {
  const state = newGame(42),
    price = priceOf(state, "nova");
  assert.equal(trade(state, "nova", "buy", 100).ok, true);
  assert.equal(
    state.cash,
    Math.round((100000 - price * 100 - feeOf(price * 100)) * 100) / 100,
  );
  assert.equal(state.holdings.nova.available, 0);
  assert.equal(trade(state, "nova", "sell", 100).ok, false);
  nextDay(state);
  assert.equal(state.holdings.nova.available, 100);
  assert.equal(trade(state, "nova", "sell", 100).ok, true);
  assert.equal(state.holdings.nova, undefined);
  assert.equal(state.trades.length, 2);
});
test("previous holdings stay sellable when adding to a position, cost basis includes fees", () => {
  const state = newGame(51);
  const firstPrice = priceOf(state, "nova");
  trade(state, "nova", "buy", 100);
  nextDay(state);
  const secondPrice = priceOf(state, "nova");
  trade(state, "nova", "buy", 100);
  assert.equal(state.holdings.nova.shares, 200);
  assert.equal(state.holdings.nova.available, 100);
  assert.equal(
    state.holdings.nova.cost,
    (firstPrice * 100 +
      feeOf(firstPrice * 100) +
      secondPrice * 100 +
      feeOf(secondPrice * 100)) /
      200,
  );
  trade(state, "nova", "sell", 100);
  assert.equal(state.holdings.nova.shares, 100);
  assert.equal(state.holdings.nova.available, 0);
});
test("invalid quantities, invalid sides and insufficient funds cannot mutate a round", () => {
  const state = newGame(72),
    original = structuredClone(state);
  for (const qty of [0, -100, 50, 1.5, NaN, Infinity, 10000000])
    assert.equal(trade(state, "nova", "buy", qty).ok, false);
  assert.equal(trade(state, "nova", "short", 100).ok, false);
  assert.equal(trade(state, "unknown", "buy", 100).ok, false);
  assert.deepEqual(state, original);
});
test("all-in quantity always leaves nonnegative cash and is maximal across many seeds", () => {
  for (let seed = 1; seed <= 100; seed++) {
    for (const stock of STOCKS) {
      const state = newGame(seed),
        max = maxShares(state, stock.id, "buy");
      assert.equal(trade(state, stock.id, "buy", max + 100).ok, false);
      assert.equal(trade(state, stock.id, "buy", max).ok, true);
      assert.ok(state.cash >= 0);
      assert.ok(maxShares(state, stock.id, "buy") === 0);
    }
  }
});
test("30th day stays tradable, settlement includes holdings, and finished rounds cannot mutate", () => {
  const state = newGame(42);
  trade(state, "nova", "buy", 100);
  for (let i = 0; i < 29; i++) nextDay(state);
  assert.equal(state.day, 30);
  assert.equal(state.finished, false);
  assert.equal(trade(state, "nova", "sell", 100).ok, true);
  const finalAssets = assetsOf(state);
  nextDay(state);
  assert.equal(state.finished, true);
  assert.equal(state.day, 30);
  assert.equal(state.equity.length, 30);
  assert.equal(state.equity.at(-1), finalAssets);
  const snapshot = structuredClone(state);
  assert.equal(trade(state, "sun", "buy", 100).ok, false);
  nextDay(state);
  assert.deepEqual(state, snapshot);
  assert.ok(restoreGame(JSON.stringify(state)));
});
test("saved games resume exactly; corrupted or incompatible saves are rejected", () => {
  const state = newGame(101);
  trade(state, "nova", "buy", 300);
  nextDay(state);
  assert.deepEqual(restoreGame(JSON.stringify(state)), state);
  const resumed = restoreGame(JSON.stringify(state));
  nextDay(state);
  nextDay(resumed);
  assert.deepEqual(state, resumed);
  assert.equal(restoreGame("{broken"), null);
  assert.equal(restoreGame("null"), null);
  for (const mutate of [
    (s) => {
      s.cash = -1;
    },
    (s) => {
      s.day = 99;
    },
    (s) => {
      s.event = 999;
    },
    (s) => {
      s.market.nova[0].close = -1;
    },
    (s) => {
      s.holdings.nova.available = 9999;
    },
    (s) => {
      s.trades[0].id = "<script>";
    },
    (s) => {
      s.equity = [];
    },
  ]) {
    const corrupt = structuredClone(state);
    mutate(corrupt);
    assert.equal(restoreGame(JSON.stringify(corrupt)), null);
  }
});
test("long simulated rounds keep prices finite, in their daily price band and valid on restore", () => {
  for (let seed = 0; seed < 40; seed++) {
    const state = newGame(seed);
    for (let d = 1; d <= 30; d++) {
      for (const s of STOCKS) {
        const c = state.market[s.id].at(-1);
        assert.ok(c.close > 0 && Number.isFinite(c.close));
        assert.ok(Math.abs(c.close / c.open - 1) <= 0.102);
      }
      nextDay(state);
    }
    assert.ok(restoreGame(JSON.stringify(state)));
  }
});

test("radar predicts the real next session without changing the random sequence or prices", async () => {
  const { useCard, changeOf } = await import("../game.mjs");
  const state = newGame(88),
    originalSeed = state.seed,
    originalMarket = structuredClone(state.market);
  assert.equal(useCard(state, "radar", "nova").ok, true);
  const prediction = state.reveal.change;
  assert.equal(state.seed, originalSeed);
  assert.deepEqual(state.market, originalMarket);
  assert.equal(state.cards.radar, 1);
  assert.ok(restoreGame(JSON.stringify(state)));
  nextDay(state);
  assert.equal(changeOf(state, "nova"), prediction);
  assert.equal(state.reveal, null);
});
test("rally boosts only the target, consumes one card and cannot stack in the same session", async () => {
  const { useCard, changeOf } = await import("../game.mjs");
  const regular = newGame(88),
    boosted = newGame(88);
  useCard(boosted, "rally", "nova");
  const equipped = structuredClone(boosted);
  assert.equal(useCard(boosted, "rally", "sun").ok, false);
  assert.deepEqual(boosted, equipped);
  nextDay(regular);
  nextDay(boosted);
  assert.ok(
    Math.abs(changeOf(boosted, "nova") - changeOf(regular, "nova") - 3.5) <
      0.04,
  );
  assert.deepEqual(regular.market.sun, boosted.market.sun);
  assert.equal(boosted.active.rally, null);
  assert.equal(boosted.cards.rally, 0);
});
test("shield refunds half of the net holding loss with a 3,000 cap and no duplicate use", async () => {
  const { useCard } = await import("../game.mjs");
  let foundLoss = false;
  for (let seed = 1; seed < 30; seed++) {
    const state = newGame(seed);
    trade(state, "nova", "buy", maxShares(state, "nova", "buy"));
    useCard(state, "shield", "nova");
    assert.equal(useCard(state, "shield", "nova").ok, false);
    nextDay(state);
    const r = state.report;
    assert.ok(r.shieldBonus >= 0 && r.shieldBonus <= 3000);
    if (r.marketGain < 0) {
      foundLoss = true;
      assert.ok(
        Math.abs(r.shieldBonus - Math.min(3000, -r.marketGain * 0.5)) <= 0.01,
      );
    } else assert.equal(r.shieldBonus, 0);
    assert.ok(Math.abs(r.gain - (r.marketGain + r.shieldBonus)) <= 0.01);
    assert.equal(state.active.shield, false);
  }
  assert.ok(foundLoss);
});
test("event challenge settles exact winnings or losses, and insufficient cash cannot enter", async () => {
  const { encounterFor, changeOf } = await import("../game.mjs");
  const preview = newGame(42),
    winning = newGame(42),
    losing = newGame(42);
  const event = encounterFor(preview);
  nextDay(preview);
  const move = changeOf(preview, event.stock);
  assert.notEqual(move, 0);
  nextDay(winning, move > 0 ? "long" : "short");
  nextDay(losing, move > 0 ? "short" : "long");
  assert.equal(winning.cash, 100000 + event.reward);
  assert.equal(losing.cash, 100000 - event.stake);
  assert.equal(winning.report.won, true);
  assert.equal(losing.report.won, false);
  const poor = newGame(12);
  poor.cash = 100;
  const snapshot = structuredClone(poor);
  assert.equal(nextDay(poor, "long").ok, false);
  assert.deepEqual(poor, snapshot);
  assert.equal(nextDay(poor, "pass").ok, true);
  assert.ok(poor.cash >= 0);
});
test("achievements reward cards once and checkpoints grant supplies", () => {
  const state = newGame(42);
  trade(state, "nova", "buy", 100);
  assert.deepEqual(state.achievements, ["first"]);
  assert.equal(state.cards.radar, 3);
  trade(state, "sun", "buy", 100);
  assert.equal(state.cards.radar, 3);
  trade(state, "cloud", "buy", 100);
  assert.ok(state.achievements.includes("diversity"));
  assert.equal(state.cards.rally, 2);
  const radarBefore = state.cards.radar,
    shieldBefore = state.cards.shield;
  while (state.day < 5) nextDay(state);
  assert.deepEqual(state.checkpoints, [5]);
  assert.equal(state.cards.radar, radarBefore + 1);
  assert.equal(state.cards.shield, shieldBefore + 1);
  assert.ok(state.report.rewards.some((r) => r.includes("补给")));
  assert.ok(restoreGame(JSON.stringify(state)));
});
test("cards cannot be used on day 30 and corrupt card or event saves are rejected", async () => {
  const { useCard } = await import("../game.mjs");
  const state = newGame(20);
  while (state.day < 30) nextDay(state);
  const snapshot = structuredClone(state);
  assert.equal(useCard(state, "shield", "nova").ok, false);
  assert.deepEqual(state, snapshot);
  for (const mutate of [
    (s) => {
      s.cards.radar = -1;
    },
    (s) => {
      s.cards = {};
    },
    (s) => {
      s.active.rally = "fake";
    },
    (s) => {
      s.achievements = ["fake"];
    },
    (s) => {
      s.report.focus = "fake";
    },
  ]) {
    const corrupt = structuredClone(state);
    mutate(corrupt);
    assert.equal(restoreGame(JSON.stringify(corrupt)), null);
  }
});
