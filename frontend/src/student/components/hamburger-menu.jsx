"use client";

import { useState } from "react";
import styles from './hamburger-menu.module.css';
import { useUser } from '@clerk/nextjs';
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Menu, BookOpen, Map, Gamepad2, Heart, Swords, Users, Award, UserCheck, GraduationCap, Star, Settings, LogOut } from "lucide-react";

export function HamburgerMenu({ userRole, currentSection, studentUser, teacherUser, menuItems, onNavigate, onRoleSwitch }) { const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { signOut } = useClerk();

  const { isLoaded, isSignedIn, user } = useUser();

  const handleNavigate = (section) => {
    onNavigate(section);
    setIsOpen(false); };

  const currentUser = userRole === 'student' ? studentUser : teacherUser;

  return (
  <Sheet open={ isOpen } onOpenChange={ setIsOpen }>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="p-2">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-80 p-0 !bg-white !text-gray-900 border-r border-gray-200 shadow-xl"
      >
        <div className="flex flex-col h-full">
          { /* User Profile Section */ }
          <SheetHeader className={`p-0 ${styles.sidebarHeader} bg-gradient-to-r from-indigo-600 to-purple-600 text-white`}>
            <div className={styles.leftGroup}>
              {isLoaded && isSignedIn && user?.imageUrl ? (
                // Use a plain <img> for external Clerk-hosted images to avoid requiring
                // adding external domains to next.config.js while keeping a simple fallback.
                <img
                  src={user.imageUrl}
                  alt={user.fullName || currentUser.name}
                  width={48}
                  height={48}
                  className={styles.sidebarProfilePic}
                  loading="lazy"
                />
              ) : (
                <Avatar className="w-12 h-12 border-2 border-white/20">
                  <AvatarFallback className="bg-white/10 text-white">{currentUser.avatar}</AvatarFallback>
                </Avatar>
              )}

              <div className={styles.userInfo}>
                <div className={styles.userName}>{currentUser.name}</div>
                <div className={styles.userRole}>{userRole === 'student' ? 'Student' : 'Teacher'}</div>
              </div>
            </div>

            <button className={styles.closeButton} onClick={() => setIsOpen(false)} aria-label="Close menu">✕</button>
          </SheetHeader>

          { /* Navigation Items (scrollable) */ }
          <div className="flex-1 p-4 overflow-y-auto [-webkit-overflow-scrolling:touch] pb-6">
            <div className="space-y-1">
              { menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <Button
                    key={item.id }
                    variant="ghost"
                    className={`w-full justify-start gap-3 h-11 rounded-lg transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm' : 'hover:bg-gray-50'}`}
                    onClick={ () => handleNavigate(item.id) }
                  >
                    <IconComponent className={`w-5 h-5 ${isActive ? 'text-indigo-700' : 'text-gray-600'}`} />
                    { item.label }
                  </Button>
                );
              })}
            </div>

          </div>

          { /* Footer Actions */ }
          <div className="p-4 border-t border-gray-200 bg-gray-50/60">
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 rounded-lg hover:bg-gray-100"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/settings");
                }}
              >
                <Settings className="w-5 h-5" />
                Settings
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-100"
                onClick={() => {
                  setIsOpen(false);
                  // Redirect to home after sign out
                  signOut({ redirectUrl: "/" });
                }}
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}