# Firefox Add-ons (AMO) Listing

## Summary (max 250 characters)
Right-click any photo to strip EXIF/GPS metadata, optionally compress it too. Nothing uploaded — 100% on your device. Uses a background script (no offscreen document needed on Firefox) to redraw the image via canvas, stripping all metadata.

## Description
Every photo you take carries hidden metadata: GPS coordinates, camera model, the exact time it was taken. Presend — Clean Photos removes it in one click, without ever uploading your image anywhere.

**How it works**
Right-click any photo on any website. Two options:
- "Clean with Presend" — strips GPS location, camera info, and timestamps, keeps full quality.
- "Clean & Compress with Presend" — does the same, then also shrinks the file size.

**100% private by design**
The image is processed entirely on your device using your browser's own rendering engine (canvas). It is never sent to Presend's servers, or to any third party.

**What it doesn't do**
- Doesn't track which sites you visit
- Doesn't collect analytics or usage data
- Doesn't require an account or sign-up
- Doesn't store your images anywhere

Free and open source. Part of the Presend toolkit (presend.pages.dev).

## Source code
https://github.com/presendapp/presend-extension

## Privacy policy
https://presend.pages.dev/privacy#extension

## Notes for AMO reviewers
This extension uses a Firefox-specific background script (firefox/background.js) instead of the Chrome/Edge version's offscreen document, since Firefox's event page background script has direct DOM/canvas access. Both versions share the same underlying image-cleaning logic (redraw onto a blank canvas, which strips all metadata by construction since canvas only holds raw pixel data). No build step or bundler is used — all source files are plain, readable JavaScript.
