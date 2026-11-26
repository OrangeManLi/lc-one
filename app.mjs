import {
  STOCKS,
  INITIAL_CASH,
  TOTAL_DAYS,
  TARGET,
  newGame,
  priceOf,
  changeOf,
  assetsOf,
  feeOf,
  maxShares,
  trade,
  nextDay,
  eventFor,
  restoreGame,
  CARDS,
  ACHIEVEMENTS,
  useCard,
  encounterFor,
  rivalsOf,
  traderRank,
} from "./game.mjs";
const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "market-play-v1";
const BEST_KEY = "market-play-best";
const fmt = (n) =>
  n.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const integer = (n) => n.toLocaleString("zh-CN");
const signed = (n) => `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
const direction = (n) => (n > 0.001 ? "up" : n < -0.001 ? "down" : "flat");
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
let state;
let storageWarning = false;
try {
  state = restoreGame(localStorage.getItem(STORAGE_KEY));
} catch {
  storageWarning = true;
}
state ||= newGame();
let selected = "nova",
  side = "buy",
  chartType = "candles",
  activeView = "market",
  hover = -1,
  chartGeometry,
  toastTimer;
let best = -Infinity;
try {
  const stored = localStorage.getItem(BEST_KEY);
  const value = Number(stored);
  if (stored !== null && Number.isFinite(value)) best = value;
} catch {
  /* Storage can be unavailable in private contexts. */
}
function toast(message, error = false) {
  const el = $("toast");
  clearTimeout(toastTimer);
  el.textContent = message;
  el.classList.toggle("error", error);
  el.hidden = false;
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 4200);
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    if (!storageWarning) {
      toast("当前浏览器无法保存进度，请保持页面开启。", true);
      storageWarning = true;
    }
  }
}
function decimalHTML(value, prefix = "") {
  const [whole, fraction] = fmt(value).split(".");
  return `${prefix}${whole}<span>.${fraction}</span>`;
}
function sparkPath(values, w = 50, h = 16) {
  const min = Math.min(...values),
    max = Math.max(...values),
    range = max - min || 1;
  return values
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${((i / Math.max(1, values.length - 1)) * w).toFixed(1)} ${(h - 2 - ((v - min) / range) * (h - 4)).toFixed(1)}`,
    )
    .join(" ");
}
function renderAccount() {
  const assets = assetsOf(state),
    profit = assets - INITIAL_CASH,
    position = assets - state.cash;
  $("total-assets").innerHTML = decimalHTML(assets);
  $("total-profit").innerHTML = decimalHTML(
    Math.abs(profit),
    profit >= 0 ? "+" : "−",
  );
  $("total-profit").className = `metric-value ${direction(profit)}`;
  $("return-rate").textContent = `${signed((profit / INITIAL_CASH) * 100)}%`;
  $("return-rate").className = `neutral-pill ${direction(profit)}`;
  $("cash").innerHTML = decimalHTML(state.cash);
  $("position-value").innerHTML = decimalHTML(position);
  const count = Object.keys(state.holdings).length;
  $("position-count").textContent = `${count} 只股票`;
  const rate = assets ? (position / assets) * 100 : 0;
  $("position-rate").textContent = `仓位 ${Math.round(rate)}%`;
  $("position-meter").style.width = `${rate}%`;
  $("equity-spark").setAttribute(
    "d",
    sparkPath(
      state.equity.length > 1 ? state.equity : [100000, 100000],
      160,
      44,
    ),
  );
  $("day").textContent = String(state.day).padStart(2, "0");
  $("session-status").textContent = state.finished ? "已收官" : "开市中";
  $("next-day").innerHTML = state.finished
    ? `查看本轮战绩 ${icon("cup")}`
    : state.day === TOTAL_DAYS
      ? `收官，查看战绩 ${icon("cup")}`
      : `收盘 · 抽取事件 ${icon("spark")}`;
  const progress = Math.max(
    0,
    Math.min(100, (profit / (TARGET - INITIAL_CASH)) * 100),
  );
  $("challenge-progress").style.width = `${progress}%`;
  $("challenge-status").textContent =
    assets >= TARGET
      ? "目标已达成！稳住，守住你的胜利。"
      : state.finished
        ? "本轮已结束，再开一局创造新纪录。"
        : profit > 0
          ? `距离目标还差 ¥${fmt(TARGET - assets)}`
          : profit < 0
            ? "暂时的回撤，也是交易的一部分。"
            : "本金已就位，故事由你来写。";
  const simulation = document.querySelector(".simulation");
  simulation.innerHTML = `<span></span>${state.finished ? "本轮已收官" : "挑战进行中"}`;
}
function renderWatchlist() {
  $("stock-list").innerHTML = STOCKS.map((stock) => {
    const change = changeOf(state, stock.id),
      color = direction(change),
      history = state.market[stock.id];
    return `<button class="stock-item ${selected === stock.id ? "active" : ""}" data-stock="${stock.id}" aria-pressed="${selected === stock.id}" aria-label="${stock.name}，价格 ${fmt(priceOf(state, stock.id))}，涨跌 ${signed(change)}%"><span class="stock-item-name">${stock.name}</span><span class="stock-item-price ${color}">${fmt(priceOf(state, stock.id))}</span><span class="stock-item-bottom">${stock.code}<svg class="mini-spark ${color}" viewBox="0 0 50 16" aria-hidden="true"><path d="${sparkPath(history.slice(-15).map((c) => c.close))}"/></svg></span><span class="stock-item-change ${color}">${signed(change)}%</span></button>`;
  }).join("");
}
function renderSelected() {
  const stock = STOCKS.find((s) => s.id === selected),
    current = state.market[selected].at(-1),
    change = changeOf(state, selected),
    color = direction(change);
  $("stock-name").textContent = stock.name;
  $("stock-code").textContent = stock.code;
  $("stock-sector").textContent = stock.sector;
  $("stock-avatar").textContent = stock.letter;
  $("stock-avatar").style.color = stock.color;
  $("stock-avatar").style.backgroundColor = `${stock.color}12`;
  $("stock-avatar").style.borderColor = `${stock.color}24`;
  $("stock-price").textContent = fmt(current.close);
  $("stock-price").className = color;
  $("stock-change").textContent =
    `${signed(current.close - state.market[selected].at(-2).close)}   ${signed(change)}%`;
  $("stock-change").className = color;
  $("order-name").textContent = stock.name;
  $("order-code").textContent = stock.code;
  $("order-price").textContent = fmt(current.close);
  $("quote-open").textContent = fmt(current.open);
  $("quote-high").textContent = fmt(current.high);
  $("quote-low").textContent = fmt(current.low);
  $("quote-volume").textContent = `${(current.volume / 10000).toFixed(1)}万`;
  $("price-chart").setAttribute(
    "aria-label",
    `${stock.name} ${chartType === "candles" ? "日 K" : "走势"}图，收盘价 ${fmt(current.close)}，今日涨跌 ${signed(change)}%，黄色为5日均线，紫色为10日均线。`,
  );
  updateOhlc();
}
function updateOhlc(candle) {
  const c = candle || state.market[selected].at(-1);
  $("chart-ohlc").innerHTML =
    `<span>开 <b>${fmt(c.open)}</b></span><span>高 <b>${fmt(c.high)}</b></span><span>低 <b>${fmt(c.low)}</b></span><span>收 <b class="${direction(c.close - c.open)}">${fmt(c.close)}</b></span>`;
}
function renderOrder() {
  const input = $("quantity"),
    qty = Number(input.value),
    valid = Number.isSafeInteger(qty) && qty > 0 && qty % 100 === 0;
  const max = maxShares(state, selected, side);
  const value = valid ? priceOf(state, selected) * qty : 0;
  $("order-value").textContent = `¥${fmt(value)}`;
  $("order-fee").textContent = valid ? `¥${fmt(feeOf(value))}` : "—";
  const locked =
    (state.holdings[selected]?.shares || 0) -
    (state.holdings[selected]?.available || 0);
  $("available-shares").textContent =
    `${side === "buy" ? "可买" : "可卖"} ${integer(max)} 股${side === "sell" && locked ? ` · ${integer(locked)} 股待解锁` : ""}`;
  $("buy-tab").classList.toggle("selected", side === "buy");
  $("sell-tab").classList.toggle("selected", side === "sell");
  $("buy-tab").setAttribute("aria-pressed", String(side === "buy"));
  $("sell-tab").setAttribute("aria-pressed", String(side === "sell"));
  const button = $("trade-button");
  button.classList.toggle("sell", side === "sell");
  button.textContent = state.finished
    ? "本轮已收官"
    : `${side === "buy" ? "买入" : "卖出"} ${valid ? integer(qty) : "—"} 股`;
  button.disabled = state.finished || !valid || qty > max;
  $("decrease").disabled =
    state.finished || (Number.isFinite(qty) && qty <= 100);
  $("increase").disabled = state.finished;
  input.disabled = state.finished;
  document.querySelectorAll("[data-fraction]").forEach((b) => {
    b.disabled = state.finished || max === 0;
  });
}
function renderNews() {
  const event = eventFor(state);
  $("news-day").textContent = `DAY ${String(state.day).padStart(2, "0")}`;
  $("news-title").textContent = event.title;
  $("news-body").textContent = event.body;
  $("news-tag").textContent = event.tag;
  $("news-sectors").textContent = `关注 ${STOCKS.filter((s) => event.bias[s.id])
    .slice(0, 3)
    .map((s) => s.sector)
    .join(" · ")}`;
}
function emptyState(title, message, name) {
  return `<div class="empty-state">${icon(name)}<h3>${title}</h3><p>${message}</p><button class="secondary-button" data-return-market>去看看行情</button></div>`;
}
function renderPortfolio() {
  const entries = STOCKS.filter((s) => state.holdings[s.id]);
  $("portfolio-content").innerHTML = entries.length
    ? `<div class="table-scroll"><table><thead><tr><th>股票</th><th>持仓 / 可卖</th><th>成本价</th><th>最新价</th><th>持仓市值</th><th>浮动盈亏</th><th>操作</th></tr></thead><tbody>${entries
        .map((s) => {
          const h = state.holdings[s.id],
            price = priceOf(state, s.id),
            profit = (price - h.cost) * h.shares;
          return `<tr><td>${s.name}<small>${s.code} · ${s.sector}</small></td><td>${integer(h.shares)}<small>可卖 ${integer(h.available)} 股</small></td><td>¥${fmt(h.cost)}</td><td>¥${fmt(price)}</td><td>¥${fmt(price * h.shares)}</td><td class="${direction(profit)}">${signed(profit)}<small class="${direction(profit)}">${signed((price / h.cost - 1) * 100)}%</small></td><td><button class="table-trade" data-trade-stock="${s.id}">${state.finished ? "看行情" : "交易"}</button></td></tr>`;
        })
        .join("")}</tbody></table></div>`
    : emptyState(
        "手里有现金，心里有底气。",
        "你还没有持仓。先看看市场，第一笔不必着急。",
        "wallet",
      );
}
function renderHistory() {
  $("history-content").innerHTML = state.trades.length
    ? `<div class="table-scroll"><table><thead><tr><th>交易日</th><th>股票</th><th>方向</th><th>成交价</th><th>数量</th><th>成交金额</th><th>手续费</th></tr></thead><tbody>${state.trades.map((t) => `<tr><td>DAY ${String(t.day).padStart(2, "0")}</td><td>${STOCKS.find((s) => s.id === t.id).name}</td><td class="${t.side === "buy" ? "up" : "down"}">${t.side === "buy" ? "买入" : "卖出"}</td><td>¥${fmt(t.price)}</td><td>${integer(t.qty)} 股</td><td>¥${fmt(t.value)}</td><td>¥${fmt(t.fee)}</td></tr>`).join("")}</tbody></table></div>`
    : emptyState(
        "好交易，从耐心开始。",
        "还没有交易记录，去寻找你的第一笔机会吧。",
        "history",
      );
}
function render() {
  renderAccount();
  renderWatchlist();
  renderSelected();
  renderOrder();
  renderNews();
  renderPortfolio();
  renderHistory();
  renderGame();
  requestAnimationFrame(drawChart);
}
function setView(view) {
  activeView = view;
  for (const name of ["market", "portfolio", "history"])
    $(name + "-view").hidden = name !== view;
  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (view === "market") requestAnimationFrame(drawChart);
}
function selectStock(id) {
  selected = id;
  hover = -1;
  $("quantity").value = 100;
  $("chart-tooltip").hidden = true;
  renderWatchlist();
  renderSelected();
  renderOrder();
  renderGame();
  drawChart();
}
function setSide(value) {
  side = value;
  $("quantity").value = 100;
  renderOrder();
}
function showResult() {
  const assets = assetsOf(state),
    profit = (assets / INITIAL_CASH - 1) * 100;
  const title =
    assets >= TARGET
      ? "恭喜，今天你是股神。"
      : profit > 10
        ? "你有点交易天赋。"
        : profit >= 0
          ? "稳住本金，也是一种胜利。"
          : "韭菜会长大，交易会继续。";
  $("result-title").textContent = title;
  $("result-description").textContent =
    assets >= TARGET
      ? "30 个交易日，完成了从小散到股神的进阶。"
      : "市场给了你一份答卷，下一次的故事由你重写。";
  $("result-assets").textContent = `¥${fmt(assets)}`;
  $("result-return").textContent = `${signed(profit)}%`;
  $("result-return").className = direction(profit);
  $("result-drawdown").textContent = `${fmt(state.drawdown * 100)}%`;
  $("result-trades").textContent = String(state.trades.length);
  best = Math.max(best, profit);
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    /* Best score is optional. */
  }
  $("personal-best").textContent =
    `个人历史最佳收益 ${signed(best)}% · 下次见，交易员。`;
  if (!$("result-dialog").open) $("result-dialog").showModal();
}
function restart() {
  document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  state = newGame();
  selected = "nova";
  side = "buy";
  hover = -1;
  $("quantity").value = 100;
  setView("market");
  save();
  render();
  toast("新一轮开市 · 10 万本金已到账");
}
const cardIcons = {
  radar:
    '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><path d="M16 16 26 6M16 5v3M5 16h3M16 24v3M24 16h3"/><circle cx="16" cy="16" r="1.5"/></svg>',
  shield:
    '<svg viewBox="0 0 32 32"><path d="m16 3 10 4v9c0 7-10 13-10 13S6 23 6 16V7z"/><path d="m11 16 3 3 7-7"/></svg>',
  rally:
    '<svg viewBox="0 0 32 32"><path d="m5 12 19-7v20L5 18zm19-7h3v20h-3M9 20l3 8h5l-2-7M4 12v6M29 10l2-1M29 20l2 1"/></svg>',
};
let chosenCard = null,
  soundOn = false,
  audioContext;
try {
  soundOn = localStorage.getItem("market-play-sound") === "on";
} catch {
  /* Optional preference. */
}
function renderSound() {
  const b = $("sound-button");
  b.innerHTML = `♪ <span>音效${soundOn ? "开" : "关"}</span>`;
  b.setAttribute("aria-label", `${soundOn ? "关闭" : "开启"}游戏音效`);
  b.setAttribute("aria-pressed", String(soundOn));
}
function playSound(type = "trade") {
  if (!soundOn) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    const notes =
      type === "win"
        ? [523, 659, 784, 1047]
        : type === "card"
          ? [392, 587, 784]
          : [660, 880];
    notes.forEach((note, index) => {
      const oscillator = audioContext.createOscillator(),
        gain = audioContext.createGain(),
        time = audioContext.currentTime + index * 0.085;
      oscillator.type = "triangle";
      oscillator.frequency.value = note;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.055, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.15);
    });
  } catch {
    /* Audio support is optional; gameplay must continue. */
  }
}
function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#c4ef80", "#f0c878", "#9cd7cf", "#c4b0e7"];
  $("confetti").innerHTML = Array.from(
    { length: 22 },
    (_, i) =>
      `<i style="--x:${(i * 47 + 11) % 100}%;--delay:${(i % 5) * 0.07}s;--color:${colors[i % colors.length]};--turn:${i % 2 ? 400 : -330}deg"></i>`,
  ).join("");
  setTimeout(() => {
    $("confetti").innerHTML = "";
  }, 2000);
}
function renderGame() {
  const assets = assetsOf(state),
    gain = (assets / INITIAL_CASH - 1) * 100;
  const rivals = rivalsOf(state),
    place = rivals.findIndex((r) => r.player) + 1;
  $("trader-rank").textContent = traderRank(state);
  $("player-status").textContent = state.finished
    ? `最终排名第 ${place} · 收益 ${signed(gain)}%`
    : `街区排名第 ${place} · 已解锁 ${state.achievements.length} / 4 个成就`;
  $("mascot-speech").textContent = state.finished
    ? "收工！下局再战。"
    : gain >= 10
      ? "好家伙，你会玩！"
      : gain < -5
        ? "稳住，还有底牌。"
        : state.trades.length
          ? "别上头，牌要用对。"
          : "先选股，再出牌！";
  const stages = [
    [1, "小散入市"],
    [5, "初试锋芒"],
    [10, "牛熊试炼"],
    [20, "资本风暴"],
    [30, "股神之夜"],
  ];
  const current = stages.findLastIndex(([day]) => day <= state.day);
  $("quest-route").innerHTML = stages
    .map(
      ([day, name], i) =>
        `<div class="route-stop ${i === current ? "current" : ""} ${day <= state.day ? "unlocked" : ""}"><span class="route-point">${day < state.day ? icon("check") : day === 30 ? icon("cup") : String(day).padStart(2, "0")}</span><div><strong>${name}</strong><span>${day === 30 ? "终极结算" : day === 1 ? "拿起你的第一手" : "抵达领取卡牌"}</span></div></div>`,
    )
    .join("");
  $("rival-list").innerHTML = rivals
    .map(
      (r, i) =>
        `<div class="rival-row ${r.player ? "is-player" : ""}"><span class="rival-place">${i + 1}</span><span class="rival-face rival-face-${r.face}">${r.face}</span><div class="rival-name"><strong>${r.name}${r.player ? " <em>YOU</em>" : ""}</strong><span>${r.style}</span></div><span class="rival-return ${direction(r.assets - INITIAL_CASH)}">${signed((r.assets / INITIAL_CASH - 1) * 100)}%</span></div>`,
    )
    .join("");
  $("rival-taunt").textContent =
    place === 1
      ? "老王：“可以啊，今天你是这条街的首富。”"
      : "老王：“小伙子，想追上我，还得有点胆量。”";
  $("card-count").textContent =
    `${Object.values(state.cards).reduce((a, n) => a + n, 0)} 张可用`;
  $("strategy-deck").innerHTML = Object.entries(CARDS)
    .map(([id, c]) => {
      const used =
        id === "shield"
          ? state.active.shield
          : id === "rally"
            ? state.active.rally
            : false;
      const disabled =
        !state.cards[id] ||
        !!used ||
        state.finished ||
        state.day === TOTAL_DAYS;
      return `<button class="strategy-card card-${id} ${used ? "is-activated" : ""}" data-card="${id}" ${disabled ? "disabled" : ""} aria-label="${c.name}，剩余 ${state.cards[id]} 张，${c.subtitle}"><span class="card-icon">${cardIcons[id]}</span><span class="card-copy"><strong>${c.name}<span>×${state.cards[id]}</span></strong><span>${used ? "本日已生效 · 等待明日结算" : c.subtitle}</span></span><span class="card-play">${used ? "已装备" : "出牌"}${icon("chevron")}</span></button>`;
    })
    .join("");
  const effects = [];
  if (state.active.shield)
    effects.push(`${icon("check")}金钟罩：亏损返还已就绪`);
  if (state.active.rally)
    effects.push(
      `${icon("spark")}牛市号角：${STOCKS.find((s) => s.id === state.active.rally).name}已加成`,
    );
  if (state.reveal)
    effects.push(
      `${cardIcons.radar}雷达透视：${STOCKS.find((s) => s.id === state.reveal.id).name} 明日 ${signed(state.reveal.change)}%`,
    );
  $("active-effects").hidden = effects.length === 0;
  $("active-effects").innerHTML = effects
    .map((e) => `<span>${e}</span>`)
    .join("");
  $("mobile-next-day").querySelector("span").textContent = state.finished
    ? "查看战绩"
    : state.day === 30
      ? "收官 · 看战绩"
      : "收盘 · 抽事件";
  $("achievement-button").innerHTML =
    `${icon("cup")}成就 ${state.achievements.length}/4`;
  $("report-button").hidden = !state.report;
}
function advance() {
  if (state.finished) {
    showResult();
    return;
  }
  if (state.day === TOTAL_DAYS) {
    nextDay(state);
    save();
    render();
    showResult();
    playSound("win");
    celebrate();
    return;
  }
  const event = encounterFor(state);
  $("event-tag").textContent = event.boss
    ? `关卡 BOSS · 第 ${state.day + 1} 天`
    : "隔夜事件 · 老王的战书";
  $("encounter-title").textContent = event.title;
  $("encounter-description").textContent = event.description;
  $("event-reward").textContent = `¥${integer(event.reward)}`;
  $("event-stake").textContent = `¥${integer(event.stake)}`;
  document.querySelectorAll("[data-choice]").forEach((b) => {
    b.disabled = b.dataset.choice !== "pass" && state.cash < event.stake;
  });
  $("encounter-cash").textContent =
    state.cash < event.stake
      ? `可用资金 ¥${fmt(state.cash)} · 不足以支付挑战金，可免费跳过。`
      : `可用资金 ¥${fmt(state.cash)} · 挑战可自由跳过，涨跌以明日收盘价计算。`;
  $("encounter-dialog").showModal();
}
function showDayReport() {
  const r = state.report;
  if (!r) return;
  $("report-day").textContent =
    `DAY ${String(r.day).padStart(2, "0")} UNLOCKED`;
  $("report-verdict").innerHTML =
    r.gain > 0 ? icon("cup") : r.gain < 0 ? cardIcons.shield : icon("clock");
  $("report-headline").textContent =
    r.gain > 2000
      ? "这波操作，有点东西！"
      : r.gain > 0
        ? "又赚到了，漂亮。"
        : r.gain < 0
          ? "市场挨了一拳，你还站着。"
          : "蓄势待发，下一手见。";
  $("report-profit").textContent = `${signed(r.gain)}`;
  $("report-profit").className = `report-profit ${direction(r.gain)}`;
  const stock = STOCKS.find((s) => s.id === r.focus);
  const choiceText =
    r.choice === "pass"
      ? "你选择了稳住，没有接招。"
      : `${stock.name} ${signed(r.movement)}% · 你${r.choice === "long" ? "看涨" : "看跌"}，${r.won ? "判断正确！" : "这次猜错了。"}`;
  $("report-details").innerHTML =
    `<div><span>持仓涨跌</span><strong class="${direction(r.marketGain)}">${signed(r.marketGain)}</strong></div><div><span>事件挑战</span><strong class="${direction(r.eventBonus)}">${signed(r.eventBonus)}</strong></div>${r.shieldBonus ? `<div><span>金钟罩补贴</span><strong>+${fmt(r.shieldBonus)}</strong></div>` : ""}<p>${choiceText}</p>`;
  $("report-rewards").hidden = !r.rewards.length;
  $("report-rewards").textContent = `奖励到账 · ${r.rewards.join(" / ")}`;
  $("report-taunt").textContent =
    r.gain > 0
      ? "老王：“这次算你厉害。下一天，可没这么简单。”"
      : "小牛：“别上头，先想想你手里还剩什么牌。”";
  if (!$("day-dialog").open) $("day-dialog").showModal();
}
function showAchievements() {
  $("achievements-content").innerHTML = Object.entries(ACHIEVEMENTS)
    .map(
      ([id, a]) =>
        `<div class="achievement-row ${state.achievements.includes(id) ? "earned" : ""}"><span>${icon(state.achievements.includes(id) ? "check" : "cup")}</span><div><strong>${a.title}</strong><p>${a.description}</p></div><span>${CARDS[a.card].name} +1</span></div>`,
    )
    .join("");
  $("achievements-dialog").showModal();
}
$("strategy-deck").addEventListener("click", (e) => {
  const b = e.target.closest("[data-card]");
  if (!b || b.disabled) return;
  chosenCard = b.dataset.card;
  const card = CARDS[chosenCard];
  $("card-modal-title").textContent = card.name;
  $("card-modal-icon").innerHTML = cardIcons[chosenCard];
  $("card-modal-description").textContent = card.description;
  $("card-modal-target").textContent =
    chosenCard === "shield"
      ? "作用范围：全部持仓 · 下个交易日生效"
      : `作用股票：${STOCKS.find((s) => s.id === selected).name} · ${chosenCard === "radar" ? "立即获得预测" : "下个交易日生效"}`;
  $("card-dialog").showModal();
});
$("confirm-card").addEventListener("click", () => {
  const result = useCard(state, chosenCard, selected);
  $("card-dialog").close();
  if (result.ok) {
    save();
    renderGame();
    playSound("card");
  }
  toast(result.message, !result.ok);
});
document.querySelectorAll("[data-choice]").forEach((b) =>
  b.addEventListener("click", () => {
    const result = nextDay(state, b.dataset.choice);
    if (!result.ok) {
      toast(result.message, true);
      return;
    }
    $("encounter-dialog").close();
    hover = -1;
    $("chart-tooltip").hidden = true;
    save();
    render();
    showDayReport();
    if (result.report.gain > 0 || result.report.rewards.length) {
      celebrate();
      playSound("win");
    } else playSound("trade");
  }),
);
$("continue-day").addEventListener("click", () => {
  $("day-dialog").close();
  setView("market");
  document
    .querySelector(".terminal")
    .scrollIntoView({ behavior: "smooth", block: "start" });
});
$("report-button").addEventListener("click", showDayReport);
$("achievement-button").addEventListener("click", showAchievements);
$("sound-button").addEventListener("click", () => {
  soundOn = !soundOn;
  try {
    localStorage.setItem("market-play-sound", soundOn ? "on" : "off");
  } catch {}
  renderSound();
  if (soundOn) playSound("card");
});
renderSound();
// Canvas charts keep the site dependency-free and work without WebGL.
function drawChart() {
  if (activeView !== "market") return;
  const canvas = $("price-chart"),
    rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const w = rect.width,
    h = rect.height,
    left = 8,
    right = w < 400 ? 42 : 48,
    top = 14,
    bottom = 22;
  const pw = w - left - right,
    chartBottom = h * 0.72,
    volumeTop = h * 0.81,
    volumeBottom = h - bottom;
  const history = state.market[selected],
    count = Math.min(history.length, w < 400 ? 32 : 40),
    start = history.length - count,
    data = history.slice(start);
  let min = Math.min(...data.map((c) => c.low)),
    max = Math.max(...data.map((c) => c.high));
  const padding = (max - min) * 0.13 || 1;
  min -= padding;
  max += padding;
  const step = pw / count,
    x = (i) => left + step * (i + 0.5),
    y = (price) => top + ((max - price) / (max - min)) * (chartBottom - top);
  const maxVolume = Math.max(...data.map((c) => c.volume));
  const fontSize = w < 400 ? 9 : 10;
  ctx.font = `${fontSize}px 'DM Sans', sans-serif`;
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 4; i++) {
    const gy = top + ((chartBottom - top) * i) / 4;
    ctx.beginPath();
    ctx.strokeStyle = "#2c353555";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.moveTo(left, gy);
    ctx.lineTo(w - right + 2, gy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#617174";
    ctx.textAlign = "left";
    ctx.fillText((max - ((max - min) * i) / 4).toFixed(2), w - right + 8, gy);
  }
  [0, Math.floor(count / 3), Math.floor((count * 2) / 3), count - 1].forEach(
    (i) => {
      ctx.beginPath();
      ctx.strokeStyle = "#2c353540";
      ctx.moveTo(x(i), top);
      ctx.lineTo(x(i), volumeBottom);
      ctx.stroke();
      ctx.fillStyle = "#607174";
      ctx.textAlign = "center";
      const day = start + i - 38;
      ctx.fillText(
        day > 0
          ? `D${String(day).padStart(2, "0")}`
          : `历史 ${Math.abs(day) + 1}`,
        x(i),
        h - 8,
      );
    },
  );
  if (chartType === "candles") {
    const cw = Math.max(3, Math.min(9, step * 0.55));
    data.forEach((c, i) => {
      const color = c.close >= c.open ? "#eb8b83" : "#6cb99a";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x(i), y(c.high));
      ctx.lineTo(x(i), y(c.low));
      ctx.stroke();
      const topY = Math.min(y(c.open), y(c.close)),
        height = Math.max(1.5, Math.abs(y(c.open) - y(c.close)));
      ctx.fillRect(x(i) - cw / 2, topY, cw, height);
    });
  } else {
    const gradient = ctx.createLinearGradient(0, top, 0, chartBottom);
    gradient.addColorStop(0, "#c4ef8025");
    gradient.addColorStop(1, "#c4ef8000");
    ctx.beginPath();
    data.forEach((c, i) =>
      i ? ctx.lineTo(x(i), y(c.close)) : ctx.moveTo(x(i), y(c.close)),
    );
    ctx.lineTo(x(count - 1), chartBottom);
    ctx.lineTo(x(0), chartBottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.beginPath();
    data.forEach((c, i) =>
      i ? ctx.lineTo(x(i), y(c.close)) : ctx.moveTo(x(i), y(c.close)),
    );
    ctx.strokeStyle = "#c4ef80";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  [5, 10].forEach((period, index) => {
    ctx.beginPath();
    data.forEach((c, i) => {
      const absolute = start + i,
        slice = history.slice(Math.max(0, absolute - period + 1), absolute + 1);
      const avg = slice.reduce((sum, v) => sum + v.close, 0) / slice.length;
      i ? ctx.lineTo(x(i), y(avg)) : ctx.moveTo(x(i), y(avg));
    });
    ctx.strokeStyle = index ? "#a29ce1" : "#d6c28a";
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  ctx.fillStyle = "#5f7372";
  ctx.textAlign = "left";
  ctx.font = `8px 'DM Sans', sans-serif`;
  ctx.fillText("VOL", left, volumeTop - 9);
  data.forEach((c, i) => {
    ctx.fillStyle = c.close >= c.open ? "#eb8b834b" : "#6cb99a4b";
    const height = (c.volume / maxVolume) * (volumeBottom - volumeTop);
    ctx.fillRect(
      x(i) - step * 0.24,
      volumeBottom - height,
      step * 0.48,
      height,
    );
  });
  const last = data.at(-1),
    py = y(last.close);
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = "#a5b99b75";
  ctx.beginPath();
  ctx.moveTo(left, py);
  ctx.lineTo(w - right, py);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#35482d";
  ctx.fillRect(w - right + 3, py - 9, right - 4, 18);
  ctx.fillStyle = "#cce4b8";
  ctx.font = `${fontSize}px 'DM Sans', sans-serif`;
  ctx.fillText(last.close.toFixed(2), w - right + 7, py);
  if (hover >= 0 && hover < count) {
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "#a7b6a080";
    ctx.beginPath();
    ctx.moveTo(x(hover), top);
    ctx.lineTo(x(hover), volumeBottom);
    ctx.moveTo(left, y(data[hover].close));
    ctx.lineTo(w - right, y(data[hover].close));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(x(hover), y(data[hover].close), 3, 0, Math.PI * 2);
    ctx.fillStyle = "#c4ef80";
    ctx.fill();
  }
  chartGeometry = { left, step, count, start, data, width: w };
}
$("stock-list").addEventListener("click", (e) => {
  const b = e.target.closest("[data-stock]");
  if (b) selectStock(b.dataset.stock);
});
$("buy-tab").addEventListener("click", () => setSide("buy"));
$("sell-tab").addEventListener("click", () => setSide("sell"));
$("quantity").addEventListener("input", renderOrder);
$("quantity").addEventListener("blur", () => {
  if (!$("quantity").value) {
    $("quantity").value = 100;
    renderOrder();
  }
});
$("decrease").addEventListener("click", () => {
  $("quantity").value = Math.max(
    100,
    (Math.floor(Number($("quantity").value) / 100) || 1) * 100 - 100,
  );
  renderOrder();
});
$("increase").addEventListener("click", () => {
  $("quantity").value = Math.max(
    100,
    (Math.floor(Number($("quantity").value) / 100) || 0) * 100 + 100,
  );
  renderOrder();
});
document.querySelectorAll("[data-fraction]").forEach((b) =>
  b.addEventListener("click", () => {
    const max = maxShares(state, selected, side),
      fraction = Number(b.dataset.fraction);
    $("quantity").value = Math.max(
      max ? 100 : 0,
      Math.floor((max * fraction) / 100) * 100,
    );
    renderOrder();
  }),
);
$("trade-button").addEventListener("click", () => {
  const result = trade(state, selected, side, Number($("quantity").value));
  if (result.ok) {
    save();
    render();
    playSound("trade");
    if (result.rewards?.length) celebrate();
  }
  toast(
    result.message +
      (result.rewards?.length
        ? ` · 成就解锁：${result.rewards.join("、")}，策略卡已到账`
        : ""),
    !result.ok,
  );
});
$("next-day").addEventListener("click", advance);
$("mobile-next-day").addEventListener("click", advance);
$("chart-tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-chart]");
  if (!b) return;
  chartType = b.dataset.chart;
  document.querySelectorAll("[data-chart]").forEach((el) => {
    el.classList.toggle("selected", el === b);
    el.setAttribute("aria-pressed", String(el === b));
  });
  renderSelected();
  drawChart();
});
const chart = $("price-chart");
chart.addEventListener("pointermove", (e) => {
  if (!chartGeometry || e.pointerType === "touch") return;
  const rect = chart.getBoundingClientRect(),
    px = e.clientX - rect.left,
    { left, step, count, data, start, width } = chartGeometry;
  if (px < left || px > left + step * count) {
    hover = -1;
    $("chart-tooltip").hidden = true;
    updateOhlc();
    drawChart();
    return;
  }
  hover = Math.max(0, Math.min(count - 1, Math.floor((px - left) / step)));
  const candle = data[hover],
    day = start + hover - 38;
  updateOhlc(candle);
  const tooltip = $("chart-tooltip");
  tooltip.hidden = false;
  tooltip.textContent = `${day > 0 ? `第 ${day} 个交易日` : "开局前历史行情"} · ¥${fmt(candle.close)}`;
  tooltip.style.left = `${Math.min(Math.max(0, px - 70), width - Math.min(210, width))}px`;
  tooltip.style.top = "8px";
  drawChart();
});
chart.addEventListener("pointerleave", () => {
  hover = -1;
  $("chart-tooltip").hidden = true;
  updateOhlc();
  drawChart();
});
document.querySelectorAll("[data-view]").forEach((b) =>
  b.addEventListener("click", () => {
    setView(b.dataset.view);
    const target =
      b.dataset.view === "market"
        ? document.querySelector(".terminal")
        : $(b.dataset.view + "-view");
    target.scrollIntoView({ block: "start", behavior: "smooth" });
  }),
);
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-return-market]")) setView("market");
  const b = e.target.closest("[data-trade-stock]");
  if (b) {
    setView("market");
    setSide("sell");
    selectStock(b.dataset.tradeStock);
    document.querySelector(".order-panel").scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  }
  const close = e.target.closest("[data-close]");
  if (close) close.closest("dialog").close();
});
$("help-button").addEventListener("click", () => $("help-dialog").showModal());
$("rules-button").addEventListener("click", () => $("help-dialog").showModal());
$("fee-help").addEventListener("click", () =>
  toast("手续费 = 成交金额 × 0.03%，每笔最低 5 元。"),
);
$("restart-button").addEventListener("click", () =>
  $("restart-dialog").showModal(),
);
$("confirm-restart").addEventListener("click", restart);
$("play-again").addEventListener("click", restart);
document.querySelectorAll("dialog").forEach((d) =>
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  }),
);
new ResizeObserver(() => requestAnimationFrame(drawChart)).observe(
  document.querySelector(".chart-wrap"),
);
window.addEventListener("pageshow", () => requestAnimationFrame(drawChart));
window.addEventListener("storage", (e) => {
  if (e.key !== STORAGE_KEY || !e.newValue) return;
  const restored = restoreGame(e.newValue);
  if (restored) {
    state = restored;
    hover = -1;
    $("chart-tooltip").hidden = true;
    render();
    toast("已同步另一个标签页的最新进度。");
  }
});
render();
save();
if (storageWarning) toast("当前浏览器无法保存进度，请保持页面开启。", true);
