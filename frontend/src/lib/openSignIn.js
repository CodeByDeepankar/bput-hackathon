// Helper to open the sign-in flow in a new tab/system browser when possible.
export function isEmbeddedOrInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const inAppRegex = /FBAN|FBAV|Instagram|Line|KAKAOTALK|Twitter|LinkedIn|WhatsApp|Electron|wv|WebView/i;
  if (inAppRegex.test(ua)) return true;
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch (e) {}
  if ((window.navigator && window.navigator.standalone) === true) return true;
  return false;
}

export function openSignIn(href = '/sign-in') {
  if (typeof window === 'undefined') return;
  if (isEmbeddedOrInAppBrowser()) {
    const newWin = window.open(href, '_blank', 'noopener,noreferrer');
    if (newWin) {
      try { newWin.opener = null; } catch (e) {}
      return true;
    }
    // fallback to helper page
    window.location.href = '/open-in-browser?target=' + encodeURIComponent(href);
    return false;
  }
  window.location.href = href;
  return true;
}
