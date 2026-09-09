# UTC World Clock &amp; Time Zone Converter

Your unified time centre — UTC and every time zone you work with, docked in Chrome's
side panel beside your work instead of on top of it.

A Manifest V3 Chrome extension. No build step, no dependencies, no network requests.

## What it does

- **UTC pinned** at the top as the reference point
- **Any of the 400+ IANA time zones**, added from a searchable list and reordered by dragging
- **Each card** shows local time, date, UTC offset, and the gap in plain language (`5h 30m ahead`)
- **Live UTC in the toolbar badge**, refreshed every minute
- **Two-way converter** — set a time in one zone, read it in another, edit either side
- **One-click copy** of a formatted date-time or a valid ISO 8601 timestamp
- **Side panel or popup**, switchable from the header
- **Light, dark, or follow the system**

## What makes it different

**No permissions.** The extension requests `storage`, `sidePanel` and `alarms` — none of
which grant access to web pages. It cannot read, modify, or observe any site you visit.
Check the install prompt: it asks for nothing.

**Search by city, not by zone ID.** `mumbai`, `bengaluru`, `nyc`, `vegas`, `joburg` and
several hundred more resolve to the right zone. IANA names each zone after a single city,
which leaves most of the world unsearchable by the name people actually use.

**Correct ISO 8601.** Copying a timestamp gives you `2026-09-09T12:08:40+05:30` — the
zone's real offset, with `Z` used only where the offset is genuinely zero. It round-trips
through `Date.parse()` to the same instant from every card.

**DST handled properly.** Offsets are read from the browser's own time zone database at
the relevant instant, so historical and future dates resolve correctly. Converting a wall
clock time to an instant uses a two-pass resolution, which gets the ambiguous hour that
occurs twice each autumn right.

**Day or night at a glance.** Every zone is tinted by its local time of day, so you can
tell whether it is a reasonable hour before you call.

## Install

From the Chrome Web Store *(link once published)*.

To run from source:

1. Clone or download this repository
2. Visit `chrome://extensions` and enable **Developer mode**
3. Click **Load unpacked** and select the folder
4. Click the toolbar icon to open the panel

Requires Chrome 116 or later.

## Privacy

Nothing is collected, transmitted, or shared. Your zones and settings live in
`chrome.storage.local` on your own machine. There is no server and no analytics.

See [PRIVACY.md](PRIVACY.md) for the full policy.

## Development

Plain HTML, CSS and JavaScript — there is nothing to install or compile.

| File | Role |
| --- | --- |
| `manifest.json` | Manifest V3 declaration |
| `background.js` | Service worker: toolbar badge, alarms, panel/popup wiring |
| `sidepanel.html` | Markup for all three views |
| `sidepanel.css` | Design tokens and layout |
| `sidepanel.js` | Clocks, converter, search, drag-to-reorder |
| `icons/` | `icon.svg` is the master; the PNGs are rendered from it |

Edit any file, then press reload on the extension's card in `chrome://extensions`. Close
the side panel before reloading — an open panel keeps running the old script.

## License

MIT — see [LICENSE](LICENSE).
