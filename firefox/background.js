// Presend — Clean Photos: Firefox background script.
// Unlike Chrome's MV3 service worker, Firefox's "event page" background
// script has full DOM access (Image, canvas), so no offscreen document
// is needed here — the cleaning logic runs directly in this file.

const MENU_CLEAN_ID = 'presend-clean-image';
const MENU_CLEAN_COMPRESS_ID = 'presend-clean-compress-image';

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: MENU_CLEAN_ID,
    title: 'Clean with Presend (remove EXIF/GPS)',
    contexts: ['image']
  });
  browser.contextMenus.create({
    id: MENU_CLEAN_COMPRESS_ID,
    title: 'Clean & Compress with Presend',
    contexts: ['image']
  });
});

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file could not be read as an image.'));
    img.src = dataUrl;
  });
}

// Redrawing onto a blank canvas strips ALL metadata (EXIF, GPS, XMP) by
// construction — the canvas only ever holds raw pixel data.
async function cleanImage(dataUrl, sourceType) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const outputType = sourceType === 'image/png' ? 'image/png' : 'image/jpeg';
  const quality = outputType === 'image/jpeg' ? 0.92 : undefined;

  return await canvasToDataUrl(canvas, outputType, quality);
}

async function cleanAndCompressImage(dataUrl, sourceType, quality) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const outputType = sourceType === 'image/png' ? 'image/png' : 'image/jpeg';
  const q = outputType === 'image/jpeg' ? (Number(quality) || 80) / 100 : undefined;

  return await canvasToDataUrl(canvas, outputType, q);
}

function canvasToDataUrl(canvas, outputType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Could not process this image.')); return; }
      const reader = new FileReader();
      reader.onload = () => resolve({ cleanedDataUrl: reader.result, outputType });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    }, outputType, quality);
  });
}

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

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const isClean = info.menuItemId === MENU_CLEAN_ID;
  const isCleanCompress = info.menuItemId === MENU_CLEAN_COMPRESS_ID;
  if ((!isClean && !isCleanCompress) || !info.srcUrl) return;

  try {
    const response = await fetch(info.srcUrl);
    if (!response.ok) throw new Error('Could not fetch the image (HTTP ' + response.status + ')');
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);

    const result = isCleanCompress
      ? await cleanAndCompressImage(dataUrl, blob.type, 80)
      : await cleanImage(dataUrl, blob.type);

    const suffix = isCleanCompress ? '-clean-compressed' : '-clean';
    const filename = guessFilename(info.srcUrl, result.outputType, suffix);

    await browser.downloads.download({
      url: result.cleanedDataUrl,
      filename: 'presend-cleaned/' + filename,
      saveAs: false
    });
  } catch (err) {
    console.error('[Presend] Failed to clean image:', err);
    if (browser.notifications) {
      browser.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Presend — could not clean this image',
        message: String(err.message || err)
      });
    }
  }
});
