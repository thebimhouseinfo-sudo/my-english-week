import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Flame, 
  Star, 
  Play, 
  HelpCircle, 
  Volume2, 
  ChevronRight, 
  CheckCircle, 
  RotateCcw, 
  Smile, 
  BookOpen, 
  Check, 
  BookMarked,
  Settings,
  Lock
} from 'lucide-react';

import { DayName, DayProgression, UserStats } from './types';
import ProgressBar from './components/ProgressBar';
import SceneRenderer from './components/SceneRenderer';
import DailyReview from './components/DailyReview';
import { useSpeech } from './hooks/useSpeech';
import { sounds } from './utils/soundEngine';
import CuteIcon from './components/CuteIcon';
import { getStorySkeletonForDay } from './data/phrases/phraseEngine';
import { persistStats, retrieveStats, clearAllStats } from './utils/storage';

// Cozy home character display vectors
import { GrandmaVector, BedroomVector, SchoolVector, ParkVector } from './components/KidsVectors';

const DAYS_OF_WEEK: DayName[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const AVATAR_LIST = [
  { id: 'fox', emoji: '🦊', name: 'Zippy Fox', desc: 'Cáo Zippy đỏ lanh lợi', unlockCount: 20, spriteIndex: 0 },
  { id: 'bunny', emoji: '🐰', name: 'Bunny Hop', desc: 'Thỏ Bunny hoạt bát tinh anh', unlockCount: 50, spriteIndex: 1 },
  { id: 'lion', emoji: '🦁', name: 'Rory Lion', desc: 'Sư Tử Rory can đảm lãnh đạo', unlockCount: 100, spriteIndex: 2 },
  { id: 'panda', emoji: '🐼', name: 'Pandy Panda', desc: 'Gấu Trúc Pandy lười biếng dễ thương', unlockCount: 200, spriteIndex: 3 },
  { id: 'koala', emoji: '🐨', name: 'Koko Koala', desc: 'Koala Koko ấm áp thích ôm ôm', unlockCount: 400, spriteIndex: 4 },
  { id: 'monkey', emoji: '🐵', name: 'Momo Monkey', desc: 'Khỉ Momo lém lỉnh nhanh nhẹn', unlockCount: 700, spriteIndex: 5 },
  { id: 'frog', emoji: '🐸', name: 'Flippy Frog', desc: 'Ếch Flippy vui nhộn nhảy nhót', unlockCount: 1000, spriteIndex: 6 },
  { id: 'tiger', emoji: '🐯', name: 'Tiggy Tiger', desc: 'Hổ Tiggy dũng mãnh đầy năng lượng', unlockCount: 1500, spriteIndex: 7 },
  { id: 'pig', emoji: '🐷', name: 'Piggy Pink', desc: 'Heo hồng Piggy béo ú ham ăn', unlockCount: 2000, spriteIndex: 8 },
  { id: 'cat', emoji: '🐱', name: 'Kitty Cat', desc: 'Mèo Kitty ngọt ngào đài các', unlockCount: 5000, spriteIndex: 10 }
];

export function getAchievementTitle(uniqueCount: number): { title: string; emoji: string } {
  if (uniqueCount >= 1000) return { title: 'English Master', emoji: '👑' };
  if (uniqueCount >= 500) return { title: 'English Star', emoji: '🏆' };
  if (uniqueCount >= 250) return { title: 'Super Speaker', emoji: '🚀' };
  if (uniqueCount >= 100) return { title: 'English Explorer', emoji: '🌳' };
  if (uniqueCount >= 50) return { title: 'Brave Speaker', emoji: '🌿' };
  return { title: 'First Words', emoji: '🌱' };
}

export function getAvatarSpriteStyles(avatar: string) {
  const found = AVATAR_LIST.find(a => a.emoji === avatar || a.id === avatar);
  const index = found ? found.spriteIndex : 0;
  const col = index % 4;
  const row = Math.floor(index / 4);
  const x = col === 0 ? 0 : (col / 3) * 100;
  const y = row === 0 ? 0 : (row / 2) * 100;
  return {
    backgroundImage: "url('avatar.png')",
    backgroundSize: '400% 300%',
    backgroundPosition: `${x}% ${y}%`,
    backgroundRepeat: 'no-repeat',
  };
}

export function getCurrentCompanion(totalSentences: number) {
  const sorted = [...AVATAR_LIST].reverse();
  const unlocked = sorted.filter(char => totalSentences >= char.unlockCount);
  if (unlocked.length > 0) {
    return unlocked[0];
  }
  return AVATAR_LIST[0]; // Cáo Zippy is the default companion
}

const DEFAULT_STATS: UserStats = {
  completedDays: [],
  currentStreak: 1,
  totalStars: 0,
  weeklyProgress: {
    Monday: 'not_started',
    Tuesday: 'not_started',
    Wednesday: 'not_started',
    Thursday: 'not_started',
    Friday: 'not_started',
    Saturday: 'not_started',
    Sunday: 'not_started',
  },
  kidName: '',
  avatar: '🦊',
  totalSentencesSpoken: 0,
  spokenPhraseIds: [],
  daysPlayed: 0,
  bestPhrases: [],
  lastPlayedDay: null,
  lastSceneIndex: 0
};

export default function App() {
  const speech = useSpeech();

  // Navigation states: 'welcome' | 'playing' | 'review'
  const [navState, setNavState] = useState<'welcome' | 'playing' | 'review'>('welcome');
  const [selectedDay, setSelectedDay] = useState<DayName | null>(null);
  
  // Weekly student profile stats
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  
  // Active recommended day on homepage living day deck
  const [selectedDayOnHome, setSelectedDayOnHome] = useState<DayName>('Monday');
  const [tempName, setTempName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦊');
  const [showMobileTipBanner, setShowMobileTipBanner] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  const MOBILE_TIP_DISMISSED_KEY = 'my_english_week_mobile_tip_dismissed';

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);
    const isMobile = isIOS || isAndroid;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    let alreadyDismissed = false;
    try {
      alreadyDismissed = localStorage.getItem(MOBILE_TIP_DISMISSED_KEY) === '1';
    } catch (e) {}

    setIsIOSDevice(isIOS);

    if (isMobile && !isStandalone && !alreadyDismissed) {
      setShowMobileTipBanner(true);
    }
  }, []);

  const dismissMobileTipBanner = () => {
    setShowMobileTipBanner(false);
    try {
      localStorage.setItem(MOBILE_TIP_DISMISSED_KEY, '1');
    } catch (e) {}
  };

  // Parent control states
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [mathNum1, setMathNum1] = useState(0);
  const [mathNum2, setMathNum2] = useState(0);
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathError, setMathError] = useState(false);
  const [parentModeUnlocked, setParentModeUnlocked] = useState(false);

  const openParentModal = () => {
    sounds.playClick();
    const num1 = Math.floor(Math.random() * 9) + 2; // 2 to 10
    const num2 = Math.floor(Math.random() * 9) + 2; // 2 to 10
    setMathNum1(num1);
    setMathNum2(num2);
    setMathAnswer('');
    setMathError(false);
    setParentModeUnlocked(false);
    setIsParentModalOpen(true);
  };

  // Active daylight routine progression
  const [dayProgression, setDayProgression] = useState<DayProgression>({
    dayName: 'Monday',
    currentSceneIndex: 0,
    selectedBreakfast: null,
    bathroomActions: [],
    weekendActivity: null,
    questionsAnswers: [],
    timelineSentences: []
  });

  // Load parent/kid stats on mount
  useEffect(() => {
    retrieveStats(DEFAULT_STATS).then(loadedStats => {
      setStats(loadedStats);
    });
  }, []);

  // Sync selected day on homepage recommendation to map to actual current day on device
  useEffect(() => {
    const todayIndex = new Date().getDay();
    const systemDay = DAYS_OF_WEEK[todayIndex === 0 ? 6 : todayIndex - 1];
    setSelectedDayOnHome(systemDay || 'Monday');
  }, [stats.kidName]);

  // Voice welcome on landing
  useEffect(() => {
    if (navState === 'welcome' && stats.kidName) {
      const timer = setTimeout(() => {
        speech.speak(`Welcome back, ${stats.kidName}!`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [navState, stats.kidName]);

  // Persist kid stats
  const saveStats = (newStats: UserStats) => {
    setStats(newStats);
    persistStats(newStats).catch(console.error);
  };

  // Lưu lại vị trí scene hiện tại mỗi khi bé tiến qua một câu/scene mới,
  // để nếu bé thoát app giữa bài học thì lần sau vào lại sẽ tiếp tục đúng chỗ đó
  useEffect(() => {
    if (navState !== 'playing' || !selectedDay) return;

    setStats(prev => {
      if (prev.lastPlayedDay === selectedDay && prev.lastSceneIndex === dayProgression.currentSceneIndex) {
        return prev;
      }
      const updated: UserStats = {
        ...prev,
        lastPlayedDay: selectedDay,
        lastSceneIndex: dayProgression.currentSceneIndex
      };
      persistStats(updated).catch(console.error);
      return updated;
    });
  }, [navState, selectedDay, dayProgression.currentSceneIndex]);

  // Register and persist speech telemetry events in real-time
  const registerSpeechReport = (text: string, stars: number) => {
    if (stars < 3) return; // Only process pass scores (>= 3 stars)

    setStats(prev => {
      const totalSentencesSpoken = (prev.totalSentencesSpoken || 0) + 1;
      
      // Clean and map text to a unique phrase identifier
      const phraseId = text.toLowerCase()
        .trim()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
        .replace(/\s+/g, "_");

      const spokenPhraseIds = [...(prev.spokenPhraseIds || [])];
      if (!spokenPhraseIds.includes(phraseId)) {
        spokenPhraseIds.push(phraseId);
      }

      // Track the top 3 highest star phrases
      let bestPhrases = [...(prev.bestPhrases || [])];
      const existingIndex = bestPhrases.findIndex(p => p.phraseId === phraseId);
      
      if (existingIndex > -1) {
        if (stars > bestPhrases[existingIndex].stars) {
          bestPhrases[existingIndex] = {
            phraseId,
            text,
            stars,
            day: selectedDay || 'Monday'
          };
        }
      } else {
        bestPhrases.push({
          phraseId,
          text,
          stars,
          day: selectedDay || 'Monday'
        });
      }

      // Sort rating descending, keep top 3
      bestPhrases.sort((a, b) => b.stars - a.stars);
      bestPhrases = bestPhrases.slice(0, 3);

      const nextComp = getCurrentCompanion(totalSentencesSpoken);
      // Removed unlocking companion spoken notification to only keep welcome messages

      const updated: UserStats = {
        ...prev,
        totalSentencesSpoken,
        spokenPhraseIds,
        bestPhrases,
        avatar: nextComp.emoji
      };

      persistStats(updated).catch(console.error);
      return updated;
    });
  };

  // Launch a specific day's adventure loop
  const handleStartDay = (day: DayName) => {
    sounds.playClick();
    setSelectedDay(day);
    setNavState('playing');

    // Nếu bé đang quay lại đúng ngày đang học dở, khôi phục lại scene đã dừng trước đó
    const resumeIndex = (stats.lastPlayedDay === day && typeof stats.lastSceneIndex === 'number')
      ? stats.lastSceneIndex
      : 0;

    // Construct default progression for the chosen day
    const defaultProg: DayProgression = {
      dayName: day,
      currentSceneIndex: resumeIndex,
      selectedBreakfast: null,
      bathroomActions: [],
      weekendActivity: null,
      questionsAnswers: [],
      timelineSentences: []
    };
    
    setDayProgression(defaultProg);
    // Removed start day greeting voice output
  };

  // Move forward through scenes
  const handleSceneComplete = () => {
    const isWeekend = selectedDay === 'Saturday' || selectedDay === 'Sunday';
    const dayType = selectedDay === 'Sunday' ? 'sunday' : selectedDay === 'Saturday' ? 'saturday' : 'weekday';
    const skeleton = getStorySkeletonForDay(dayType);
    const totalScenes = skeleton.length;

    if (dayProgression.currentSceneIndex < totalScenes - 1) {
      // Proceed to next scene
      setDayProgression(prev => ({
        ...prev,
        currentSceneIndex: prev.currentSceneIndex + 1
      }));
    } else {
      // Initiates the End-of-day Oral Review
      setNavState('review');
      // Removed transition to review greeting voice output
    }
  };

  // Update dayState helper callback
  const updateDayStateHelper = (updater: (prev: DayProgression) => DayProgression) => {
    setDayProgression(prev => updater(prev));
  };

  // Jump to specific scene for testing/parents/sandbox
  const handleJumpToScene = (index: number) => {
    setDayProgression(prev => ({
      ...prev,
      currentSceneIndex: index
    }));
  };

  // Finish review and save star achievements
  const handleReviewComplete = (dayStars: number) => {
    if (!selectedDay) return;

    sounds.playSuccess();

    // Collect updated stats
    const updatedCompletedDays = [...stats.completedDays];
    if (!updatedCompletedDays.includes(selectedDay)) {
      updatedCompletedDays.push(selectedDay);
    }

    // Refresh calendar progress status
    const updatedWeeklyProgress = { ...stats.weeklyProgress };
    updatedWeeklyProgress[selectedDay] = 'passed';

    // Compute healthy streak increment
    const didAllPriorPassed = DAYS_OF_WEEK.slice(0, DAYS_OF_WEEK.indexOf(selectedDay)).every(d => 
      stats.weeklyProgress[d] === 'passed'
    );
    const newStreak = didAllPriorPassed ? stats.completedDays.length + 1 : stats.currentStreak;

    const newStats: UserStats = {
      completedDays: updatedCompletedDays,
      currentStreak: Math.max(newStreak, 1),
      totalStars: stats.totalStars + dayStars,
      weeklyProgress: updatedWeeklyProgress,
      kidName: stats.kidName,
      avatar: stats.avatar,
      totalSentencesSpoken: stats.totalSentencesSpoken,
      spokenPhraseIds: stats.spokenPhraseIds,
      daysPlayed: (stats.daysPlayed || 0) + 1,
      bestPhrases: stats.bestPhrases,
      // Đã hoàn thành ngày này, xóa vị trí tiếp tục để lần sau bắt đầu lại từ đầu nếu chọn lại ngày này
      lastPlayedDay: null,
      lastSceneIndex: 0
    };

    saveStats(newStats);
    setNavState('welcome');
    setSelectedDay(null);
    // Removed congratulations passed voice output
  };

  // Reset entire score/streak to replay a brand new week!
  const handleResetProgress = () => {
    sounds.playClick();
    clearAllStats().then(() => {
      setStats(DEFAULT_STATS);
      setTempName('');
      setNavState('welcome');
      setSelectedDay(null);
      setIsParentModalOpen(false);
      setParentModeUnlocked(false);
    });
  };

  const isWeekend = selectedDay === 'Saturday' || selectedDay === 'Sunday';
  
  let totalActiveScenes = 10;
  if (selectedDay) {
    const dayType = selectedDay === 'Sunday' ? 'sunday' : selectedDay === 'Saturday' ? 'saturday' : 'weekday';
    totalActiveScenes = getStorySkeletonForDay(dayType).length;
  }

  const getHeroFrameIndex = (day: DayName) => {
    if (day === 'Saturday' || day === 'Sunday') {
      return 9;
    }
    return 0;
  };

  const getDayGreeting = (day: DayName) => {
    if (day === 'Saturday' || day === 'Sunday') {
      return `WEEKEND ADVENTURE! ${stats.kidName ? 'LET\'S PLAY ' + stats.kidName.toUpperCase() : ''} 🎉`;
    }
    return `LIVING A NEW DAY, ${stats.kidName ? stats.kidName.toUpperCase() : ''}! ☀️`;
  };

  return (
    <div className="min-h-screen bg-[#FFF8EE] text-slate-800 pb-16 relative overflow-hidden" id="applet-viewport">
      {/* Playful background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl -z-10" />

      {/* Main navigation Header */}
      <header className="bg-white border-b-4 border-amber-100 shadow-xs sticky top-0 z-45" id="global-header">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => {
              sounds.playClick();
              setNavState('welcome');
              setSelectedDay(null);
            }} 
            className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
            id="brand-logo-btn"
          >
            <div className="px-5 py-2.5 bg-[#FF9800] text-white rounded-full font-black shadow-md transform -rotate-1 flex items-center gap-1.5 hover:rotate-0 transition-transform">
              <CuteIcon nameOrEmoji="☀️" className="h-6 w-6" />
              <span className="text-lg font-black tracking-tight leading-none font-fredoka">English Adventure</span>
            </div>
          </button>

          {/* Golden stats board for the kid */}
          <div className="flex items-center gap-2 sm:gap-3" id="stats-header-widget">
            {stats.kidName && (
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border-4 border-emerald-200 bento-shadow" id="header-avatar-badge">
                <div 
                  className="w-7 h-7 rounded-md shrink-0 border border-emerald-100/50" 
                  style={getAvatarSpriteStyles(getCurrentCompanion(stats.totalSentencesSpoken || 0).emoji)}
                />
                <span className="text-xs font-black text-emerald-900 font-vietnamese hidden sm:inline">{stats.kidName}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border-4 border-rose-200 bento-shadow" id="streak-total-badge">
              <Flame className="h-5 w-5 fill-rose-500 stroke-transparent animate-pulse" />
              <span className="text-xs sm:text-sm font-vietnamese font-black text-rose-700">{stats.currentStreak} Ngày</span>
            </div>
            
            {/* Total Stars Badge in Header */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border-4 border-amber-200 bento-shadow" id="stars-total-badge">
              <Star className="h-5 w-5 fill-amber-400 stroke-transparent animate-pulse" />
              <span className="text-xs sm:text-sm font-vietnamese font-black text-amber-700">{stats.totalStars} Sao</span>
            </div>

            {/* Parent Settings Cog */}
            <button
              onClick={openParentModal}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border-2 border-slate-200 rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-110 shrink-0 shadow-3xs"
              title="Góc Phụ Huynh"
              id="parent-settings-btn"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
 
      {/* Mobile (iOS/Android, any browser) tip banner - shown only once */}
      {showMobileTipBanner && (
        <div className="max-w-5xl mx-auto px-4 mt-4" id="mobile-tip-banner">
          <div className="bg-amber-50 border-4 border-amber-200 rounded-[2rem] p-4.5 flex items-start gap-3 shadow-xs relative">
            <span className="text-2xl shrink-0 mt-0.5">💡</span>
            <div className="flex flex-col gap-1 text-xs sm:text-sm text-amber-900 font-vietnamese">
              <span className="font-black text-amber-955">Mẹo học hay trên điện thoại:</span>
              <p className="font-medium opacity-90 leading-relaxed">
                Để không bị mất tiến trình học và không cần cấp quyền micro mỗi lần vào lại, bố mẹ hãy thêm trang này vào màn hình chính nhé!{' '}
                {isIOSDevice
                  ? <>Trên Safari: nhấn nút <strong className="font-bold text-amber-950">Chia sẻ (Share) 📤</strong> &rarr; chọn <strong className="font-bold text-amber-955">"Thêm vào MH chính" (Add to Home Screen)</strong>.</>
                  : <>Trên Chrome: nhấn nút <strong className="font-bold text-amber-950">Menu (⋮)</strong> &rarr; chọn <strong className="font-bold text-amber-955">"Thêm vào màn hình chính" (Add to Home screen)</strong>.</>
                }
              </p>
            </div>
            <button
              onClick={dismissMobileTipBanner}
              className="absolute top-2.5 right-4 text-amber-500 hover:text-amber-750 font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* RENDER DYNAMIC NAVIGATION SCREENS */}
      <main className="max-w-5xl mx-auto px-4 mt-8" id="main-root">
        <AnimatePresence mode="wait">
 
          {/* SCREEN 1: WELCOME SELECTOR LANDING PANEL */}
          {navState === 'welcome' && (
            <motion.div
              key="welcome-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col gap-8"
              id="welcome-layout"
            >
              {!stats.kidName ? (
                /* FIRST-TIME ONBOARDING SCREEN */
                <div className="bg-white border-8 border-amber-250 p-8 sm:p-10 rounded-[3rem] shadow-2xl max-w-xl mx-auto w-full text-center flex flex-col gap-6 bento-shadow my-8" id="child-onboarding-panel">
                  <div className="text-6xl animate-bounce">🎈</div>
                  <h2 className="text-3xl font-black text-amber-955 leading-tight font-vietnamese">Chào mừng bé đến với English Adventure!</h2>
                  <p className="text-slate-500 font-vietnamese text-sm font-semibold leading-relaxed">
                    Để mở ra những chuyến phiêu lưu nói tiếng Anh hằng ngày, <br />con hãy viết tên mình bên dưới nhé!
                  </p>
                  
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="Tên của con... (Ví dụ: Tom, Lucy...)"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full text-center text-xl sm:text-2xl font-black text-amber-800 bg-amber-50 border-4 border-amber-200 px-6 py-4 rounded-3xl focus:outline-hidden focus:ring-4 focus:ring-amber-200 transition-colors placeholder:text-amber-200"
                  />

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (!tempName.trim()) {
                        speech.speak("Please type your name first!");
                        return;
                      }
                      sounds.playSuccess();
                      const newStats: UserStats = {
                        completedDays: [],
                        currentStreak: 1,
                        totalStars: 0,
                        weeklyProgress: {
                          Monday: 'not_started',
                          Tuesday: 'not_started',
                          Wednesday: 'not_started',
                          Thursday: 'not_started',
                          Friday: 'not_started',
                          Saturday: 'not_started',
                          Sunday: 'not_started',
                        },
                        kidName: tempName.trim(),
                        avatar: '🦊',
                        totalSentencesSpoken: 0,
                        spokenPhraseIds: [],
                        daysPlayed: 1,
                        bestPhrases: []
                      };
                      saveStats(newStats);
                      speech.speak(`Welcome, ${tempName.trim()}!`);
                      handleStartDay('Monday');
                    }}
                    className="w-full py-4.5 bg-[#58CC02] border-b-6 border-green-700 text-white font-extrabold text-xl rounded-2xl shadow-lg cursor-pointer active:border-b-2 active:translate-y-1 block mt-2"
                  >
                    Bắt đầu chuyến phiêu lưu! 🚀
                  </motion.button>
                </div>
              ) : (
                /* REDESIGNED GAMEPLAY HOMEPAGE */
                <div className="flex flex-col gap-8" id="redesign-home-cards">
                  {/* 1. HERO BANNER */}
                  <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-[3rem] p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center shadow-lg relative overflow-hidden" id="hero-banner">
                    {/* Floating cloud icons */}
                    <div className="absolute top-3 right-6 text-white/20 text-5xl select-none">☁️</div>
                    <div className="absolute bottom-4 left-4 text-white/10 text-6xl select-none">☁️</div>
                    
                    <div 
                      className="w-full md:w-5/12 aspect-video md:aspect-[4/3] rounded-[2rem] border-4 border-white/60 overflow-hidden relative shadow-md shrink-0 bg-[#FFF8EE]"
                      style={{
                        backgroundImage: "url('Scenes.png')",
                        backgroundSize: '100% 1100%',
                        backgroundPosition: `0% ${getHeroFrameIndex(selectedDayOnHome) * 10}%`,
                        backgroundRepeat: 'no-repeat',
                      }}
                    >
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl border border-amber-200 shadow-sm z-10 select-none">
                        <span className="text-[10px] uppercase font-black text-amber-600 block leading-none">CẢNH CHƠI HÔM NAY</span>
                        <span className="text-xs font-black text-slate-800 leading-tight">
                          {selectedDayOnHome === 'Saturday' || selectedDayOnHome === 'Sunday' ? '🌳 Park & Zoo' : '🛌 Daily Routines'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4 flex-1 text-white">
                      <div>
                        <span className="text-white/85 font-black text-xs uppercase tracking-widest block font-fredoka select-none">
                          {selectedDayOnHome === 'Saturday' || selectedDayOnHome === 'Sunday' ? 'Cuối tuần vui vẻ! 🎉' : 'Ngày mới tràn ngập năng lượng! ☀️'}
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-none mt-1 font-fredoka">
                          {selectedDayOnHome}
                        </h2>
                        <span className="text-2xl sm:text-3.5xl font-black block mt-2 text-yellow-100 font-fredoka select-none">
                          {selectedDayOnHome === 'Saturday' || selectedDayOnHome === 'Sunday' ? 'Let\'s Play! 🎉' : 'Good Morning! 🛌'}
                        </span>
                        <p className="text-white/90 font-vietnamese text-xs font-semibold max-w-sm mt-2 leading-relaxed">
                          Con đã sẵn sàng vui chơi ngày hôm nay chưa? Hãy dấn bước vào hành trình rèn nói tiếng Anh tự nhiên nhé!
                        </p>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleStartDay(selectedDayOnHome)}
                        className="w-full sm:w-[280px] h-[68px] bg-[#58CC02] border-b-6 border-green-750 hover:bg-[#60df03] text-white font-black text-lg rounded-2xl flex items-center justify-center gap-3 shadow-md active:border-b-2 active:translate-y-1 transition-all cursor-pointer"
                        id="play-today-hero-btn"
                      >
                        <Play className="h-5 w-5 fill-white stroke-transparent" />
                        <span>PLAY TODAY</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* 2. CURRENT FRIEND */}
                  {(() => {
                    const currentFriend = getCurrentCompanion(stats.totalSentencesSpoken || 0);
                    const nextFriend = AVATAR_LIST.find(char => (stats.totalSentencesSpoken || 0) < char.unlockCount) || { name: 'Thần thoại Miu Miu', emoji: '🐱', unlockCount: 5000 };
                    
                    const sentencesCount = stats.totalSentencesSpoken || 0;
                    const nextTargetThreshold = nextFriend.unlockCount;
                    
                    // ████████░░ visual representation
                    const totalBlocks = 10;
                    const fillRatio = nextTargetThreshold > 0 ? Math.min(sentencesCount / nextTargetThreshold, 1) : 1;
                    const solidBlocks = Math.floor(fillRatio * totalBlocks);
                    const emptyBlocks = totalBlocks - solidBlocks;
                    const textProgressBlocks = '█'.repeat(solidBlocks) + '░'.repeat(emptyBlocks);

                    return (
                      <div className="bg-white rounded-[2.5rem] p-6 border-4 border-orange-200 bento-shadow flex flex-col md:flex-row gap-6 items-center shadow-md justify-between" id="current-friend-section">
                        <div className="flex items-center gap-5 w-full md:w-auto">
                          <div className="h-20 w-20 bg-amber-50 rounded-3xl flex items-center justify-center shrink-0 border-4 border-amber-100 shadow-inner">
                            <div className="w-14 h-14" style={getAvatarSpriteStyles(currentFriend.emoji)} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-amber-500 font-extrabold text-[12px] uppercase tracking-wider block font-fredoka">Bạn Đồng Hành Hiện Tại</span>
                            <h2 className="text-2xl font-black text-slate-800 leading-none mt-1 font-fredoka">{currentFriend.emoji} {currentFriend.name}</h2>
                            <span className="text-xs font-semibold text-slate-450 font-vietnamese mt-1.5">{currentFriend.desc}</span>
                          </div>
                        </div>

                        {/* Progression Blocks HUD */}
                        <div className="flex flex-col gap-2 w-full md:w-7/12 bg-orange-50/50 p-4.5 rounded-2xl border-2 border-orange-100">
                          <div className="flex justify-between items-center text-xs font-black text-slate-500">
                            <span className="text-amber-800 font-fredoka">MỤC TIÊU MỞ KHÓA</span>
                            <span className="font-mono text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">{sentencesCount} / {nextTargetThreshold} Sentences</span>
                          </div>
                          
                          {/* Text Visual Block specified in Spec */}
                          <div className="font-mono text-xl text-amber-600 block font-bold leading-none tracking-wider text-center py-1 select-none">
                            {textProgressBlocks}
                          </div>

                          {/* Matching smooth background progress bar */}
                          <div className="w-full bg-[#E5E7EB] h-3 rounded-full overflow-hidden">
                            <div 
                              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${fillRatio * 100}%` }}
                            />
                          </div>

                          {nextFriend && (
                            <div className="flex justify-between items-center text-[11px] text-slate-400 font-semibold font-vietnamese mt-1">
                              <span>Tiến trình mở bạn hoàn toàn tự động</span>
                              <span className="text-amber-700 font-black flex items-center gap-1">
                                Bạn kế tiếp: {nextFriend.emoji} {nextFriend.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. SPEAKING STATS + BEST PHRASES (merged card) */}
                  {(() => {
                    const totalSpoken = stats.totalSentencesSpoken || 0;
                    const totalUnique = stats.spokenPhraseIds?.length || 0;

                    // Compute average stars from bestPhrases (real data)
                    const bestPhrases = stats.bestPhrases || [];
                    let avgStarsDisplay = '—';
                    if (bestPhrases.length > 0) {
                      const avg = bestPhrases.reduce((sum, p) => sum + p.stars, 0) / bestPhrases.length;
                      avgStarsDisplay = '⭐'.repeat(Math.round(avg));
                    }

                    return (
                      <div className="bg-white rounded-[2.5rem] p-6 border-4 border-sky-100 bento-shadow flex flex-col gap-5 shadow-sm" id="today-speaking-section">
                        {/* Header */}
                        <div className="border-b border-slate-100 pb-2.5 flex justify-between items-center">
                          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <span>🗣️</span>
                            <span className="font-vietnamese">Speaking Stats & Top Phrases</span>
                          </h3>
                          <span className="text-[10px] bg-sky-50 text-sky-700 font-black px-2.5 py-1 rounded-full uppercase tracking-wider font-fredoka">Tổng Kết</span>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="today-speaking-grid">
                          <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100 text-center flex flex-col justify-center items-center">
                            <span className="text-3xl font-black text-sky-600 block font-fredoka">{totalSpoken}</span>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mt-1 block leading-none font-fredoka">Sentences Spoken</span>
                            <p className="text-[10px] font-vietnamese text-slate-400 font-medium mt-1">Tổng câu bé đã nói</p>
                          </div>

                          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-center flex flex-col justify-center items-center">
                            <span className="text-3xl font-black text-emerald-600 block font-fredoka">{totalUnique}</span>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mt-1 block leading-none font-fredoka">Unique Phrases</span>
                            <p className="text-[10px] font-vietnamese text-slate-400 font-medium mt-1">Số câu khác nhau đã nói</p>
                          </div>

                          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 text-center flex flex-col justify-center items-center">
                            <span className="text-2xl font-black text-amber-500 block leading-none">{avgStarsDisplay || '—'}</span>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mt-2.5 block leading-none font-fredoka">Avg Stars</span>
                            <p className="text-[10px] font-vietnamese text-slate-400 font-medium mt-1">Đánh giá phát âm trung bình</p>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100 pt-1 flex items-center gap-2">
                          <span className="text-base">🌟</span>
                          <span className="text-sm font-black text-slate-700 font-vietnamese">Top Giọng Nói Vàng</span>
                          <span className="text-[10px] bg-pink-50 text-pink-700 font-black px-2.5 py-1 rounded-full uppercase tracking-wider font-fredoka ml-auto">Phát lại</span>
                        </div>

                        {/* Best phrases list */}
                        <div className="flex flex-col gap-3" id="best-speaking-list">
                          {bestPhrases.length > 0 ? (
                            bestPhrases.slice(0, 3).map((bp, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-4 p-3 bg-pink-50/25 rounded-2xl border border-pink-100 hover:bg-pink-50/50 transition-colors">
                                <div className="flex items-center gap-4 min-w-0">
                                  <span className="text-2xl font-black text-pink-400 font-fredoka shrink-0">#{idx + 1}</span>
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      {Array.from({ length: bp.stars }).map((_, i) => (
                                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 stroke-transparent" />
                                      ))}
                                    </div>
                                    <span className="text-base font-black font-mono text-slate-800 truncate mt-1 leading-snug">"{bp.text}"</span>
                                    <span className="text-[10px] font-vietnamese font-semibold text-slate-400 mt-0.5">Nói trong ngày {bp.day}</span>
                                  </div>
                                </div>

                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    sounds.playClick();
                                    speech.speak(bp.text);
                                  }}
                                  className="h-11 px-4 bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shrink-0 shadow-3xs cursor-pointer font-vietnamese"
                                >
                                  <Volume2 className="h-4 w-4" />
                                  <span>▶ Play</span>
                                </motion.button>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-5 text-slate-400 flex flex-col items-center gap-1.5">
                              <span className="text-3xl">🎙️</span>
                              <span className="text-xs font-vietnamese font-medium">Bé chưa có ghi âm đạt sao cao. Hãy vui chơi rèn nói tiếng Anh nhé!</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 5. CHARACTER COLLECTION */}
                  <div className="bg-white rounded-[2.5rem] p-6 border-4 border-indigo-150 bento-shadow flex flex-col gap-4" id="character-collection-section">
                    <div className="border-b border-slate-100 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                          <span>🐹</span>
                          <span className="font-vietnamese">Character Collection (Bộ Sưu Tập Bạn Bè)</span>
                        </h3>
                        <p className="text-xs text-slate-400 font-vietnamese font-medium mt-0.5">
                          Tích lũy tổng số câu nói thực sự để cứu hộ hoàn toàn bạn thú cưng đồng hành!
                        </p>
                      </div>
                      
                      {/* programmatic unlocked statistics */}
                      {(() => {
                        const unlockedCount = AVATAR_LIST.filter(char => (stats.totalSentencesSpoken || 0) >= char.unlockCount).length;
                        return (
                          <div className="bg-indigo-50 text-indigo-700 text-xs font-black px-3.5 py-1.5 rounded-full border border-indigo-200 shrink-0 self-start sm:self-auto font-fredoka">
                            Unlocked {unlockedCount} / 10
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5" id="character-collection-grid">
                      {AVATAR_LIST.map((char) => {
                        const isUnlocked = (stats.totalSentencesSpoken || 0) >= char.unlockCount;
                        const activeComp = getCurrentCompanion(stats.totalSentencesSpoken || 0);
                        const isCurrentActive = activeComp.emoji === char.emoji;

                        return (
                          <motion.button
                            key={char.id}
                            whileHover={isUnlocked ? { scale: 1.05, y: -2 } : {}}
                            whileTap={isUnlocked ? { scale: 0.95 } : {}}
                            onClick={() => {
                              sounds.playClick();
                              if (isUnlocked) {
                                speech.speak(`${char.name} is here! ${char.desc}`);
                              } else {
                                speech.speak(`Practice speaking ${char.unlockCount} sentences to rescue ${char.name}!`);
                              }
                            }}
                            className={`p-4 rounded-[1.8rem] border-4 text-center flex flex-col items-center justify-center transition-all min-h-[140px] relative ${
                              !isUnlocked 
                                ? 'bg-slate-50/65 border-slate-105 opacity-60 cursor-pointer' 
                                : isCurrentActive
                                  ? 'bg-indigo-50/85 border-indigo-400 ring-4 ring-indigo-100 shadow-3xs cursor-pointer'
                                  : 'bg-white border-slate-105 hover:border-indigo-300 cursor-pointer'
                            }`}
                          >
                            {isUnlocked ? (
                              <div className="w-12 h-12 mb-2 flex items-center justify-center">
                                <div className="w-12 h-12" style={getAvatarSpriteStyles(char.emoji)} />
                              </div>
                            ) : (
                              <span className="text-3xl block mb-2 select-none">🔒</span>
                            )}
                            <span className="text-xs font-black text-slate-800 block leading-tight font-fredoka">{char.name}</span>
                            <span className="text-[9px] font-black uppercase font-vietnamese text-slate-400 mt-1 leading-none tracking-widest">
                              {isCurrentActive ? '🎯 EQUIPPED' : isUnlocked ? 'Đã Nhận ✔' : `${char.unlockCount} Sentences`}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 6. MY ENGLISH JOURNEY */}
                  {(() => {
                    const uniquePhrasesVal = stats.spokenPhraseIds?.length || 0;
                    const daysPlayedVal = stats.daysPlayed || stats.completedDays?.length || 0;
                    const sentencesSpokenVal = stats.totalSentencesSpoken || 0;
                    const achievement = getAchievementTitle(uniquePhrasesVal);

                    return (
                      <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[3rem] p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center shadow-lg text-white relative overflow-hidden" id="english-journey-section">
                        <div className="absolute top-2 right-4 text-white/10 text-5xl">🏆</div>
                        
                        <div className="flex flex-col gap-4 flex-1">
                          <div>
                            <span className="text-emerald-100 font-black text-xs uppercase tracking-widest block font-fredoka">Hành Trình Học Tập Trọn Đời</span>
                            <h2 className="text-3xl font-black tracking-tight mt-1 font-fredoka">My English Journey</h2>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" id="journey-metrics-cells">
                            <div className="bg-white/15 p-4 rounded-2xl border border-white/20">
                              <span className="text-2xl font-black block font-fredoka">{sentencesSpokenVal}</span>
                              <span className="text-[10px] font-black text-emerald-100 uppercase tracking-wider block mt-1 leading-none font-fredoka">Sentences Spoken</span>
                            </div>

                            <div className="bg-white/15 p-4 rounded-2xl border border-white/20">
                              <span className="text-2xl font-black block font-fredoka">{uniquePhrasesVal}</span>
                              <span className="text-[10px] font-black text-emerald-100 uppercase tracking-wider block mt-1 leading-none font-fredoka font-vietnamese">Phrases You Can Say</span>
                            </div>

                            <div className="bg-white/15 p-4 rounded-2xl border border-white/20 col-span-2 sm:col-span-1">
                              <span className="text-2xl font-black block font-fredoka">{daysPlayedVal}</span>
                              <span className="text-[10px] font-black text-emerald-100 uppercase tracking-wider block mt-1 leading-none font-fredoka">Days Played</span>
                            </div>
                          </div>
                        </div>

                        {/* Achievement Badge Board */}
                        <div className="bg-white/20 p-5 rounded-3xl border-2 border-white/30 flex flex-col items-center text-center justify-center min-w-[210px] sm:min-w-[240px] shadow-inner font-vietnamese shrink-0">
                          <span className="text-5xl block animate-bounce">{achievement.emoji}</span>
                          <span className="text-emerald-100 font-extrabold text-[12px] uppercase mt-2.5 tracking-wider block font-fredoka">DANH HIỆU ĐẠT ĐƯỢC</span>
                          <h4 className="text-xl font-black tracking-wide mt-1 text-yellow-100 font-fredoka">{achievement.title}</h4>
                          <span className="text-[9px] text-white/80 font-medium font-vietnamese mt-1 leading-tight block">Khen ngợi đạt {uniquePhrasesVal} câu độc lập</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 7. THIS WEEK */}
                  <div className="bg-white rounded-[2.5rem] p-6 border-4 border-amber-100 shadow-sm flex flex-col gap-4" id="this-week-section">
                    <div className="border-b border-slate-100 pb-2.5 flex justify-between items-center">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 font-fredoka">
                        <span>📅</span>
                        <span className="font-vietnamese leading-none">Bản Đồ Tuần Học (This Week)</span>
                      </h3>
                      <span className="text-[10px] bg-amber-50 text-amber-700 font-black px-2.5 py-1 rounded-full uppercase tracking-wider font-fredoka">Weekly Tracking</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3.5" id="this-week-track-grid">
                      {DAYS_OF_WEEK.map((day) => {
                        const isPassed = stats.weeklyProgress[day] === 'passed';
                        const isRecommendationActive = selectedDayOnHome === day;
                        const shortName = day.substring(0, 3); // Mon, Tue, etc.

                        const todayIndex = new Date().getDay();
                        const systemDay = DAYS_OF_WEEK[todayIndex === 0 ? 6 : todayIndex - 1];
                        const isActualToday = (day === systemDay);

                        return (
                          <motion.button
                            key={day}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              sounds.playClick();
                              setSelectedDayOnHome(day);
                            }}
                            className={`p-4 rounded-3xl border-4 text-center flex flex-col items-center justify-between min-h-24 cursor-pointer transition-all ${
                              isRecommendationActive
                                ? 'bg-amber-500 border-white ring-4 ring-amber-200 text-white shadow-md'
                                : isPassed
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                                  : isActualToday
                                    ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs'
                                    : 'bg-white border-slate-105 text-slate-800 hover:border-amber-205'
                            }`}
                          >
                            <span className="text-xs font-black uppercase tracking-wider block opacity-90 font-fredoka">
                              {shortName} {isActualToday && '📍'}
                            </span>
                            
                            <div className="my-1.5 text-2xl select-none">
                              {isPassed ? '⭐' : isRecommendationActive ? '▶' : '🛌'}
                            </div>

                            <span className="text-[10px] font-black uppercase tracking-widest block opacity-75 font-fredoka">
                              {isActualToday ? 'Hôm Nay' : isPassed ? 'Passed' : isRecommendationActive ? 'Active' : 'Routine'}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* SCREEN 2: ACTIVE ROUTINE STORY PAGES */}
          {navState === 'playing' && selectedDay && (
            <motion.div
              key="playing-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col gap-6"
              id="story-layout"
            >
              <SceneRenderer
                dayName={selectedDay}
                currentScene={dayProgression.currentSceneIndex}
                totalScenes={totalActiveScenes}
                dayState={dayProgression}
                updateDayState={updateDayStateHelper}
                onSceneComplete={handleSceneComplete}
                onJumpToScene={handleJumpToScene}
                onSpeechReport={registerSpeechReport}
              />
            </motion.div>
          )}

          {/* SCREEN 3: END-OF-DAY REVIEW DISCUSSION */}
          {navState === 'review' && selectedDay && (
            <motion.div
              key="review-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              id="review-layout"
            >
              <DailyReview
                dayName={selectedDay}
                dayState={dayProgression}
                updateDayState={updateDayStateHelper}
                onReviewComplete={handleReviewComplete}
                onSpeechReport={registerSpeechReport}
                kidName={stats.kidName}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ⚙️ PARENT CONTROL ZONE MODAL */}
      <AnimatePresence>
        {isParentModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-vietnamese"
            id="parent-modal-backdrop"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[2.5rem] border-8 border-slate-100 max-w-md w-full p-6 sm:p-8 shadow-2xl flex flex-col gap-6 relative"
              id="parent-modal-container"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setIsParentModalOpen(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center cursor-pointer"
                id="parent-modal-close"
              >
                ✕
              </button>

              {!parentModeUnlocked ? (
                /* STEP 1: MATH SECURITY CHECK FOR PARENTS */
                <div className="flex flex-col gap-4 text-center">
                  <div className="bg-amber-50 h-16 w-16 rounded-3xl border-4 border-amber-200 flex items-center justify-center text-3xl mx-auto">
                    🔒
                  </div>
                  <h3 className="text-xl font-black text-slate-800">Cổng Nhập Cho Cha Mẹ</h3>
                  <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                    Để truy cập tính năng quản trị & xóa dữ liệu hằng tuần, bố mẹ vui lòng giải nhanh phép tính sau để xác minh nhé:
                  </p>
                  
                  <div className="bg-amber-50/50 p-4 rounded-2xl border-2 border-amber-100 my-2 text-2xl font-black text-amber-800 font-fredoka">
                    {mathNum1} + {mathNum2} = ?
                  </div>

                  <input
                    type="number"
                    placeholder="Nhập kết quả..."
                    value={mathAnswer}
                    onChange={(e) => {
                      setMathAnswer(e.target.value);
                      setMathError(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const ans = parseInt(mathAnswer, 10);
                        if (ans === mathNum1 + mathNum2) {
                          sounds.playSuccess();
                          setParentModeUnlocked(true);
                        } else {
                          sounds.playClick();
                          setMathError(true);
                        }
                      }
                    }}
                    className="w-full text-center text-lg font-bold border-3 border-slate-200 px-4 py-3 rounded-2xl focus:outline-hidden focus:border-indigo-400 transition-colors"
                  />

                  {mathError && (
                    <span className="text-xs font-bold text-rose-500">Kết quả chưa chính xác, bố mẹ hãy thử lại nhé!</span>
                  )}

                  <button
                    onClick={() => {
                      const ans = parseInt(mathAnswer, 10);
                      if (ans === mathNum1 + mathNum2) {
                        sounds.playSuccess();
                        setParentModeUnlocked(true);
                      } else {
                        sounds.playClick();
                        setMathError(true);
                      }
                    }}
                    className="mt-2 w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl transition-colors cursor-pointer shadow-md"
                  >
                    Xác Nhận & Tiếp Tục
                  </button>
                </div>
              ) : (
                /* STEP 2: PARENT CONTROLS & COMPLETED RESET ACTION */
                <div className="flex flex-col gap-5 text-center">
                  <div className="bg-rose-50 h-16 w-16 rounded-3xl border-4 border-rose-200 flex items-center justify-center text-3xl mx-auto animate-bounce">
                    🛠️
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 font-fredoka">⚙️ Góc Phụ Huynh</h3>
                  <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                    Tại đây bố mẹ có thể dọn dẹp các ngôi sao tích lũy của con để bé bắt đầu tuần học mới hằng tuần.
                  </p>

                  <div className="bg-rose-50/50 p-4 border border-rose-100 rounded-3xl text-left flex flex-col gap-1 my-2">
                    <span className="text-xs font-black text-rose-800">Vùng Nguy Hiểm (Danger Zone):</span>
                    <span className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                      Toàn bộ sao vàng, ngày chơi, chặng tiến trình và tên đã lưu của con sẽ bị xóa khởi chạy lại hoàn toàn.
                    </span>
                  </div>

                  <button
                    onClick={handleResetProgress}
                    className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md"
                  >
                    <RotateCcw className="h-4 w-4 animate-spin-slow" />
                    <span>Xóa Sạch Data & Chơi Lại Từ Đầu Tuần</span>
                  </button>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      setIsParentModalOpen(false);
                      setParentModeUnlocked(false);
                    }}
                    className="w-full py-3 hover:bg-slate-50 text-slate-500 font-black text-xs rounded-2xl transition-colors cursor-pointer"
                  >
                    Quay Lại Bảng Học
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
