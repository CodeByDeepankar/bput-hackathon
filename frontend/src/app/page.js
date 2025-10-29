"use client";
import Script from "next/script";
import Image from "next/image";

import { useEffect, useState, useRef } from "react";
import {
  SignedOut,
  SignedIn,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { fetchUserRole } from "@/lib/users";
import { motion } from "framer-motion";

const headingVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const paragraphVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay: 0.28 },
  },
};

// Typewriter variants
const typeParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const typeLetter = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: "easeOut" },
  },
};

// Word-by-word paragraph animation
const wordsParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.28 } },
};

const wordChild = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

export default function Welcome() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [redirecting, setRedirecting] = useState(false);

  // Preload the GIF so it appears instantly when the MP4 ends
  useEffect(() => {
    try {
      const img = new Image();
      img.src = "/home.gif";
    } catch (e) {
      // ignore
    }
  }, []);

  // local state to toggle from mp4 -> gif
  const [showGif, setShowGif] = useState(false);
  const videoRef = useRef(null);

  // Try to programmatically start playback for browsers that require a play() call
  useEffect(() => {
    if (showGif) return;
    const v = videoRef.current;
    if (!v) return;
    // attempt play; some browsers require user gesture — handle the promise
    const p = v.play();
    if (p && p.catch) {
      p.catch((err) => {
        // common: autoplay prevented. We'll mute and try again.
        try {
          v.muted = true;
          v.play().catch(() => {});
        } catch (e) {}
      });
    }
  }, [showGif]);

  // If signed in, redirect based on role
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchUserRole(user.id).catch(() => null);
        const role = typeof data === "string" ? data : data?.role;
        if (!role || cancelled) return;
        setRedirecting(true);
        if (role === "student") router.replace("/student");
        else if (role === "teacher") router.replace("/teacher");
        else router.replace("/role-select");
      } catch (_) {
        // ignore role fetch errors on home
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user?.id, router]);

  return (
    <>
      <Script
        src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"
        strategy="afterInteractive" // loads after hydration
        defer
      />
      <div></div>
      <section className="relative flex items-center justify-center overflow-hidden bg-[#ffff] text-center">
  <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 py-10 md:grid md:grid-cols-2 md:gap-8 md:py-20">
            {/* Left column: heading, paragraph, CTA */}
            <div className="flex w-full flex-col items-center text-center md:items-start md:text-left">
              <SignedOut>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.12 } },
                  }}
                  className="p-2 md:p-0"
                >
                  <motion.h2
                    variants={headingVariants}
                    className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 bg-gradient-to-r from-sky-700 via-indigo-700 to-violet-700 text-transparent bg-clip-text tracking-tight leading-tight drop-shadow-md transform-gpu"
                  >
                    <motion.span
                      variants={wordsParent}
                      initial="hidden"
                      animate="visible"
                      aria-hidden
                    >
                      {["Learn,", "Play,", "and", "Grow!"].map((word, idx) => (
                        <motion.span
                          key={idx}
                          variants={wordChild}
                          className="inline-block mr-2"
                        >
                          {word}
                        </motion.span>
                      ))}
                    </motion.span>
                  </motion.h2>

                  <motion.p
                    variants={paragraphVariants}
                    className="text-lg md:text-xl lg:text-2xl text-slate-700 max-w-xl"
                  >
                    <motion.span
                      variants={wordsParent}
                      initial="hidden"
                      animate="visible"
                      aria-hidden
                    >
                      {Array.from(
                        "Join our platform to start learning in a fun way.".split(
                          " "
                        )
                      ).map((w, i) => (
                        <motion.span
                          key={i}
                          variants={wordChild}
                          className="inline-block mr-1"
                        >
                          {w}
                        </motion.span>
                      ))}
                    </motion.span>
                    <span className="sr-only">
                      Join our platform to start learning in a fun way.
                    </span>
                  </motion.p>

                  {/* CTA: centered and using Shades-like button style */}
                  <div className="mt-6 flex w-full justify-center md:justify-start">
                    <SignInButton>
                      <button className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 text-base font-medium text-white transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:from-sky-700 hover:to-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 active:scale-95 md:max-w-none md:px-8 md:py-4 md:text-lg">
                        Get Started
                      </button>
                    </SignInButton>
                  </div>
                </motion.div>
              </SignedOut>

              <SignedIn>
                <div className="mt-4">
                  {redirecting ? (
                    <div className="text-sm text-slate-600">
                      Redirecting to your dashboard…
                    </div>
                  ) : (
                    <UserButton />
                  )}
                </div>
              </SignedIn>
            </div>

            {/* Right column: mascot animation */}
            <div className="flex w-full items-center justify-center md:justify-end">
              <div className="relative h-64 w-full max-w-md sm:h-80 md:h-auto md:max-w-none">
                {!showGif ? (
                  <video
                    ref={videoRef}
                    src="/home.mp4"
                    preload="auto"
                    autoPlay
                    muted
                    playsInline
                    onEnded={() => setShowGif(true)}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Image
                    src="/home.gif"
                    alt="Home animation"
                    width={1280}
                    height={720}
                    className="h-full w-full object-contain rounded-md"
                    priority
                    unoptimized
                  />
                )}
              </div>
            </div>
          </div>
      </section>
    </>
  );
}
