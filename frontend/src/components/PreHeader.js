"use client";
import { useEffect, useState, useMemo } from "react";

export default function PreHeader({ included = "en,as,bn,gu,hi,kn,ml,mr,ne,or,pa,sa,sd,ta,te,ur,ks,mai,brx,sat,doi" }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langs, setLangs] = useState([]);
  const [currentCode, setCurrentCode] = useState("en");

  const EN_LABELS = useMemo(() => ({
    en: "English",
    as: "Assamese",
    bn: "Bengali",
    gu: "Gujarati",
    hi: "Hindi",
    kn: "Kannada",
    ml: "Malayalam",
    mr: "Marathi",
    ne: "Nepali",
    or: "Odia",
    pa: "Punjabi",
    sa: "Sanskrit",
    sd: "Sindhi",
    ta: "Tamil",
    te: "Telugu",
    ur: "Urdu",
    ks: "Kashmiri",
    mai: "Maithili",
    brx: "Bodo",
    sat: "Santali",
    doi: "Dogri",
  }), []);
  useEffect(() => {
    // Inject Google Translate script once
    if (document.getElementById("google-translate-script")) return;
    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src = "https://translate.google.com/translate_a/element.js?cb=__gr_loadGoogleTranslate";
    window.__gr_loadGoogleTranslate = function () {
      // global google from injected script
      // @ts-ignore
      new google.translate.TranslateElement({ pageLanguage: "en", includedLanguages: included, autoDisplay: false }, "google_element");

      // Populate languages list from injected select, but always use English names
      const populateLangs = () => {
        const sel = document.querySelector('.translateHost .goog-te-combo');
        if (!sel) return false;
        const opts = Array.from(sel.options || [])
          .map(o => {
            const value = o.value;
            if (!value) return null;
            const label = EN_LABELS[value] || o.textContent || value.toUpperCase();
            return { value, label };
          })
          .filter(Boolean);
        // Ensure English is present at the top even if Google omits it
        if (!opts.find(o => o.value === 'en')) {
          opts.unshift({ value: 'en', label: EN_LABELS['en'] });
        }
        if (opts.length) setLangs(opts);
        if (sel.value) setCurrentCode(sel.value);
        return !!opts.length;
      };
      let tries = 0;
      const t = setInterval(() => {
        if (populateLangs() || tries++ > 8) clearInterval(t);
      }, 200);

      // On mobile, aggressively remove Google's green overlay menu iframe if it appears
      if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) {
        const mo = new MutationObserver(() => {
          const frame = document.querySelector('iframe.goog-te-menu-frame');
          if (frame && frame.parentNode) {
            try { frame.parentNode.removeChild(frame); } catch {}
          }
        });
        mo.observe(document.body, { childList: true, subtree: true });
        // stop on page unload
        window.addEventListener('beforeunload', () => mo.disconnect());
      }
    };
    document.body.appendChild(script);
  }, [included, EN_LABELS]);

  // Aggressively hide Google top banner if it appears after a language is selected
  useEffect(() => {
    const hideBanner = () => {
      const iframe = document.querySelector('iframe.goog-te-banner-frame');
      if (iframe) {
        iframe.style.display = 'none';
        try { iframe.parentNode && iframe.parentNode.removeChild(iframe); } catch {}
      }
      const banner = document.querySelector('.goog-te-banner-frame');
      if (banner) {
        banner.style.display = 'none';
        try { banner.parentNode && banner.parentNode.removeChild(banner); } catch {}
      }
      const tt = document.getElementById('goog-gt-tt');
      if (tt) {
        tt.style.display = 'none';
        try { tt.parentNode && tt.parentNode.removeChild(tt); } catch {}
      }
      document.documentElement.style.top = '0px';
      document.body.style.top = '0px';
    };
    hideBanner();
    const mo = new MutationObserver(() => hideBanner());
    mo.observe(document.documentElement, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  const selectLanguage = (value) => {
    const sel = document.querySelector('.translateHost .goog-te-combo');
    if (!sel) return;
    sel.value = value;
    sel.dispatchEvent(new Event('change'));
    setMobileOpen(false);
    setCurrentCode(value);
  };

  return (
    <div className="translateHost inline-flex items-center">
      <div id="google_element" className="text-sm" />
      {/* Mobile custom trigger and menu */}
  <button type="button" aria-label="Change language" className="mobile-globe-btn sm:hidden" onClick={() => setMobileOpen(v => !v)}>🌐</button>
      {mobileOpen && (
        <>
          <div className="mobile-lang-overlay sm:hidden" onClick={() => setMobileOpen(false)} />
          <div className="mobile-lang-menu notranslate sm:hidden" translate="no" data-no-translate="true">
            <div className="mobile-lang-title notranslate" translate="no">Select Language</div>
            <ul className="notranslate" translate="no">
              {langs.map(l => (
                <li key={l.value} className="notranslate" translate="no">
                  <button type="button" className="notranslate" translate="no" onClick={() => selectLanguage(l.value)}>{l.label}</button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      <style jsx global>{`
        /* Keep banner hidden to avoid layout shift */
        iframe.goog-te-banner-frame { display: none !important; visibility: hidden !important; height: 0 !important; }
        .goog-te-banner-frame { display: none !important; visibility: hidden !important; height: 0 !important; }
        body { top: 0 !important; }
        html { top: 0 !important; }

        .translateHost .goog-te-gadget { font-size: 0; line-height: 0; margin: 0; }
        .translateHost .goog-te-gadget > span { display: none; }
  .goog-te-spinner-pos, .goog-te-spinner-animation { display: none !important; }
        .translateHost .goog-te-combo {
          font-size: 13px !important;
          line-height: 1 !important;
          padding: 6px 10px !important;
          border-radius: 8px !important;
          border: 1px solid var(--border, #d1d5db) !important;
          min-width: 160px;
          outline: none !important;
          background: var(--input-background, #f3f4f6);
          color: var(--foreground, #111827);
        }
          /* Replace the select's visible text with a globe icon on small footprint UI.
             We hide the native text and overlay a globe emoji. The select still works
             and the chosen language will be applied, but the control shows 🌐 instead
             of verbose placeholder text like "Select Language". */
          .translateHost { position: relative; display: inline-block; }
          /* Keep the select text visible (so options and the chosen language are readable),
             but leave room for the globe emoji by adding left padding. */
          .translateHost .goog-te-combo {
            padding-left: 34px !important;
            color: var(--foreground, #111827) !important;
            text-shadow: none !important;
          }
          /* On narrow screens, remove the control from normal flow so it doesn't push
             the header content to the right. Position it in the top-right of the
             header area and reduce its footprint. */
          @media (max-width: 640px) {
            .translateHost {
              position: absolute;
              right: 8px; /* anchor to far right */
              top: 8px;
              width: 40px; /* globe only */
              height: 32px;
              z-index: 10; /* under profile, above background */
              display: inline-block;
            }
            /* Hide pseudo icon; use real button instead */
            .translateHost::before { display: none; }
            .mobile-globe-btn {
              position: absolute; right: 0; top: 0; width: 40px; height: 32px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              line-height: 1;
              border: 1px solid var(--border, #d1d5db);
              border-radius: 8px;
              background: var(--input-background, #f3f4f6);
              color: var(--foreground, #111827);
            }
            /* removed label chip */
            .translateHost .goog-te-combo {
              min-width: 40px !important;
              width: 40px !important;
              max-width: 40px !important;
              padding-left: 26px !important; /* room for globe */
              color: transparent !important; /* visually hide label */
              background: var(--input-background, #f3f4f6) !important;
              opacity: 0; /* avoid double focus ring */
              pointer-events: none; /* use custom button to open menu */
            }
            /* Force-hide Google's own overlay menu on phones */
            .goog-te-menu-frame, .goog-te-menu2 { display: none !important; }
            /* Custom mobile menu */
            .mobile-lang-overlay {
              position: fixed; inset: 0; background: rgba(0,0,0,0.1); z-index: 40;
            }
            .mobile-lang-menu {
              position: fixed; right: 8px; top: 48px; width: min(88vw, 320px); max-height: 70vh; overflow: auto;
              background: var(--background, #ffffff); color: var(--foreground, #111827);
              border: 1px solid var(--border, #d1d5db); border-radius: 10px; z-index: 50; box-shadow: 0 10px 24px rgba(0,0,0,0.15);
            }
            .mobile-lang-menu .mobile-lang-title { padding: 10px 12px; font-weight: 600; background: #e5e7eb; color: #111827; border-bottom: 1px solid #d1d5db; }
            :root.dark .mobile-lang-menu .mobile-lang-title { background: #111827; color: #e5e7eb; border-bottom-color: #262626; }
            .mobile-lang-menu ul { list-style: none; margin: 0; padding: 6px; }
            .mobile-lang-menu li { margin: 0; }
            .mobile-lang-menu li button { width: 100%; text-align: left; padding: 10px 12px; border-radius: 8px; }
            .mobile-lang-menu li button:hover { background: #f3f4f6; }
            :root.dark .mobile-lang-menu { background: #0b0b0b; color: #f8fafc; border-color: #262626; }
            :root.dark .mobile-lang-menu li button:hover { background: #1f1f1f; }
          }
        :root.dark .translateHost .goog-te-combo {
          background: #0b0b0b;
          color: #f8fafc;
          border-color: #262626 !important;
        }
      `}</style>
    </div>
  );
}
