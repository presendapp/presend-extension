# Presend — Clean Photos

A browser extension that lets you right-click any image on the web and strip hidden EXIF/GPS metadata, entirely on your device.

Part of the [Presend](https://presend.pages.dev) toolkit — free, no-signup browser tools for cleaning, compressing, and converting files before you share them.

## What it does

Right-click any photo on any website, choose **"Clean with Presend (remove EXIF/GPS)"**, and a cleaned copy downloads automatically. No GPS location, no camera model, no timestamps — the pixel data is untouched.

## How it works

- `background.js` — service worker that registers the context menu and orchestrates the cleaning flow.
- `offscreen.html` / `offscreen.js` — an offscreen document (service workers have no DOM/canvas access) that does the actual work: redraw the image onto a blank `<canvas>` and re-export it. Redrawing strips all metadata by construction, since a canvas only ever holds raw pixel data.

Nothing is ever uploaded. The image is fetched by the extension itself (needed to read pixel data across origins) and processed locally — it never reaches any Presend server or third party.

## Availability

- **Direct download**: [latest release](https://github.com/presendapp/presend-extension/releases/latest) — works in any Chromium browser (Chrome, Edge, Opera, Brave, Vivaldi) via "Load unpacked" in developer mode.
- **Firefox Add-ons**: submitted, pending review.
- **Opera Add-ons**: submitted, pending review.
- **Chrome Web Store / Microsoft Edge Add-ons**: not yet submitted.

## Development

Load unpacked in Chrome:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

## Privacy

See [presend.pages.dev/privacy#extension](https://presend.pages.dev/privacy#extension) for the full privacy policy, including why the extension requests broad host permissions.

## License

MIT
