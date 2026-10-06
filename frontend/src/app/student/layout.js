"use client";
import { SignedIn, SignedOut, RedirectToSignIn, useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/student/components/ui/button";
import { Card } from "@/student/components/ui/card";
import { cn } from "@/student/components/ui/utils";
import {
  BookOpen,
  Trophy,
  Star,
  Search,
  Gamepad2,
  Crown,
  Award,
  Home,
  ClipboardList,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  ChevronLeft,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";
import { Input } from "@/student/components/ui/input";
import { useI18n } from "@/i18n/useI18n";
import { useRef, useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";

const makeNavItems = (t) => [
  { href: "/student", label: t?.nav?.dashboard ? t.nav.dashboard() : "Dashboard", icon: Home },
  { href: "/student/courses", label: t?.nav?.courses ? t.nav.courses() : "Courses", icon: BookOpen },
  { href: "/student/quiz", label: "Quiz", icon: ClipboardList },
  { href: "/student/achievements", label: t?.nav?.achievements ? t.nav.achievements() : "Achievements", icon: Star },
  { href: "/student/leaderboard", label: t?.nav?.leaderboard ? t.nav.leaderboard() : "Leaderboard", icon: Trophy },
  { href: "/student/search", label: t?.nav?.search ? t.nav.search() : "Search", icon: Search },
  { href: "/student/games", label: t?.nav?.games ? t.nav.games() : "Games", icon: Gamepad2 },
  { href: "/student/challenges", label: t?.nav?.challenges ? t.nav.challenges() : "Challenges", icon: Crown },
  { href: "/student/adventures", label: t?.nav?.adventures ? t.nav.adventures() : "Adventures", icon: Award },
];

export default function StudentLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const searchRef = useRef(null);
  const { theme } = useTheme();
  const { t } = useI18n();

  // Sidebar toggle state (for desktop and mobile)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("student_sidebar_open");
      if (saved !== null) {
        setSidebarOpen(saved === "true");
      }
    } catch {}
  }, []);

  const toggleDesktopSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("student_sidebar_open", String(next));
      } catch {}
      return next;
    });
  };

  const navItems = makeNavItems(t);
  const studentUser = {
    name: user?.fullName || user?.firstName || user?.username || "Student",
    avatar: (user?.firstName?.[0] || user?.username?.[0] || "S").toUpperCase(),
    imageUrl: user?.imageUrl || null,
  };

  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-[#F7F8FC] text-[#172033] transition-colors duration-200">
          {/* =========================================
              DESKTOP SIDEBAR
             ========================================= */}
          <aside
            className={cn(
              "hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out border-r bg-white border-[#E2E8F0] shadow-xs",
              sidebarOpen ? "w-64 translate-x-0" : "-translate-x-full w-64"
            )}
          >
            {/* Sidebar Brand Header */}
            <div className="flex items-center justify-between px-5 h-16 border-b border-[#E2E8F0]">
              <Link href="/student" className="flex items-center gap-3 group">
                <img
                  src="/logo.webp"
                  alt="Gyanaratna Logo"
                  className="h-8 w-8 object-contain rounded-md shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                />
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm tracking-tight text-[#172033] leading-tight">
                    GYANARATNA
                  </span>
                  <span className="text-[10px] font-semibold text-[#635BFF] tracking-wider uppercase">
                    Learn • Practice • Grow
                  </span>
                </div>
              </Link>
              {/* Desktop Close/Collapse Button */}
              <button
                onClick={toggleDesktopSidebar}
                title="Collapse sidebar"
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-[#F1EEFF] transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Sidebar Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
              <div className="text-[11px] font-bold uppercase tracking-wider mb-2 px-3 text-[#64748B]">
                Menu
              </div>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} prefetch>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer select-none",
                        isActive
                          ? "bg-[#F1EEFF] text-[#635BFF] font-semibold shadow-xs"
                          : "text-[#64748B] hover:text-[#172033] hover:bg-[#F1EEFF]/60"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-5 h-5 shrink-0 transition-colors",
                          isActive ? "text-[#635BFF]" : "text-[#64748B]"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#635BFF]" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Sidebar Bottom Controls */}
            <div className="p-3 border-t border-[#E2E8F0] space-y-1">
              <Link href="/settings">
                <div
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                    pathname === "/settings"
                      ? "bg-[#F1EEFF] text-[#635BFF] font-semibold"
                      : "text-[#64748B] hover:text-[#172033] hover:bg-[#F1EEFF]/60"
                  )}
                >
                  <Settings className="w-5 h-5 text-[#64748B] shrink-0" />
                  <span>Settings</span>
                </div>
              </Link>

              <button
                onClick={() => signOut({ redirectUrl: "/" })}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <LogOut className="w-5 h-5 text-rose-500 shrink-0" />
                <span>Sign Out</span>
              </button>

              {/* Student Profile Pill */}
              <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex items-center gap-3 px-2 py-1.5">
                {studentUser.imageUrl ? (
                  <img
                    src={studentUser.imageUrl}
                    alt={studentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#E2E8F0]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#F1EEFF] text-[#635BFF] flex items-center justify-center font-bold text-xs shrink-0">
                    {studentUser.avatar}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#172033] truncate">
                    {studentUser.name}
                  </p>
                  <p className="text-[10px] text-[#64748B] truncate">Student Account</p>
                </div>
              </div>
            </div>
          </aside>

          {/* =========================================
              MOBILE DRAWER (SLIDE-OVER)
             ========================================= */}
          {mobileDrawerOpen && (
            <div
              className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setMobileDrawerOpen(false)}
            />
          )}

          <aside
            className={cn(
              "lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 ease-in-out border-r bg-white border-[#E2E8F0] shadow-2xl",
              mobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-[#E2E8F0]">
              <Link
                href="/student"
                className="flex items-center gap-2.5"
                onClick={() => setMobileDrawerOpen(false)}
              >
                <img
                  src="/logo.webp"
                  alt="Gyanaratna Logo"
                  className="h-8 w-8 object-contain rounded-md"
                />
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm tracking-tight text-[#172033] leading-tight">
                    GYANARATNA
                  </span>
                  <span className="text-[9px] font-semibold text-[#635BFF] uppercase">
                    Learn • Practice • Grow
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                        isActive
                          ? "bg-[#F1EEFF] text-[#635BFF] font-semibold"
                          : "text-[#64748B] hover:text-[#172033] hover:bg-[#F1EEFF]/60"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-5 h-5 shrink-0",
                          isActive ? "text-[#635BFF]" : "text-[#64748B]"
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="p-3 border-t border-[#E2E8F0] space-y-1">
              <Link href="/settings" onClick={() => setMobileDrawerOpen(false)}>
                <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-[#64748B] hover:bg-slate-100">
                  <Settings className="w-5 h-5 text-[#64748B]" />
                  <span>Settings</span>
                </div>
              </Link>
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  signOut({ redirectUrl: "/" });
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-5 h-5 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* =========================================
              MAIN CONTENT WRAPPER
             ========================================= */}
          <div
            className={cn(
              "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
              sidebarOpen ? "lg:pl-64" : "lg:pl-0"
            )}
          >
            {/* Secondary Header Bar (Search & Sidebar Toggle ONLY - NO duplicate Dark/Language controls) */}
            <header className="sticky top-0 z-30 border-b bg-white/95 border-[#E2E8F0] shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] backdrop-blur-md">
              <div className="px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
                {/* Left section: Sidebar toggle button */}
                <div className="flex items-center gap-3">
                  {/* Mobile drawer toggle */}
                  <button
                    onClick={() => setMobileDrawerOpen(true)}
                    className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl text-[#64748B] hover:bg-slate-100 transition-colors"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>

                  {/* Desktop sidebar toggle button */}
                  <button
                    onClick={toggleDesktopSidebar}
                    className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl text-[#64748B] hover:text-[#172033] hover:bg-[#F1EEFF] transition-colors"
                    title={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
                  >
                    {sidebarOpen ? (
                      <PanelLeftClose className="w-5 h-5" />
                    ) : (
                      <PanelLeft className="w-5 h-5 text-[#635BFF]" />
                    )}
                  </button>
                </div>

                {/* Center search bar */}
                <div className="flex-1 max-w-xl flex items-center">
                  <div className="relative w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                    <Input
                      ref={searchRef}
                      placeholder={
                        t?.search?.placeholder
                          ? t.search.placeholder()
                          : "Search lessons, quizzes, courses..."
                      }
                      className="w-full pl-10 pr-4 h-9 rounded-full text-xs transition-all bg-[#F7F8FC] border-[#E2E8F0] focus:bg-white focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/20 text-[#172033] placeholder:text-[#64748B]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const q = e.currentTarget.value.trim();
                          router.push(
                            q ? `/student/search?q=${encodeURIComponent(q)}` : "/student/search"
                          );
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Right controls: Notifications bell only (Dark Mode & Language are in the main top header) */}
                <div className="flex items-center gap-2">
                  <Link
                    href="/student/adventures"
                    className="relative flex items-center justify-center w-9 h-9 rounded-full text-[#64748B] hover:text-[#172033] hover:bg-[#F1EEFF] transition-colors"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#635BFF] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      3
                    </span>
                  </Link>
                </div>
              </div>
            </header>

            {/* Main Application Body */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>

            {/* Mobile Bottom Navigation Bar (< md screens) */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 border-t bg-white/95 border-[#E2E8F0] text-[#64748B] backdrop-blur-lg z-40 pb-safe shadow-lg">
              <div className="grid grid-cols-5">
                {[
                  { href: "/student", label: "Dashboard", icon: Home },
                  { href: "/student/courses", label: "Courses", icon: BookOpen },
                  { href: "/student/quiz", label: "Quiz", icon: ClipboardList },
                  { href: "/student/games", label: "Games", icon: Gamepad2 },
                  { href: "/settings", label: "Profile", icon: Settings },
                ].map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex flex-col items-center justify-center py-2.5 text-[10px] font-medium transition-colors",
                        active
                          ? "text-[#635BFF] font-bold"
                          : "text-[#64748B] hover:text-[#172033]"
                      )}
                    >
                      <Icon className={cn("w-5 h-5 mb-1", active && "scale-110 transition-transform")} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
