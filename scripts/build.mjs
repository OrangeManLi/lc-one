import { cp, mkdtemp, rename, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import adsConfig from "../shared/ads-config.mjs";
import { adsTxt, validateAdsConfig } from "../shared/ads.mjs";

validateAdsConfig(adsConfig);

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
  "shared",
  "privacy",
];
try {
  await Promise.all(
    sources.map((source) =>
      cp(source, path.join(staging, source), { recursive: true }),
    ),
  );
  const homepage = path.join(staging, "index.html");
  if (adsConfig.publisherId) {
    const html = await readFile(homepage, "utf8");
    await writeFile(homepage, html.replace(
      "<!-- adsense-site-verification -->",
      `<meta name="google-adsense-account" content="${adsConfig.publisherId}" />`,
    ));
  }
  const sellers = adsTxt(adsConfig);
  if (sellers) await writeFile(path.join(staging, "ads.txt"), sellers);
  await rm("dist", { recursive: true, force: true });
  await rename(staging, "dist");
  console.log("Built game lobby and both games in dist/.");
} finally {
  await rm(staging, { recursive: true, force: true });
}
