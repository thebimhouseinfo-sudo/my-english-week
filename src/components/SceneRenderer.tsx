import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Mic, CheckCircle2, ChevronRight, HelpCircle, Volume2, Star } from 'lucide-react';
import { DayName, DayProgression } from '../types';
import { useSpeech } from '../hooks/useSpeech';
import { sounds } from '../utils/soundEngine';
import SoundWave from './SoundWave';
import CuteIcon from './CuteIcon';
import { 
  getWordMeaning, 
  wakeUpTimes, 
  breakfastOptions, 
  classroomActivities, 
  houseChores,
  bathroomPool
} from '../data/storyData';
import { getStorySkeletonForDay, getPhrasesForScenario, scenarios } from '../data/phrases/phraseEngine';
import ProgressBar from './ProgressBar';

// Import vectors
import {
  BedroomVector,
  BathroomVector,
  GetDressedVector,
  BreakfastVector,
  ClockVector,
  SchoolVector,
  ClassroomVector,
  ChoreVector,
  BedtimeVector,
  ZooVector,
  ParkVector,
  GrandmaVector
} from './KidsVectors';

interface SceneRendererProps {
  dayName: DayName;
  currentScene: number; // 0 to 9 for workdays, 0 to 5 for weekends
  dayState: DayProgression;
  updateDayState: (updater: (prev: DayProgression) => DayProgression) => void;
  onSceneComplete: () => void;
  onJumpToScene: (index: number) => void;
  totalScenes: number;
  onSpeechReport?: (text: string, stars: number) => void;
}

interface ConversationLine {
  id: string;
  actor: 'narrator' | 'mom' | 'dad' | 'friend' | 'child';
  text: string;
  translation: string;
  isChoice?: boolean;
}

export default function SceneRenderer({
  dayName,
  currentScene,
  dayState,
  updateDayState,
  onSceneComplete,
  onJumpToScene,
  totalScenes,
  onSpeechReport,
}: SceneRendererProps) {
  const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';
  const speech = useSpeech();

  const dayType = dayName === 'Sunday' ? 'sunday' : dayName === 'Saturday' ? 'saturday' : 'weekday';
  const skeleton = getStorySkeletonForDay(dayType);
  const currentScenarioId = skeleton[currentScene];

  // Internal steps in current scene
  const [lines, setLines] = useState<ConversationLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [completedLines, setCompletedLines] = useState<Record<string, { stars: number; transcript?: string; practicePoints?: number; conquered?: boolean }>>({});
  const [selectedWord, setSelectedWord] = useState<{ word: string; meaning: string } | null>(null);
  const [showWordMeaning, setShowWordMeaning] = useState(false);

  // Random triggers generated once per day
  const [randomTime] = useState(() => wakeUpTimes[Math.floor(Math.random() * wakeUpTimes.length)]);
  const [randomBathroomActions] = useState(() => {
    // Pick 3 random actions
    const shuffled = [...bathroomPool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  });

  // Load conversation lines for the current scene
  useEffect(() => {
    setSelectedWord(null);
    setShowWordMeaning(false);
    
    if (!currentScenarioId) return;

    // Load from Engine
    const fetchedPhrases = getPhrasesForScenario(currentScenarioId);
    let sceneLines: ConversationLine[] = fetchedPhrases.map((p, idx) => ({
      id: p.id + '_' + idx,
      actor: 'child', // Default to child so they can practice
      text: p.en,
      translation: p.vi,
      isChoice: false
    }));

    // Inject Choice Prompts based on scenario ID to keep the UI interactive
    if (currentScenarioId === 'breakfast' && !isWeekend) {
      if (!dayState.selectedBreakfast) {
        sceneLines = [
          { id: 'bf_choice_prompt', actor: 'mom', text: 'What do you want for breakfast?', translation: 'Con muốn ăn sáng món gì nào?', isChoice: false },
          { id: 'bf_choice', actor: 'child', text: '', translation: '', isChoice: true }
        ];
      }
    } else if (currentScenarioId === 'weekend_breakfast' && isWeekend) {
      if (!dayState.selectedBreakfast) {
        sceneLines = [
          { id: 'wk_bf_choice_prompt', actor: 'dad', text: 'What do you want to eat today?', translation: 'Hôm nay con muốn thưởng thức món gì nào?', isChoice: false },
          { id: 'wk_bf_choice', actor: 'child', text: '', translation: '', isChoice: true }
        ];
      }
    } else if (currentScenarioId === 'weekend_destination' && isWeekend) {
      if (!dayState.weekendActivity) {
        sceneLines = [
          { id: 'wk_pl_choice', actor: 'child', text: '', translation: '', isChoice: true }
        ];
      }
    } else if (currentScenarioId === 'weekend_treat' && isWeekend) {
      const selectedFlavor = dayState.questionsAnswers[2]?.answer;
      if (!selectedFlavor) {
        sceneLines = [
          { id: 'wk_treat_choice', actor: 'child', text: '', translation: '', isChoice: true }
        ];
      }
    }

    setLines(sceneLines);
    setActiveLineIndex(0);
    setCompletedLines({});

    // Save random items to day state on first scene initial triggers
    if (currentScene === 0) {
      updateDayState((prev) => {
        // Collect bathroom phrases
        const bathPhrases = randomBathroomActions.map(a => a.phrase);
        const wakeText = `I wake up at ${randomTime.timeStr}.`;

        return {
          ...prev,
          bathroomActions: bathPhrases,
          // Setup template answers for timeline and end reviews
          timelineSentences: [
            { icon: '🛏️', text: `I wake up at ${randomTime.enText}.`, recordingState: 'idle' },
            { icon: '🪥', text: bathPhrases[0] || 'I brush my teeth.', recordingState: 'idle' },
            { icon: '🥛', text: 'I want milk.', recordingState: 'idle' }, // Placeholder till chosen
            { icon: isWeekend ? '🦕' : '🏫', text: isWeekend ? 'We go to the park.' : 'I go to school.', recordingState: 'idle' },
            { icon: isWeekend ? '🍦' : '🧹', text: isWeekend ? 'I eat delicious ice cream.' : `I do my chores today.`, recordingState: 'idle' },
          ]
        };
      });
    }
  }, [currentScene, dayName, isWeekend, dayState.selectedBreakfast, dayState.weekendActivity]);

  // Read line voice on line reveal
  useEffect(() => {
    if (lines.length > 0 && activeLineIndex < lines.length) {
      const activeLine = lines[activeLineIndex];
      if (activeLine && !activeLine.isChoice) {
        // Play TTS automatically for the child to listen
        speech.speak(activeLine.text);
      }
    }
  }, [activeLineIndex, lines]);

  // Make breakfast selection
  const handleBreakfastSelection = (id: string, text: string, labelVi: string) => {
    sounds.playClick();
    updateDayState((prev) => {
      // Find food details and replace in timeline sentences
      const newTimeline = [...prev.timelineSentences];
      newTimeline[2] = {
        icon: id === 'milk' ? '🥛' : id === 'juice' ? '🧃' : id === 'bread' ? '🍞' : id === 'eggs' ? '🍳' : '🥣',
        text: isWeekend ? `I eat ${text.toLowerCase()} for breakfast.` : `I want ${text.toLowerCase()}.`,
        recordingState: 'idle'
      };

      return {
        ...prev,
        selectedBreakfast: id,
        timelineSentences: newTimeline
      };
    });
  };

  // Make weekend place selection
  const handleWeekendPlaceSelection = (place: string) => {
    sounds.playClick();
    updateDayState((prev) => {
      const newTimeline = [...prev.timelineSentences];
      newTimeline[3] = {
        icon: place === 'Zoo' ? '🦁' : place === 'Park' ? '🌳' : place === 'Playground' ? '🛝' : '👵',
        text: `We go to the ${place.toLowerCase()}.`,
        recordingState: 'idle'
      };

      return {
        ...prev,
        weekendActivity: place,
        timelineSentences: newTimeline
      };
    });
  };

  // Make Weekend Ice Cream Selection
  const handleIceCreamSelection = (flavor: string) => {
    sounds.playClick();
    updateDayState((prev) => {
      const newTimeline = [...prev.timelineSentences];
      newTimeline[4] = {
        icon: '🍦',
        text: `I eat ${flavor.toLowerCase()} ice cream.`,
        recordingState: 'idle'
      };

      const newQA = [...prev.questionsAnswers];
      // Save flavor in index index 2 for final Q&A retrieval
      newQA[2] = {
        question: 'What did you eat at weekend?',
        answer: flavor,
        audioText: `I eat ${flavor.toLowerCase()} ice cream.`,
        recordingState: 'idle'
      };

      return {
        ...prev,
        questionsAnswers: newQA,
        timelineSentences: newTimeline
      };
    });
  };

  // Define helper to check if a specific sentence line is conquered
  const isLineConquered = (lineId: string): boolean => {
    const record = completedLines[lineId];
    if (!record) return false;
    // ⭐⭐⭐⭐ (4 stars) and ⭐⭐⭐⭐⭐ (5 stars) unlock immediately. Otherwise, need cumulative practicePoints >= 3
    return record.stars >= 4 || (record.practicePoints !== undefined && record.practicePoints >= 3);
  };

  // Handle Recording and Mic logic
  const triggerListening = (targetText: string, lineId: string) => {
    sounds.playMicBeep();
    speech.startListening(targetText, (transcript, score) => {
      sounds.playTwinkle();
      setCompletedLines(prev => {
        const prevRecord = prev[lineId] || { stars: 0, transcript: '', practicePoints: 0, conquered: false };
        const prevPoints = prevRecord.practicePoints || 0;

        // ⭐      = không tính (score === 1)
        // ⭐⭐     = +1 điểm luyện tập (score === 2)
        // ⭐⭐⭐    = +2 điểm luyện tập (score === 3)
        // ⭐⭐⭐⭐   = qua ngay (score === 4)
        // ⭐⭐⭐⭐⭐ = qua ngay (score === 5)
        let addedPoints = 0;
        if (score === 2) {
          addedPoints = 1;
        } else if (score === 3) {
          addedPoints = 2;
        }

        const newPoints = prevPoints + addedPoints;
        const conquered = (score >= 4) || (newPoints >= 3);

        return {
          ...prev,
          [lineId]: {
            stars: score,
            transcript,
            practicePoints: newPoints,
            conquered
          }
        };
      });

      if (onSpeechReport) {
        onSpeechReport(targetText, score);
      }
    });
  };

  const currentLine = lines[activeLineIndex];
  const isSceneFullyPlayed = activeLineIndex >= lines.length || (
    lines.length > 0 && 
    lines.filter(l => !l.isChoice).every(l => isLineConquered(l.id))
  );

  // Character name displays
  const getActorEmoji = (actor: string) => {
    switch (actor) {
      case 'mom': return '👩‍👦 Mom';
      case 'dad': return '👨‍👦 Dad';
      case 'friend': return '👦 Friend';
      case 'child': return '👧 Me';
      default: return '🎙️ Narrator';
    }
  };

  const getActorColor = (actor: string) => {
    switch (actor) {
      case 'mom': return 'bg-pink-100 text-pink-700 border-pink-300';
      case 'dad': return 'bg-sky-100 text-sky-700 border-sky-300';
      case 'friend': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'child': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  // Map scene index to sprite sheet row index (0 to 10)
  const getFrameIndex = () => {
    if (isWeekend) {
      switch (currentScene) {
        case 0: return 0; // Bedroom
        case 1: return 3; // Breakfast
        case 2: return 9; // Weekend Place (Zoo / Park)
        case 3: return 9; // Weekend Adventure (Grandma / Zoo / Park)
        case 4: return 3; // Breakfast/Sweet treats (Juice) -> Frame 4 (Index 3)
        case 5: return 10; // Bedtime
        default: return 0;
      }
    } else {
      switch (currentScene) {
        case 0: return 0; // Bedroom - Wake Up
        case 1: return 1; // Bathroom
        case 2: return 2; // Get Dressed
        case 3: return 3; // Breakfast
        case 4: return 4; // Check Time / Clock
        case 5: return 5; // School
        case 6: return 6; // Classroom
        case 7: return 7; // Chores
        case 8: return 8; // Dinner (Breakfast vector with "eggs") -> Frame 9 (Index 8)
        case 9: return 10; // Bedtime
        default: return 0;
      }
    }
  };

  // Split sentence to show words and attach tap definitions
  const renderInteractiveEnglishWords = (text: string) => {
    const rawWords = text.split(" ");
    return (
      <div className="flex flex-wrap justify-center gap-2 md:gap-3.5 text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight md:leading-snug" id="english-interactive-sentence">
        {rawWords.map((word, index) => {
          // Remove punctuation for clean matching lookup
          const clean = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
          return (
            <motion.button
              key={index}
              id={`word-tap-${clean}-${index}`}
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                sounds.playClick();
                const meaning = getWordMeaning(clean);
                setSelectedWord({ word: clean, meaning });
                setShowWordMeaning(true);
                // Also speak just that single word so the kid can listen!
                speech.speak(clean);
              }}
              className="px-2 py-1 rounded-xl text-slate-900 font-extrabold hover:bg-sky-50 underline decoration-sky-300 decoration-4 underline-offset-4 hover:text-sky-700 transition-all duration-200 cursor-pointer"
            >
              {word}
            </motion.button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-full mx-auto px-4" id="scene-renderer-root">
      
      {/* Combined Header Card (Illustration + Progress) */}
      <div className="w-full bg-white rounded-[2.5rem] border-4 border-amber-100 shadow-xl overflow-hidden bento-shadow mb-6 flex flex-col relative" id="combined-header-card">
        
        {/* Top half: Scene Illustration */}
        <motion.div 
          key={`vector-${currentScene}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full relative transition-all duration-300 bg-[#FFF8EE]"
          style={{
            backgroundImage: "url('Scenes.png')",
            backgroundSize: '100% 1100%',
            backgroundPosition: `0% ${getFrameIndex() * 10}%`,
            backgroundRepeat: 'no-repeat',
            aspectRatio: '960 / 320',
            width: '100%',
          }}
          id="scene-illustration-card"
        >
          {/* Subtle gradient overlay at bottom to blend into the progress bar */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
          
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3.5 py-1.5 rounded-full border-2 border-sky-200 shadow-3xs z-10" id="scene-label">
            <span className="text-[10px] font-black text-sky-600 block leading-none uppercase tracking-wider">Scene {currentScene + 1}</span>
          </div>
        </motion.div>

        {/* Bottom half: Progress Bar */}
        <div className="px-5 pb-5 -mt-3 relative z-10">
          <ProgressBar 
            dayName={dayName}
            currentScene={currentScene}
            totalScenes={totalScenes}
            onJumpToScene={onJumpToScene}
            reviewStep={false}
            isEmbedded={true}
          />
        </div>
      </div>

      {/* Main interaction card container */}
      <div className="w-full bg-white rounded-[2.5rem] p-6 md:p-8 bento-shadow flex flex-col gap-6" id="interaction-card">
        
        {/* Render prior conversations in the scene */}
        {lines.slice(0, activeLineIndex).length > 0 && (
          <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1" id="prior-lines-flow">
            {lines.slice(0, activeLineIndex).map((line) => {
              if (line.isChoice) return null;
              const status = completedLines[line.id];
              return (
                <div key={line.id} className="flex items-start gap-2 text-sm text-slate-400 opacity-75 border-b border-dashed border-slate-100 pb-1.5">
                  <span className="font-extrabold shrink-0 text-slate-500">{getActorEmoji(line.actor)}:</span>
                  <span className="italic font-medium">{line.text}</span>
                  {status && (
                    <div className="ml-auto flex items-center gap-0.5 text-amber-500 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                      <Star className="h-3 w-3 fill-amber-400 stroke-transparent" />
                      <span>Pass!</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Current Active Conversation Step Line */}
        {currentLine && !currentLine.isChoice && (
          <motion.div
            key={currentLine.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white flex flex-col items-center text-center gap-5"
            id="active-conversation-bubble"
          >
            {/* Character tag */}
            <span className={`px-4 py-1 rounded-full text-xs font-black border border-slate-200/50 shadow-2xs ${getActorColor(currentLine.actor)}`} id="active-actor-tag">
              {getActorEmoji(currentLine.actor)} is speaking
            </span>

            {/* Tap interactive English words */}
            <div className="my-1 w-full flex justify-center">
              {renderInteractiveEnglishWords(currentLine.text)}
            </div>

            {/* Vietnamese subtitle */}
            <div className="text-base md:text-xl font-vietnamese font-bold text-slate-500" id="vietnamese-translation">
              {currentLine.translation}
            </div>

            {/* Vertical Stack Action Panel (Luồng Lắng nghe & Tập nói) */}
            <div className="flex flex-col items-center justify-center gap-3 mt-4 w-full max-w-xs mx-auto" id="action-voice-panel">
              {/* 🔊 Listen Again */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  sounds.playClick();
                  speech.speak(currentLine.text);
                }}
                className="flex items-center justify-center gap-2 px-6 py-3.5 w-full rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 border-2 border-amber-200 font-extrabold text-base transition-colors cursor-pointer"
                id="listen-tts-btn"
                title="Nghe cô nói mẫu"
              >
                <Volume2 className="h-5.5 w-5.5 text-amber-655" />
                <span>🔊 Nghe Máy Đọc</span>
              </motion.button>

              {/* 🎤 Speak/Repeat Microphone Button */}
              {speech.isListening ? (
                <div className="flex flex-col items-center py-4 px-6 w-full bg-rose-50 border-2 border-rose-200 rounded-2xl shadow-3xs">
                  <SoundWave />
                  <span className="text-xs text-rose-600 font-extrabold animate-pulse mt-1.5">Con nói đi... Cô đang nghe nè! 🎤</span>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => triggerListening(currentLine.text, currentLine.id)}
                  className={`flex items-center justify-center gap-2 px-6 py-3.5 w-full rounded-2xl font-black text-white cursor-pointer shadow-md transition-all duration-300 ring-4 ${
                    completedLines[currentLine.id] 
                      ? 'bg-emerald-500 hover:bg-emerald-600 ring-emerald-100' 
                      : 'bg-[#FF9800] hover:bg-orange-650 ring-orange-100'
                  }`}
                  id="record-stt-btn"
                >
                  <Mic className="h-5 w-5" />
                  <span>{completedLines[currentLine.id] ? 'Con nói lại (Try Again)' : 'Bé Tập Nói (My Turn 🎤)'}</span>
                </motion.button>
              )}
            </div>

            {/* Custom friendly rating indicator with Next button underneath */}
            {completedLines[currentLine.id] && !speech.isListening && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 flex flex-col items-center gap-2.5 p-4 rounded-3xl bg-amber-50/70 border-2 border-amber-150 w-full max-w-sm mx-auto"
                id="pronunciation-scorecard"
              >
                <div className="flex gap-1.5">
                  {Array.from({ length: completedLines[currentLine.id].stars }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                    >
                      <Star className="h-6 w-6 fill-amber-400 stroke-amber-500" />
                    </motion.div>
                  ))}
                </div>
                <span className="text-amber-900 font-vietnamese font-black text-sm md:text-base mt-0.5 text-center leading-snug">
                  {completedLines[currentLine.id].stars === 5 && '🌟 Tuyệt vời! Phát âm hoàn hảo! Qua câu ngay lập tức!'}
                  {completedLines[currentLine.id].stars === 4 && '✨ Phát âm rành rọt! Qua câu ngay lập tức!'}
                  {completedLines[currentLine.id].stars === 3 && '👍 Cần tích lũy 3 điểm luyện tập. Được +2 điểm'}
                  {completedLines[currentLine.id].stars === 2 && '💪 Cần tích lũy 3 điểm luyện tập. Được +1 điểm'}
                  {completedLines[currentLine.id].stars === 1 && '💡 Chưa tính lượt. Mời bé đọc lại 🎤'}
                </span>
                {completedLines[currentLine.id].transcript && (
                  <span className="text-xs text-slate-500 font-vietnamese italic font-semibold">
                    Máy nghe được: "{completedLines[currentLine.id].transcript}"
                  </span>
                )}

                {/* Point Accumulation Progress Bar for stars <= 3 */}
                {completedLines[currentLine.id].stars <= 3 && (
                  <div className="flex flex-col items-center w-full mt-1.5 bg-white/70 p-3 rounded-2xl border border-amber-100 shadow-3xs">
                    <span className="text-[11px] text-slate-500 font-black mb-1">
                      ĐIỂM LUYỆN TẬP CỦA CON:
                    </span>
                    <div className="flex items-center gap-2 text-lg font-black text-amber-900">
                      <div className="flex gap-1">
                        {Array.from({ length: 3 }).map((_, idx) => {
                          const currentPoints = completedLines[currentLine.id].practicePoints || 0;
                          return (
                            <span key={idx} className="transition-all duration-300">
                              {idx < currentPoints ? '🔶' : '⚪'}
                            </span>
                          );
                        })}
                      </div>
                      <span className="text-xs font-black text-slate-600 font-vietnamese">
                        ({completedLines[currentLine.id].practicePoints || 0}/3 điểm)
                      </span>
                    </div>
                    {(completedLines[currentLine.id].practicePoints || 0) >= 3 ? (
                      <span className="text-[11px] font-black text-emerald-600 font-vietnamese mt-1.5 flex items-center gap-1">
                        🎉 Đã tích lũy đủ 3 điểm để qua câu!
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 font-vietnamese mt-1">
                        Bé đọc thêm {3 - (completedLines[currentLine.id].practicePoints || 0)} điểm nữa là đủ điểm qua câu nha!
                      </span>
                    )}
                  </div>
                )}

                {/* Next Button placed strictly below the Feedback card */}
                <div className="mt-3 w-full">
                  {isLineConquered(currentLine.id) && activeLineIndex < lines.length - 1 ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        sounds.playClick();
                        setActiveLineIndex(prev => prev + 1);
                      }}
                      className="flex items-center justify-center gap-1.5 px-6 py-3 w-full rounded-2xl font-black bg-[#FFE57F] hover:bg-[#FFD54F] text-amber-950 border-2 border-amber-400 cursor-pointer shadow-md text-sm transition-all"
                      id="next-line-step-btn"
                    >
                      <span className="font-vietnamese">Nghe câu tiếp</span>
                      <ChevronRight className="h-4 w-4" strokeWidth={3} />
                    </motion.button>
                  ) : isSceneFullyPlayed && activeLineIndex === lines.length - 1 ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        sounds.playClick();
                        onSceneComplete();
                      }}
                      className="flex items-center justify-center gap-1.5 px-6 py-3.5 w-full rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-md text-sm transition-all"
                      id="scene-complete-next-btn"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-vietnamese font-bold">Qua đoạn mới 👉</span>
                    </motion.button>
                  ) : null}
                </div>
              </motion.div>
            )}

          </motion.div>
        )}

        {/* Word Translation bilingual overlay details */}
        <AnimatePresence>
          {showWordMeaning && selectedWord && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-5 bg-sky-50 rounded-[2rem] border-4 border-sky-200 text-center flex flex-col items-center gap-1 relative bento-shadow"
              id="word-dictionary-hint"
            >
              <button 
                onClick={() => setShowWordMeaning(false)}
                className="absolute top-2.5 right-4 text-sky-700 font-extrabold text-sm hover:text-sky-900 cursor-pointer bg-white h-6 w-6 rounded-full flex items-center justify-center border border-sky-300"
                id="close-word-hint"
              >
                ✕
              </button>
              <span className="text-[10px] uppercase tracking-wider text-sky-600 font-vietnamese font-black">Từ vựng tương tác biling-biling</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-black text-sky-950 capitalize">"{selectedWord.word}"</span>
                <span className="text-sky-400 font-bold">=</span>
                <span className="text-xl font-vietnamese font-black text-orange-600">{selectedWord.meaning}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Choice Screen Renderer (e.g. Breakfast selection) */}
        {currentLine && currentLine.isChoice && (
          <div className="flex flex-col items-center gap-5 py-4 border-t-2 border-slate-50 pt-4" id="interactive-choice-block">
            <span className="text-lg font-black text-slate-700 text-center">
              {currentScene === 3 && !isWeekend && "What do you want for breakfast? 😋"}
              {currentScene === 1 && isWeekend && "What do you want to eat today? 🥞"}
              {currentScene === 2 && isWeekend && "Where do we go today? 🗺️"}
              {currentScene === 4 && isWeekend && "Choose your favorite Ice Cream flavor! 🍦"}
            </span>

            {/* Render breakfast choice items */}
            {((currentScenarioId === 'breakfast' && !isWeekend) || (currentScenarioId === 'weekend_breakfast' && isWeekend)) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full" id="breakfast-choices-grid">
                {breakfastOptions.map((opt) => (
                  <motion.button
                    key={opt.id}
                    id={`choice-button-${opt.id}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBreakfastSelection(opt.id, opt.text, opt.labelVi)}
                    className="p-5 bg-amber-50 hover:bg-[#FFE082] border-4 border-amber-200 rounded-[2rem] flex flex-col items-center gap-2 cursor-pointer bento-shadow transition-all"
                  >
                    <span className="text-4xl">{opt.icon}</span>
                    <span className="font-extrabold text-[#FF9800]">{opt.text}</span>
                    <span className="text-xs text-amber-800 font-extrabold bg-amber-200/50 px-2.5 py-0.5 rounded-full">{opt.labelVi}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Weekend specific attraction selection */}
            {currentScenarioId === 'weekend_destination' && isWeekend && (
              <div className="grid grid-cols-2 gap-4 w-full" id="weekend-place-grid">
                {dayName === 'Saturday' ? (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleWeekendPlaceSelection('Zoo')}
                      className="p-6 bg-emerald-50 hover:bg-emerald-100 border-4 border-emerald-300 rounded-[2rem] flex flex-col items-center gap-3 cursor-pointer bento-shadow"
                      id="zoo-selector"
                    >
                      <span className="text-5xl animate-bounce">🦁</span>
                      <span className="font-black text-lg text-emerald-800">Zoo</span>
                      <span className="text-xs text-white font-black bg-emerald-500 px-3.5 py-1 rounded-full border border-emerald-400 font-vietnamese">Sở Thú</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleWeekendPlaceSelection('Park')}
                      className="p-6 bg-sky-50 hover:bg-sky-100 border-4 border-sky-300 rounded-[2rem] flex flex-col items-center gap-3 cursor-pointer bento-shadow"
                      id="park-selector"
                    >
                      <span className="text-5xl animate-bounce">🌳</span>
                      <span className="font-black text-lg text-sky-800">Park</span>
                      <span className="text-xs text-white font-black bg-sky-500 px-3.5 py-1 rounded-full border border-sky-400 font-vietnamese">Công Viên</span>
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleWeekendPlaceSelection('Playground')}
                      className="p-6 bg-amber-50 hover:bg-[#FFE082] border-4 border-amber-300 rounded-[2rem] flex flex-col items-center gap-3 cursor-pointer bento-shadow"
                      id="playground-selector"
                    >
                      <span className="text-5xl animate-bounce">🛝</span>
                      <span className="font-black text-lg text-amber-800">Playground</span>
                      <span className="text-xs text-white font-black bg-amber-500 px-3.5 py-1 rounded-full border border-amber-400 font-vietnamese">Xích Đu</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleWeekendPlaceSelection('Grandma')}
                      className="p-6 bg-rose-50 hover:bg-rose-100 border-4 border-rose-300 rounded-[2rem] flex flex-col items-center gap-3 cursor-pointer bento-shadow"
                      id="grandma-selector"
                    >
                      <span className="text-5xl animate-bounce">👵</span>
                      <span className="font-black text-lg text-rose-800">Grandma</span>
                      <span className="text-xs text-white font-black bg-rose-500 px-3.5 py-1 rounded-full border border-rose-400 font-vietnamese">Bà Ngoại</span>
                    </motion.button>
                  </>
                )}
              </div>
            )}

            {/* Weekend Cool Treat Selection (Ice cream flavor) */}
            {currentScenarioId === 'weekend_treat' && isWeekend && (
              <div className="grid grid-cols-3 gap-3 w-full" id="icecream-choice-grid">
                {[
                  { flavor: 'Chocolate', icon: '🟫', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                  { flavor: 'Strawberry', icon: '🟥', color: 'bg-rose-100 text-rose-800 border-rose-300' },
                  { flavor: 'Vanilla', icon: '⬜', color: 'bg-slate-100 text-slate-800 border-slate-300' }
                ].map((treat) => (
                  <motion.button
                    key={treat.flavor}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleIceCreamSelection(treat.flavor)}
                    className="p-5 bg-orange-50 hover:bg-[#FFE082] border-4 border-orange-200 rounded-[2rem] flex flex-col items-center gap-1 cursor-pointer bento-shadow"
                    id={`flavor-${treat.flavor.toLowerCase()}`}
                  >
                    <span className="text-3xl">{treat.icon}</span>
                    <span className="font-black text-sm mt-1">{treat.flavor}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation Actions Footer inside card */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 border-t-2 border-slate-50 pt-4" id="story-navigation-panel">
          {/* Quick tips about word translation */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-vietnamese font-extrabold bg-[#FFF9E5] border border-amber-100 px-4 py-2 rounded-full w-auto shadow-2xs">
            <HelpCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Mẹo: Chạm vào chữ tiếng Anh để xem nghĩa</span>
          </div>
        </div>
      </div>
    </div>
  );
}
