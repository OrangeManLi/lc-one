import { cp, mkdtemp, rename, rm } from "node:fs/promises";
import path from "node:path";

// Stage a complete site before replacing the previous output, so removed root
// game files cannot remain deployed after moving the games into subdirectories.
const staging = await mkdtemp(path.resolve(".site-build-"));
const sources = [
  "index.html",
  "home.css",
  "favicon.svg",
  "_headers",
  "assets",
  "games",
];
try {
  await Promise.all(
    sources.map((source) =>
      cp(source, path.join(staging, source), { recursive: true }),
    ),
  );
  await rm("dist", { recursive: true, force: true });
  await rename(staging, "dist");
  console.log("Built game lobby and both games in dist/.");
} finally {
  await rm(staging, { recursive: true, force: true });
}
