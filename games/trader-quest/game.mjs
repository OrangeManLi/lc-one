export const INITIAL_CASH = 100000;
export const TOTAL_DAYS = 30;
export const TARGET = 150000;
export const STOCKS = [
  {
    id: "nova",
    name: "星河科技",
    code: "688001",
    sector: "人工智能",
    letter: "星",
    color: "#a6b6ff",
    base: 68.8,
    volatility: 0.053,
  },
  {
    id: "sun",
    name: "逐日能源",
    code: "600028",
    sector: "清洁能源",
    letter: "逐",
    color: "#f3cb7b",
    base: 32.6,
    volatility: 0.046,
  },
  {
    id: "cloud",
    name: "云端互联",
    code: "300059",
    sector: "数字经济",
    letter: "云",
    color: "#7fd9dd",
    base: 46.2,
    volatility: 0.049,
  },
  {
    id: "tea",
    name: "山野茶事",
    code: "600519",
    sector: "新式消费",
    letter: "山",
    color: "#bddbaa",
    base: 89.5,
    volatility: 0.033,
  },
  {
    id: "bio",
    name: "未来生物",
    code: "300760",
    sector: "生物医药",
    letter: "未",
    color: "#dcb5ef",
    base: 108.3,
    volatility: 0.058,
  },
  {
    id: "ocean",
    name: "远洋制造",
    code: "601919",
    sector: "高端制造",
    letter: "远",
    color: "#a5c9ec",
    base: 23.8,
    volatility: 0.035,
  },
];
const EVENTS = [
  {
    title: "新一轮算力建设计划公布，科技板块热度升温",
    body: "产业投资预期改善，资金开始关注人工智能和数字经济。机会总与波动同行。",
    tag: "产业动向",
    bias: { nova: 0.025, cloud: 0.017 },
  },
  {
    title: "绿色转型再提速，新能源迎来政策窗口",
    body: "清洁能源项目需求上升，市场对能源板块的盈利预期有所改善。",
    tag: "政策风向",
    bias: { sun: 0.03, ocean: 0.008 },
  },
  {
    title: "市场进入观望期，资金偏爱稳健消费",
    body: "交易情绪趋于谨慎，消费板块可能受到关注，高波动个股面临考验。",
    tag: "市场情绪",
    bias: { tea: 0.018, nova: -0.018, bio: -0.012 },
  },
  {
    title: "创新药研发传出新进展，医药板块受关注",
    body: "研发成果提振行业信心，不过利好能否兑现仍取决于下一交易日的市场反应。",
    tag: "行业快讯",
    bias: { bio: 0.031 },
  },
  {
    title: "海外订单回暖，制造企业交出新答卷",
    body: "出口订单预期改善，制造与供应链企业或迎来新的市场关注。",
    tag: "公司观察",
    bias: { ocean: 0.025, sun: 0.009 },
  },
  {
    title: "短线获利盘增加，热门板块或迎来震荡",
    body: "部分资金选择落袋为安，科技与新能源板块的短期波动可能加大。",
    tag: "风险观察",
    bias: { nova: -0.025, cloud: -0.023, sun: -0.018 },
  },
  {
    title: "假日消费数据亮眼，消费市场活力回升",
    body: "线下消费与线上零售预期向好，消费和互联网板块情绪获得支撑。",
    tag: "消费观察",
    bias: { tea: 0.027, cloud: 0.012 },
  },
  {
    title: "流动性预期改善，市场风险偏好回升",
    body: "资金面趋暖带来积极信号，各板块表现仍可能分化，留意仓位分配。",
    tag: "宏观速递",
    bias: {
      nova: 0.013,
      sun: 0.013,
      cloud: 0.013,
      tea: 0.013,
      bio: 0.013,
      ocean: 0.013,
    },
  },
];
export const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
function random(state) {
  state.seed = (Math.imul(1664525, state.seed) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
export function eventFor(state) {
  return EVENTS[state.event];
}
function candle(state, open, volatility, bias = 0) {
  const move = Math.max(
    -0.099,
    Math.min(
      0.099,
      (random(state) + random(state) - 1) * volatility * 1.8 + bias,
    ),
  );
  const close = Math.max(1, round(open * (1 + move)));
  return {
    open: round(open),
    close,
    high: round(Math.max(open, close) * (1 + random(state) * 0.018)),
    low: Math.max(
      0.01,
      round(Math.min(open, close) * (1 - random(state) * 0.018)),
    ),
    volume: Math.floor(8000 + random(state) * 60000),
  };
}
export function newGame(seed = Date.now() >>> 0) {
  const state = {
    version: 2,
    cards: { radar: 2, shield: 1, rally: 1 },
    active: { shield: false, rally: null },
    reveal: null,
    achievements: [],
    checkpoints: [],
    report: null,
    bonus: 0,
    seed: seed >>> 0,
    day: 1,
    cash: INITIAL_CASH,
    market: {},
    holdings: {},
    trades: [],
    equity: [INITIAL_CASH],
    event: 0,
    peak: INITIAL_CASH,
    drawdown: 0,
    finished: false,
  };
  for (const stock of STOCKS) {
    const history = [];
    let price = stock.base * 0.85;
    for (let i = 0; i < 39; i++) {
      const item = candle(state, price, stock.volatility * 0.6, 0.003);
      history.push(item);
      price = item.close;
    }
    history.push(
      candle(
        state,
        price,
        stock.volatility,
        stock.id === "nova" ? 0.024 : 0.008,
      ),
    );
    state.market[stock.id] = history;
  }
  state.event = Math.floor(random(state) * EVENTS.length);
  return state;
}
export function priceOf(state, id) {
  return state.market[id].at(-1).close;
}
export function changeOf(state, id) {
  const h = state.market[id];
  return (h.at(-1).close / h.at(-2).close - 1) * 100;
}
export function assetsOf(state) {
  return round(
    state.cash +
      STOCKS.reduce(
        (sum, s) =>
          sum + (state.holdings[s.id]?.shares || 0) * priceOf(state, s.id),
        0,
      ),
  );
}
export function feeOf(value) {
  return round(Math.max(5, value * 0.0003));
}
export function maxShares(state, id, side) {
  if (state.finished) return 0;
  if (side === "sell") return state.holdings[id]?.available || 0;
  const price = priceOf(state, id);
  let qty = Math.floor(state.cash / (price * 100)) * 100;
  while (qty > 0 && round(qty * price + feeOf(qty * price)) > state.cash)
    qty -= 100;
  return qty;
}
export function trade(state, id, side, qty) {
  if (state.finished)
    return { ok: false, message: "本轮已收官，开启新一轮再来挑战。" };
  if (!STOCKS.some((s) => s.id === id) || !["buy", "sell"].includes(side))
    return { ok: false, message: "请选择有效的交易。" };
  if (!Number.isSafeInteger(qty) || qty <= 0 || qty % 100 !== 0)
    return { ok: false, message: "交易数量须为 100 股的正整数倍。" };
  if (qty > maxShares(state, id, side))
    return {
      ok: false,
      message:
        side === "buy"
          ? "可用资金不足，请减少买入数量。"
          : "可卖持仓不足，当日买入需下一交易日卖出。",
    };
  const price = priceOf(state, id),
    value = round(price * qty),
    fee = feeOf(value);
  const holding = state.holdings[id] || { shares: 0, available: 0, cost: 0 };
  if (side === "buy") {
    holding.cost =
      (holding.cost * holding.shares + value + fee) / (holding.shares + qty);
    holding.shares += qty;
    state.cash = round(state.cash - value - fee);
    state.holdings[id] = holding;
  } else {
    state.cash = round(state.cash + value - fee);
    holding.shares -= qty;
    holding.available -= qty;
    if (!holding.shares) delete state.holdings[id];
  }
  state.trades.unshift({ day: state.day, id, side, qty, price, fee, value });
  state.equity[state.day - 1] = assetsOf(state);
  const rewards = checkAchievements(state);
  return {
    ok: true,
    rewards,
    message: `${side === "buy" ? "买入" : "卖出"}成功 · ${STOCKS.find((s) => s.id === id).name} ${qty.toLocaleString("zh-CN")} 股`,
  };
}
export const CARDS = {
  radar: {
    name: "先知雷达",
    icon: "radar",
    subtitle: "偷看一眼明天",
    description: "透视当前所选股票下一天的涨跌，按用卡时已生效的策略计算。",
  },
  shield: {
    name: "金钟罩",
    icon: "shield",
    subtitle: "给回撤上个保险",
    description:
      "下一天持仓市值下跌时，补回一半损失，最高补贴 ¥3,000。不覆盖事件挑战损失。",
  },
  rally: {
    name: "牛市号角",
    icon: "horn",
    subtitle: "喊一声，多涨一点",
    description:
      "所选股票下一日涨幅额外增加 3.5 个百分点，仍受每日涨跌上限约束。",
  },
};
export const ACHIEVEMENTS = {
  first: { title: "开张大吉", description: "完成第一笔交易", card: "radar" },
  diversity: {
    title: "雨露均沾",
    description: "同时持有 3 只股票",
    card: "rally",
  },
  active: { title: "交易老手", description: "完成 5 笔交易", card: "shield" },
  profit: { title: "第一桶金", description: "总资产突破 11 万", card: "radar" },
};
function checkAchievements(state) {
  const rewards = [];
  const conditions = {
    first: state.trades.length > 0,
    diversity: Object.keys(state.holdings).length >= 3,
    active: state.trades.length >= 5,
    profit: assetsOf(state) >= 110000,
  };
  for (const [id, passed] of Object.entries(conditions)) {
    if (passed && !state.achievements.includes(id)) {
      state.achievements.push(id);
      state.cards[ACHIEVEMENTS[id].card]++;
      rewards.push(ACHIEVEMENTS[id].title);
    }
  }
  return rewards;
}
export function traderRank(state) {
  const gain = assetsOf(state) / INITIAL_CASH - 1;
  return gain >= 0.5
    ? "传奇股神"
    : gain >= 0.25
      ? "游资大佬"
      : gain >= 0.1
        ? "潜力操盘手"
        : gain > 0
          ? "见习交易员"
          : gain > -0.1
            ? "新手小散"
            : "坚强的韭菜";
}
export function rivalsOf(state) {
  const d = state.day - 1;
  return [
    {
      name: "隔壁老王",
      face: "王",
      style: "价值派",
      assets: round(INITIAL_CASH * (1 + d * 0.004 + Math.sin(d * 0.7) * 0.025)),
    },
    {
      name: "追涨阿浪",
      face: "浪",
      style: "梭哈派",
      assets: round(INITIAL_CASH * (1 + d * 0.006 + Math.sin(d * 1.3) * 0.075)),
    },
    {
      name: "佛系小陈",
      face: "陈",
      style: "躺平派",
      assets: round(INITIAL_CASH * (1 + d * 0.0015)),
    },
    {
      name: "你",
      face: "LC",
      style: traderRank(state),
      assets: assetsOf(state),
      player: true,
    },
  ].sort(
    (a, b) =>
      b.assets - a.assets ||
      Number(Boolean(b.player)) - Number(Boolean(a.player)),
  );
}
export function encounterFor(state) {
  const boss = (state.day + 1) % 5 === 0;
  const event = eventFor(state);
  const focus =
    STOCKS.find((s) => event.bias[s.id] > 0) ||
    STOCKS[state.event % STOCKS.length];
  return {
    boss,
    stock: focus.id,
    name: focus.name,
    title: boss
      ? "关卡挑战：谁能扛住大波动？"
      : `${focus.name}，明天会怎么走？`,
    description: boss
      ? "关卡日的大盘更容易剧烈波动。老王发来战书：猜中这只股票的涨跌，就把挑战奖金带走。"
      : "收盘后，老王又在群里放出消息。这次信他还是反着来？你的判断，将在下个交易日揭晓。",
    stake: boss ? 1000 : 500,
    reward: boss ? 3500 : 1500,
  };
}
function recordEquity(state) {
  const assets = assetsOf(state);
  state.equity[state.day - 1] = assets;
  state.peak = Math.max(state.peak, assets);
  state.drawdown = Math.max(state.drawdown, (state.peak - assets) / state.peak);
}
export function useCard(state, type, id) {
  if (state.finished)
    return { ok: false, message: "本轮已收官，留到下一局再战。" };
  if (
    !Object.hasOwn(CARDS, type) ||
    !STOCKS.some((s) => s.id === id) ||
    state.cards[type] <= 0
  )
    return {
      ok: false,
      message: "这张策略卡已经用完，完成成就或闯过关卡可获得补给。",
    };
  if (
    (type === "shield" && state.active.shield) ||
    (type === "rally" && state.active.rally)
  )
    return { ok: false, message: "这张卡今天已经生效，明天再用吧。" };
  if (state.day === TOTAL_DAYS)
    return {
      ok: false,
      message: "今天是最后一个交易日，没有隔夜行情可以施展技能了。",
    };
  const stock = STOCKS.find((s) => s.id === id);
  let message;
  if (type === "radar") {
    const prediction = structuredClone(state);
    nextDay(prediction);
    const change = changeOf(prediction, id);
    state.reveal = { day: state.day, id, change };
    message = `雷达预测：${stock.name} 明日${change >= 0 ? "涨" : "跌"} ${Math.abs(change).toFixed(2)}%（按当前已用策略）`;
  } else if (type === "shield") {
    state.active.shield = true;
    message = "金钟罩已生效：下一日持仓亏损返还 50%，最高 ¥3,000。";
  } else {
    state.active.rally = id;
    // A previous prediction is no longer current after modifying the market.
    state.reveal = null;
    message = `牛市号角已吹响：${stock.name} 下一日额外增加 3.5 个百分点涨幅。`;
  }
  state.cards[type]--;
  return { ok: true, message };
}
export function nextDay(state, choice = "pass") {
  if (state.finished) return { ok: false };
  if (!["long", "short", "pass"].includes(choice))
    return { ok: false, message: "请选择一个事件选项。" };
  const encounter = encounterFor(state);
  if (
    state.day < TOTAL_DAYS &&
    choice !== "pass" &&
    state.cash < encounter.stake
  )
    return { ok: false, message: "挑战需要预留可用资金，也可以选择跳过。" };
  recordEquity(state);
  // The 30th session remains tradable; no 31st session is generated.
  if (state.day === TOTAL_DAYS) {
    state.finished = true;
    return { ok: true };
  }
  const before = assetsOf(state),
    previousDay = state.day;
  const event = eventFor(state),
    shield = state.active.shield,
    rally = state.active.rally;
  if (choice !== "pass") state.cash = round(state.cash - encounter.stake);
  let marketGain = 0;
  for (const stock of STOCKS) {
    const previousPrice = priceOf(state, stock.id);
    const item = candle(
      state,
      previousPrice,
      stock.volatility * (encounter.boss ? 1.55 : 1),
      (event.bias[stock.id] || 0) + (rally === stock.id ? 0.035 : 0),
    );
    state.market[stock.id].push(item);
    marketGain +=
      (state.holdings[stock.id]?.shares || 0) * (item.close - previousPrice);
  }
  const shieldBonus =
    shield && marketGain < 0 ? round(Math.min(3000, -marketGain * 0.5)) : 0;
  state.cash = round(state.cash + shieldBonus);
  const movement = changeOf(state, encounter.stock);
  const won =
    choice === "long"
      ? movement > 0
      : choice === "short"
        ? movement < 0
        : false;
  const eventBonus =
    choice === "pass" ? 0 : won ? encounter.reward : -encounter.stake;
  if (won) state.cash = round(state.cash + encounter.stake + encounter.reward);
  state.bonus = round(state.bonus + shieldBonus + eventBonus);
  for (const holding of Object.values(state.holdings))
    holding.available = holding.shares;
  state.day++;
  state.event = Math.floor(random(state) * EVENTS.length);
  state.equity.push(assetsOf(state));
  const rewards = checkAchievements(state);
  if (
    [5, 10, 20].includes(state.day) &&
    !state.checkpoints.includes(state.day)
  ) {
    state.checkpoints.push(state.day);
    for (const type of Object.keys(CARDS)) state.cards[type]++;
    rewards.push(`第 ${state.day} 天补给：每种策略卡 +1`);
  }
  state.report = {
    day: state.day,
    previousDay,
    before,
    after: assetsOf(state),
    gain: round(assetsOf(state) - before),
    marketGain: round(marketGain),
    choice,
    won,
    eventBonus,
    shieldBonus,
    focus: encounter.stock,
    movement,
    rewards,
  };
  state.active = { shield: false, rally: null };
  state.reveal = null;
  return { ok: true, report: state.report };
}
export function restoreGame(raw) {
  try {
    const s = JSON.parse(raw);
    if (
      !s ||
      ![1, 2].includes(s.version) ||
      !Number.isInteger(s.day) ||
      s.day < 1 ||
      s.day > TOTAL_DAYS ||
      !Number.isInteger(s.seed) ||
      !Number.isFinite(s.cash) ||
      s.cash < 0 ||
      typeof s.finished !== "boolean" ||
      (s.finished && s.day !== TOTAL_DAYS) ||
      !Number.isInteger(s.event) ||
      s.event < 0 ||
      s.event >= EVENTS.length ||
      !Number.isFinite(s.peak) ||
      s.peak < INITIAL_CASH ||
      !Number.isFinite(s.drawdown) ||
      s.drawdown < 0 ||
      s.drawdown > 1
    )
      return null;
    if (
      !s.market ||
      !s.holdings ||
      Array.isArray(s.holdings) ||
      !Array.isArray(s.trades) ||
      !Array.isArray(s.equity) ||
      s.equity.length !== s.day ||
      !s.equity.every((n) => Number.isFinite(n) && n >= 0)
    )
      return null;
    if (
      !STOCKS.every(
        (stock) =>
          Array.isArray(s.market[stock.id]) &&
          s.market[stock.id].length === 39 + s.day &&
          s.market[stock.id].every(
            (c) =>
              ["open", "close", "high", "low", "volume"].every(
                (k) => Number.isFinite(c[k]) && c[k] > 0,
              ) &&
              c.high >= Math.max(c.open, c.close) &&
              c.low <= Math.min(c.open, c.close),
          ),
      )
    )
      return null;
    if (
      !Object.entries(s.holdings).every(
        ([id, h]) =>
          STOCKS.some((stock) => stock.id === id) &&
          h &&
          Number.isInteger(h.shares) &&
          h.shares > 0 &&
          h.shares % 100 === 0 &&
          Number.isInteger(h.available) &&
          h.available >= 0 &&
          h.available <= h.shares &&
          h.available % 100 === 0 &&
          Number.isFinite(h.cost) &&
          h.cost > 0,
      )
    )
      return null;
    if (
      !s.trades.every(
        (t) =>
          t &&
          STOCKS.some((stock) => stock.id === t.id) &&
          ["buy", "sell"].includes(t.side) &&
          Number.isInteger(t.day) &&
          t.day >= 1 &&
          t.day <= s.day &&
          Number.isInteger(t.qty) &&
          t.qty > 0 &&
          t.qty % 100 === 0 &&
          ["price", "fee", "value"].every(
            (k) => Number.isFinite(t[k]) && t[k] > 0,
          ),
      )
    )
      return null;
    if (s.version === 1) {
      Object.assign(s, {
        version: 2,
        cards: { radar: 2, shield: 1, rally: 1 },
        active: { shield: false, rally: null },
        reveal: null,
        achievements: [],
        checkpoints: [],
        report: null,
        bonus: 0,
      });
    }
    if (
      !s.cards ||
      !Object.keys(CARDS).every(
        (k) =>
          Number.isInteger(s.cards[k]) && s.cards[k] >= 0 && s.cards[k] <= 30,
      ) ||
      !s.active ||
      typeof s.active.shield !== "boolean" ||
      !(
        s.active.rally === null ||
        STOCKS.some((stock) => stock.id === s.active.rally)
      ) ||
      !Number.isFinite(s.bonus)
    )
      return null;
    if (
      !Array.isArray(s.achievements) ||
      !s.achievements.every((id) => Object.hasOwn(ACHIEVEMENTS, id)) ||
      new Set(s.achievements).size !== s.achievements.length ||
      !Array.isArray(s.checkpoints) ||
      !s.checkpoints.every((d) => [5, 10, 20].includes(d) && d <= s.day)
    )
      return null;
    if (
      s.reveal !== null &&
      (!s.reveal ||
        s.reveal.day !== s.day ||
        !STOCKS.some((stock) => stock.id === s.reveal.id) ||
        !Number.isFinite(s.reveal.change))
    )
      return null;
    if (
      s.report !== null &&
      (!s.report ||
        s.report.day !== s.day ||
        !["long", "short", "pass"].includes(s.report.choice) ||
        !STOCKS.some((stock) => stock.id === s.report.focus) ||
        ![
          "before",
          "after",
          "gain",
          "marketGain",
          "eventBonus",
          "shieldBonus",
          "movement",
        ].every((k) => Number.isFinite(s.report[k])) ||
        typeof s.report.won !== "boolean" ||
        !Array.isArray(s.report.rewards) ||
        !s.report.rewards.every((r) => typeof r === "string"))
    )
      return null;
    return s;
  } catch {
    return null;
  }
}
