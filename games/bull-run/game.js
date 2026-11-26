import {
  t,
  getLanguage,
  getLocale,
  onLanguageChange,
} from "../../shared/i18n.mjs";
import { localizeHTML } from "../../shared/language-ui.mjs";
(() => {
  "use strict";
  const canvas = document.getElementById("game"),
    ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const W = 768,
    H = 432,
    TILE = 32,
    FLOOR = 368,
    WORLD = 6656,
    GOAL = 6208;
  const keys = { left: false, right: false, jump: false, run: false };
  const inputs = new Map();
  let mode = "ready",
    player,
    blocks = [],
    floors = [],
    coins = [],
    enemies = [],
    items = [],
    particles = [],
    texts = [];
  let camera = 0,
    score = 0,
    collected = 0,
    lives = 3,
    time = 300,
    checkpoint = 112,
    tick = 0,
    jumpBuffer = 0,
    best = 0,
    winTicks = 0,
    audio,
    soundOn = false;
  let colors = {};
  function readColors() {
    const c = getComputedStyle(document.documentElement);
    for (const k of [
      "sky",
      "ground",
      "soil",
      "grass",
      "bush",
      "cloud",
      "pixel-dark",
      "hud",
      "grid",
      "chart",
      "up",
      "down",
      "gold",
      "market-muted",
      "terminal",
      "market-light",
    ])
      colors[k] = c.getPropertyValue("--" + k).trim();
  }
  readColors();
  matchMedia("(prefers-color-scheme: dark)").addEventListener(
    "change",
    readColors,
  );
  try {
    best = Number(localStorage.getItem("pixel-mario-best-v1")) || 0;
  } catch (_) {}
  function updateBest() {
    $("best").textContent = t(
      best ? "最高积分 " + String(best).padStart(6, "0") : "最高积分 —",
    );
  }
  updateBest();
  const font = {
    0: ["111", "101", "101", "101", "111"],
    1: ["010", "110", "010", "010", "111"],
    2: ["111", "001", "111", "100", "111"],
    3: ["111", "001", "111", "001", "111"],
    4: ["101", "101", "111", "001", "001"],
    5: ["111", "100", "111", "001", "111"],
    6: ["111", "100", "111", "101", "111"],
    7: ["111", "001", "010", "010", "010"],
    8: ["111", "101", "111", "101", "111"],
    9: ["111", "101", "111", "001", "111"],
    A: ["010", "101", "111", "101", "101"],
    B: ["110", "101", "110", "101", "110"],
    C: ["111", "100", "100", "100", "111"],
    D: ["110", "101", "101", "101", "110"],
    E: ["111", "100", "110", "100", "111"],
    F: ["111", "100", "110", "100", "100"],
    G: ["111", "100", "101", "101", "111"],
    H: ["101", "101", "111", "101", "101"],
    I: ["111", "010", "010", "010", "111"],
    J: ["001", "001", "001", "101", "111"],
    K: ["101", "101", "110", "101", "101"],
    L: ["100", "100", "100", "100", "111"],
    M: ["10001", "11011", "10101", "10001", "10001"],
    N: ["1001", "1101", "1011", "1001", "1001"],
    O: ["111", "101", "101", "101", "111"],
    P: ["111", "101", "111", "100", "100"],
    Q: ["111", "101", "101", "111", "001"],
    R: ["110", "101", "110", "101", "101"],
    S: ["111", "100", "111", "001", "111"],
    T: ["111", "010", "010", "010", "010"],
    U: ["101", "101", "101", "101", "111"],
    V: ["101", "101", "101", "101", "010"],
    W: ["10001", "10001", "10101", "11011", "10001"],
    X: ["101", "101", "010", "101", "101"],
    Y: ["101", "101", "010", "010", "010"],
    Z: ["111", "001", "010", "100", "111"],
    "-": ["000", "000", "111", "000", "000"],
    "!": ["1", "1", "1", "0", "1"],
    ":": ["0", "1", "0", "1", "0"],
    ".": ["0", "0", "0", "0", "1"],
    "?": ["111", "001", "011", "000", "010"],
  };
  function pixelText(str, x, y, s = 3, color = colors.hud) {
    ctx.fillStyle = color;
    for (const ch of String(str)) {
      const a = font[ch];
      if (a) {
        a.forEach((row, j) => {
          for (let i = 0; i < row.length; i++)
            if (row[i] === "1")
              ctx.fillRect(Math.round(x + i * s), Math.round(y + j * s), s, s);
        });
        x += (a[0].length + 1) * s;
      } else x += 3 * s;
    }
  }
  const palette = {
    r: "#39d89b",
    b: "#416887",
    s: "#ffd2a1",
    k: "#0a1621",
    w: "#f1fff5",
    g: "#ffd36b",
    n: "#ad5e70",
    q: "#5bf4b9",
    d: "#e5a39e",
  };
  // Original pixel trader, bear and bullish-news sprites; gameplay hitboxes are unchanged.
  const mario = [
    ".....kkkkkk.....",
    "....kkkkkkkk....",
    "....kssssssk....",
    "....kskssksk....",
    "....ssssssss....",
    ".....sskkss.....",
    "......ssss......",
    "....bbwwwwbb....",
    "...bbbwqqwbbb...",
    "..bbbbwqqwbbbb..",
    "..ssbbwwwwbbss..",
    "..ssbbbbbbbbss..",
    "....bbbbbbbb....",
    "....bbb..bbb....",
    "...bbbb..bbbb...",
    "...kkkk..kkkk...",
  ];
  const goomba = [
    "..nnn......nnn..",
    ".nndnn....nndnn.",
    ".nnnnnnnnnnnnnn.",
    "..nnnnnnnnnnnn..",
    ".nnnknnnnnnknnn.",
    ".nnnknnnnnnknnn.",
    ".nnnndddddnnnnn.",
    ".nnnndkkddnnnnn.",
    ".nnnnndddnnnnnn.",
    "..nnnnnnnnnnnn..",
    "...nnnnddnnnn...",
    "...nnnnddnnnn...",
    "..kkkknnnnkkkk..",
    "..kkkk....kkkk..",
  ];
  const mushroom = [
    "..kkkkkkkkkkkk..",
    "..kwwwwwwwwwwk..",
    "..kwrrwwwwwwwk..",
    "..kwrrwwwwrrwk..",
    "..kwwrrwwrrrwk..",
    "..kwwwrrrrrrwk..",
    "..kwwwwrrrrrwk..",
    "..kwwwwwrrwwwk..",
    "..kwwwwwwwwwwk..",
    "..kwbbbbbbbbwk..",
    "..kwwwwwwwwwwk..",
    "..kwbbbbwwwwwk..",
    "..kwwwwwwwwwwk..",
    "..kkkkkkkkkkkk..",
  ];
  function sprite(rows, x, y, scale = 2, flip = false, vertical = 1) {
    ctx.save();
    ctx.translate(Math.round(x) + (flip ? 32 : 0), Math.round(y));
    ctx.scale(flip ? -1 : 1, vertical);
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = palette[row[i]];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(i * scale, j * scale, scale, scale);
        }
      }
    });
    ctx.restore();
  }
  function tone(freq, duration = 0.09, type = "square", volume = 0.035) {
    if (!soundOn) return;
    try {
      if (!audio)
        audio = new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => {});
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audio.currentTime);
      gain.gain.setValueAtTime(volume, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + duration,
      );
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + duration);
    } catch (_) {}
  }
  function sound(kind) {
    if (kind === "coin") {
      tone(990, 0.08);
      setTimeout(() => tone(1320, 0.12), 70);
    } else if (kind === "jump") tone(370, 0.12, "square", 0.018);
    else if (kind === "stomp") tone(130, 0.08);
    else if (kind === "hurt") tone(100, 0.3, "sawtooth");
    else if (kind === "power") {
      [440, 554, 659, 880].forEach((n, i) =>
        setTimeout(() => tone(n, 0.13), i * 85),
      );
    } else if (kind === "win") {
      [523, 659, 784, 1046, 784, 1046].forEach((n, i) =>
        setTimeout(() => tone(n, 0.2), i * 135),
      );
    }
  }
  function overlap(a, b) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  }
  function buildLevel() {
    blocks = [];
    coins = [];
    enemies = [];
    items = [];
    particles = [];
    texts = [];
    const gaps = [
      [30, 33],
      [57, 60],
      [91, 95],
      [128, 131],
      [164, 168],
    ];
    floors = [];
    let start = 0;
    for (const [a, b] of gaps) {
      floors.push({
        x: start,
        y: FLOOR,
        w: a * TILE - start,
        h: H - FLOOR + 120,
        type: "floor",
      });
      start = b * TILE;
    }
    floors.push({
      x: start,
      y: FLOOR,
      w: WORLD - start,
      h: H - FLOOR + 120,
      type: "floor",
    });
    const block = (tx, y, type = "brick", content = null) =>
      blocks.push({
        x: tx * TILE,
        y,
        w: 32,
        h: 32,
        type,
        content,
        used: false,
        bump: 0,
      });
    [7, 9, 11].forEach((n) =>
      block(n, 264, "question", n === 9 ? "mushroom" : "coin"),
    );
    [8, 10].forEach((n) => block(n, 264));
    [
      [19, 64],
      [37, 64],
      [52, 96],
      [68, 64],
      [84, 96],
      [109, 64],
      [144, 96],
      [157, 64],
      [177, 64],
    ].forEach(([n, h]) =>
      blocks.push({ x: n * TILE, y: FLOOR - h, w: 64, h, type: "pipe" }),
    );
    for (const n of [
      24, 25, 26, 27, 42, 43, 44, 73, 74, 75, 76, 101, 102, 103, 118, 119, 120,
      137, 138, 139, 149, 150, 151, 173, 174,
    ])
      block(
        n,
        n >= 137 && n <= 139 ? 232 : 264,
        n % 3 === 0 ? "question" : "brick",
        n % 3 === 0 ? (n === 75 || n === 120 ? "mushroom" : "coin") : null,
      );
    [
      [47, 1],
      [48, 2],
      [49, 3],
      [79, 1],
      [80, 2],
      [81, 3],
      [82, 2],
      [125, 1],
      [126, 2],
      [159, 1],
      [160, 2],
      [161, 3],
    ].forEach(([n, h]) => {
      for (let i = 0; i < h; i++) block(n, FLOOR - 32 * (i + 1), "stone");
    });
    for (let n = 184; n < 189; n++)
      for (let j = 0; j <= n - 184; j++)
        block(n, FLOOR - (j + 1) * 32, "stone");
    for (const [from, to, y] of [
      [13, 17, 298],
      [24, 28, 215],
      [33, 37, 245],
      [42, 45, 215],
      [60, 65, 270],
      [73, 77, 215],
      [96, 100, 274],
      [101, 104, 215],
      [113, 117, 295],
      [132, 137, 275],
      [137, 140, 180],
      [150, 154, 213],
      [168, 173, 275],
      [180, 183, 295],
    ])
      for (let n = from; n < to; n++)
        coins.push({ x: n * TILE + 8, y, w: 16, h: 23, taken: false });
    [
      470, 770, 1210, 1340, 1670, 2070, 2310, 2690, 3160, 3540, 3710, 3900,
      4330, 4610, 4930, 5450, 5620,
    ].forEach((x, i) =>
      enemies.push({
        x,
        y: FLOOR - 28,
        w: 28,
        h: 28,
        vx: i % 2 ? 0.65 : -0.65,
        vy: 0,
        alive: true,
        squash: 0,
      }),
    );
  }
  function makePlayer(x) {
    return {
      x,
      y: FLOOR - 32,
      w: 24,
      h: 32,
      vx: 0,
      vy: 0,
      ground: true,
      coyote: 6,
      jumps: 0,
      face: 1,
      power: false,
      inv: 0,
      walk: 0,
    };
  }
  function clearInputs() {
    inputs.clear();
    Object.keys(keys).forEach((k) => (keys[k] = false));
    jumpBuffer = 0;
    document
      .querySelectorAll("[data-key]")
      .forEach((b) => b.classList.remove("held"));
  }
  function setInput(source, key, down) {
    if (down) inputs.set(source, key);
    else inputs.delete(source);
    const old = keys.jump;
    Object.keys(keys).forEach(
      (k) => (keys[k] = [...inputs.values()].includes(k)),
    );
    if (keys.jump && !old) jumpBuffer = 8;
  }
  let overlaySource = [
    "BULL RUN / OPENING BELL",
    "今天，你是多头主角。",
    "踩住空头熊，跳过市场深坑。<br>收集筹码，去交易所敲响胜利的钟。",
    "开市出发",
    "Enter 开始 · 空格二段跳 / 长按连跳 · F 全屏",
  ];
  function showOverlay(eyebrow, title, copy, button, hint) {
    overlaySource = [eyebrow, title, copy, button, hint];
    $("overlay-eyebrow").textContent = t(eyebrow);
    $("overlay-title").textContent = t(title);
    $("overlay-copy").innerHTML = localizeHTML(copy);
    $("play").innerHTML = localizeHTML(button + " <span>▶</span>");
    $("overlay-hint").textContent = t(hint);
    $("overlay").classList.remove("hidden");
  }
  function refreshStatus() {
    const labels = {
      ready: "等待开市",
      playing: "牛市闯关中",
      paused: "午间休市",
      dead: "调整心态再来",
      gameover: "本轮收市",
      winning: "敲响胜利钟",
      won: "牛市闯关成功",
    };
    $("status").textContent = t(labels[mode] || "");
    $("pause").innerHTML = localizeHTML(
      mode === "paused" ? "继续 <kbd>P</kbd>" : "暂停 <kbd>P</kbd>",
    );
    $("stage-pause").textContent = t(mode === "paused" ? "继续 ▶" : "暂停 Ⅱ");
  }
  function startGame() {
    buildLevel();
    score = 0;
    collected = 0;
    lives = 3;
    time = 300;
    camera = 0;
    checkpoint = 112;
    player = makePlayer(112);
    tick = 0;
    mode = "playing";
    winTicks = 0;
    clearInputs();
    $("overlay").classList.add("hidden");
    refreshStatus();
    canvas.focus({ preventScroll: true });
  }
  function saveBest() {
    if (score > best) {
      best = score;
      try {
        localStorage.setItem("pixel-mario-best-v1", String(best));
      } catch (_) {}
      updateBest();
    }
  }
  function resume() {
    mode = "playing";
    clearInputs();
    $("overlay").classList.add("hidden");
    refreshStatus();
    canvas.focus({ preventScroll: true });
  }
  function togglePause() {
    if (mode === "playing") {
      mode = "paused";
      clearInputs();
      showOverlay(
        "MARKET BREAK",
        "休市片刻，保持节奏。",
        "不追涨，不慌张。<br>准备好了，再回到你的像素交易场。",
        "继续闯关",
        "按 P / Esc 继续",
      );
      refreshStatus();
    } else if (mode === "paused") resume();
  }
  function activate() {
    if (mode === "paused") resume();
    else if (mode === "dead") {
      player = makePlayer(checkpoint);
      player.inv = 120;
      camera = Math.max(0, checkpoint - 180);
      items = [];
      time = Math.max(90, time);
      resume();
    } else startGame();
  }
  function addScore(n, x, y) {
    score += n;
    texts.push({ text: String(n), x, y, life: 55 });
  }
  function getCoin(x, y) {
    collected++;
    addScore(100, x, y);
    sound("coin");
    if (collected % 50 === 0) {
      lives++;
      texts.push({ text: "1 UP", x, y: y - 20, life: 80 });
    }
  }
  function burst(x, y, color, count = 8) {
    for (let i = 0; i < count; i++)
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 5 - 1,
        life: 40,
        color,
        size: 3 + Math.random() * 3,
      });
  }
  function die() {
    if (mode !== "playing") return;
    lives--;
    sound("hurt");
    burst(player.x + 12, player.y + 16, colors.down, 14);
    clearInputs();
    saveBest();
    mode = lives > 0 ? "dead" : "gameover";
    showOverlay(
      lives > 0 ? "RISK RESET" : "MARKET CLOSED",
      lives > 0 ? "遇到回撤，调整再出发。" : "本轮收市，下局再战。",
      lives > 0
        ? "还有 " +
            lives +
            " 次机会。<br>" +
            (checkpoint > 112
              ? "从中途补给站继续出发。"
              : "跳过回撤深坑，踩住空头熊。")
        : "游戏积分 " +
            String(score).padStart(6, "0") +
            " · 收益筹码 " +
            collected,
      "" + (lives > 0 ? "继续闯关" : "重新开市"),
      "按 Enter " + (lives > 0 ? "继续" : "重新开始"),
    );
    refreshStatus();
  }
  function hurt() {
    if (player.inv > 0) return;
    if (player.power) {
      player.power = false;
      player.y += 10;
      player.h = 32;
      player.inv = 140;
      sound("hurt");
      burst(player.x, player.y, "#fff8db");
    } else die();
  }
  function win() {
    mode = "winning";
    winTicks = 0;
    score += Math.ceil(time) * 10 + 1000;
    saveBest();
    sound("win");
    clearInputs();
    refreshStatus();
  }
  function allSolids() {
    return floors.concat(blocks.filter((b) => !b.broken));
  }
  function hitBlock(b) {
    if (b.type === "pipe" || b.type === "stone") return;
    b.bump = 10;
    if (b.type === "question" && !b.used) {
      b.used = true;
      if (b.content === "mushroom") {
        items.push({
          x: b.x + 3,
          y: b.y - 28,
          w: 28,
          h: 28,
          vx: 1.25,
          vy: -1,
          alive: true,
        });
        sound("power");
      } else {
        getCoin(b.x + 8, b.y - 20);
        particles.push({
          x: b.x + 12,
          y: b.y - 12,
          vx: 0,
          vy: -5,
          life: 28,
          color: "#ffd443",
          size: 9,
        });
      }
    } else if (b.type === "brick" && player.power) {
      b.broken = true;
      burst(b.x + 16, b.y + 16, "#c65125", 12);
      addScore(50, b.x, b.y);
    } else tone(180, 0.04);
  }
  function moveBody(body, solids, headHit = false) {
    body.x += body.vx;
    for (const b of solids) {
      if (overlap(body, b)) {
        if (body.vx > 0) body.x = b.x - body.w;
        else if (body.vx < 0) body.x = b.x + b.w;
        if (headHit) body.vx = 0;
        else body.vx = -body.vx;
      }
    }
    body.y += body.vy;
    body.ground = false;
    for (const b of solids) {
      if (overlap(body, b)) {
        if (body.vy >= 0) {
          body.y = b.y - body.h;
          body.ground = true;
        } else {
          body.y = b.y + b.h;
          if (headHit) hitBlock(b);
        }
        body.vy = 0;
      }
    }
  }
  function update() {
    tick++;
    for (const b of blocks) if (b.bump > 0) b.bump--;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16;
      p.life--;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const t of texts) {
      t.y -= 0.65;
      t.life--;
    }
    texts = texts.filter((t) => t.life > 0);
    if (mode === "winning") {
      winTicks++;
      player.vx = 0;
      if (player.y + player.h < FLOOR) {
        player.y = Math.min(FLOOR - player.h, player.y + 3);
      } else if (winTicks > 40) {
        player.x += 2;
        player.walk += 0.2;
        player.face = 1;
      }
      camera = Math.min(WORLD - W, Math.max(0, player.x - 300));
      if (winTicks > 170) {
        mode = "won";
        showOverlay(
          "CLOSING BELL / WELL PLAYED",
          "漂亮！敲响牛市胜利钟。",
          "游戏积分 " +
            String(score).padStart(6, "0") +
            " · 收益筹码 " +
            collected +
            "<br>穿越牛熊，下一轮继续出发。",
          "再开一局",
          "按 Enter 重新挑战 · 积分不代表投资收益",
        );
        refreshStatus();
      }
      return;
    }
    if (mode !== "playing") return;
    time -= 1 / 60;
    if (time <= 0) {
      time = 0;
      die();
      return;
    }
    const p = player,
      prevY = p.y;
    const solids = allSolids();
    if (p.inv > 0) p.inv--;
    if (jumpBuffer > 0) jumpBuffer--;
    p.coyote = p.ground ? 7 : Math.max(0, p.coyote - 1);
    if (p.ground) p.jumps = 0;
    if (!p.ground && p.coyote === 0 && p.jumps === 0) p.jumps = 1;
    const direction = Number(keys.right) - Number(keys.left),
      max = keys.run ? 4.5 : 3.05;
    if (direction) {
      p.vx += direction * (p.ground ? 0.38 : 0.24);
      p.vx = Math.max(-max, Math.min(max, p.vx));
      p.face = direction;
    } else {
      p.vx *= p.ground ? 0.78 : 0.97;
      if (Math.abs(p.vx) < 0.06) p.vx = 0;
    }
    const groundJump =
      p.coyote > 0 && (jumpBuffer > 0 || (p.ground && keys.jump));
    const airJump =
      !groundJump && jumpBuffer > 0 && p.coyote === 0 && p.jumps === 1;
    if (groundJump || airJump) {
      p.vy = airJump ? -9.5 : keys.run ? -10.6 : -10.1;
      p.ground = false;
      p.coyote = 0;
      p.jumps = airJump ? 2 : 1;
      jumpBuffer = 0;
      sound("jump");
      if (airJump) {
        burst(p.x + 12, p.y + p.h, "#fff8cf", 10);
        texts.push({ text: "DOUBLE!", x: p.x - 14, y: p.y - 16, life: 35 });
      }
    }
    if (!keys.jump && p.vy < -4) p.vy += 0.62;
    p.vy = Math.min(12, p.vy + 0.43);
    moveBody(p, solids, true);
    p.x = Math.max(0, Math.min(WORLD - p.w, p.x));
    p.walk += Math.abs(p.vx) * 0.13;
    for (const coin of coins)
      if (!coin.taken && overlap(p, coin)) {
        coin.taken = true;
        getCoin(coin.x, coin.y);
        burst(coin.x + 8, coin.y + 8, "#ffdf5b", 5);
      }
    for (const item of items) {
      if (!item.alive) continue;
      item.vy = Math.min(10, item.vy + 0.4);
      moveBody(item, solids);
      if (item.y > H + 80) item.alive = false;
      if (overlap(p, item)) {
        item.alive = false;
        if (!p.power) {
          p.power = true;
          p.y -= 10;
          p.h = 42;
          p.inv = 70;
        }
        addScore(1000, p.x, p.y);
        sound("power");
      }
    }
    items = items.filter((i) => i.alive);
    for (const e of enemies) {
      if (!e.alive) {
        if (e.squash > 0) e.squash--;
        continue;
      }
      if (Math.abs(e.x - p.x) > 1000) continue;
      e.vy = Math.min(10, e.vy + 0.43);
      moveBody(e, solids);
      if (e.ground) {
        const ahead = {
          x: e.vx > 0 ? e.x + e.w + 3 : e.x - 3,
          y: e.y + e.h + 2,
          w: 2,
          h: 3,
        };
        if (!solids.some((b) => overlap(ahead, b))) e.vx = -e.vx;
      }
      if (e.y > H + 90) e.alive = false;
      if (e.alive && overlap(p, e)) {
        if (p.vy > 0 && prevY + p.h <= e.y + 12) {
          e.alive = false;
          e.squash = 24;
          p.vy = keys.jump ? -7 : -4.5;
          p.jumps = 1;
          p.coyote = 0;
          addScore(200, e.x, e.y);
          sound("stomp");
        } else hurt();
        if (mode !== "playing") return;
      }
    }
    if (p.y > H + 55) {
      die();
      return;
    }
    if (p.x > 3350 && checkpoint === 112) {
      checkpoint = 3392;
      texts.push({ text: "CHECKPOINT", x: 3380, y: 245, life: 110 });
      sound("power");
    }
    if (p.x + p.w >= GOAL && p.y + p.h > 160) {
      win();
      return;
    }
    camera += (Math.max(0, Math.min(WORLD - W, p.x - 250)) - camera) * 0.12;
  }
  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }
  function cloud(x, y, s = 1) {
    ctx.save();
    ctx.translate(Math.round(x), y);
    ctx.scale(s, s);
    const c = colors.cloud;
    ctx.fillStyle = colors["pixel-dark"];
    ctx.beginPath();
    ctx.moveTo(0, 25);
    ctx.lineTo(6, 19);
    ctx.lineTo(16, 19);
    ctx.lineTo(16, 10);
    ctx.lineTo(26, 10);
    ctx.lineTo(30, 0);
    ctx.lineTo(42, 0);
    ctx.lineTo(48, 8);
    ctx.lineTo(52, 8);
    ctx.lineTo(58, 18);
    ctx.lineTo(67, 17);
    ctx.lineTo(67, 23);
    ctx.lineTo(75, 23);
    ctx.lineTo(80, 31);
    ctx.lineTo(73, 41);
    ctx.lineTo(59, 44);
    ctx.lineTo(24, 44);
    ctx.lineTo(9, 37);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(3, 25);
    ctx.lineTo(9, 21);
    ctx.lineTo(19, 21);
    ctx.lineTo(19, 12);
    ctx.lineTo(28, 12);
    ctx.lineTo(32, 3);
    ctx.lineTo(40, 3);
    ctx.lineTo(48, 11);
    ctx.lineTo(51, 11);
    ctx.lineTo(57, 21);
    ctx.lineTo(65, 20);
    ctx.lineTo(65, 26);
    ctx.lineTo(73, 26);
    ctx.lineTo(77, 31);
    ctx.lineTo(71, 38);
    ctx.lineTo(58, 41);
    ctx.lineTo(25, 41);
    ctx.lineTo(11, 35);
    ctx.closePath();
    ctx.fill();
    rect(28, 13, 4, 2, "#64c9ed");
    rect(43, 14, 4, 2, "#64c9ed");
    rect(17, 33, 9, 2, "#64c9ed");
    rect(28, 36, 13, 2, "#64c9ed");
    rect(45, 34, 10, 2, "#64c9ed");
    ctx.restore();
  }
  function hill(x, w, h) {
    ctx.fillStyle = colors["pixel-dark"];
    ctx.beginPath();
    ctx.moveTo(x, FLOOR);
    ctx.lineTo(x + w * 0.36, FLOOR - h + 10);
    ctx.lineTo(x + w * 0.46, FLOOR - h);
    ctx.lineTo(x + w * 0.54, FLOOR - h);
    ctx.lineTo(x + w * 0.64, FLOOR - h + 10);
    ctx.lineTo(x + w, FLOOR);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.grass;
    ctx.beginPath();
    ctx.moveTo(x + 4, FLOOR);
    ctx.lineTo(x + w * 0.37, FLOOR - h + 12);
    ctx.lineTo(x + w * 0.47, FLOOR - h + 3);
    ctx.lineTo(x + w * 0.53, FLOOR - h + 3);
    ctx.lineTo(x + w * 0.63, FLOOR - h + 12);
    ctx.lineTo(x + w - 4, FLOOR);
    ctx.closePath();
    ctx.fill();
    rect(x + w * 0.51, FLOOR - h + 14, 5, 13, "#126407");
    rect(x + w * 0.44, FLOOR - h + 23, 4, 8, "#126407");
    rect(x + w * 0.34, FLOOR - h + 47, 4, 10, "#126407");
  }
  function bush(x, y) {
    ctx.fillStyle = colors["pixel-dark"];
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < 3; i++) {
      ctx.lineTo(x + i * 34 + 3, y - 11);
      ctx.lineTo(x + i * 34 + 8, y - 24);
      ctx.lineTo(x + i * 34 + 18, y - 25);
      ctx.lineTo(x + i * 34 + 29, y - 12);
    }
    ctx.lineTo(x + 104, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.bush;
    ctx.beginPath();
    ctx.moveTo(x + 3, y);
    for (let i = 0; i < 3; i++) {
      ctx.lineTo(x + i * 34 + 6, y - 10);
      ctx.lineTo(x + i * 34 + 10, y - 21);
      ctx.lineTo(x + i * 34 + 17, y - 22);
      ctx.lineTo(x + i * 34 + 27, y - 9);
    }
    ctx.lineTo(x + 101, y);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 3; i++) rect(x + 13 + i * 34, y - 16, 3, 3, "#438c00");
  }
  function drawBrick(x, y, stone = false) {
    rect(x, y, 32, 32, colors["pixel-dark"]);
    rect(x + 1, y + 1, 30, 30, stone ? "#486174" : colors.ground);
    rect(x + 2, y + 2, 28, 2, colors["market-muted"]);
    rect(x + 3, y + 5, 26, 24, colors.terminal);
    if (y >= FLOOR) {
      rect(x + 3, y + 5, 26, 1, colors.grid);
      const heights = [7, 14, 10, 18];
      for (let i = 0; i < 4; i++)
        rect(
          x + 5 + i * 6,
          y + 26 - heights[(i + Math.round(x / 32)) % 4],
          3,
          heights[(i + Math.round(x / 32)) % 4],
          i % 3 === 0 ? colors.down : colors.up,
        );
    } else {
      rect(x + 8, y + 10, 2, 15, colors.up);
      rect(x + 6, y + 14, 6, 7, colors.up);
      rect(x + 19, y + 7, 2, 17, colors.down);
      rect(x + 17, y + 11, 6, 8, colors.down);
      if (stone) rect(x + 3, y + 27, 26, 2, colors["market-light"]);
    }
  }
  function drawPipe(b) {
    const x = b.x,
      y = b.y,
      up = Math.round(x / TILE) % 2 === 1,
      c = up ? colors.up : colors.down;
    rect(x + 29, y - 20, 5, 20, c);
    rect(x, y, 64, b.h, colors["pixel-dark"]);
    rect(x + 2, y + 2, 60, b.h - 4, c);
    rect(x + 5, y + 5, 5, b.h - 10, up ? "#aaffd5" : "#ffd0db");
    rect(x + 56, y + 5, 5, b.h - 10, up ? "#168361" : "#a5425b");
    rect(x + 12, y + 8, 39, 2, up ? "#1d9d75" : "#c54f6e");
    pixelText(up ? "BULL" : "BEAR", x + 12, y + 19, 2, colors["pixel-dark"]);
    if (b.h > 70) {
      rect(x + 18, y + 48, 3, 16, colors["pixel-dark"]);
      rect(x + 26, y + 40, 3, 24, colors["pixel-dark"]);
      rect(x + 34, y + 33, 3, 31, colors["pixel-dark"]);
      rect(x + 42, y + 26, 3, 38, colors["pixel-dark"]);
    }
  }
  function drawCoin(x, y, phase = 0) {
    const f = Math.abs(Math.sin(tick * 0.1 + phase)),
      w = 4 + Math.round(f * 10);
    rect(x + (16 - w) / 2, y, w, 22, "#b18432");
    rect(x + (16 - w) / 2, y + 2, w - 2, 18, colors.gold);
    if (w > 10) {
      rect(x + 5, y + 4, 6, 2, "#93681e");
      rect(x + 4, y + 6, 2, 4, "#93681e");
      rect(x + 5, y + 10, 6, 2, "#93681e");
      rect(x + 10, y + 12, 2, 4, "#93681e");
      rect(x + 4, y + 16, 7, 2, "#93681e");
      rect(x + 7, y + 3, 2, 16, "#93681e");
    }
  }
  function castle(x) {
    rect(x, FLOOR - 100, 112, 100, "#713518");
    for (let yy = FLOOR - 100; yy < FLOOR; yy += 16)
      for (let xx = 0; xx < 112; xx += 32) {
        rect(x + xx + (yy % 32 ? 0 : 16), yy, 30, 14, "#c8713e");
        rect(x + xx + (yy % 32 ? 0 : 16), yy, 29, 2, "#f4a16a");
      }
    rect(x - 2, FLOOR - 102, 118, 5, "#f1a367");
    for (let i = 0; i < 4; i++)
      rect(x + i * 30, FLOOR - 118, 20, 18, "#c8713e");
    rect(x + 35, FLOOR - 50, 40, 50, "#251b16");
    rect(x + 41, FLOOR - 57, 28, 10, "#251b16");
    rect(x + 16, FLOOR - 83, 12, 19, "#251b16");
    rect(x + 84, FLOOR - 83, 12, 19, "#251b16");
  }
  function drawMarketBackground() {
    for (let x = -Math.round(camera * 0.12) % 48; x < W; x += 48)
      rect(x, 68, 1, FLOOR - 68, colors.grid);
    for (let y = 96; y < FLOOR; y += 40) rect(0, y, W, 1, colors.grid);
    // Decorative, invented market path: no financial data or real quotes.
    const path = [282, 267, 279, 245, 257, 220, 238, 194, 213, 180, 198, 157];
    ctx.strokeStyle = colors.chart;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = -1; i < 20; i++) {
      const x = i * 64 - ((camera * 0.16) % 64),
        y = path[(i + 12) % 12];
      if (i === -1) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let i = -1; i < 15; i++) {
      const x = i * 96 - (Math.round(camera * 0.24) % 96),
        h = 52 + (((i + 24) * 37) % 83);
      rect(x, FLOOR - h, 57, h, colors.terminal);
      rect(x + 25, FLOOR - h - 15, 5, 15, colors["market-muted"]);
      for (let yy = FLOOR - h + 12; yy < FLOOR - 10; yy += 15)
        for (let xx = 9; xx < 50; xx += 13)
          if ((yy + xx + i) % 3) rect(x + xx, yy, 5, 6, colors.grid);
    }
    for (let i = 0; i < 3; i++) {
      const x = i * 310 + 85 - ((camera * 0.09) % 310),
        y = 125 + (i % 2) * 33;
      rect(x, y, 100, 25, colors["pixel-dark"]);
      rect(x + 1, y + 1, 98, 23, colors.terminal);
      pixelText(["BULL", "ALPHA", "DIV"][i], x + 12, y + 8, 2, colors.cloud);
      rect(x + 81, y + 6, 3, 12, colors.up);
      rect(x + 76, y + 10, 13, 3, colors.up);
    }
  }
  function drawExchange(x) {
    const y = FLOOR - 116;
    rect(x - 5, y + 17, 122, 99, colors["pixel-dark"]);
    rect(x, y + 20, 112, 96, colors["market-light"]);
    rect(x - 7, y + 15, 126, 8, colors.cloud);
    ctx.fillStyle = colors.cloud;
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 15);
    ctx.lineTo(x + 56, y - 20);
    ctx.lineTo(x + 120, y + 15);
    ctx.closePath();
    ctx.fill();
    pixelText("IPO", x + 37, y - 2, 3, colors.terminal);
    for (let i = 0; i < 4; i++) {
      rect(x + 8 + i * 27, y + 32, 15, 65, colors.cloud);
      rect(x + 10 + i * 27, y + 34, 3, 60, "#f1fff5");
      rect(x + 18 + i * 27, y + 34, 3, 60, colors["market-muted"]);
    }
    rect(x + 38, y + 58, 37, 58, colors["pixel-dark"]);
    rect(x - 5, FLOOR - 8, 122, 8, colors.cloud);
    rect(x + 2, y + 22, 108, 7, colors.terminal);
  }
  function drawBell(x, y, ring = false) {
    const sway = ring ? Math.sin(tick * 0.35) * 3 : 0;
    rect(x + 12 + sway, y, 8, 6, colors.gold);
    rect(x + 6 + sway, y + 6, 20, 18, "#f2b643");
    rect(x + 3 + sway, y + 17, 26, 7, colors.gold);
    rect(x + 13 + sway, y + 24, 6, 5, colors.gold);
    rect(x + 9 + sway, y + 7, 4, 13, "#fff0af");
    if (ring) {
      rect(x - 5, y + 5, 3, 12, colors.gold);
      rect(x + 35, y + 5, 3, 12, colors.gold);
    }
  }
  function drawWorld() {
    ctx.fillStyle = colors.sky;
    ctx.fillRect(0, 0, W, H);
    drawMarketBackground();
    ctx.save();
    ctx.translate(-Math.floor(camera), 0);
    for (const f of floors) {
      const from = Math.max(f.x, Math.floor(camera / TILE) * TILE),
        to = Math.min(f.x + f.w, camera + W + TILE);
      for (let x = from; x < to; x += TILE) {
        drawBrick(x, FLOOR);
        drawBrick(x, FLOOR + 32);
      }
    }
    for (const b of blocks) {
      if (b.broken || b.x + b.w < camera - 32 || b.x > camera + W + 32)
        continue;
      if (b.type === "pipe") {
        drawPipe(b);
        continue;
      }
      const y = b.y - Math.sin((b.bump / 10) * Math.PI) * 7;
      if (b.type === "question") {
        rect(b.x, y, 32, 32, colors["pixel-dark"]);
        rect(b.x + 2, y + 2, 28, 28, b.used ? colors.ground : colors.gold);
        rect(
          b.x + 3,
          y + 3,
          26,
          3,
          b.used ? colors["market-muted"] : "#fff0bf",
        );
        rect(b.x + 6, y + 8, 20, 15, b.used ? colors.terminal : "#fff9dc");
        rect(b.x + 8, y + 10, 7, 5, b.used ? colors.ground : colors.up);
        rect(b.x + 17, y + 10, 7, 2, colors["market-muted"]);
        rect(b.x + 17, y + 14, 7, 2, colors["market-muted"]);
        rect(b.x + 8, y + 18, 16, 2, colors["market-muted"]);
        if (!b.used && Math.floor(tick / 25) % 2 === 0)
          rect(b.x + 23, y + 4, 4, 4, colors.down);
      } else drawBrick(b.x, y, b.type === "stone");
    }
    for (const c of coins)
      if (!c.taken && c.x > camera - 32 && c.x < camera + W + 32)
        drawCoin(c.x, c.y, c.x * 0.01);
    rect(3388, 288, 4, 80, "#446b28");
    rect(3388, 282, 7, 7, "#fff9d9");
    rect(3392, 290, 30, 18, checkpoint > 112 ? "#ffcf38" : "#f1f3c4");
    rect(GOAL + 9, 118, 5, FLOOR - 118, colors["market-light"]);
    rect(GOAL - 19, 116, 57, 6, colors["market-light"]);
    const flagY =
      mode === "winning" || mode === "won"
        ? Math.min(FLOOR - 100, 132 + winTicks * 1.2)
        : 132;
    drawBell(GOAL - 4, flagY, mode === "winning" || mode === "won");
    rect(GOAL - 18, FLOOR - 66, 60, 24, colors.terminal);
    pixelText("BELL", GOAL - 10, FLOOR - 58, 2, colors.gold);
    drawBrick(GOAL, FLOOR - 32, true);
    drawExchange(6380);
    for (const i of items) if (i.alive) sprite(mushroom, i.x - 2, i.y, 2);
    for (const e of enemies) {
      if (e.x < camera - 40 || e.x > camera + W + 40) continue;
      if (e.alive) {
        const flip = Math.sin(tick * 0.12) > 0;
        sprite(goomba, e.x - 2, e.y, 2, flip);
        if (flip) {
          rect(e.x, e.y + 26, 9, 3, "#151c16");
          rect(e.x + 20, e.y + 24, 8, 3, "#151c16");
        }
      } else if (e.squash > 0) {
        ctx.save();
        ctx.translate(e.x - 2, e.y + 20);
        ctx.scale(1, 0.28);
        sprite(goomba, 0, 0, 2);
        ctx.restore();
      }
    }
    if (player && (player.inv <= 0 || Math.floor(tick / 5) % 2 === 0)) {
      const p = player;
      ctx.save();
      if (!p.ground && mode === "playing") {
        sprite(mario, p.x - 4, p.y, 2, p.face < 0, p.h / 32);
        rect(p.x + (p.face > 0 ? 21 : 0), p.y + p.h - 7, 9, 5, "#763c17");
      } else {
        sprite(mario, p.x - 4, p.y, 2, p.face < 0, p.h / 32);
        if (Math.abs(p.vx) > 0.2 || mode === "winning") {
          const frame = Math.floor(p.walk) % 3;
          if (frame !== 0) {
            rect(p.x - 1, p.y + p.h - 8, 30, 8, colors.sky);
            const shift = frame === 1 ? 3 : -3;
            rect(p.x + 2 + shift, p.y + p.h - 8, 9, 5, "#764018");
            rect(p.x + 15 - shift, p.y + p.h - 8, 9, 5, "#764018");
            rect(p.x + shift, p.y + p.h - 3, 11, 3, "#171d13");
            rect(p.x + 15 - shift, p.y + p.h - 3, 11, 3, "#171d13");
          }
        }
      }
      ctx.restore();
    }
    for (const p of particles) rect(p.x, p.y, p.size, p.size, p.color);
    for (const item of texts) {
      const captions = {
        "DOUBLE!": "二段跳！",
        CHECKPOINT: "补给站",
        "1 UP": "生命 +1",
      };
      const zh = captions[item.text];
      if (zh) hudLabel(zh, item.text, item.x, item.y, 2, "#fffbd0");
      else pixelText(item.text, item.x, item.y, 2, "#fffbd0");
    }
    ctx.restore();
    drawHUD();
  }
  function hudLabel(zh, en, x, y, scale = 3, color = colors.hud) {
    if (getLanguage() === "en") {
      pixelText(en, x, y, scale, color);
      return;
    }
    ctx.save();
    ctx.font = `600 ${scale * 5}px 'PingFang SC', 'Microsoft YaHei', sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillStyle = color;
    ctx.fillText(zh, x, y - 1);
    ctx.restore();
  }
  function drawHUD() {
    rect(0, 0, W, 67, colors["pixel-dark"]);
    rect(0, 66, W, 1, colors.grid);
    hudLabel("积分", "ALPHA", 34, 18, 3, colors.up);
    pixelText(String(score).padStart(6, "0"), 34, 40, 3);
    hudLabel("筹码", "CHIPS", 236, 18, 3, colors.gold);
    drawCoin(239, 37);
    pixelText("X" + String(collected).padStart(2, "0"), 261, 40, 3);
    hudLabel("关卡", "ROUND", 423, 18, 3, colors.cloud);
    pixelText("1-1", 442, 40, 3);
    hudLabel("倒计时", "CLOSE", 614, 18, 3, colors.down);
    pixelText(
      String(Math.max(0, Math.ceil(time))).padStart(3, "0"),
      628,
      40,
      3,
    );
    hudLabel("生命 ×" + lives, "LIVES X" + lives, 34, 83, 2);
    if (player && player.power)
      hudLabel("利好护盾", "BULLISH", 34, 101, 2, colors.up);
    // A quiet progress rail, kept below the HUD.
    rect(424, 83, 106, 2, "#ffffff40");
    rect(
      424,
      83,
      Math.min(106, Math.max(2, (player.x / GOAL) * 106)),
      2,
      "#fff8cf",
    );
    rect(528, 78, 2, 7, "#fff8cf");
    rect(530, 78, 4, 3, "#fff8cf");
  }
  $("play").addEventListener("click", activate);
  $("pause").addEventListener("click", togglePause);
  $("restart").addEventListener("click", () => {
    startGame();
  });
  $("sound").addEventListener("click", () => {
    soundOn = !soundOn;
    $("sound").textContent = t("音效 " + (soundOn ? "开" : "关"));
    $("sound").setAttribute(
      "aria-label",
      t(soundOn ? "关闭游戏音效" : "开启游戏音效"),
    );
    $("sound").title = t(soundOn ? "关闭游戏音效" : "开启游戏音效");
    if (soundOn) tone(660, 0.08);
  });
  let fullscreenBusy = false,
    expandedScroll = 0;
  function nativeFullscreen() {
    return document.fullscreenElement || document.webkitFullscreenElement;
  }
  function isFullscreen() {
    return Boolean(
      nativeFullscreen() || $("stage").classList.contains("is-expanded"),
    );
  }
  function renderFullscreenLabels() {
    const active = isFullscreen();
    $("fullscreen").textContent = t(active ? "退出全屏 ⛶" : "全屏 ⛶");
    $("stage-fullscreen").textContent = t("退出全屏 ⛶");
    $("fullscreen").title = t(active ? "退出全屏 (F / Esc)" : "全屏游戏 (F)");
  }
  function syncFullscreen() {
    const active = isFullscreen();
    $("stage").classList.toggle("fullscreen-active", active);
    document.body.classList.toggle("game-expanded", active);
    $("fullscreen").textContent = t(active ? "退出全屏 ⛶" : "全屏 ⛶");
    $("fullscreen").setAttribute("aria-pressed", String(active));
    $("fullscreen").title = t(active ? "退出全屏 (F / Esc)" : "全屏游戏 (F)");
    canvas.focus({ preventScroll: true });
    clearInputs();
  }
  function expandInPage() {
    expandedScroll = window.scrollY || 0;
    $("stage").classList.add("is-expanded");
    syncFullscreen();
  }
  function collapseInPage() {
    $("stage").classList.remove("is-expanded");
    syncFullscreen();
    window.scrollTo(0, expandedScroll);
  }
  async function toggleFullscreen() {
    if (fullscreenBusy) return;
    fullscreenBusy = true;
    try {
      if (nativeFullscreen()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
        syncFullscreen();
      } else if ($("stage").classList.contains("is-expanded")) collapseInPage();
      else {
        const request =
          $("stage").requestFullscreen || $("stage").webkitRequestFullscreen;
        if (request) {
          try {
            await request.call($("stage"));
            if (nativeFullscreen()) syncFullscreen();
            else expandInPage();
          } catch (_) {
            expandInPage();
          }
        } else expandInPage();
      }
    } finally {
      fullscreenBusy = false;
    }
  }
  $("fullscreen").addEventListener("click", toggleFullscreen);
  $("stage-fullscreen").addEventListener("click", toggleFullscreen);
  $("stage-pause").addEventListener("click", togglePause);
  document.addEventListener("fullscreenchange", syncFullscreen);
  document.addEventListener("webkitfullscreenchange", syncFullscreen);
  const keyMap = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    Space: "jump",
    ArrowUp: "jump",
    KeyW: "jump",
    KeyZ: "jump",
    ShiftLeft: "run",
    ShiftRight: "run",
    KeyX: "run",
  };
  window.addEventListener("keydown", (e) => {
    if (
      e.target instanceof Element &&
      e.target.closest("a[href], [data-language-switch]")
    )
      return;
    if (keyMap[e.code]) {
      e.preventDefault();
      if (mode === "playing") setInput(e.code, keyMap[e.code], true);
    }
    if (e.repeat) return;
    if (e.code === "Enter") {
      e.preventDefault();
      if (["ready", "paused", "dead", "gameover", "won"].includes(mode))
        activate();
    }
    if (e.code === "KeyF") {
      e.preventDefault();
      void toggleFullscreen();
    }
    if (e.code === "Escape") {
      if (isFullscreen()) {
        e.preventDefault();
        void toggleFullscreen();
      } else {
        e.preventDefault();
        togglePause();
      }
    }
    if (e.code === "KeyP") {
      e.preventDefault();
      togglePause();
    }
    if (e.code === "KeyR") {
      e.preventDefault();
      startGame();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (keyMap[e.code]) {
      e.preventDefault();
      setInput(e.code, keyMap[e.code], false);
    }
  });
  for (const button of document.querySelectorAll("[data-key]")) {
    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (mode !== "playing") return;
      button.setPointerCapture(e.pointerId);
      setInput("pointer" + e.pointerId, button.dataset.key, true);
      button.classList.add("held");
    });
    const release = (e) => {
      setInput("pointer" + e.pointerId, button.dataset.key, false);
      button.classList.remove("held");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  window.addEventListener("blur", () => {
    clearInputs();
    if (mode === "playing") togglePause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearInputs();
      if (mode === "playing") togglePause();
    }
  });
  let last = 0,
    accum = 0;
  function frame(now) {
    if (!last) last = now;
    accum += Math.min(0.05, (now - last) / 1000);
    last = now;
    while (accum >= 1 / 60) {
      if (mode === "playing" || mode === "winning") update();
      accum -= 1 / 60;
    }
    drawWorld();
    requestAnimationFrame(frame);
  }
  onLanguageChange(() => {
    updateBest();
    refreshStatus();
    $("sound").textContent = t("音效 " + (soundOn ? "开" : "关"));
    $("sound").setAttribute(
      "aria-label",
      t(soundOn ? "关闭游戏音效" : "开启游戏音效"),
    );
    $("sound").title = t(soundOn ? "关闭游戏音效" : "开启游戏音效");
    renderFullscreenLabels();
    if (mode !== "playing" && mode !== "winning") showOverlay(...overlaySource);
    drawWorld();
    if (mode === "playing") canvas.focus({ preventScroll: true });
  });
  buildLevel();
  player = makePlayer(112);
  refreshStatus();
  expandInPage();
  showOverlay(...overlaySource);
  requestAnimationFrame(frame);
})();
