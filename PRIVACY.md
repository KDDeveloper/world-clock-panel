# Privacy Policy

**UTC World Clock Panel**
Last updated: 9 September 2026

## Summary

This extension collects nothing, transmits nothing, and shares nothing. It makes no
network requests of any kind.

## What is stored

Your preferences are saved on your own device using `chrome.storage.local`:

- the time zones you have added, and the order you arranged them in
- your 12- or 24-hour clock preference
- your theme choice (system, light, or dark)
- whether the extension opens as a side panel or a popup

That is the complete list. It never leaves your browser, and it is not synced to any
account.

## What is not collected

No personally identifiable information. No browsing history. No web page content. No
location data. No authentication or financial information. No usage analytics, telemetry,
or crash reporting. No cookies. No advertising or tracking identifiers of any kind.

There is no server component to this extension, so there is nowhere for such data to be
sent even in principle.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `storage` | Saves the preferences listed above, locally |
| `sidePanel` | The user interface is a side panel; required to display and open it |
| `alarms` | Wakes the service worker once a minute to update the toolbar badge |

The extension requests **no host permissions**. It has no ability to read, modify, or
observe any website you visit, in any tab, at any time.

## Time zone data

All time and offset calculations use the time zone database built into your own copy of
Chrome, through the standard `Intl` APIs. No external time service is contacted.

## Removing your data

Removing the extension from `chrome://extensions` deletes everything it stored. You can
also clear it while keeping the extension installed by removing all your added time zones.

## Third parties

There are none. No analytics provider, no error reporting service, no advertising network,
no content delivery network. All code and assets ship inside the extension package.

## Changes

If this policy ever changes, the revised version will be published here and the date above
updated. Any change that affected what is collected would also require a new extension
release, which is publicly visible in the Chrome Web Store version history.

## Contact

Questions about this policy: [kushaldavda.com](https://kushaldavda.com)
