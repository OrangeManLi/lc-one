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

function browser(hostname = "lc-one.cn", existingSdk = null) {
  const elements = [];
  const content = { append: (element) => elements.push(element) };
  const container = {
    hidden: true,
    dataset: {},
    querySelector: () => content,
  };
  const scripts = [];
  const document = {
    querySelector: (selector) => selector === "[data-home-ad]" ? container : existingSdk,
    createElement: (tag) => ({ tag, style: {}, dataset: {} }),
    head: { append: (script) => scripts.push(script) },
  };
  const window = { location: { hostname } };
  return { document, window, container, elements, scripts };
}

test("an unconfigured manual slot makes no additional requests and leaves no blank slot", () => {
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

test("the manual loader never requests live ads on localhost or preview hosts", () => {
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

test("the manual slot reuses the Auto ads SDK instead of loading it twice", () => {
  const sdk = { addEventListener() {} };
  const env = browser("lc-one.cn", sdk);
  assert.equal(mountHomepageAd({ ...env, config: configured }), true);
  assert.equal(env.scripts.length, 0);
  assert.deepEqual(env.window.adsbygoogle, [{}]);
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

test("the manual slot follows both cards and Auto ads use one async tag per page", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.indexOf("data-home-ad") > html.indexOf("</ul>"));
  assert.equal((html.match(/data-home-ad/g) || []).length, 1);
  for (const file of ["index.html", "games/trader-quest/index.html", "games/bull-run/index.html"]) {
    const page = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    const tags = [...page.matchAll(/<script\b[^>]+adsbygoogle\.js[^>]*>/g)];
    assert.equal(tags.length, 1);
    assert.match(tags[0][0], /\basync\b/);
    assert.match(tags[0][0], new RegExp(`client=${current.publisherId}`));
    assert.match(tags[0][0], /crossorigin="anonymous"/);
    assert.ok(page.indexOf(tags[0][0]) < page.indexOf("</head>"));
    if (file !== "index.html") assert.doesNotMatch(page, /home-ad\.mjs/);
  }
});
