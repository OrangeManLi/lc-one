import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import current from "../shared/ads-config.mjs";
import { adsTxt, validateAdsConfig, mountHomepageAd } from "../shared/ads.mjs";

const configured = {
  enabled: true,
  publisherId: "ca-pub-1234567890123456",
  homepageSlotId: "1234567890",
};

function browser(hostname = "lc-one.cn") {
  const elements = [];
  const content = { append: (element) => elements.push(element) };
  const container = {
    hidden: true,
    dataset: {},
    querySelector: () => content,
  };
  const scripts = [];
  const document = {
    querySelector: () => container,
    createElement: (tag) => ({ tag, style: {}, dataset: {} }),
    head: { append: (script) => scripts.push(script) },
  };
  const window = { location: { hostname } };
  return { document, window, container, elements, scripts };
}

test("unconfigured ads make no external requests and leave no blank slot", () => {
  const env = browser();
  validateAdsConfig(current);
  assert.equal(mountHomepageAd({ ...env, config: { enabled: false, publisherId: "", homepageSlotId: "" } }), false);
  assert.equal(env.container.hidden, true);
  assert.equal(env.scripts.length, 0);
  assert.equal(env.elements.length, 0);
});

test("invalid and incomplete ad identifiers fail before any SDK loads", () => {
  assert.throws(() => validateAdsConfig({ ...configured, publisherId: "bad" }));
  assert.throws(() => validateAdsConfig({ ...configured, homepageSlotId: "" }));
  assert.throws(() => validateAdsConfig({ ...configured, homepageSlotId: "<script>" }));
  assert.throws(() => validateAdsConfig({ ...configured, enabled: "true" }));
  assert.equal(adsTxt({ enabled: false, publisherId: "", homepageSlotId: "" }), "");
  assert.equal(adsTxt(configured), "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
});

test("localhost and preview deployments never request live ads", () => {
  for (const host of ["localhost", "127.0.0.1", "lc-one.pages.dev", "lc-one.cn.example.com"]) {
    const env = browser(host);
    assert.equal(mountHomepageAd({ ...env, config: configured }), false);
    assert.equal(env.scripts.length, 0);
  }
});

test("one homepage slot loads one responsive ad without duplicate requests", () => {
  const env = browser();
  assert.equal(mountHomepageAd({ ...env, config: configured }), true);
  assert.equal(env.container.hidden, false);
  assert.equal(env.elements.length, 1);
  assert.deepEqual(env.elements[0].dataset, {
    adClient: configured.publisherId,
    adSlot: configured.homepageSlotId,
    adFormat: "horizontal",
    fullWidthResponsive: "true",
  });
  assert.equal(env.scripts[0].async, true);
  assert.match(env.scripts[0].src, /^https:\/\/pagead2\.googlesyndication\.com\//);
  env.scripts[0].onload();
  assert.deepEqual(env.window.adsbygoogle, [{}]);
  assert.equal(mountHomepageAd({ ...env, config: configured }), false);
  assert.equal(env.scripts.length, 1);
});

test("blocked SDK, rejected rendering and unfilled ads collapse the container", () => {
  const blocked = browser();
  mountHomepageAd({ ...blocked, config: configured });
  blocked.scripts[0].onerror();
  assert.equal(blocked.container.hidden, true);
  const rejected = browser();
  rejected.window.adsbygoogle = { push() { throw new Error("blocked"); } };
  mountHomepageAd({ ...rejected, config: configured });
  rejected.scripts[0].onload();
  assert.equal(rejected.container.hidden, true);
  const unfilled = browser();
  let notify, disconnected = false;
  unfilled.window.MutationObserver = class {
    constructor(callback) { notify = callback; }
    observe() {}
    disconnect() { disconnected = true; }
  };
  mountHomepageAd({ ...unfilled, config: configured });
  unfilled.elements[0].dataset.adStatus = "unfilled";
  notify();
  assert.equal(unfilled.container.hidden, true);
  assert.equal(disconnected, true);
});

test("ad loader is limited to the lobby and its slot follows both game cards", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.indexOf("data-home-ad") > html.indexOf("</ul>"));
  assert.equal((html.match(/data-home-ad/g) || []).length, 1);
  for (const game of ["trader-quest", "bull-run"]) {
    const page = await readFile(new URL(`../games/${game}/index.html`, import.meta.url), "utf8");
    assert.doesNotMatch(page, /home-ad\.mjs|adsbygoogle/);
  }
});
