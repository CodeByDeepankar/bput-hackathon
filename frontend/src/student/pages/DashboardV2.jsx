import {
  BookOpen,
  Sparkles,
  Star,
  Gift,
  Trophy,
  Zap,
  Target,
  Brain,
  Send,
  TrendingUp,
  Clock,
  Award,
  Database,
  Layers,
  Cpu,
  HardDrive,
  ExternalLink,
  Gamepad2,
  Flame,
  Play,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  Video,
  FileText,
  Download,
  School,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useUser } from '@clerk/nextjs';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/components/ThemeProvider';

import StudentLearningModules from '../components/StudentLearningModules';
import SkillTrackCard from '../components/SkillTrackCard';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchUserRole } from '@/lib/users';
import { useSchoolContent, useStudentProgress, useSubjects, useStudentDashboard } from '@/hooks/useApi';
import { askStudyBuddy } from '@/lib/api';
import { buildUserContext } from '@/lib/chatbot/buildContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRealtimeQuizProgress } from '@/hooks/useRealtimeQuizProgress';
import { useStreak } from '@/hooks/useStreak';
import { RESOURCE_SECTION_ORDER, buildResourcePreview, extractYoutubeId, getResourceMeta, normalizeContentType } from '@student/utils/resourceHelpers';

function formatRelativeTime(value) {
  if (!value) return 'No activity yet';
  const ts = new Date(value);
  if (Number.isNaN(ts.getTime())) return 'No activity yet';
  const diffMs = Date.now() - ts.getTime();
  if (diffMs < 0) return 'Just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return ts.toISOString().split('T')[0];
}

function normalizeScore(value) {
  const numeric = typeof value === 'number' ? value : Number(value) || 0;
  return Math.round(numeric * 10) / 10;
}

function calculateLevelMetrics({ totalQuizzes = 0, averageScore = 0 }) {
  const xpTotal = Math.max(0, totalQuizzes * averageScore);
  const xpPerLevel = 1000;
  const level = Math.max(1, Math.floor(xpTotal / xpPerLevel) + 1);
  const xpFloor = (level - 1) * xpPerLevel;
  const xpIntoLevel = Math.min(xpPerLevel, Math.max(0, xpTotal - xpFloor));
  const xpRemaining = Math.max(0, xpPerLevel - xpIntoLevel);

  return {
    level,
    xpTotal,
    xpIntoLevel,
    xpRemaining,
    xpPerLevel,
  };
}

function sumTimeSpent(entries, { days = 7 } = {}) {
  if (!Array.isArray(entries) || !entries.length) return 0;
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));

  return entries.reduce((acc, entry) => {
    if (!entry?.submittedAt) return acc;
    const submitted = new Date(entry.submittedAt);
    if (Number.isNaN(submitted.getTime())) return acc;
    if (submitted < start || submitted > now) return acc;
    return acc + (Number(entry.timeSpent) || 0);
  }, 0);
}

const getSubjectTheme = (subjectName = '', idx = 0) => {
  const s = (subjectName || '').toLowerCase();
  if (s.includes('sci') || s.includes('phy') || s.includes('chem') || s.includes('bio')) {
    return {
      bgLight: 'bg-[#ECFDF3]',
      text: 'text-[#22C55E]',
      bar: 'bg-[#22C55E]',
      iconChar: '🔬',
    };
  }
  if (s.includes('math') || s.includes('alg') || s.includes('geom') || s.includes('calc')) {
    return {
      bgLight: 'bg-[#EFF6FF]',
      text: 'text-[#3B82F6]',
      bar: 'bg-[#3B82F6]',
      iconChar: 'π',
    };
  }
  if (s.includes('eng') || s.includes('lit') || s.includes('lang') || s.includes('odia') || s.includes('hindi')) {
    return {
      bgLight: 'bg-[#FFF0F5]',
      text: 'text-[#EC4899]',
      bar: 'bg-[#EC4899]',
      iconChar: '📖',
    };
  }
  if (s.includes('comp') || s.includes('cs') || s.includes('code') || s.includes('tech') || s.includes('data')) {
    return {
      bgLight: 'bg-[#F1EEFF]',
      text: 'text-[#635BFF]',
      bar: 'bg-[#635BFF]',
      iconChar: '💻',
    };
  }
  const fallback = [
    { bgLight: 'bg-[#ECFDF3]', text: 'text-[#22C55E]', bar: 'bg-[#22C55E]', iconChar: '🔬' },
    { bgLight: 'bg-[#EFF6FF]', text: 'text-[#3B82F6]', bar: 'bg-[#3B82F6]', iconChar: 'π' },
    { bgLight: 'bg-[#FFF0F5]', text: 'text-[#EC4899]', bar: 'bg-[#EC4899]', iconChar: '📖' },
    { bgLight: 'bg-[#FFF8E7]', text: 'text-[#F59E0B]', bar: 'bg-[#F59E0B]', iconChar: '🌟' },
  ];
  return fallback[idx % fallback.length];
};

export default function DashboardV2({ user = {} }) {
  const router = useRouter();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const name = clerkUser?.fullName || clerkUser?.firstName || user.name || 'Student';
  const { t } = useI18n();
  const [gyanBotQuery, setGyanBotQuery] = useState('');
  const [gyanBotHistory, setGyanBotHistory] = useState([]);
  const [gyanBotLoading, setGyanBotLoading] = useState(false);
  const [gyanBotError, setGyanBotError] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [roleError, setRoleError] = useState(null);
  const { theme = 'light' } = useTheme();

  const studentId = clerkUser?.id || null;
  const { dashboardData } = useStudentDashboard(studentId);
  const {
    progress: quizProgress,
    loading: quizProgressLoading,
    error: quizProgressError,
    fetchProgress: fetchQuizProgress,
  } = useStudentProgress(studentId);

  const handleQuizProgressEvent = useCallback(() => {
    if (!studentId) return;
    fetchQuizProgress();
  }, [studentId, fetchQuizProgress]);

  useRealtimeQuizProgress({ studentId, onQuizEvent: handleQuizProgressEvent });

  const { streakData } = useStreak(studentId);

  const [userRoleDoc, setUserRoleDoc] = useState(null);

  useEffect(() => {
    if (!userLoaded) return;
    if (!clerkUser?.id) {
      setSchoolId(null);
      setRoleError(null);
      return;
    }
    let active = true;
    fetchUserRole(clerkUser.id)
      .then((doc) => {
        if (!active) return;
        let roleVal = typeof doc === 'string' ? doc : doc?.role;
        if (!roleVal || roleVal === 'unassigned') {
          router.replace('/role-select');
          return;
        }
        setUserRoleDoc(doc);
        const school = doc?.schoolId || doc?.school_id || null;
        setSchoolId(school);
        setRoleError(null);
      })
      .catch((error) => {
        if (!active) return;
        setSchoolId(null);
        setRoleError(error?.message || 'Unable to load profile data');
      });
    return () => {
      active = false;
    };
  }, [userLoaded, clerkUser?.id, router]);

  const schoolNameDisplay =
    dashboardData?.student?.schoolId ||
    userRoleDoc?.school_id ||
    userRoleDoc?.schoolId ||
    'School Not Set';

  const studentClassDisplay =
    dashboardData?.student?.class ||
    userRoleDoc?.class ||
    'Class Not Set';

  const profileImageUrl = clerkUser?.imageUrl || clerkUser?.profileImageUrl || null;

  // Database subjects hook
  const {
    subjects: dbSubjects,
    loading: subjectsLoading,
    error: subjectsError,
  } = useSubjects({
    classFilter: studentClassDisplay,
    schoolId: schoolId || dashboardData?.student?.schoolId,
    enabled: true,
  });

  const {
    content: schoolContent,
    loading: contentLoading,
    error: contentError,
  } = useSchoolContent(schoolId);

  const sortedSchoolContent = useMemo(() => {
    if (!Array.isArray(schoolContent)) return [];
    return [...schoolContent].sort((a, b) => {
      const aTs = new Date(a?.createdAt || 0).getTime();
      const bTs = new Date(b?.createdAt || 0).getTime();
      return bTs - aTs;
    });
  }, [schoolContent]);

  const groupedSchoolContent = useMemo(() => {
    if (!sortedSchoolContent.length) return [];
    const buckets = sortedSchoolContent.reduce((acc, item) => {
      const key = normalizeContentType(item?.type);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    return Object.entries(buckets)
      .map(([type, items]) => {
        const meta = getResourceMeta(type);
        return { ...meta, items };
      })
      .sort((a, b) => {
        const indexA = RESOURCE_SECTION_ORDER.indexOf(a.key);
        const indexB = RESOURCE_SECTION_ORDER.indexOf(b.key);
        const safeA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
        const safeB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
        if (safeA !== safeB) return safeA - safeB;
        return a.label.localeCompare(b.label);
      });
  }, [sortedSchoolContent]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const formatContentDate = (value) => {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toISOString().split('T')[0];
    } catch (error) {
      return String(value);
    }
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    return (
      <div className="space-y-1 text-[11px] leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-1.5 list-disc list-inside space-y-0.5">{children}</ul>,
            ol: ({ children }) => <ol className="mb-1.5 list-decimal list-inside space-y-0.5">{children}</ol>,
            strong: ({ children }) => <strong className="font-semibold text-[#635BFF]">{children}</strong>,
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  };

  const recentRaw = quizProgress?.recentActivity;
  const quizSummary = quizProgress?.summary || { totalQuizzes: 0, averageScore: 0, bestScore: 0 };
  const recentAttempts = useMemo(() => {
    const list = Array.isArray(recentRaw) ? recentRaw : [];
    return list.slice(0, 5);
  }, [recentRaw]);

  const levelMetrics = useMemo(
    () => calculateLevelMetrics({
      totalQuizzes: quizSummary.totalQuizzes ?? 0,
      averageScore: quizSummary.averageScore ?? 0,
    }),
    [quizSummary.totalQuizzes, quizSummary.averageScore]
  );

  const weeklyTimeSpentSeconds = useMemo(
    () => sumTimeSpent(recentRaw, { days: 7 }),
    [recentRaw]
  );

  const weeklyHours = Math.max(0, weeklyTimeSpentSeconds / 3600);
  const resourceCount = sortedSchoolContent.length;
  const totalQuizzesCompleted = quizSummary.totalQuizzes ?? 0;
  const currentStreak = streakData?.currentStreak ?? 0;

  const weeklyHoursDisplay = Number.isFinite(weeklyHours)
    ? weeklyHours >= 1
      ? `${weeklyHours.toFixed(1)} hrs`
      : `${Math.round(weeklyHours * 60)} min`
    : '--';

  const streakDisplay = Number.isFinite(currentStreak)
    ? `${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`
    : '--';

  async function handleGyanBotSubmit(prompt) {
    const trimmed = (prompt ?? gyanBotQuery).trim();
    if (!trimmed || gyanBotLoading) return;

    const nextHistory = [...gyanBotHistory, { role: 'user', content: trimmed }].slice(-10);
    setGyanBotHistory(nextHistory);
    setGyanBotQuery('');
    setGyanBotError(null);
    setGyanBotLoading(true);

    try {
      const userContext = buildUserContext(clerkUser, { school_id: schoolId, name }, { route: '/student' });
      const response = await askStudyBuddy({ question: trimmed, mode: 'answer', history: nextHistory, userContext });
      const answer = response?.answer || 'I could not generate a response.';
      setGyanBotHistory((prev) => [...prev.slice(-9), { role: 'assistant', content: answer }]);
    } catch (error) {
      setGyanBotError(error?.message || "Sorry, I'm having trouble connecting right now. Please try again.");
    } finally {
      setGyanBotLoading(false);
    }
  }

  function handleGyanBotKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleGyanBotSubmit();
    }
  }

  if (!mounted) return null;

  return (
    <div className="w-full flex flex-col xl:flex-row gap-6 lg:gap-8 pb-12">
      
      {/* =========================================
          LEFT MAIN COLUMN (70% WIDTH)
         ========================================= */}
      <div className="flex-1 w-full space-y-7 min-w-0">
        
        {/* =========================================
            WELCOME HERO BANNER (LIGHT PURPLE/BLUE GRADIENT)
           ========================================= */}
        <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 lg:p-10 border border-[#E2E8F0] shadow-xs bg-gradient-to-r from-[#F1EEFF] via-[#EFF6FF] to-[#F1EEFF] transition-all duration-300">
          
          <div className="relative z-10 max-w-2xl">
            {/* Tag pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-xs font-semibold mb-4 text-[#635BFF] border border-[#E2E8F0] shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#635BFF]" />
              <span>AI-Powered School Learning Platform</span>
            </div>

            {/* Greeting */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 tracking-tight text-[#172033] leading-tight">
              Welcome back, <br className="hidden sm:inline" />
              <span className="text-[#635BFF]">{name}!</span> 👋
            </h1>

            {/* Description text with dynamic class and school */}
            <p className="text-[#64748B] text-sm sm:text-base mb-7 max-w-xl leading-relaxed">
              Ready to learn today? You are enrolled in <span className="font-bold text-[#172033]">{studentClassDisplay}</span> at <span className="font-bold text-[#172033]">{schoolNameDisplay}</span>. Explore interactive lessons, take quizzes, and earn achievements!
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                size="lg"
                className="bg-[#635BFF] hover:bg-[#5148E5] text-white font-semibold h-11 px-6 rounded-xl shadow-md shadow-[#635BFF]/20 transition-all hover:scale-[1.02] gap-2 text-sm"
                asChild
              >
                <Link href="/student/courses" prefetch>
                  <Play className="w-4 h-4 fill-current" />
                  Continue Learning
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="bg-white hover:bg-slate-50 text-[#635BFF] border-[#E2E8F0] font-semibold h-11 px-6 rounded-xl shadow-xs transition-all gap-2 text-sm"
                asChild
              >
                <Link href="/student/courses" prefetch>
                  <BookOpen className="w-4 h-4 text-[#635BFF]" />
                  Browse Subjects
                </Link>
              </Button>
            </div>
          </div>

          {/* Right side floating joyful badge & artwork decorative elements */}
          <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 flex-col items-center pointer-events-none select-none">
            <div className="relative">
              {/* Soft decorative glow */}
              <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-[#635BFF]/15 to-[#3B82F6]/15 blur-2xl" />
              {/* Playful EdTech floating card */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-white shadow-lg border border-[#E2E8F0] flex items-center justify-center p-3 transform rotate-6 hover:rotate-0 transition-transform">
                  <img src="/logo.webp" alt="Gyanaratna" className="w-full h-full object-contain" />
                </div>
                <div className="mt-3 px-3 py-1 bg-white rounded-full shadow-xs border border-[#E2E8F0] text-[11px] font-extrabold text-[#635BFF] transform -rotate-3">
                  Learn • Practice • Grow
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================
            5 QUICK METRICS STRIP (CLEAN WHITE CARDS)
           ========================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Level */}
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#ECFDF3] text-[#22C55E] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#172033] block truncate">
                  Level {levelMetrics.level}
                </span>
                <span className="text-[10px] text-[#64748B] block truncate">
                  {Math.round(levelMetrics.xpIntoLevel)} / {levelMetrics.xpPerLevel} XP
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="w-full bg-[#ECFDF3] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#22C55E] h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, (levelMetrics.xpIntoLevel / levelMetrics.xpPerLevel) * 100))}%` }}
                />
              </div>
              <span className="text-[10px] text-[#64748B] block">
                {Math.max(0, Math.round(levelMetrics.xpRemaining))} XP to Level {levelMetrics.level + 1}
              </span>
            </div>
          </div>

          {/* Card 2: This Week */}
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] block">
                This Week
              </span>
              <span className="text-lg font-black text-[#172033] tracking-tight block">
                {weeklyHoursDisplay}
              </span>
              <span className="text-[10px] text-[#64748B] block">Learning Time</span>
            </div>
          </div>

          {/* Card 3: Resources */}
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="w-8 h-8 rounded-full bg-[#F1EEFF] text-[#635BFF] flex items-center justify-center mb-2">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] block">
                Resources
              </span>
              <span className="text-lg font-black text-[#172033] tracking-tight block">
                {resourceCount}
              </span>
              <span className="text-[10px] text-[#64748B] block">Study Materials</span>
            </div>
          </div>

          {/* Card 4: Quizzes */}
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="w-8 h-8 rounded-full bg-[#FFF8E7] text-[#F59E0B] flex items-center justify-center mb-2">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] block">
                Quizzes
              </span>
              <span className="text-lg font-black text-[#172033] tracking-tight block">
                {totalQuizzesCompleted}
              </span>
              <span className="text-[10px] text-[#64748B] block">Completed</span>
            </div>
          </div>

          {/* Card 5: Streak */}
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:shadow-md transition-all flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="w-8 h-8 rounded-full bg-[#FFF1ED] text-[#F97316] flex items-center justify-center mb-2">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] block">
                Streak
              </span>
              <span className="text-lg font-black text-[#172033] tracking-tight block">
                {streakDisplay}
              </span>
              <span className="text-[10px] text-[#64748B] block">Keep it going!</span>
            </div>
          </div>
        </div>

        {/* =========================================
            MY SCHOOL SUBJECTS (CLEAN WHITE CARDS)
           ========================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#F1EEFF] text-[#635BFF] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#172033] tracking-tight leading-none">
                  My School Subjects
                </h2>
                <p className="text-xs text-[#64748B] font-medium mt-1">
                  {studentClassDisplay} Curriculum
                </p>
              </div>
            </div>
            <Link
              href="/student/courses"
              className="text-xs font-bold text-[#635BFF] hover:text-[#5148E5] hover:underline flex items-center gap-1"
            >
              View All →
            </Link>
          </div>

          {subjectsLoading ? (
            <div className="py-8 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
              Loading your subjects...
            </div>
          ) : dbSubjects && dbSubjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dbSubjects.map((subj, idx) => {
                const themeInfo = getSubjectTheme(subj.name, idx);
                return (
                  <div
                    key={subj.id || subj.name}
                    className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Subject Icon Box */}
                      <div
                        className={`w-12 h-12 rounded-xl ${themeInfo.bgLight} ${themeInfo.text} flex items-center justify-center text-2xl font-bold mb-4 shadow-xs group-hover:scale-105 transition-transform`}
                      >
                        {subj.icon ? subj.icon : themeInfo.iconChar}
                      </div>

                      {/* Title & Mastery */}
                      <h3 className="font-extrabold text-base text-[#172033] tracking-tight truncate">
                        {subj.name}
                      </h3>
                      <p className="text-xs text-[#64748B] font-medium mt-0.5 mb-3">
                        0% Mastered
                      </p>

                      {/* Mini Progress Bar */}
                      <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden mb-5">
                        <div className={`${themeInfo.bar} h-1.5 rounded-full w-0`} />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0]">
                      <Button
                        size="sm"
                        className="bg-[#635BFF] hover:bg-[#5148E5] text-white font-semibold text-xs h-9 rounded-xl shadow-xs"
                        asChild
                      >
                        <Link
                          href={`/student/courses?subject=${encodeURIComponent(subj.name)}`}
                          prefetch
                        >
                          Start Learning
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#E2E8F0] text-[#172033] font-semibold text-xs h-9 rounded-xl hover:bg-slate-50"
                        asChild
                      >
                        <Link href="/student/quiz" prefetch className="gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-[#F59E0B]" />
                          Quiz
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
              No subjects enrolled for {studentClassDisplay} yet.
            </div>
          )}
        </div>

        {/* =========================================
            CONTINUE LEARNING & INTERACTIVE MODULES
           ========================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#F1EEFF] text-[#635BFF] flex items-center justify-center">
                <Play className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#172033] tracking-tight leading-none">
                  Continue Learning
                </h2>
                <p className="text-xs text-[#64748B] font-medium mt-1">
                  Pick up where you left off
                </p>
              </div>
            </div>
            <Link
              href="/student/courses"
              className="text-xs font-bold text-[#635BFF] hover:text-[#5148E5] hover:underline flex items-center gap-1"
            >
              View All →
            </Link>
          </div>

          {/* Interactive Learning Modules Engine */}
          <StudentLearningModules />
        </div>

        {/* =========================================
            TEACHER SHARED RESOURCES SECTION
           ========================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FFF8E7] text-[#F59E0B] flex items-center justify-center">
                <School className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#172033] tracking-tight leading-none">
                  Teacher Shared Resources
                </h2>
                <p className="text-xs text-[#64748B] font-medium mt-1">
                  Direct materials from {schoolNameDisplay}
                </p>
              </div>
            </div>
            <Badge className="bg-[#FFF8E7] text-[#F59E0B] border-none text-[11px] font-semibold">
              School Feed
            </Badge>
          </div>

          <Card className="rounded-2xl border border-[#E2E8F0] shadow-xs bg-white overflow-hidden">
            <CardContent className="p-6">
              {roleError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3.5">
                  {roleError}
                </div>
              )}

              {schoolId && !roleError && (
                <div className="space-y-5">
                  {contentError && (
                    <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3.5">
                      {contentError}
                    </div>
                  )}

                  {contentLoading && !groupedSchoolContent.length ? (
                    <div className="py-6 text-center text-xs text-[#64748B]">
                      Loading resources...
                    </div>
                  ) : groupedSchoolContent.length ? (
                    groupedSchoolContent.map((section) => {
                      const SectionIcon = section.icon;
                      return (
                        <div key={section.key} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#172033] font-bold text-sm">
                              <SectionIcon className="w-4 h-4 text-[#F59E0B]" />
                              <span>{section.label}</span>
                            </div>
                            <span className="text-[11px] font-medium text-[#64748B]">
                              {section.items.length} item{section.items.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {section.items.map((item) => (
                              <div
                                key={item.id}
                                className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FC] hover:border-[#635BFF]/40 transition-colors flex items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xs text-[#172033] truncate">
                                    {item.title}
                                  </h4>
                                  <p className="text-[10px] text-[#64748B] truncate mt-0.5">
                                    {item.description || formatContentDate(item.createdAt)}
                                  </p>
                                </div>
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg bg-white text-[#635BFF] hover:text-[#5148E5] shadow-xs border border-[#E2E8F0] shrink-0"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-[#64748B]">
                      No materials uploaded for your school yet.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* =========================================
          RIGHT COLUMN (SIDEBAR WIDGETS - 30% WIDTH)
         ========================================= */}
      <div className="w-full xl:w-80 space-y-5 shrink-0">
        
        {/* =========================================
            1. STUDENT PROFILE CARD (CLEAN WHITE CARD)
           ========================================= */}
        <Card className="rounded-2xl border border-[#E2E8F0] shadow-xs bg-white overflow-hidden">
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={name}
                  className="w-13 h-13 rounded-2xl object-cover ring-2 ring-[#635BFF]/20 shadow-xs"
                />
              ) : (
                <div className="w-13 h-13 rounded-2xl bg-[#F1EEFF] text-[#635BFF] flex items-center justify-center text-lg font-black shadow-xs">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-[#172033] truncate tracking-tight">
                  {name}
                </h3>
                <p className="text-[11px] text-[#64748B] font-medium truncate flex items-center gap-1.5 mt-0.5">
                  <span>{studentClassDisplay}</span>
                  <span>•</span>
                  <span className="truncate">🏫 {schoolNameDisplay}</span>
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-[11px] font-bold border-[#E2E8F0] text-[#635BFF] hover:bg-[#F1EEFF] shrink-0 h-8 px-2.5"
              asChild
            >
              <Link href="/settings">
                View Profile →
              </Link>
            </Button>
          </div>
        </Card>

        {/* =========================================
            2. LEVEL PROGRESSION CARD (CLEAN WHITE CARD)
           ========================================= */}
        <Card className="rounded-2xl border border-[#E2E8F0] shadow-xs bg-white p-5">
          <div className="flex items-center gap-3.5 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF8E7] text-[#F59E0B] flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-[#F59E0B] text-[#F59E0B]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-[#172033]">
                  Level {levelMetrics.level}
                </h4>
                <span className="text-xs font-bold text-[#635BFF]">
                  {Math.round(levelMetrics.xpIntoLevel)} / {levelMetrics.xpPerLevel} XP
                </span>
              </div>
              <p className="text-[10px] text-[#64748B] font-medium mt-0.5">
                {Math.max(0, Math.round(levelMetrics.xpRemaining))} XP to Level {levelMetrics.level + 1}
              </p>
            </div>
          </div>
          <div className="w-full bg-[#EFF6FF] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#635BFF] h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, (levelMetrics.xpIntoLevel / levelMetrics.xpPerLevel) * 100))}%`,
              }}
            />
          </div>
        </Card>

        {/* =========================================
            3. ACHIEVEMENTS & LEADERBOARD TWIN CARDS
           ========================================= */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Achievements */}
          <Link href="/student/achievements" className="group">
            <Card className="rounded-2xl border border-[#E2E8F0] shadow-xs bg-white p-4 group-hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-xl bg-[#FFF8E7] text-[#F59E0B] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Star className="w-5 h-5 fill-[#F59E0B] text-[#F59E0B]" />
              </div>
              <div className="text-[11px] font-semibold text-[#64748B]">
                Achievements
              </div>
              <div className="text-2xl font-black text-[#172033] tracking-tight my-0.5">
                {dashboardData?.achievements?.length ?? 0}
              </div>
              <div className="text-[10px] text-[#64748B] font-medium">Badges Earned</div>
            </Card>
          </Link>

          {/* Leaderboard */}
          <Link href="/student/leaderboard" className="group">
            <Card className="rounded-2xl border border-[#E2E8F0] shadow-xs bg-white p-4 group-hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-xl bg-[#F1EEFF] text-[#635BFF] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Trophy className="w-5 h-5 text-[#635BFF]" />
              </div>
              <div className="text-[11px] font-semibold text-[#64748B]">
                Leaderboard
              </div>
              <div className="text-2xl font-black text-[#172033] tracking-tight my-0.5">
                -
              </div>
              <div className="text-[10px] text-[#64748B] font-medium">Your Rank</div>
            </Card>
          </Link>
        </div>

        {/* =========================================
            4. ASK GYAN-BOT CARD (AI STUDY BUDDY)
           ========================================= */}
        <Card className="rounded-2xl border border-[#E2E8F0] shadow-xs bg-white p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#F1EEFF] text-[#635BFF] flex items-center justify-center shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-[#172033] tracking-tight leading-none">
                Ask Gyan-Bot
              </h4>
              <p className="text-[11px] text-[#64748B] font-medium mt-1">
                Your AI Study Buddy
              </p>
            </div>
          </div>

          {/* Prompt input box */}
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Ask about Science, Math, etc..."
              value={gyanBotQuery}
              onChange={(e) => setGyanBotQuery(e.target.value)}
              onKeyDown={handleGyanBotKeyDown}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F7F8FC] text-xs text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF] transition-all placeholder:text-[#64748B]"
            />
            <button
              onClick={() => handleGyanBotSubmit()}
              disabled={gyanBotLoading || !gyanBotQuery.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#635BFF] hover:bg-[#5148E5] disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>

          {/* Suggestion pill buttons */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {['Photosynthesis', 'Pythagoras Theorem', 'Fractions', 'Water Cycle'].map((topic) => (
              <button
                key={topic}
                onClick={() => handleGyanBotSubmit(topic)}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F1EEFF] hover:bg-[#E0DAFF] text-[#635BFF] transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Chat history preview */}
          {gyanBotHistory.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-2 mb-3 pr-1 scrollbar-thin">
              {gyanBotHistory.slice(-4).map((entry, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                    entry.role === 'user'
                      ? 'bg-[#F1EEFF] text-[#172033] ml-4 font-medium'
                      : 'bg-[#F7F8FC] text-[#172033] mr-2'
                  }`}
                >
                  <span className="block font-bold text-[9px] uppercase tracking-wider text-[#64748B] mb-0.5">
                    {entry.role === 'user' ? 'You' : 'Gyan-Bot'}
                  </span>
                  {renderFormattedText(entry.content)}
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs font-semibold rounded-xl border-[#E2E8F0] text-[#172033] hover:bg-[#F7F8FC] h-9"
            asChild
          >
            <Link href="/student/study-buddy">
              Open Full Screen Chat →
            </Link>
          </Button>
        </Card>

        {/* =========================================
            5. RECENT ACTIVITY CARD (CLEAN WHITE CARD)
           ========================================= */}
        <Card className="rounded-2xl border border-[#E2E8F0] shadow-xs bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <h4 className="font-extrabold text-sm text-[#172033]">
                Recent Activity
              </h4>
            </div>
            <Link
              href="/student/quiz"
              className="text-xs font-bold text-[#635BFF] hover:text-[#5148E5]"
            >
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {recentAttempts.length > 0 ? (
              recentAttempts.slice(0, 3).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-[#F7F8FC] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#172033] truncate">
                        {item.quizTitle || item.subject || 'Quiz Session'}
                      </p>
                      <p className="text-[10px] text-[#64748B]">
                        {formatRelativeTime(item.submittedAt || item.completed_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] font-semibold rounded-lg shrink-0 border-[#E2E8F0] text-[#172033] hover:bg-slate-50"
                    asChild
                  >
                    <Link href="/student/quiz">View</Link>
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-[#64748B]">
                No recent activity yet. Start a quiz to track progress!
              </div>
            )}
          </div>
        </Card>

      </div>

    </div>
  );
}
