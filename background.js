// Presend — Clean Photos: background service worker.
// Handles the right-click context menu and orchestrates image cleaning
// via an offscreen document (service workers have no DOM/canvas access).

const MENU_CLEAN_ID = 'presend-clean-image';
const MENU_CLEAN_COMPRESS_ID = 'presend-clean-compress-image';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_CLEAN_ID,
    title: 'Clean with Presend (remove EXIF/GPS)',
    contexts: ['image']
  });
  chrome.contextMenus.create({
    id: MENU_CLEAN_COMPRESS_ID,
    title: 'Clean & Compress with Presend',
    contexts: ['image']
  });
});

let offscreenReady = null;

async function ensureOffscreenDocument() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existing.length > 0) return;

  if (!offscreenReady) {
    offscreenReady = chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_SCRAPING'],
      justification: 'Use canvas to strip image metadata (no DOM in service workers).'
    });
  }
  await offscreenReady;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const isClean = info.menuItemId === MENU_CLEAN_ID;
  const isCleanCompress = info.menuItemId === MENU_CLEAN_COMPRESS_ID;
  if ((!isClean && !isCleanCompress) || !info.srcUrl) return;

  try {
    await ensureOffscreenDocument();

    // Fetch the image as a data URL from the background context first —
    // offscreen documents can't always reach page-restricted images directly,
    // but a straightforward fetch from the extension's own context can.
    const response = await fetch(info.srcUrl);
    if (!response.ok) throw new Error('Could not fetch the image (HTTP ' + response.status + ')');
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);

    const action = isCleanCompress ? 'clean-and-compress-image' : 'clean-image';
    const result = await chrome.runtime.sendMessage({
      target: 'offscreen',
      action,
      dataUrl,
      sourceType: blob.type,
      quality: 80
    });

    if (!result || !result.success) {
      throw new Error(result && result.error ? result.error : 'Unknown error cleaning the image.');
    }

    const suffix = isCleanCompress ? '-clean-compressed' : '-clean';
    const filename = guessFilename(info.srcUrl, result.outputType, suffix);
    await chrome.downloads.download({
      url: result.cleanedDataUrl,
      filename: 'presend-cleaned/' + filename,
      saveAs: false
    });
  } catch (err) {
    console.error('[Presend] Failed to clean image:', err);
    chrome.notifications && chrome.notifications.create && chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Presend — could not clean this image',
      message: String(err.message || err)
    });
  }
});

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function guessFilename(srcUrl, outputType, suffix) {
  let base = 'image';
  try {
    const u = new URL(srcUrl);
    const last = u.pathname.split('/').pop();
    if (last) base = last.replace(/\.[^.]+$/, '');
  } catch (e) { /* keep default */ }
  const ext = outputType === 'image/png' ? 'png' : 'jpg';
  return base + (suffix || '-clean') + '.' + ext;
}
