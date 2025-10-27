"use client";
import { useEffect, useState } from "react";

export default function OpenInBrowserPage({ searchParams }) {
  const target = (searchParams && searchParams.target) || '/sign-in';
  const [tried, setTried] = useState(false);

  useEffect(() => {
    // try opening automatically once
    if (!tried) {
      setTried(true);
      try {
        const w = window.open(target, '_blank', 'noopener,noreferrer');
        if (w) try { w.opener = null; } catch (e) {}
      } catch (e) {
        // ignore
      }
    }
  }, [tried, target]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-xl w-full bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">Open in your device browser</h1>
        <p className="mb-4 text-gray-700">We detected you may be using an in-app browser or an embedded webview. Google blocks signing in with some providers from embedded browsers. To continue, open the sign-in flow in your device's normal browser.</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={target}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Open sign-in in browser
          </a>

          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.origin + target).then(() => {
                alert('Sign-in link copied to clipboard — open your browser and paste it.');
              }).catch(() => {
                alert('Copy failed — please long-press the link and copy it or open in your browser.');
              });
            }}
            className="inline-block text-center bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
          >
            Copy sign-in link
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-600">If this is a native app using a webview (Cordova/Capacitor), the app must open external OAuth flows using the system browser (SFSafariViewController / Custom Tabs). If you control the app, use the platform's browser plugin. If not, open this site in Chrome or Safari and try again.</p>
      </div>
    </div>
  );
}
