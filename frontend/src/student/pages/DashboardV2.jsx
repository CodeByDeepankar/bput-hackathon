import { BookOpen, Sparkles, Star, Gift, Trophy, Zap, Target, Brain, Send, TrendingUp, Clock, Award, Database, Layers, Cpu, HardDrive } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useUser } from '@clerk/nextjs';
import { useI18n } from '@/i18n/useI18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchUserRole } from '@/lib/users';
import { useSchoolContent, useStudentProgress } from '@/hooks/useApi';
import SkillTrackCard from '../components/SkillTrackCard';
import { askStudyBuddy } from '@/lib/api';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRealtimeQuizProgress } from '@/hooks/useRealtimeQuizProgress';
import { useStreak } from '@/hooks/useStreak';

function formatRelativeTime(value) {
  if (!value) return 'No activity yet';
  const ts = new Date(value);
  if (Number.isNaN(ts.getTime())) return 'No activity yet';
  const diffMs = Date.now() - ts.getTime();
  if (diffMs < 0) return ts.toLocaleString();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return ts.toLocaleDateString();
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

export default function DashboardV2({ user = {} }) {
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const name = clerkUser?.fullName || clerkUser?.firstName || user.name || 'Student';
  const { t } = useI18n();
  const [gyanBotQuery, setGyanBotQuery] = useState('');
  const [gyanBotHistory, setGyanBotHistory] = useState([]);
  const [gyanBotLoading, setGyanBotLoading] = useState(false);
  const [gyanBotError, setGyanBotError] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [roleError, setRoleError] = useState(null);

  const studentId = clerkUser?.id || null;
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

  // Get user metadata from Clerk
  const userYear = clerkUser?.publicMetadata?.year || '3rd Year';
  const userBranch = clerkUser?.publicMetadata?.branch || 'CSE';

  // Simulated AI-detected knowledge gap
  const detectedGap = 'Data Structures';
  const recommendedGame = 'Big O Runner';
  
  // CSE skill tracks list (can be dynamic later)
  const cseSkillTracks = [
    {
      title: 'Data Structures',
      icon: <Layers className="w-6 h-6" />,
      progress: 60,
      isRecommended: true,
    },
    {
      title: 'Algorithms',
      icon: <Cpu className="w-6 h-6" />,
      progress: 45,
      isRecommended: false,
    },
    {
      title: 'Database Systems',
      icon: <Database className="w-6 h-6" />,
      progress: 20,
      isRecommended: false,
    },
    {
      title: 'Operating Systems',
      icon: <HardDrive className="w-6 h-6" />,
      progress: 32,
      isRecommended: false,
    },
  ];

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
        const school = doc?.schoolId || doc?.school_id || null;
        setSchoolId(school);
        setRoleError(null);
      })
      .catch((error) => {
        if (!active) return;
        setSchoolId(null);
        setRoleError(error?.message || 'Unable to load shared content');
      });
    return () => {
      active = false;
    };
  }, [userLoaded, clerkUser?.id]);

  const {
    content: schoolContent,
    loading: contentLoading,
    error: contentError,
  } = useSchoolContent(schoolId, { limit: 8 });

  const latestContent = useMemo(() => {
    if (!Array.isArray(schoolContent)) return [];
    return schoolContent.slice(0, 4);
  }, [schoolContent]);

  const formatContentDate = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString();
    } catch (error) {
      return String(value);
    }
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    return (
      <div className="space-y-2 text-[12px] leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-2 list-disc list-inside space-y-1 text-[12px]">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal list-inside space-y-1 text-[12px]">{children}</ol>,
            strong: ({ children }) => <strong className="font-semibold text-indigo-100">{children}</strong>,
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
  const resourceCount = Array.isArray(schoolContent) ? schoolContent.length : 0;
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
      const response = await askStudyBuddy({ question: trimmed, mode: 'answer', history: nextHistory });
      const answer = response?.answer || 'I could not generate a response.';
      setGyanBotHistory((prev) => [...prev.slice(-9), { role: 'assistant', content: answer }]);
    } catch (error) {
      setGyanBotError(error?.message || 'Unable to contact the AI assistant.');
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

  return (
    <div className="min-h-screen pb-10 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Two-Column Layout Container */}
      <div className="max-w-[1600px] mx-auto px-4 pt-6">
  <div className="dashboard-layout flex flex-col lg:flex-row gap-6 max-w-full">
          
          {/* ============================================================ */}
          {/* LEFT COLUMN - Main Feed (70%) */}
          {/* ============================================================ */}
          <div className="main-feed w-full lg:w-3/4 space-y-6">
            
            {/* AI-Powered Hero Banner */}
            <Card
              className="relative overflow-hidden bg-none border-2 border-purple-200 dark:border-purple-800 shadow-xl min-h-[220px] sm:min-h-[260px] md:min-h-[300px] bg-clip-border"
              style={{
                backgroundImage: 'linear-gradient(135deg,#6366f1 0%, #7c3aed 45%, #ec4899 100%)',
                WebkitBackgroundClip: 'border-box'
              }}
            >
              {/* decorative circles only on md+ */}
              <div className="hidden md:block absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="hidden md:block absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <CardContent className="relative z-10 p-4 sm:p-6 md:p-8 text-white min-h-[160px] sm:min-h-[180px] md:min-h-[220px]">
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                    <p className="text-sm font-medium text-yellow-100">AI-Powered Learning Assistant</p>
                  </div>

                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 leading-tight whitespace-normal break-words">
                    Your AI-Powered Next Step
                  </h1>

                  <p className="text-white/90 text-base max-w-full sm:max-w-2xl mb-6 whitespace-normal break-words leading-relaxed">
                    Based on your recent quiz, the AI has identified a knowledge gap in <span className="font-semibold text-yellow-300">{detectedGap}</span>. 
                    Let's strengthen your foundation!
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white text-purple-700 hover:bg-yellow-50 hover:text-purple-800 font-semibold shadow-lg transition-all duration-200 hover:scale-105 justify-center"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Start AI-Recommended Module
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto bg-white/20 text-white border-white/40 hover:bg-white/30 backdrop-blur-sm font-semibold"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Play {recommendedGame}
                  </Button>
                </div>
                
                {/* AI Insight Badge */}
                <div className="mt-4 sm:mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm border border-white/30">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span>AI Confidence: 92% match for your learning style</span>
                </div>
              </CardContent>
            </Card>

            {/* Teacher Shared Content */}
            <Card className="shadow-lg border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Teacher Shared Resources</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Latest quizzes, videos, and materials from your school</p>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200">School feed</Badge>
                </div>

                {roleError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-300">
                    {roleError}
                  </div>
                )}

                {!roleError && !schoolId && (
                  <div className="text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-lg p-4 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                    Your account is not linked to a school yet. Ask your teacher to assign you to a class to see shared resources.
                  </div>
                )}

                {schoolId && !roleError && (
                  <div className="space-y-4">
                    {contentError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-300">
                        {contentError}
                      </div>
                    )}

                    {contentLoading && !latestContent.length ? (
                      <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-300">Loading resources...</div>
                    ) : latestContent.length ? (
                      latestContent.map((item) => {
                        const preview = item.body || item.description || '';
                        const showPreview = preview ? preview.slice(0, 220) + (preview.length > 220 ? '...' : '') : '';
                        return (
                          <div key={item.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white/60 dark:bg-slate-800/80 shadow-sm space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                                  <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 uppercase">{item.type}</Badge>
                                </div>
                                {showPreview && (
                                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{showPreview}</p>
                                )}
                                {Array.isArray(item.tags) && item.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {item.tags.slice(0, 4).map((tag) => (
                                      <span key={tag} className="text-xs px-2 py-1 bg-slate-200/80 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 rounded-full border border-slate-300/70 dark:border-slate-600/70">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatContentDate(item.createdAt)}</div>
                            </div>

                            {item.type === 'video' && item.embedHtml && (
                              <div
                                className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                                dangerouslySetInnerHTML={{ __html: item.embedHtml }}
                              />
                            )}

                            {item.url && (
                              <div className="flex flex-wrap gap-3">
                                <Button
                                  size="sm"
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                  asChild
                                >
                                  <a href={item.url} target="_blank" rel="noreferrer">
                                    Open resource
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                        Your teachers have not shared new resources yet.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Engineering Skill Tracks */}
            <Card className="shadow-lg border-2 bg-slate-800 dark:bg-slate-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center text-white">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">My Engineering Skill Tracks</h2>
                      <p className="text-sm text-gray-300">Branch: {userBranch}</p>
                    </div>
                  </div>
                  <button className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                    View All →
                  </button>
                </div>
                
                <div className="skill-tracks-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cseSkillTracks.map((track) => (
                    <SkillTrackCard
                      key={track.title}
                      title={track.title}
                      icon={track.icon}
                      progress={track.progress}
                      isRecommended={track.isRecommended}
                      footer={(
                        <div className="flex flex-col sm:flex-row gap-2 mt-4">
                          <Button size="sm" className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white justify-center">
                            Continue Learning
                          </Button>
                          <Button size="sm" variant="outline" className="w-full sm:w-auto border-gray-500 text-white hover:bg-slate-600">
                            <Trophy className="w-3 h-3 mr-1" />
                            Practice
                          </Button>
                        </div>
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Browse Courses', icon: <BookOpen className="w-5 h-5" />, color: 'from-blue-500 to-cyan-500' },
                { label: 'Take Quiz', icon: <Trophy className="w-5 h-5" />, color: 'from-purple-500 to-pink-500' },
                { label: 'Unlock Rewards', icon: <Gift className="w-5 h-5" />, color: 'from-orange-500 to-red-500' },
                { label: 'Achievements', icon: <Star className="w-5 h-5" />, color: 'from-yellow-500 to-amber-500' },
              ].map((action) => (
                <Button 
                  key={action.label}
                  variant="outline" 
                  className="h-20 sm:h-24 w-full flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform border-2 border-slate-600 hover:border-purple-400 bg-slate-700 dark:bg-slate-800 text-white"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} grid place-items-center text-white`}>
                    {action.icon}
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              ))}
            </div>

          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN - Sidebar (30%) */}
          {/* ============================================================ */}
          <div className="sidebar w-full lg:w-1/4 space-y-6 lg:sticky lg:top-20">
            
            {/* Student Profile Card */}
            <Card className="shadow-xl border-2 border-purple-200 dark:border-purple-800 overflow-hidden bg-slate-800 dark:bg-slate-900">
              <div className="h-20 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600" />
              {/* avoid negative overlap on small screens to prevent hero/content overlap */}
              <CardContent className="p-6 mt-0 md:-mt-10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-white dark:border-slate-900 grid place-items-center text-3xl font-bold text-white shadow-lg mb-4">
                  {name.charAt(0)}
                </div>
                
                <h3 className="text-xl font-bold mb-1 text-white">{name}</h3>
                <p className="text-sm text-gray-300 mb-4">
                  {userYear} B.Tech - {userBranch}
                </p>
                
                {/* Level & XP */}
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-4 mb-4 border border-purple-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">Level {levelMetrics.level}</span>
                    <span className="text-sm font-bold text-purple-300">{Math.round(levelMetrics.xpIntoLevel)} / {levelMetrics.xpPerLevel} XP</span>
                  </div>
                  <Progress value={levelMetrics.xpPerLevel ? (levelMetrics.xpIntoLevel / levelMetrics.xpPerLevel) * 100 : 0} className="h-3 mb-1" />
                  <p className="text-xs text-gray-300 text-center">{Math.max(0, Math.round(levelMetrics.xpRemaining))} XP to Level {levelMetrics.level + 1}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: 'This Week',
                      value: weeklyHoursDisplay,
                      icon: <Clock className="w-4 h-4" />,
                    },
                    { label: 'Resources', value: resourceCount, icon: <BookOpen className="w-4 h-4" /> },
                    { label: 'Quizzes', value: totalQuizzesCompleted, icon: <Trophy className="w-4 h-4" /> },
                    {
                      label: 'Streak',
                      value: streakDisplay,
                      icon: <TrendingUp className="w-4 h-4" />,
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-slate-700 dark:bg-slate-800 border-2 border-slate-600 rounded-lg p-3 text-center hover:border-purple-400 transition-colors">
                      <div className="flex items-center justify-center mb-1 text-purple-400">
                        {stat.icon}
                      </div>
                      <div className="text-xs text-gray-300 mb-1">{stat.label}</div>
                      <div className="text-lg font-bold text-white">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quiz Progress Card */}
            {studentId && (
              <Card className="shadow-lg border-2 border-emerald-300/60 dark:border-emerald-800 bg-slate-800 dark:bg-slate-900">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-300" />
                      <h3 className="text-sm font-semibold text-white uppercase tracking-wide">My Quiz Progress</h3>
                    </div>
                    <Badge className="bg-emerald-600/30 text-emerald-200 border border-emerald-500/50">Live</Badge>
                  </div>

                  {quizProgressError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                      {quizProgressError}
                    </div>
                  )}

                  {!quizProgressError && (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">Quizzes</div>
                          <div className="text-lg font-bold text-white">{quizSummary.totalQuizzes ?? 0}</div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">Average</div>
                          <div className="text-lg font-bold text-emerald-300">{normalizeScore(quizSummary.averageScore)}%</div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">Best</div>
                          <div className="text-lg font-bold text-emerald-300">{normalizeScore(quizSummary.bestScore)}%</div>
                        </div>
                      </div>

                      {quizProgressLoading && !recentAttempts.length ? (
                        <div className="text-xs text-slate-300 text-center py-4">Loading your recent attempts...</div>
                      ) : recentAttempts.length ? (
                        <div className="space-y-2">
                          {recentAttempts.map((attempt) => (
                            <div
                              key={attempt.id}
                              className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/50 border border-slate-700/60 px-3 py-2 text-xs text-slate-200"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-white truncate">{attempt.quizTitle}</div>
                                <div className="text-[11px] text-slate-400 truncate">{formatRelativeTime(attempt.submittedAt)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-emerald-300">{normalizeScore(attempt.score)}%</div>
                                {attempt.correctAnswers != null && attempt.totalQuestions != null && (
                                  <div className="text-[11px] text-slate-400">
                                    {attempt.correctAnswers}/{attempt.totalQuestions} correct
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-300 text-center py-4">
                          You have not completed a quiz yet. Start one to see your progress here.
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Gyan-Bot Card */}
            <Card className="shadow-lg border-2 border-indigo-200 dark:border-indigo-800 bg-slate-800 dark:bg-slate-900">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center text-white shadow-lg">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Ask Gyan-Bot</h3>
                    <p className="text-xs text-gray-300">Your AI Study Buddy</p>
                  </div>
                </div>
                
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Ask about any engineering concept..."
                    value={gyanBotQuery}
                    onChange={(e) => setGyanBotQuery(e.target.value)}
                    onKeyDown={handleGyanBotKeyDown}
                    className="w-full px-4 py-3 pr-12 border-2 border-indigo-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-700 dark:bg-slate-900 text-white placeholder-gray-400"
                  />
                  <Button 
                    size="sm" 
                    disabled={gyanBotLoading || !gyanBotQuery.trim()}
                    onClick={() => handleGyanBotSubmit()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {['Binary Search', 'SQL Joins', 'Recursion'].map((suggestion) => (
                    <button 
                      key={suggestion}
                      onClick={() => handleGyanBotSubmit(suggestion)}
                      className="px-3 py-1.5 text-xs bg-indigo-900/50 text-indigo-200 rounded-full hover:bg-indigo-800 border border-indigo-600"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="mt-4 w-full border-indigo-600 text-indigo-100 hover:bg-indigo-900/60 bg-transparent"
                >
                  <Link href="/student/study-buddy">Open Full Screen Study Buddy</Link>
                </Button>

                {gyanBotError && (
                  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {gyanBotError}
                  </div>
                )}

                <div className="mt-4 max-h-56 overflow-y-auto space-y-3">
                  {gyanBotHistory.length === 0 && !gyanBotLoading && (
                    <p className="text-xs text-indigo-200/80">
                      Try a quick question like "What is Big O notation?" or click a suggestion to begin.
                    </p>
                  )}

                  {gyanBotHistory.map((entry, index) => (
                    <div
                      key={`${entry.role}-${index}`}
                      className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                        entry.role === 'user'
                          ? 'bg-indigo-900/60 text-indigo-100 border border-indigo-700'
                          : 'bg-slate-900/70 text-indigo-100 border border-indigo-700/60'
                      }`}
                    >
                      <span className="block font-semibold mb-1 text-[11px] uppercase tracking-wide">
                        {entry.role === 'user' ? 'You' : 'Gyan-Bot'}
                      </span>
                      <span className="text-[12px] leading-relaxed">{renderFormattedText(entry.content)}</span>
                    </div>
                  ))}

                  {gyanBotLoading && (
                    <div className="flex items-center gap-2 text-xs text-indigo-200">
                      <div className="h-2 w-2 animate-ping rounded-full bg-indigo-300" />
                      Thinking...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Today's AI Challenge */}
            <Card className="shadow-lg border-2 border-orange-200 dark:border-orange-800 bg-slate-800 dark:bg-slate-900">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 grid place-items-center text-2xl shadow-lg">
                    🎯
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Today's AI Challenge</h3>
                    <p className="text-xs text-gray-300">Personalized for you</p>
                  </div>
                </div>
                
                <p className="text-sm mb-4 text-gray-200">
                  Bridge a <span className="font-bold text-orange-400">5-question knowledge gap</span> in <span className="font-bold text-white">SQL Joins</span>.
                </p>
                
                <Progress value={40} className="h-2.5 mb-3" />
                <p className="text-xs text-gray-300 mb-4">2 of 5 questions completed</p>
                
                <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">
                  <Target className="w-4 h-4 mr-2" />
                  Start Challenge
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="shadow-lg bg-slate-800 dark:bg-slate-900">
              <CardContent className="p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
                  <Award className="w-5 h-5 text-purple-400" />
                  Recent Activity
                </h3>
                
                <div className="space-y-3">
                  {[
                    { title: 'Operating Systems Quiz', time: '1 hour ago', icon: '💻', color: 'bg-blue-500/20 text-blue-300 border border-blue-500' },
                    { title: 'Database Normalization', time: '1 day ago', icon: '🗄️', color: 'bg-green-500/20 text-green-300 border border-green-500' },
                    { title: 'Algorithm Master Badge', time: '2 days ago', icon: '🏆', color: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500' },
                    { title: 'Computer Networks Lab', time: '3 days ago', icon: '🌐', color: 'bg-purple-500/20 text-purple-300 border border-purple-500' },
                  ].map((activity) => (
                    <div key={activity.title} className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-600 hover:border-purple-400 transition-colors bg-slate-700 dark:bg-slate-800">
                      <div className={`w-10 h-10 rounded-lg ${activity.color} grid place-items-center text-lg`}>
                        {activity.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-white">{activity.title}</div>
                        <div className="text-xs text-gray-300">{activity.time}</div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-xs text-gray-300 hover:text-white hover:bg-slate-600">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
