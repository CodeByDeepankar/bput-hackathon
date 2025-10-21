import { BookOpen, Sparkles, Star, Gift, Trophy, Zap, Target, Brain, Send, TrendingUp, Clock, Award, Database, Layers, Cpu, HardDrive } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { useUser } from '@clerk/nextjs';
import { useI18n } from '@/i18n/useI18n';
import { useState } from 'react';
import SkillTrackCard from '../components/SkillTrackCard';

export default function DashboardV2({ user = {} }) {
  const { user: clerkUser } = useUser();
  const name = clerkUser?.fullName || clerkUser?.firstName || user.name || 'Student';
  const { t } = useI18n();
  const [gyanBotQuery, setGyanBotQuery] = useState('');

  // Get user metadata from Clerk
  const userYear = clerkUser?.publicMetadata?.year || '3rd Year';
  const userBranch = clerkUser?.publicMetadata?.branch || 'CSE';
  const userLevel = 10;
  const userXP = 2150;
  const maxXP = 3000;

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

  return (
    <div className="min-h-screen pb-10 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Two-Column Layout Container */}
      <div className="max-w-[1600px] mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          
          {/* ============================================================ */}
          {/* LEFT COLUMN - Main Feed (70%) */}
          {/* ============================================================ */}
          <div className="space-y-6">
            
            {/* AI-Powered Hero Banner */}
            <Card className="relative overflow-hidden border-2 border-purple-200 dark:border-purple-800 shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 opacity-90" />
              <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <CardContent className="relative z-10 p-8 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                  <p className="text-sm font-medium text-yellow-100">AI-Powered Learning Assistant</p>
                </div>
                
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                  Your AI-Powered Next Step
                </h1>
                
                <p className="text-white/90 text-base max-w-2xl mb-6">
                  Based on your recent quiz, the AI has identified a knowledge gap in <span className="font-semibold text-yellow-300">{detectedGap}</span>. 
                  Let's strengthen your foundation!
                </p>
                
                <div className="flex flex-wrap items-center gap-3">
                  <Button 
                    size="lg" 
                    className="bg-white text-purple-700 hover:bg-yellow-50 hover:text-purple-800 font-semibold shadow-lg transition-all duration-200 hover:scale-105"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Start AI-Recommended Module
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="bg-white/20 text-white border-white/40 hover:bg-white/30 backdrop-blur-sm font-semibold"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Play {recommendedGame}
                  </Button>
                </div>
                
                {/* AI Insight Badge */}
                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm border border-white/30">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span>AI Confidence: 92% match for your learning style</span>
                </div>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cseSkillTracks.map((track) => (
                    <SkillTrackCard
                      key={track.title}
                      title={track.title}
                      icon={track.icon}
                      progress={track.progress}
                      isRecommended={track.isRecommended}
                      footer={(
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                            Continue Learning
                          </Button>
                          <Button size="sm" variant="outline" className="border-gray-500 text-white hover:bg-slate-600">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Browse Courses', icon: <BookOpen className="w-5 h-5" />, color: 'from-blue-500 to-cyan-500' },
                { label: 'Take Quiz', icon: <Trophy className="w-5 h-5" />, color: 'from-purple-500 to-pink-500' },
                { label: 'Unlock Rewards', icon: <Gift className="w-5 h-5" />, color: 'from-orange-500 to-red-500' },
                { label: 'Achievements', icon: <Star className="w-5 h-5" />, color: 'from-yellow-500 to-amber-500' },
              ].map((action) => (
                <Button 
                  key={action.label}
                  variant="outline" 
                  className="h-24 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform border-2 border-slate-600 hover:border-purple-400 bg-slate-700 dark:bg-slate-800 text-white"
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
          <div className="space-y-6">
            
            {/* Student Profile Card */}
            <Card className="shadow-xl border-2 border-purple-200 dark:border-purple-800 overflow-hidden bg-slate-800 dark:bg-slate-900">
              <div className="h-20 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600" />
              <CardContent className="p-6 -mt-10">
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
                    <span className="text-sm font-medium text-white">Level {userLevel}</span>
                    <span className="text-sm font-bold text-purple-300">{userXP} / {maxXP} XP</span>
                  </div>
                  <Progress value={(userXP / maxXP) * 100} className="h-3 mb-1" />
                  <p className="text-xs text-gray-300 text-center">{maxXP - userXP} XP to Level {userLevel + 1}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'This Week', value: '4.5 hrs', icon: <Clock className="w-4 h-4" /> },
                    { label: 'Lessons', value: '12', icon: <BookOpen className="w-4 h-4" /> },
                    { label: 'Quizzes', value: '8', icon: <Trophy className="w-4 h-4" /> },
                    { label: 'Streak', value: '18 days', icon: <TrendingUp className="w-4 h-4" /> },
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
                    className="w-full px-4 py-3 pr-12 border-2 border-indigo-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-700 dark:bg-slate-900 text-white placeholder-gray-400"
                  />
                  <Button 
                    size="sm" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {['Binary Search', 'SQL Joins', 'Recursion'].map((suggestion) => (
                    <button 
                      key={suggestion}
                      className="px-3 py-1.5 text-xs bg-indigo-900/50 text-indigo-200 rounded-full hover:bg-indigo-800 border border-indigo-600"
                    >
                      {suggestion}
                    </button>
                  ))}
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
