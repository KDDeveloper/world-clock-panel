// Service worker. It sleeps when idle, so keep no state in memory here --
// everything below recomputes from scratch on each wake.
//
// Nothing at the top level is allowed to throw: an exception during evaluation
// fails the whole worker registration, not just the feature that broke.
//
// The toolbar icon stays as the artwork from the manifest. The time rides in
// Chrome's native badge, which renders far more legibly at 16px than anything
// we could paint into the icon bitmap ourselves.

// The badge matches the panel surface: light theme -> light badge, dark theme
// -> dark badge. Mirrors the --bg / --t1 tokens in sidepanel.css.
const BADGE = {
  light: { bg: "#ffffff", fg: "#0f172a" },
  dark: { bg: "#0f172a", fg: "#f1f5f9" },
};
const ALARM = "utc-tick";

function utcParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "--";
  return { hh: get("hour"), mm: get("minute") };
}

async function updateBadge() {
  try {
    const { hh, mm } = utcParts();

    // Written by the panel, which resolves "system" via matchMedia.
    const { resolvedTheme } = await chrome.storage.local.get({ resolvedTheme: "light" });
    const colours = BADGE[resolvedTheme] ?? BADGE.light;

    await chrome.action.setBadgeText({ text: `${hh}:${mm}` });
    await chrome.action.setBadgeBackgroundColor({ color: colours.bg });

    // Chrome 110+. Older builds pick their own contrasting colour.
    if (chrome.action.setBadgeTextColor) {
      await chrome.action.setBadgeTextColor({ color: colours.fg });
    }

    await chrome.action.setTitle({ title: `${hh}:${mm} UTC - open World Clock` });
  } catch (err) {
    console.error("badge update failed:", err);
  }
}

// An action with a popup set always opens the popup, so the two are mutually
// exclusive: setting one means clearing the other.
async function applyMode(mode) {
  try {
    const asPopup = mode === "popup";

    await chrome.action.setPopup({ popup: asPopup ? "sidepanel.html?mode=popup" : "" });

    if (chrome.sidePanel?.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: !asPopup });
    }
  } catch (err) {
    console.error("mode switch failed:", err);
  }
}

async function loadMode() {
  const { mode } = await chrome.storage.local.get({ mode: "panel" });
  return applyMode(mode);
}

function setup() {
  loadMode();

  // Fire on the next whole minute, then every minute after.
  if (chrome.alarms?.create) {
    chrome.alarms.create(ALARM, {
      when: Math.ceil(Date.now() / 60000) * 60000,
      periodInMinutes: 1,
    });
  }

  updateBadge();
}

try {
  chrome.runtime.onInstalled.addListener(setup);
  chrome.runtime.onStartup.addListener(setup);

  if (chrome.alarms?.onAlarm) {
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === ALARM) updateBadge();
    });
  }

  // Recolour the moment the theme changes, without waiting for the next minute.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.resolvedTheme) updateBadge();
    if (changes.mode) applyMode(changes.mode.newValue);
  });

  // Any wake at all -- a click, a message, an alarm -- refreshes immediately,
  // so the badge is never stale while the worker is alive.
  updateBadge();
  loadMode();
} catch (err) {
  console.error("world clock worker boot failed:", err);
}
