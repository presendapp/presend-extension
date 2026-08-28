// Presend — Clean Photos: offscreen document.
// Has DOM/canvas access (unlike the background service worker), so this
// is where the actual EXIF-stripping happens: redraw onto a blank canvas
// and re-export, exactly like the stripMetadata() logic on presend.pages.dev.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;

  if (message.action === 'clean-image') {
    cleanImage(message.dataUrl, message.sourceType)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: String(err.message || err) }));
    return true;
  }

  if (message.action === 'clean-and-compress-image') {
    cleanAndCompressImage(message.dataUrl, message.sourceType, message.quality)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: String(err.message || err) }));
    return true;
  }

  return false; // not for us
});

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file could not be read as an image.'));
    img.src = dataUrl;
  });
}

async function cleanImage(dataUrl, sourceType) {
  const img = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // Same convention as the website: keep PNG as PNG, everything else -> JPEG.
  const outputType = sourceType === 'image/png' ? 'image/png' : 'image/jpeg';
  const quality = outputType === 'image/jpeg' ? 0.92 : undefined;

  const cleanedDataUrl = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Could not process this image.')); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    }, outputType, quality);
  });

  return { cleanedDataUrl, outputType };
}


// Same metadata-stripping pass as cleanImage(), then re-encodes at a given
// quality (0-100, matching the convention used on presend.pages.dev).
async function cleanAndCompressImage(dataUrl, sourceType, quality) {
  const img = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const outputType = sourceType === 'image/png' ? 'image/png' : 'image/jpeg';
  const q = outputType === 'image/jpeg' ? (Number(quality) || 80) / 100 : undefined;

  const cleanedDataUrl = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Could not process this image.')); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    }, outputType, q);
  });

  return { cleanedDataUrl, outputType };
}
