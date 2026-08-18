/**
 * inAppBrowserScrollFix
 * ----------------------
 * Fixes "dead" vertical scroll inside WebKit-based in-app browsers
 * (Telegram, Instagram, Facebook, TikTok, etc. — all of these use a
 * WKWebView on iOS to render links opened from inside the app).
 *
 * Why this is needed:
 * These in-app WebViews sometimes fail to translate native touch gestures
 * into page scrolling, even though the page itself is tall enough to
 * scroll and all click/tap handlers keep firing normally. This is a
 * long-standing WKWebView quirk, not a bug in this app's layout — regular
 * Safari/Chrome tabs are never affected, only links opened from inside
 * another app's in-app browser.
 *
 * What this script does:
 * 1. Only activates for known in-app browsers (detected via User-Agent).
 *    It never touches normal Chrome/Safari/Firefox — those already scroll
 *    correctly, so this code is a no-op there.
 * 2. Watches whether the page actually scrolls in response to touch drags.
 *    If native scrolling is working, it stays completely out of the way.
 * 3. If a drag produces no native scroll movement, it takes over and
 *    manually moves the page with window.scrollTo, so the user's swipe
 *    still scrolls the page.
 * 4. It never interferes with scrolling *inside* modals/drawers that have
 *    their own internal `overflow-y: auto` container (cart drawer, product
 *    modal, checkout modal, admin tables, etc.) — those keep scrolling
 *    natively as before.
 */

function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /Telegram/i.test(ua) ||
    /Instagram/i.test(ua) ||
    /FBAN|FBAV|FB_IAB/i.test(ua) ||
    /TikTok/i.test(ua) ||
    /Line\//i.test(ua) ||
    // Telegram's iOS in-app browser doesn't always add its own UA token,
    // but it (and other WKWebView-based in-app browsers) lacks Safari's
    // UA suffix while still being iOS WebKit — a reasonably safe signal
    // when combined with the absence of a real browser token.
    (/iPhone|iPad|iPod/i.test(ua) && !/Safari/i.test(ua) && /AppleWebKit/i.test(ua))
  );
}

function findScrollableAncestor(el: Element | null): Element | null {
  let node = el;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const canScrollY =
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight;
    if (canScrollY) return node;
    node = node.parentElement;
  }
  return null;
}

export function installInAppBrowserScrollFix(): void {
  if (typeof window === 'undefined') return;
  if (!isInAppBrowser()) return; // no-op in normal browsers

  let startY = 0;
  let startScrollY = 0;
  let lastY = 0;
  let insideOwnScroller = false;
  let nativeScrollConfirmed = false;

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    startY = lastY = e.touches[0].clientY;
    startScrollY = window.scrollY;
    nativeScrollConfirmed = false;
    insideOwnScroller = !!findScrollableAncestor(e.target as Element);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    // Let elements with their own scroll area (modals, drawers, tables)
    // handle their touch gestures exactly as they already do.
    if (insideOwnScroller) return;

    const currentY = e.touches[0].clientY;
    const draggedBy = lastY - currentY;
    lastY = currentY;

    // Give the native scroll a chance first: if the browser already moved
    // the page on its own since touchstart, don't fight it.
    if (!nativeScrollConfirmed && window.scrollY !== startScrollY) {
      nativeScrollConfirmed = true;
    }
    if (nativeScrollConfirmed) return;

    // Native scroll produced no movement even though the page has room to
    // scroll — this is the frozen-scroll bug. Drive the scroll manually.
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return; // nothing to scroll anyway

    const next = Math.min(Math.max(window.scrollY + draggedBy, 0), maxScroll);
    if (next !== window.scrollY) {
      window.scrollTo(0, next);
      e.preventDefault();
    }
  };

  const onTouchEnd = () => {
    insideOwnScroller = false;
    nativeScrollConfirmed = false;
  };

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  // Must be non-passive so we're allowed to call preventDefault when we
  // take over scrolling manually.
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchcancel', onTouchEnd, { passive: true });
}
