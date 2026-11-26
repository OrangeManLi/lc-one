import { mkdir, copyFile } from "node:fs/promises";
const files = [
  "index.html",
  "styles.css",
  "app.mjs",
  "game.mjs",
  "favicon.svg",
  "mascot.svg",
  "_headers",
];
await mkdir("dist", { recursive: true });
await Promise.all(files.map((file) => copyFile(file, `dist/${file}`)));
console.log(`Built ${files.length} static files in dist/.`);
