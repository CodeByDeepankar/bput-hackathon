"use client"; // if you use hooks or state
import headerStyles from './Header.module.css';

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { openSignIn } from '@/lib/openSignIn';
import { usePathname } from "next/navigation";
// LanguageToggle replaced by Google Translate widget in PreHeader
// import LanguageToggle from "@/components/LanguageToggle";
import OnlineBadge from "@/components/OnlineBadge";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";
import PreHeader from "@/components/PreHeader";

export default function Header() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const isWelcome = pathname === "/";
  const isStudentShell = [
    "/student",
    "/subjects",
    "/achievements",
    "/progress",
    "/settings",
  ].some((p) => pathname?.startsWith(p));
  const isTeacherShell = pathname?.startsWith("/teacher");
  const isRoleSelect = pathname === "/role-select";

  return (
    <header
      className="w-full max-w-7xl mx-auto px-4 py-3 flex justify-between items-center relative z-50"
      style={isLight ? { backgroundColor: "#ffffff", color: "#000000" } : { backgroundColor: "#000000", color: "#f8fafc" }}
    >
      <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
        {/* Use public asset with absolute path; fallback to initials if missing */}
        {(() => {
          const [ok] = [true];
          return ok ? (
            <Image src="/logo.webp" alt="Logo" width={32} height={32} className="rounded" />
          ) : (
            <div className="w-8 h-8 rounded bg-white text-blue-600 flex items-center justify-center text-xs font-bold">SL</div>
          );
        })()}
        <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate max-w-[10rem] sm:max-w-[14rem]">GYANARATNA</h1>
      </div>
      <nav>
        {isWelcome ? (
          <div className="flex items-center gap-3">
            <ul className="flex space-x-4">
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
            <ThemeToggle />
          </div>
        ) : isStudentShell ? (
          // Replace nav with language toggle + online badge + Clerk profile button on student pages
          <div className="flex items-center gap-3 flex-shrink-0">
            <OnlineBadge />
            {/* Google Translate dropdown appears in PreHeader */}
            <ThemeToggle />
            <PreHeader />
            <SignedIn>
              <div className={headerStyles.profilePicture}>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
            <SignedOut>
              <button onClick={(e) => { e.preventDefault(); openSignIn('/sign-in'); }} className="text-sm text-blue-600 hover:underline">Sign in</button>
            </SignedOut>
          </div>
        ) : isTeacherShell ? (
          // On teacher routes, remove the default nav links (Home/Student/Teacher/Contact)
          <div className="flex items-center gap-3 flex-shrink-0">
            <ThemeToggle />
            <PreHeader />
            <SignedIn>
              <div className={headerStyles.profilePicture}>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
            <SignedOut>
              <button onClick={(e) => { e.preventDefault(); openSignIn('/sign-in'); }} className="text-sm text-blue-600 hover:underline">Sign in</button>
            </SignedOut>
          </div>
        ) : (
          <div className="flex items-center gap-4 flex-shrink-0">
            <ul className="hidden md:flex space-x-4 items-center">
              <li>
                <Link href="/">Home</Link>
              </li>
              {!isRoleSelect && (
                <>
                  <li>
                    <Link href="/student">Student</Link>
                  </li>
                  <li>
                    <Link href="/teacher">Teacher</Link>
                  </li>
                </>
              )}
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
            <ThemeToggle />
            <SignedIn>
              <div className={headerStyles.profilePicture}>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
            <SignedOut>
              <button onClick={(e) => { e.preventDefault(); openSignIn('/sign-in'); }} className="text-sm text-blue-600 hover:underline">Sign in</button>
            </SignedOut>
          </div>
        )}
      </nav>
    </header>
  );
}
