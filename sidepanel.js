const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const ALL_ZONES = Intl.supportedValuesOf("timeZone").filter((z) => z !== "UTC");
const CANONICAL = new Map(ALL_ZONES.map((z) => [z.toLowerCase(), z]));
const HAYSTACK = new Map(ALL_ZONES.map((z) => [z, z.toLowerCase().replace(/[_/]/g, " ")]));
const MAX_RESULTS = 80;

// IANA names a zone after one city, so the others in it are unsearchable.
// Each group lists candidate zone ids (the first one this browser knows wins)
// and the extra terms that should find it.
const ALIAS_GROUPS = [
  [["Asia/Calcutta", "Asia/Kolkata"],
   "india ist mumbai bombay delhi new delhi bengaluru bangalore chennai madras hyderabad pune ahmedabad jaipur surat lucknow kochi cochin goa"],
  [["Asia/Karachi"], "pakistan karachi lahore islamabad rawalpindi pkt"],
  [["Asia/Dhaka"], "bangladesh dhaka chittagong"],
  [["Asia/Kathmandu", "Asia/Katmandu"], "nepal kathmandu katmandu"],
  [["Asia/Colombo"], "sri lanka colombo"],
  [["Asia/Shanghai"], "china beijing peking shenzhen guangzhou chengdu cst"],
  [["Asia/Hong_Kong"], "hong kong hk"],
  [["Asia/Tokyo"], "japan tokyo osaka kyoto yokohama jst"],
  [["Asia/Seoul"], "korea south korea seoul busan kst"],
  [["Asia/Singapore"], "singapore sgt"],
  [["Asia/Bangkok"], "thailand bangkok phuket"],
  [["Asia/Jakarta"], "indonesia jakarta bali"],
  [["Asia/Manila"], "philippines manila cebu"],
  [["Asia/Kuala_Lumpur"], "malaysia kuala lumpur"],
  [["Asia/Ho_Chi_Minh", "Asia/Saigon"], "vietnam saigon ho chi minh hanoi"],
  [["Asia/Dubai"], "uae dubai abu dhabi emirates gst"],
  [["Asia/Riyadh"], "saudi arabia riyadh jeddah mecca"],
  [["Asia/Jerusalem", "Asia/Tel_Aviv"], "israel jerusalem tel aviv"],
  [["Europe/London"], "uk england britain great britain london manchester birmingham liverpool leeds glasgow edinburgh cardiff belfast gmt bst"],
  [["Europe/Dublin"], "ireland dublin cork"],
  [["Europe/Paris"], "france paris lyon marseille nice cet"],
  [["Europe/Berlin"], "germany berlin munich munchen frankfurt hamburg cologne stuttgart"],
  [["Europe/Madrid"], "spain madrid barcelona valencia seville"],
  [["Europe/Rome"], "italy rome milan naples turin florence venice"],
  [["Europe/Amsterdam"], "netherlands holland amsterdam rotterdam the hague"],
  [["Europe/Brussels"], "belgium brussels antwerp"],
  [["Europe/Zurich"], "switzerland zurich geneva basel bern"],
  [["Europe/Vienna"], "austria vienna wien"],
  [["Europe/Stockholm"], "sweden stockholm gothenburg"],
  [["Europe/Oslo"], "norway oslo"],
  [["Europe/Copenhagen"], "denmark copenhagen"],
  [["Europe/Helsinki"], "finland helsinki"],
  [["Europe/Warsaw"], "poland warsaw krakow"],
  [["Europe/Prague"], "czech czechia prague"],
  [["Europe/Lisbon"], "portugal lisbon porto"],
  [["Europe/Athens"], "greece athens"],
  [["Europe/Moscow"], "russia moscow saint petersburg msk"],
  [["Europe/Istanbul"], "turkey turkiye istanbul ankara"],
  [["America/New_York"], "usa us east coast eastern new york nyc manhattan brooklyn boston washington dc philadelphia miami orlando atlanta detroit est edt"],
  [["America/Chicago"], "usa central chicago dallas houston austin san antonio minneapolis new orleans cst cdt"],
  [["America/Denver"], "usa mountain denver salt lake city albuquerque mst mdt"],
  [["America/Phoenix"], "arizona phoenix tucson"],
  [["America/Los_Angeles"], "usa west coast pacific los angeles la san francisco sf silicon valley san diego san jose seattle portland las vegas vegas pst pdt"],
  [["America/Anchorage"], "alaska anchorage"],
  [["Pacific/Honolulu"], "hawaii honolulu"],
  [["America/Toronto"], "canada toronto ottawa montreal quebec"],
  [["America/Vancouver"], "canada vancouver victoria"],
  [["America/Mexico_City"], "mexico mexico city guadalajara monterrey"],
  [["America/Sao_Paulo"], "brazil brasil sao paulo rio de janeiro brasilia"],
  [["America/Argentina/Buenos_Aires", "America/Buenos_Aires"], "argentina buenos aires"],
  [["America/Bogota"], "colombia bogota medellin"],
  [["America/Lima"], "peru lima"],
  [["America/Santiago"], "chile santiago"],
  [["Africa/Lagos"], "nigeria lagos abuja"],
  [["Africa/Cairo"], "egypt cairo"],
  [["Africa/Nairobi"], "kenya nairobi"],
  [["Africa/Johannesburg"], "south africa johannesburg joburg cape town durban pretoria"],
  [["Africa/Casablanca"], "morocco casablanca rabat"],
  [["Australia/Sydney"], "australia sydney canberra newcastle aest aedt"],
  [["Australia/Melbourne"], "australia melbourne"],
  [["Australia/Brisbane"], "australia brisbane gold coast"],
  [["Australia/Perth"], "australia perth"],
  [["Australia/Adelaide"], "australia adelaide"],
  [["Pacific/Auckland"], "new zealand nz auckland wellington christchurch"],
];

// zone -> extra search terms, keyed only by zone ids this browser actually has
const ALIASES = new Map();
for (const [ids, terms] of ALIAS_GROUPS) {
  for (const id of ids) {
    const zone = CANONICAL.get(id.toLowerCase());
    if (zone) {
      ALIASES.set(zone, terms);
      break;
    }
  }
}

const ICON = {
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  system:
    '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  light:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M8 3v18M8 3L4 7M8 3l4 4M16 21V3M16 21l-4-4M16 21l4-4"/></svg>',
  panel:
    '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16"/></svg>',
  popup:
    '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 9.5h16"/></svg>',
};

const MODES = ["panel", "popup"];

const MODE_TIP = {
  panel: "Opens in the side panel - click for a popup instead",
  popup: "Opens as a popup - click for the side panel instead",
};

// The service worker appends this when it points the action at a popup, so the
// same page can size itself correctly in either host.
const IS_POPUP = new URLSearchParams(location.search).get("mode") === "popup";
document.documentElement.dataset.mode = IS_POPUP ? "popup" : "panel";

const THEMES = ["system", "light", "dark"];
const DARK_QUERY = matchMedia("(prefers-color-scheme: dark)");

const THEME_TIP = {
  system: "Theme: following your system",
  light: "Theme: always light",
  dark: "Theme: always dark",
};

const el = {
  pinned: document.getElementById("pinned"),
  zones: document.getElementById("zones"),
  fmt: document.getElementById("fmt"),
  theme: document.getElementById("theme"),
  mode: document.getElementById("mode"),
  openAdd: document.getElementById("open-add"),
  openConvert: document.getElementById("open-convert"),
  closeConvert: document.getElementById("close-convert"),
  convNow: document.getElementById("conv-now"),
  closeAdd: document.getElementById("close-add"),
  search: document.getElementById("search"),
  results: document.getElementById("results"),
};

const state = { zones: [], hour12: false, theme: "system", mode: "panel" };
const rows = new Map(); // zone -> node refs

/* ---------- flags ---------- */

const ZONE_COUNTRY = new Map();
let FLAGS_RENDER = false;

// Windows ships no flag glyphs; it draws the two regional indicators as plain
// letters. A real flag is multi-coloured, the fallback is a single flat colour —
// so paint one and look for colour. Width heuristics give false positives here.
function detectFlagSupport() {
  const size = 24;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;

  ctx.font = "20px sans-serif";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000";
  ctx.fillText("\u{1F1EC}\u{1F1E7}", 0, 0); // GB: red / white / blue if real

  const { data } = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // transparent
    if (data[i] !== data[i + 1] || data[i + 1] !== data[i + 2]) return true;
  }
  return false;
}

// Reverse the region -> zones data Intl already carries.
function buildCountryMap() {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (const a of A) {
    for (const b of A) {
      const cc = a + b;
      let label;
      try {
        label = names.of(cc);
      } catch {
        continue;
      }
      if (!label || label === cc) continue; // not a real ISO region

      let zones = [];
      try {
        const loc = new Intl.Locale(`und-${cc}`);
        zones = (typeof loc.getTimeZones === "function" ? loc.getTimeZones() : loc.timeZones) || [];
      } catch {
        continue;
      }
      for (const zone of zones) if (!ZONE_COUNTRY.has(zone)) ZONE_COUNTRY.set(zone, cc);
    }
  }
}

function toFlagEmoji(cc) {
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

// The day/night signal survives as a tint behind the flag.
function paintFlag(node, zone, date) {
  const cc = ZONE_COUNTRY.get(zone);
  const phase = dayPhase(hourIn(date, zone));
  const asCode = !FLAGS_RENDER && zone !== "UTC" && !!cc;

  node.className = `flag flag--${phase}${asCode ? " flag--code" : ""}`;

  const glyph = zone === "UTC" ? "\u{1F310}" : cc ? (FLAGS_RENDER ? toFlagEmoji(cc) : cc) : "?";

  // The code badge needs its own element so the optical nudge lands on the glyphs.
  if (asCode) {
    const span = document.createElement("span");
    span.textContent = glyph;
    node.replaceChildren(span);
  } else {
    node.textContent = glyph;
  }
}

/* ---------- names ---------- */

function splitZone(zone) {
  const parts = zone.split("/");
  const city = parts.pop().replace(/_/g, " ");
  const region = parts.join(" / ").replace(/_/g, " ");
  return { city, region };
}

/* ---------- time ---------- */

function timeParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    ...(state.hour12 ? { hour12: true } : { hourCycle: "h23" }),
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  return { hm: `${get("hour")}:${get("minute")}`, s: get("second"), period: get("dayPeriod") };
}

function formatDate(date, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

// en-CA yields YYYY-MM-DD, which is what we want for copying.
function isoDate(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Copied values are always 24-hour, regardless of the display toggle.
function hms24(date, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

// ISO 8601: "Z" when the zone sits at UTC, otherwise an explicit ±HH:MM offset.
function isoTimestamp(date, timeZone) {
  const mins = offsetMinutes(date, timeZone);
  const abs = Math.abs(mins);
  const suffix =
    mins === 0
      ? "Z"
      : `${mins < 0 ? "-" : "+"}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(
          abs % 60
        ).padStart(2, "0")}`;
  return `${isoDate(date, timeZone)}T${hms24(date, timeZone)}${suffix}`;
}

function hourIn(date, timeZone) {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(date)
  );
}

function dayPhase(hour) {
  if (hour >= 7 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "dusk";
  return "night";
}

// DST-correct: asks Intl for the zone's actual offset at this instant.
function offsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

function offsetLabel(mins) {
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${mins < 0 ? "−" : "+"}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}

function deltaLabel(mins) {
  if (mins === 0) return "same as UTC";
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const chunks = [h ? `${h}h` : null, m ? `${m}m` : null].filter(Boolean);
  return `${chunks.join(" ")} ${mins < 0 ? "behind" : "ahead"}`;
}

/* ---------- cards ---------- */

// Pinned cards (local, UTC) have no remove button and may override their labels.
function makeCard(zone, { pinned = false, title, subtitle, variant } = {}) {
  const { city, region } = splitZone(zone);

  const card = document.createElement("article");
  card.className = variant ? `card card--${variant}` : "card";
  card.innerHTML = `
    <div class="card__head">
      <span class="flag"></span>
      <div class="names">
        <div class="city"></div>
        <div class="region"></div>
      </div>
      <span class="badge"></span>
      ${pinned ? "" : `<button class="remove" type="button" aria-label="Remove">${ICON.close}</button>`}
    </div>
    <div class="time"></div>
    <div class="meta"></div>
    <div class="actions">
      <button class="copy" data-copy="datetime" type="button">${ICON.copy}<span>date time</span></button>
      <button class="copy" data-copy="timestamp" type="button">${ICON.copy}<span>timestamp</span></button>
    </div>`;

  card.querySelector(".city").textContent = title ?? city;
  card.querySelector(".region").textContent = subtitle ?? region;

  for (const b of card.querySelectorAll("button.copy")) b.dataset.zone = zone;
  if (!pinned) {
    card.querySelector(".remove").addEventListener("click", () => removeZone(zone));
    card.addEventListener("pointerdown", (e) => armPress(card, e));
  }

  rows.set(zone, {
    flag: card.querySelector(".flag"),
    badge: card.querySelector(".badge"),
    time: card.querySelector(".time"),
    meta: card.querySelector(".meta"),
  });

  return card;
}

function render() {
  rows.clear();

  el.pinned.replaceChildren(
    makeCard("UTC", {
      pinned: true,
      title: "UTC",
      subtitle: "Coordinated Universal Time",
      variant: "utc",
    })
  );
  el.zones.replaceChildren(...state.zones.map((z) => makeCard(z)));
  tick();
}

// Seconds are deliberately smaller and muted so the eye lands on hh:mm.
function paintTime(node, date, zone) {
  const { hm, s, period } = timeParts(date, zone);
  node.replaceChildren(hm);

  const secs = document.createElement("span");
  secs.className = "secs";
  secs.textContent = ":" + s;
  node.append(secs);

  if (period) {
    const p = document.createElement("span");
    p.className = "period";
    p.textContent = period;
    node.append(p);
  }
}

function tick() {
  const now = new Date();
  for (const [zone, node] of rows) {
    const mins = offsetMinutes(now, zone);

    paintTime(node.time, now, zone);
    paintFlag(node.flag, zone, now);
    node.badge.textContent = offsetLabel(mins);

    node.meta.replaceChildren(formatDate(now, zone));
    if (zone !== "UTC") {
      const sep = document.createElement("span");
      sep.className = "sep";
      sep.textContent = "·";
      node.meta.append(sep, deltaLabel(mins));
    }
  }
}

/* ---------- reorder by long press + drag ---------- */

const LONG_PRESS_MS = 200;
const MOVE_CANCEL_PX = 8; // a scroll gesture, not a hold
const CARD_GAP = 8; // .card margin-bottom

let press = null;
let drag = null;

function armPress(card, event) {
  // Left button only, and never steal a tap meant for copy or remove.
  if (event.button !== 0 || event.target.closest("button")) return;

  cancelPress();
  press = {
    card,
    startY: event.clientY,
    pointerId: event.pointerId,
    timer: setTimeout(startDrag, LONG_PRESS_MS),
  };
}

function cancelPress() {
  if (!press) return;
  clearTimeout(press.timer);
  press = null;
}

function startDrag() {
  if (!press) return;
  const { card, startY, pointerId } = press;
  press = null;

  const cards = [...el.zones.querySelectorAll(".card")];
  const from = cards.indexOf(card);
  if (from < 0) return;

  drag = {
    card,
    cards,
    from,
    to: from,
    startY,
    step: card.getBoundingClientRect().height + CARD_GAP,
  };

  card.classList.add("card--drag");
  document.body.classList.add("dragging");
  try {
    card.setPointerCapture(pointerId);
  } catch {
    /* capture is a nicety, not a requirement */
  }
}

// Slide every card the dragged one has passed over into its vacated slot.
function layoutSiblings() {
  for (const [i, card] of drag.cards.entries()) {
    if (card === drag.card) continue;
    let shift = 0;
    if (drag.from < drag.to && i > drag.from && i <= drag.to) shift = -drag.step;
    else if (drag.from > drag.to && i >= drag.to && i < drag.from) shift = drag.step;

    card.classList.add("card--shift");
    card.style.transform = shift ? `translateY(${shift}px)` : "";
  }
}

function onPointerMove(event) {
  if (press) {
    if (Math.abs(event.clientY - press.startY) > MOVE_CANCEL_PX) cancelPress();
    return;
  }
  if (!drag) return;

  event.preventDefault();
  const dy = event.clientY - drag.startY;
  drag.card.style.transform = `translateY(${dy}px)`;

  const to = Math.min(
    drag.cards.length - 1,
    Math.max(0, drag.from + Math.round(dy / drag.step))
  );
  if (to !== drag.to) {
    drag.to = to;
    layoutSiblings();
  }
}

async function onPointerUp() {
  cancelPress();
  if (!drag) return;

  const { from, to, cards, card } = drag;
  drag = null;

  for (const c of cards) {
    c.style.transform = "";
    c.classList.remove("card--shift");
  }
  card.classList.remove("card--drag");
  document.body.classList.remove("dragging");

  if (from === to) return;

  const [moved] = state.zones.splice(from, 1);
  state.zones.splice(to, 0, moved);
  await save();
  render();
}

document.addEventListener("pointermove", onPointerMove);
document.addEventListener("pointerup", onPointerUp);
document.addEventListener("pointercancel", onPointerUp);

/* ---------- copy ---------- */

async function copyValue(button) {
  const zone = button.dataset.zone;
  const now = new Date();
  const text =
    button.dataset.copy === "timestamp"
      ? isoTimestamp(now, zone)
      : `${isoDate(now, zone)} ${hms24(now, zone)}`;

  await navigator.clipboard.writeText(text);

  const original = button.querySelector("span").textContent;
  button.innerHTML = `${ICON.check}<span>copied</span>`;
  button.classList.add("done");
  setTimeout(() => {
    button.innerHTML = `${ICON.copy}<span>${original}</span>`;
    button.classList.remove("done");
  }, 1100);
}

document.addEventListener("click", (e) => {
  const button = e.target.closest("button.copy");
  if (button) copyValue(button);
});

/* ---------- add view ---------- */

function makeResultRow(zone, now) {
  const { city, region } = splitZone(zone);
  const added = state.zones.includes(zone);

  const row = document.createElement("button");
  row.type = "button";
  row.className = "result";
  row.disabled = added;
  row.innerHTML = `
    <span class="flag"></span>
    <span class="result__names">
      <span class="result__city"></span>
      <span class="result__region"></span>
    </span>
    <span class="result__time"></span>`;

  paintFlag(row.querySelector(".flag"), zone, now);
  row.querySelector(".result__city").textContent = city;
  row.querySelector(".result__region").textContent = region;
  row.querySelector(".result__time").textContent = added ? "added" : timeParts(now, zone).hm;

  if (!added) row.addEventListener("click", () => addZone(zone));
  return row;
}

function makeLabel(text) {
  const h = document.createElement("p");
  h.className = "results__label";
  h.textContent = text;
  return h;
}

function matchesQuery(zone, q) {
  if (!q) return true;
  if ((HAYSTACK.get(zone) ?? zone.toLowerCase()).includes(q)) return true;
  const terms = ALIASES.get(zone);
  return !!terms && terms.includes(q);
}

function renderResults() {
  const q = el.search.value.trim().toLowerCase();
  const now = new Date();

  // The user's own zone is surfaced above everything else.
  const showLocal = matchesQuery(LOCAL_ZONE, q);

  const matches = [];
  for (const zone of ALL_ZONES) {
    if (zone === LOCAL_ZONE || !matchesQuery(zone, q)) continue;
    matches.push(zone);
    if (matches.length >= MAX_RESULTS) break;
  }

  el.results.replaceChildren();

  if (!showLocal && matches.length === 0) {
    const note = document.createElement("p");
    note.className = "results__note";
    note.textContent = "No time zone matches that.";
    el.results.append(note);
    return;
  }

  if (showLocal) {
    el.results.append(makeLabel("Your time zone"), makeResultRow(LOCAL_ZONE, now));
  }

  if (matches.length) {
    el.results.append(makeLabel(showLocal ? "All time zones" : "Time zones"));
    for (const zone of matches) el.results.append(makeResultRow(zone, now));
  }
}

function openAdd() {
  document.body.classList.add("adding");
  el.search.value = "";
  renderResults();
  // At this instant the view is still translated off-screen. A plain focus()
  // would make the browser scroll the document sideways to reveal it, and
  // overflow:hidden does not prevent that.
  el.search.focus({ preventScroll: true });
}

function closeAdd() {
  document.body.classList.remove("adding");
}

/* ---------- convert view ---------- */

const convert = {
  instant: Date.now(),
  zones: ["UTC", LOCAL_ZONE === "UTC" ? "Asia/Calcutta" : LOCAL_ZONE],
  cards: [],
};

// Wall-clock time in a zone -> UTC instant. Two passes so DST boundaries land right.
function zonedToInstant(y, mo, d, h, mi, s, zone) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const first = offsetMinutes(new Date(guess), zone);
  const ts = guess - first * 60000;
  const second = offsetMinutes(new Date(ts), zone);
  return second === first ? ts : guess - second * 60000;
}

// Accepts ISO 8601, or Unix seconds / milliseconds.
function parseStamp(raw) {
  const v = raw.trim();
  if (!v) return null;
  if (/^\d{13}$/.test(v)) return Number(v);
  if (/^\d{10}$/.test(v)) return Number(v) * 1000;
  const parsed = Date.parse(v);
  return Number.isNaN(parsed) ? null : parsed;
}

function zoneSelect(selected) {
  const sel = document.createElement("select");
  sel.className = "zone-select";
  for (const zone of ["UTC", ...ALL_ZONES]) {
    const opt = document.createElement("option");
    opt.value = zone;
    opt.textContent = zone.replace(/_/g, " ");
    if (zone === selected) opt.selected = true;
    sel.append(opt);
  }
  return sel;
}

function makeConvertCard(index) {
  const card = document.createElement("article");
  card.className = "card conv";
  card.innerHTML = `
    <div class="conv__head"></div>
    <div class="time"></div>
    <div class="meta"></div>
    <div class="conv__fields">
      <input class="field conv__date" type="date" aria-label="Date" />
      <input class="field conv__time" type="time" step="1" aria-label="Time" />
    </div>
    <input class="field conv__stamp" type="text" spellcheck="false"
           aria-label="Timestamp" placeholder="ISO 8601 or Unix timestamp" />`;

  const select = zoneSelect(convert.zones[index]);
  card.querySelector(".conv__head").append(select);

  const refs = {
    root: card,
    select,
    time: card.querySelector(".time"),
    meta: card.querySelector(".meta"),
    date: card.querySelector(".conv__date"),
    clock: card.querySelector(".conv__time"),
    stamp: card.querySelector(".conv__stamp"),
  };

  select.addEventListener("change", () => {
    convert.zones[index] = select.value;
    syncConvert();
  });

  const onFields = () => {
    const d = refs.date.value;
    const t = refs.clock.value;
    if (!d || !t) return;
    const [y, mo, da] = d.split("-").map(Number);
    const [h, mi, s = 0] = t.split(":").map(Number);
    convert.instant = zonedToInstant(y, mo, da, h, mi, s, convert.zones[index]);
    syncConvert();
  };
  refs.date.addEventListener("input", onFields);
  refs.clock.addEventListener("input", onFields);

  refs.stamp.addEventListener("input", () => {
    const parsed = parseStamp(refs.stamp.value);
    refs.stamp.classList.toggle("bad", refs.stamp.value.trim() !== "" && parsed === null);
    if (parsed === null) return;
    convert.instant = parsed;
    syncConvert();
  });

  convert.cards[index] = refs;
  return card;
}

// Never overwrite the field the user is currently typing in.
function syncConvert() {
  const when = new Date(convert.instant);

  convert.cards.forEach((refs, i) => {
    const zone = convert.zones[i];
    const mins = offsetMinutes(when, zone);

    paintTime(refs.time, when, zone);
    refs.meta.replaceChildren(`${formatDate(when, zone)} · ${offsetLabel(mins)}`);

    if (document.activeElement !== refs.select) refs.select.value = zone;
    if (document.activeElement !== refs.date) refs.date.value = isoDate(when, zone);
    if (document.activeElement !== refs.clock) refs.clock.value = hms24(when, zone);
    if (document.activeElement !== refs.stamp) {
      refs.stamp.value = isoTimestamp(when, zone);
      refs.stamp.classList.remove("bad");
    }
  });
}

function buildConvert() {
  const host = document.getElementById("convert-cards");

  const swapRow = document.createElement("div");
  swapRow.className = "swap-row";
  const swap = document.createElement("button");
  swap.type = "button";
  swap.className = "swap";
  swap.dataset.tip = "Swap the two zones";
  swap.innerHTML = ICON.swap;
  swap.addEventListener("click", () => {
    convert.zones.reverse();
    syncConvert();
  });
  swapRow.append(swap);

  host.replaceChildren(makeConvertCard(0), swapRow, makeConvertCard(1));
}

function openConvert() {
  convert.instant = Date.now();
  document.body.classList.add("converting");
  syncConvert();
}

function closeConvert() {
  document.body.classList.remove("converting");
}

/* ---------- state ---------- */

const save = () =>
  chrome.storage.local.set({
    zones: state.zones,
    hour12: state.hour12,
    theme: state.theme,
    mode: state.mode,
  });

function applyMode() {
  el.mode.innerHTML = ICON[state.mode];
  el.mode.dataset.tip = MODE_TIP[state.mode];
}

// Cached at startup: chrome.sidePanel.open() needs a user gesture, so it cannot
// afford to await a windowId lookup first.
let WINDOW_ID = null;

// An action with a popup set always opens the popup, so the two are mutually
// exclusive. Done here rather than in the worker to avoid the round trip.
async function applyHostWiring(mode) {
  await chrome.action.setPopup({ popup: mode === "popup" ? "sidepanel.html?mode=popup" : "" });
  if (chrome.sidePanel?.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: mode !== "popup" });
  }
}

async function switchHost(next) {
  // Fire the gesture-bound call first; awaits below would invalidate it.
  const opening =
    next === "panel" && WINDOW_ID != null && chrome.sidePanel?.open
      ? chrome.sidePanel.open({ windowId: WINDOW_ID })
      : null;

  await applyHostWiring(next);

  let opened = false;
  if (next === "panel") {
    if (opening) {
      try {
        await opening;
        opened = true;
      } catch (err) {
        console.error("could not open the side panel:", err);
      }
    }
  } else if (chrome.action.openPopup) {
    // Chrome 127+. Older builds keep the panel open and wait for an icon click.
    try {
      await chrome.action.openPopup();
      opened = true;
    } catch (err) {
      console.error("could not open the popup:", err);
    }
  }

  // Only tear down the current host once its replacement is actually up.
  if (opened) window.close();
}

// "system" removes the attribute so the prefers-color-scheme media query wins.
function applyTheme() {
  if (state.theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = state.theme;

  el.theme.innerHTML = ICON[state.theme];
  el.theme.dataset.tip = THEME_TIP[state.theme];

  // The service worker has no matchMedia, so resolve "system" here and hand it
  // over — that is what the toolbar badge colours itself from.
  const resolved =
    state.theme === "system"
      ? DARK_QUERY.matches
        ? "dark"
        : "light"
      : state.theme;
  chrome.storage.local.set({ resolvedTheme: resolved });
}

function applyFormat() {
  el.fmt.textContent = state.hour12 ? "12h" : "24h";
  el.fmt.dataset.tip = state.hour12 ? "Switch to 24-hour time" : "Switch to 12-hour time";
}

async function addZone(zone) {
  if (state.zones.includes(zone)) return;
  state.zones.push(zone);
  await save();
  render();
  closeAdd();
}

async function removeZone(zone) {
  state.zones = state.zones.filter((z) => z !== zone);
  await save();
  render();
}

/* ---------- wiring ---------- */

// Safety net: the off-screen views make the document scrollable even with
// overflow:hidden. If anything ever nudges it, every view ends up offset by a
// whole panel width, so snap it straight back.
addEventListener(
  "scroll",
  () => {
    if (scrollX || scrollY) scrollTo(0, 0);
  },
  { passive: true }
);

el.openAdd.addEventListener("click", openAdd);
el.closeAdd.addEventListener("click", closeAdd);
el.openConvert.addEventListener("click", openConvert);
el.closeConvert.addEventListener("click", closeConvert);
el.convNow.addEventListener("click", () => {
  convert.instant = Date.now();
  syncConvert();
});
el.search.addEventListener("input", renderResults);

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (document.body.classList.contains("adding")) closeAdd();
  if (document.body.classList.contains("converting")) closeConvert();
});

el.fmt.addEventListener("click", async () => {
  state.hour12 = !state.hour12;
  applyFormat();
  await save();
  tick();
  syncConvert();
});

// While on "system", an OS theme flip must reach the badge too.
DARK_QUERY.addEventListener("change", () => {
  if (state.theme === "system") applyTheme();
});

el.mode.addEventListener("click", async () => {
  state.mode = state.mode === "panel" ? "popup" : "panel";
  applyMode();
  const next = state.mode;
  switchHost(next);
  await save();
});

el.theme.addEventListener("click", async () => {
  state.theme = THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length];
  applyTheme();
  await save();
});

/* ---------- boot ---------- */

async function init() {
  const stored = await chrome.storage.local.get({
    zones: [],
    hour12: false,
    theme: "system",
    mode: "panel",
  });
  state.zones = stored.zones.filter((z) => CANONICAL.has(z.toLowerCase()));
  state.hour12 = stored.hour12;
  state.theme = THEMES.includes(stored.theme) ? stored.theme : "system";
  state.mode = MODES.includes(stored.mode) ? stored.mode : "panel";

  // Flags are decoration. If either step fails, the panel must still work,
  // so neither is allowed to abort init.
  try {
    FLAGS_RENDER = detectFlagSupport();
    buildCountryMap();
  } catch (err) {
    console.error("flag setup failed, continuing without flags:", err);
  }

  applyFormat();
  applyTheme();
  applyMode();

  chrome.windows
    ?.getCurrent()
    .then((w) => (WINDOW_ID = w.id))
    .catch(() => {});

  buildConvert();
  render();
  setInterval(tick, 1000);
}

init().catch((err) => console.error("panel init failed:", err));
