"use client"; // if you use hooks or state

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
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
      className="w-full"
      style={isLight ? { backgroundColor: "#ffffff", color: "#000000" } : { backgroundColor: "#000000", color: "#f8fafc" }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
        {/* Use public asset with absolute path; fallback to initials if missing */}
        {(() => {
          const [ok] = [true];
          return ok ? (
            <Image src="/logo.webp" alt="Logo" width={32} height={32} className="rounded" />
          ) : (
            <div className="w-8 h-8 rounded bg-white text-blue-600 flex items-center justify-center text-xs font-bold">SL</div>
          );
        })()}
        <h1 className="text-xl font-bold">GYANARATNA</h1>
        </div>

        <nav className="flex w-full items-center justify-end gap-3 sm:w-auto sm:flex-nowrap">
          {isWelcome ? (
            <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
              <ul className="flex flex-wrap items-center gap-3 text-sm">
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
            <ThemeToggle />
            </div>
          ) : isStudentShell ? (
          // Replace nav with language toggle + online badge + Clerk profile button on student pages
          <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
            <OnlineBadge />
            {/* Google Translate dropdown appears in PreHeader */}
            <ThemeToggle />
            <PreHeader />
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <Link href="/sign-in">Sign in</Link>
            </SignedOut>
          </div>
          ) : isTeacherShell ? (
          // On teacher routes, remove the default nav links (Home/Student/Teacher/Contact)
          <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
            <ThemeToggle />
            <PreHeader />
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <Link href="/sign-in">Sign in</Link>
            </SignedOut>
          </div>
        ) : (
          <ul className="flex flex-wrap items-center justify-end gap-3 text-sm">
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
            <li>
              <ThemeToggle />
            </li>
            <li>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <Link href="/sign-in">Sign in</Link>
              </SignedOut>
            </li>
          </ul>
        )}
        </nav>
      </div>
    </header>
  );
}
