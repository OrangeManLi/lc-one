import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const pages = [
  "index.html",
  "games/trader-quest/index.html",
  "games/bull-run/index.html",
];

test("the lobby offers both independent game entry points", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const games = [...html.matchAll(/href="(\/games\/[^"#]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(games.sort(), ["/games/bull-run/", "/games/trader-quest/"]);
  for (const game of games) await access(path.join(root, game, "index.html"));
});

test("every local link and asset resolves from all three pages", async () => {
  for (const page of pages) {
    const html = await readFile(path.join(root, page), "utf8");
    for (const [, ref] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(#|https?:|data:)/.test(ref)) continue;
      let target = ref.startsWith("/")
        ? path.join(root, ref)
        : path.resolve(root, path.dirname(page), ref);
      if ((await stat(target)).isDirectory())
        target = path.join(target, "index.html");
      await access(target);
    }
  }
});

test("each game offers a visible lobby link, including Bull Run's expanded stage", async () => {
  for (const page of pages.slice(1)) {
    const html = await readFile(path.join(root, page), "utf8");
    assert.match(html, /href="\/"[^>]*>\s*游戏大厅/);
  }
  const bull = await readFile(
    path.join(root, "games/bull-run/index.html"),
    "utf8",
  );
  assert.match(
    bull,
    /class="stage-tools"[^>]*>[\s\S]*?<a[^>]+href="\/"[^>]*>游戏大厅/,
  );
});
