export function validateAdsConfig(config) {
  if (typeof config.enabled !== "boolean")
    throw new Error("AdSense enabled must be true or false.");
  if (config.publisherId && !/^ca-pub-\d{16}$/.test(config.publisherId))
    throw new Error("AdSense publisherId must be ca-pub- followed by 16 digits.");
  if (config.homepageSlotId && !/^\d+$/.test(config.homepageSlotId))
    throw new Error("AdSense homepageSlotId must contain only digits.");
  if (config.enabled && (!config.publisherId || !config.homepageSlotId))
    throw new Error("Enabling ads requires both publisherId and homepageSlotId.");
  return config;
}

export function adsTxt(config) {
  validateAdsConfig(config);
  return config.publisherId
    ? `google.com, ${config.publisherId.slice(3)}, DIRECT, f08c47fec0942fa0\n`
    : "";
}

// Optional manual homepage ad; independent of the static Auto ads tags.
export function mountHomepageAd({ config, document, window }) {
  validateAdsConfig(config);
  if (!config.enabled || window.location.hostname !== "lc-one.cn") return false;
  const container = document.querySelector("[data-home-ad]");
  if (!container || container.dataset.adMounted) return false;
  container.dataset.adMounted = "true";
  const unit = document.createElement("ins");
  unit.className = "adsbygoogle";
  unit.style.display = "block";
  unit.dataset.adClient = config.publisherId;
  unit.dataset.adSlot = config.homepageSlotId;
  unit.dataset.adFormat = "horizontal";
  unit.dataset.fullWidthResponsive = "true";
  container.querySelector("[data-ad-content]").append(unit);
  container.hidden = false;

  const hide = () => { container.hidden = true; };
  if (window.MutationObserver) {
    const observer = new window.MutationObserver(() => {
      if (unit.dataset.adStatus === "unfilled") {
        hide();
        observer.disconnect();
      }
    });
    observer.observe(unit, { attributes: true, attributeFilter: ["data-ad-status"] });
  }
  const requestAd = () => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      hide();
    }
  };
  const existing = document.querySelector('script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
  if (existing) {
    existing.addEventListener("error", hide, { once: true });
    // The standard AdSense queue works before or after the async tag loads.
    requestAd();
    return true;
  }
  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.publisherId}`;
  script.onerror = hide;
  script.onload = requestAd;
  document.head.append(script);
  return true;
}
