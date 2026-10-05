"use client";
import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Helper to detect embedded/in-app browsers or PWA standalone mode.
  // Google blocks OAuth from certain embedded webviews (error: disallowed_useragent).
  // When we detect such an environment, we try to open the sign-in flow in a new tab
  // (which on many devices will open the system browser) to avoid the block.
  const isEmbeddedOrInAppBrowser = () => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";

    // Common signals for in-app browsers / webviews
    const inAppRegex = /FBAN|FBAV|Instagram|Line|KAKAOTALK|Twitter|LinkedIn|WhatsApp|Electron|wv|WebView/i;
    if (inAppRegex.test(ua)) return true;

    // PWAs launched from home screen: display-mode: standalone
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (e) {
      // ignore
    }

    // iOS Safari standalone (older) indicator
    if ((window.navigator && window.navigator.standalone) === true) return true;

    return false;
  };

  const openSignIn = (href) => {
    if (typeof window === "undefined") return;

    // If we suspect an embedded browser, open in a new tab (often hands off to system browser).
    if (isEmbeddedOrInAppBrowser()) {
      const newWin = window.open(href, "_blank", "noopener,noreferrer");
      // Some in-app webviews block window.open or keep the same embedded view; if popup fails
      // or returns null, redirect to a helper page that explains how to open in system browser.
      if (newWin) {
        try { newWin.opener = null; } catch (e) { /* ignore */ }
        return;
      }

      // Fallback: navigate to a short helper instruction page where the user can open in browser
      // or copy the link for opening externally.
      window.location.href = '/open-in-browser?target=' + encodeURIComponent(href);
      return;
    }

    // Normal navigation for regular browsers
    window.location.href = href;
  };

  return (
    <nav className="relative flex items-center justify-between p-4 shadow-md bg-white">
      <h1 className="font-bold text-xl">STEM Learning</h1>

      {/* Hamburger - visible on small screens only */}
      <button
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        className="md:hidden text-2xl p-2 rounded-md hover:bg-gray-100"
        onClick={() => setIsMobileMenuOpen((s) => !s)}
      >
        {isMobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Navigation links - hidden on mobile unless toggled, visible on md+ */}
      <div
        className={
          `gap-4 items-center ${
            isMobileMenuOpen
              ? 'flex flex-col absolute top-16 left-0 right-0 bg-white p-4 shadow-md z-50'
              : 'hidden'
          } md:flex md:relative md:top-0 md:left-0 md:right-0 md:flex-row md:bg-transparent md:p-0 md:shadow-none`
        }
      >
        <input
          type="search"
          placeholder="Search lessons..."
          className="px-3 py-2 border rounded-md w-full md:w-64"
        />
        <Link href="/">Home</Link>
        <Link href="/lessons">Lessons</Link>
        <Link href="/games">Games</Link>
        <Link href="/dashboard">Dashboard</Link>
        {/* Sign in triggers: open in system browser/new tab when inside embedded browsers */}
        <button
          onClick={() => openSignIn('/sign-in')}
          className="ml-0 md:ml-2 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700"
        >
          Sign in
        </button>
      </div>
    </nav>
  );
}
