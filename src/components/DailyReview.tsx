import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Mic, Star, ChevronRight, RefreshCw, Trophy, Sparkles, Smile, Volume2, ArrowRight, Download } from 'lucide-react';
import { DayName, DayProgression } from '../types';
import { useSpeech } from '../hooks/useSpeech';
import { sounds } from '../utils/soundEngine';
import { downloadWorksheetPNG } from '../utils/worksheetGenerator';
import SoundWave from './SoundWave';
import CuteIcon from './CuteIcon';
import { breakfastOptions, classroomActivities, houseChores } from '../data/storyData';
import { getStorySkeletonForDay, getReviewQuestion } from '../data/phrases/phraseEngine';

interface DailyReviewProps {
  dayName: DayName;
  dayState: DayProgression;
  updateDayState: (updater: (prev: DayProgression) => DayProgression) => void;
  onReviewComplete: (totalScore: number) => void;
  onSpeechReport?: (text: string, stars: number) => void;
  kidName?: string;
}

export default function DailyReview({
  dayName,
  dayState,
  updateDayState,
  onReviewComplete,
  onSpeechReport,
  kidName,
}: DailyReviewProps) {
  const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';
  const speech = useSpeech();

  // Part 1: Five Questions, Part 2: Tell Me about your day, Part 3: Congratulatory screen
  const [reviewPart, setReviewPart] = useState<'questions' | 'timeline' | 'congrats'>('questions');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(0);

  // Load dynamically tailored Questions & Answers on mount
  useEffect(() => {
    const dayType = dayName === 'Sunday' ? 'sunday' : dayName === 'Saturday' ? 'saturday' : 'weekday';
    const skeleton = getStorySkeletonForDay(dayType);
    
    let generatedQuestions: any[] = [];
    // Collect questions from scenarios
    skeleton.forEach(scenarioId => {
      const qList = getReviewQuestion(scenarioId);
      qList.forEach(q => {
        let answerText = 'I did a lot of things!';

        switch (q.id) {
          // Weekday
          case 'q_wake_up': {
            answerText = dayState.timelineSentences[0]?.text || "I wake up.";
            break;
          }
          case 'q_bathroom': {
            answerText = dayState.bathroomActions[0] || 'I brush my teeth.';
            break;
          }
          case 'q_get_dressed': {
            answerText = 'I get dressed.';
            break;
          }
          case 'q_breakfast': {
            const bOption = breakfastOptions.find(o => o.id === dayState.selectedBreakfast);
            const bFood = bOption?.text.toLowerCase() || 'milk';
            answerText = `I want ${bFood}.`;
            break;
          }
          case 'q_go_to_school': {
            answerText = 'I go to school.';
            break;
          }
          case 'q_classroom': {
            answerText = classroomActivities[dayName]?.instruction || 'Open your book.';
            break;
          }
          case 'q_go_home': {
            answerText = 'I go home.';
            break;
          }
          case 'q_house_chores': {
            answerText = houseChores[dayName]?.narratorChore || 'I sweep the floor.';
            break;
          }
          case 'q_dinner': {
            answerText = 'I eat dinner.';
            break;
          }
          case 'q_bedtime': {
            answerText = 'I go to bed.';
            break;
          }

          // Weekend
          case 'q_weekend_wake_up': {
            answerText = 'I wake up late on weekends!';
            break;
          }
          case 'q_weekend_breakfast': {
            const wkFood = dayState.selectedBreakfast || 'pancakes';
            answerText = `I want ${wkFood.toLowerCase()}, please.`;
            break;
          }
          case 'q_weekend_destination': {
            const wkPlace = dayState.weekendActivity || 'Park';
            answerText = `We go to the ${wkPlace.toLowerCase()}.`;
            break;
          }
          case 'q_weekend_adventure': {
            const wkPlace = dayState.weekendActivity || 'Park';
            answerText = wkPlace === 'Zoo' 
              ? 'I see a big giraffe.' 
              : wkPlace === 'Grandma' 
                ? 'Grandma gives me a big hug.' 
                : wkPlace === 'Playground' 
                  ? 'I go down the slide.' 
                  : 'I run on the green grass.';
            break;
          }
          case 'q_weekend_treat': {
            const selectedFlavor = dayState.questionsAnswers[2]?.answer || 'Strawberry';
            answerText = `I eat ${selectedFlavor.toLowerCase()} ice cream.`;
            break;
          }
          case 'q_weekend_bedtime': {
            answerText = 'Good night, sweet dreams!';
            break;
          }
          default: {
            answerText = 'I had a wonderful day!';
          }
        }

        generatedQuestions.push({
          question: q.question,
          answer: answerText,
          audioText: answerText,
          recordingState: 'idle'
        });
      });
    });

    // Limit to 5 questions for the UI Part 1
    const finalQuestions = generatedQuestions.slice(0, 5);

    // Keep the timeline visual the same, just use the generated ones
    updateDayState(prev => ({
      ...prev,
      questionsAnswers: finalQuestions.length > 0 ? finalQuestions : prev.questionsAnswers
    }));
  }, [dayName, isWeekend, dayState.selectedBreakfast, dayState.weekendActivity]);

  // Voice play assistant when question mounts
  useEffect(() => {
    if (reviewPart === 'questions' && dayState.questionsAnswers[activeQuestionIndex]) {
      const q = dayState.questionsAnswers[activeQuestionIndex];
      // Speak the actual question for the child to listen
      speech.speak(q.question);
    }
  }, [activeQuestionIndex, reviewPart, dayState.questionsAnswers.length]);

  // Handle Practice Repeating in Questions section
  const handleRecordQuestion = (index: number, answerText: string) => {
    sounds.playMicBeep();
    speech.startListening(answerText, `q_${index}`, (transcript, score) => {
      sounds.playTwinkle();
      updateDayState(prev => {
        const newQA = [...prev.questionsAnswers];
        const prevStars = newQA[index].stars || 0;
        const newStars = Math.min(5, prevStars + score);
        newQA[index] = {
          ...newQA[index],
          recordingState: 'completed',
          transcript,
          stars: newStars
        };
        return { ...prev, questionsAnswers: newQA };
      });
      
      const prevStars = dayState.questionsAnswers[index].stars || 0;
      const newStars = Math.min(5, prevStars + score);
      if (newStars >= 3) {
        setTimeout(() => {
          setActiveQuestionIndex(curr => (curr === index && curr < 4) ? curr + 1 : curr);
        }, 1500);
      }

      if (onSpeechReport) {
        onSpeechReport(answerText, score);
      }
    });
  };

  // Handle Timeline narration practice
  const handleRecordTimeline = (index: number, targetText: string) => {
    sounds.playMicBeep();
    speech.startListening(targetText, `t_${index}`, (transcript, score) => {
      sounds.playTwinkle();
      updateDayState(prev => {
        const newTimeline = [...prev.timelineSentences];
        const prevStars = newTimeline[index].stars || 0;
        const newStars = Math.min(5, prevStars + score);
        newTimeline[index] = {
          ...newTimeline[index],
          recordingState: 'completed',
          transcript,
          stars: newStars
        };
        return { ...prev, timelineSentences: newTimeline };
      });
      
      const prevStars = dayState.timelineSentences[index].stars || 0;
      const newStars = Math.min(5, prevStars + score);
      if (newStars >= 3) {
        setTimeout(() => {
          setActiveTimelineIndex(curr => (curr === index && curr < 4) ? curr + 1 : curr);
        }, 1500);
      }

      if (onSpeechReport) {
        onSpeechReport(targetText, score);
      }
    });
  };

  // Skip or Auto pass helpers so kids never get stuck
  const autoPassActiveQuestion = () => {
    sounds.playTwinkle();
    updateDayState(prev => {
      const newQA = [...prev.questionsAnswers];
      newQA[activeQuestionIndex] = {
        ...newQA[activeQuestionIndex],
        recordingState: 'completed',
        stars: 4, // Perfect auto pass
        transcript: newQA[activeQuestionIndex].answer
      };
      return { ...prev, questionsAnswers: newQA };
    });
    setTimeout(() => {
      setActiveQuestionIndex(curr => curr < 4 ? curr + 1 : curr);
    }, 1000);
  };

  const autoPassActiveTimeline = () => {
    sounds.playTwinkle();
    updateDayState(prev => {
      const newTimeline = [...prev.timelineSentences];
      newTimeline[activeTimelineIndex] = {
        ...newTimeline[newTimeline.length - 1] ? newTimeline[activeTimelineIndex] : newTimeline[activeTimelineIndex],
        recordingState: 'completed',
        stars: 4,
        transcript: newTimeline[activeTimelineIndex].text
      };
      return { ...prev, timelineSentences: newTimeline };
    });
    setTimeout(() => {
      setActiveTimelineIndex(curr => curr < 4 ? curr + 1 : curr);
    }, 1000);
  };

  // Compute stats
  const totalStarsEarned = (): number => {
    let sum = 0;
    dayState.questionsAnswers.forEach(q => sum += q.stars || 0);
    dayState.timelineSentences.forEach(t => sum += t.stars || 0);
    return sum;
  };

  const isQuestionsFinished = dayState.questionsAnswers.every(q => q.recordingState === 'completed' && (q.stars || 0) >= 3);
  const isTimelineFinished = dayState.timelineSentences.every(t => t.recordingState === 'completed' && (t.stars || 0) >= 3);

  return (
    <div className="w-full max-w-full mx-auto px-4 py-2" id="daily-review-wrapper">
      
      {/* ProgressBar for review step */}
      <div className="flex justify-between items-center bg-white px-5 py-4 rounded-[2rem] mb-6 border-4 border-amber-100 bento-shadow" id="review-navigator-timeline">
        <span className="font-extrabold text-slate-750 text-sm flex items-center gap-1.5"><CuteIcon nameOrEmoji="calendar" className="h-5 w-5" /> {dayName}'s Interactive Review</span>
        <div className="flex gap-2" id="review-tabs">
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-black border-2 transition-all ${reviewPart === 'questions' ? 'bg-[#FF9800] border-[#FF9800] text-white shadow-xs' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
            Part 1: 5 Questions
          </span>
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-black border-2 transition-all ${reviewPart === 'timeline' ? 'bg-[#FF9800] border-[#FF9800] text-white shadow-xs' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
            Part 2: My Day Story
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* PART 1: FIVE QUESTIONS */}
        {reviewPart === 'questions' && (
          <motion.div
            key="questions-container"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-[2.5rem] p-6 shadow-xl border-4 border-amber-100 flex flex-col gap-6"
            id="review-questions-block"
          >
            {/* Title */}
            <div className="text-center" id="q-header-title">
              <span className="text-pink-650 font-vietnamese font-extrabold uppercase text-xs tracking-wider flex items-center justify-center gap-1"><CuteIcon nameOrEmoji="old-woman" className="h-4.5 w-4.5" /> Cô Giáo</span>
              <h2 className="text-2xl font-vietnamese font-black text-slate-800 mt-1">Con Trả Lời Câu Hỏi Nhé!</h2>
              <div className="flex justify-center gap-1.5 mt-3" id="q-stepping-dots">
                {dayState.questionsAnswers.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      sounds.playClick();
                      setActiveQuestionIndex(idx);
                    }}
                    className={`h-4 w-9 rounded-full transition-all duration-300 cursor-pointer border-2 ${
                      idx === activeQuestionIndex 
                        ? 'bg-orange-500 border-orange-600 w-12 shadow-xs' 
                        : dayState.questionsAnswers[idx].recordingState === 'completed' 
                          ? 'bg-emerald-500 border-emerald-650' 
                          : 'bg-slate-50 border-slate-250'
                    }`}
                    id={`dot-btn-${idx}`}
                  />
                ))}
              </div>
            </div>

            {/* Current Active Question Display */}
            {dayState.questionsAnswers[activeQuestionIndex] && (
              <motion.div
                key={`q-${activeQuestionIndex}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center p-6 md:p-8 bg-sky-50 rounded-[2rem] border-4 border-sky-100 relative"
                id="q-body-panel"
              >
                {/* Voice play button for the question */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    speech.speak(dayState.questionsAnswers[activeQuestionIndex].question);
                  }}
                  className="absolute top-4 right-4 p-2.5 bg-pink-50 text-pink-600 border-2 border-pink-100 rounded-full hover:bg-pink-100 transition-colors cursor-pointer shadow-3xs"
                  id="speak-question-play"
                  title="Nghe lại câu hỏi"
                >
                  <Volume2 className="h-5 w-5 animate-pulse" />
                </button>

                <CuteIcon nameOrEmoji="old-woman" className="h-14 w-14 mb-1" />
                <span className="text-xs font-black text-sky-600 uppercase tracking-wide">Question {activeQuestionIndex + 1}</span>
                <h3 className="text-2.5xl font-black text-sky-950 mt-1.5 tracking-tight leading-tight">
                  {dayState.questionsAnswers[activeQuestionIndex].question}
                </h3>

                {/* Subtitle helper showing what to say */}
                <div className="mt-6 flex flex-col items-center gap-2 w-full max-w-md bg-white p-4 rounded-2xl border-4 border-emerald-100 shadow-xs" id="q-answer-guide">
                  <span className="text-xs text-emerald-600 font-vietnamese font-extrabold uppercase tracking-wide flex items-center gap-1"><CuteIcon nameOrEmoji="star" className="h-4 w-4" /> Hãy trả lời bé ơi:</span>
                  <p className="text-2xl font-black text-slate-800 leading-tight">
                    {dayState.questionsAnswers[activeQuestionIndex].answer}
                  </p>
                </div>

                {/* Recording module */}
                <div className="flex flex-col items-center gap-3 mt-6 w-full" id="q-record-control">
                  {speech.isListening ? (
                    <div className="flex flex-col items-center py-2 px-6 bg-rose-50 border-2 border-rose-100 rounded-2xl">
                      <SoundWave />
                      <span className="text-rose-500 font-vietnamese font-extrabold animate-pulse text-xs mt-1.5">Con nói đi... Ba mẹ đang nghe nè! 🎤</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 justify-center w-full">
                      {/* Audio helper tool to hear the exact answer speech */}
                      <button
                        onClick={() => {
                          sounds.playClick();
                          speech.speak(dayState.questionsAnswers[activeQuestionIndex].answer);
                        }}
                        className="p-3.5 bg-emerald-50 text-emerald-700 border-2 border-emerald-250 rounded-2xl hover:bg-emerald-100 transition-colors cursor-pointer"
                        id="q-hear-guide"
                        title="Nghe cách nói mẫu"
                      >
                        <Volume2 className="h-6 w-6" />
                      </button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRecordQuestion(activeQuestionIndex, dayState.questionsAnswers[activeQuestionIndex].answer)}
                        className={`flex items-center gap-2.5 px-7 py-4 rounded-2xl text-white font-black shadow-lg cursor-pointer ring-8 ${
                          dayState.questionsAnswers[activeQuestionIndex].recordingState === 'completed'
                            ? 'bg-emerald-500 hover:bg-emerald-600 ring-emerald-50'
                            : 'bg-rose-500 hover:bg-rose-600 ring-rose-50'
                        }`}
                        id="q-record-trigger"
                      >
                        <Mic className="h-5 w-5" />
                        <span>{dayState.questionsAnswers[activeQuestionIndex].recordingState === 'completed' ? 'Nói lại 🎤' : 'Trả lời 🎤'}</span>
                      </motion.button>

                      {/* Quick Auto Pass button if kid has some trouble or wants to skip */}
                      <button
                        onClick={autoPassActiveQuestion}
                        className="text-xs font-black text-slate-500 hover:text-slate-800 bg-white border-2 border-slate-200 px-4 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors font-vietnamese"
                      >
                        Bỏ qua ➜
                      </button>
                    </div>
                  )}

                  {/* Question Feedback stars */}
                  {dayState.questionsAnswers[activeQuestionIndex].recordingState === 'completed' && !speech.isListening && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-2 flex flex-col items-center gap-1.5 bg-amber-50 border-2 border-amber-200 px-6 py-3 rounded-2xl shadow-3xs"
                      id="q-stars-badge"
                    >
                      <div className="flex">
                        {Array.from({ length: dayState.questionsAnswers[activeQuestionIndex].stars || 3 }).map((_, i) => (
                          <Star key={i} className="h-5.5 w-5.5 fill-amber-400 stroke-amber-500" />
                        ))}
                      </div>
                      <span className="text-amber-800 font-black text-sm capitalize">
                        {dayState.questionsAnswers[activeQuestionIndex].stars === 5 && '🌟 Amazing! Phát âm rất rõ ràng!'}
                        {dayState.questionsAnswers[activeQuestionIndex].stars === 4 && '✨ Great! Con nói gần đúng hết rồi!'}
                        {dayState.questionsAnswers[activeQuestionIndex].stars === 3 && '👍 Nice! Ba mẹ nghe hiểu rồi nha!'}
                        {dayState.questionsAnswers[activeQuestionIndex].stars <= 2 && '💪 Good Try! Bạn ơi thử nói lại nhé!'}
                      </span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Part Footer triggers */}
            <div className="flex justify-between items-center border-t-2 border-slate-50 pt-4" id="questions-footer">
              <span className="text-xs text-slate-400 font-vietnamese font-bold">Thành tích: {dayState.questionsAnswers.filter(q => q.recordingState === 'completed').length}/5 Câu</span>
              
              {isQuestionsFinished ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    sounds.playSuccess();
                    setReviewPart('timeline');
                  }}
                  className="flex items-center gap-1.5 px-6 py-3.5 bg-[#FF9800] hover:bg-orange-600 text-white rounded-full font-black cursor-pointer shadow-md text-base border-2 border-orange-500 transition-all font-vietnamese"
                  id="proceed-to-timeline-btn"
                >
                  <span>Chuyển Sang Phần 2</span>
                  <ArrowRight className="h-5 w-5" />
                </motion.button>
              ) : (
                <button
                  onClick={() => {
                    sounds.playClick();
                    if (activeQuestionIndex < 4) {
                      setActiveQuestionIndex(prev => prev + 1);
                    }
                  }}
                  disabled={activeQuestionIndex === 4 || dayState.questionsAnswers[activeQuestionIndex]?.recordingState !== 'completed' || (dayState.questionsAnswers[activeQuestionIndex]?.stars || 0) < 3}
                  className="px-5 py-2.5 rounded-full text-sm font-black text-[#FF9800] bg-amber-50 border-2 border-amber-200 hover:bg-amber-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all font-vietnamese"
                  id="next-q-btn"
                >
                  Câu tiếp theo
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* PART 2: TELL ME ABOUT YOUR DAY (TIMELINE NARRATION) */}
        {reviewPart === 'timeline' && (
          <motion.div
            key="timeline-container"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-[2.5rem] p-6 shadow-xl border-4 border-amber-100 flex flex-col gap-6"
            id="review-timeline-block"
          >
            {/* Title prompt */}
            <div className="text-center" id="t-header-title">
              <span className="text-[#FF9800]  font-vietnamese font-black uppercase text-xs tracking-wider flex items-center justify-center gap-1"><CuteIcon nameOrEmoji="star" className="h-4.5 w-4.5" /> Kể chuyện tự do</span>
              <h2 className="text-2.5xl font-black text-slate-800 mt-1">Tell Me About Your Day</h2>
              <p className="text-slate-500 font-vietnamese text-sm mt-1 font-semibold leading-relaxed">Hãy ngắm nhìn chuỗi tranh gợi ý sinh động và tập kể lại bằng tiếng Anh nhé!</p>
            </div>

            {/* Visual Timeline Cards (Child clicks / speaks through each) */}
            <div className="flex flex-col gap-4 my-2" id="timeline-stack">
              {dayState.timelineSentences.map((step, idx) => {
                const isActive = idx === activeTimelineIndex;
                const isPassed = step.recordingState === 'completed' && (step.stars || 0) >= 3;

                return (
                  <motion.div
                    key={idx}
                    id={`timeline-row-${idx}`}
                    whileHover={{ scale: isActive ? 1.02 : 1 }}
                    className={`flex items-center gap-4 p-5 rounded-[1.5rem] border-4 transition-all duration-200 relative ${
                      isActive 
                        ? 'bg-amber-50 border-amber-300 shadow-md scale-[1.01]' 
                        : isPassed 
                          ? 'bg-emerald-50/40 border-emerald-300' 
                          : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  >
                    {/* Time icon badge */}
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl shadow-3xs border-2 transition-all ${
                      isActive 
                        ? 'bg-[#FF9800] border-orange-500 text-white animate-bounce' 
                        : isPassed 
                          ? 'bg-emerald-500 border-emerald-650 text-white' 
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`} id="timeline-icon-badge">
                      <CuteIcon nameOrEmoji={step.icon} className="h-7 w-7" />
                    </div>

                    {/* Left text guide */}
                    <div className="flex flex-col flex-1" id="timeline-col-guide">
                      <span className="text-[10px] font-black text-slate-400 font-vietnamese uppercase tracking-widest leading-none">Phần {idx + 1}</span>
                      <p className="text-lg font-black text-slate-800 tracking-tight mt-1 leading-tight">
                        {step.text}
                      </p>
                    </div>

                    {/* Mic indicator or complete star */}
                    <div className="flex items-center gap-2.5" id="timeline-mic">
                      {isActive && speech.isListening ? (
                        <div className="h-10 w-24">
                          <SoundWave />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {isPassed && (
                            <div className="flex gap-0.5" id="timeline-stars-row">
                              {Array.from({ length: step.stars || 3 }).map((_, i) => (
                                <Star key={i} className="h-4.5 w-4.5 fill-amber-400 stroke-transparent" />
                              ))}
                            </div>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              sounds.playClick();
                              setActiveTimelineIndex(idx);
                              handleRecordTimeline(idx, step.text);
                            }}
                            className={`p-3.5 rounded-full cursor-pointer hover:shadow-md border-2 transition-all ${
                              isActive 
                                ? 'bg-[#FF9800] border-orange-500 text-white ring-4 ring-orange-100' 
                                : isPassed 
                                  ? 'bg-emerald-100 border-emerald-250 text-emerald-800' 
                                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 shadow-3xs'
                            }`}
                            id={`mic-timeline-btn-${idx}`}
                          >
                            <Mic className="h-4.5 w-4.5" />
                          </motion.button>

                          {isActive && (
                            <button
                              onClick={autoPassActiveTimeline}
                              className="text-xs font-black text-slate-400 hover:text-[#FF9800] cursor-pointer bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg hover:border-orange-200 transition-all font-vietnamese"
                              id="timeline-sc-pass"
                            >
                              Bỏ qua
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Narrative Footer control */}
            <div className="flex justify-between items-center border-t-2 border-slate-50 pt-4" id="timeline-footer">
              <span className="text-sm text-slate-400 font-vietnamese font-extrabold">Thành tựu câu chuyện: {dayState.timelineSentences.filter(t => t.recordingState === 'completed').length}/5 Câu</span>
              
              {isTimelineFinished ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    sounds.playSuccess();
                    setReviewPart('congrats');
                  }}
                  className="flex items-center gap-1.5 px-7 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-black cursor-pointer shadow-lg text-lg border-4 border-white ring-8 ring-emerald-50 transition-all animate-pulse font-vietnamese"
                  id="timeline-finish-trigger"
                >
                  <Trophy className="h-5 w-5" />
                  <span>Hoàn Thành Bài Ôn Tập ➜</span>
                </motion.button>
              ) : (
                <button
                  onClick={() => {
                    sounds.playClick();
                    if (activeTimelineIndex < 4) {
                      setActiveTimelineIndex(activeTimelineIndex + 1);
                    }
                  }}
                  disabled={activeTimelineIndex === 4 || dayState.timelineSentences[activeTimelineIndex]?.recordingState !== 'completed' || (dayState.timelineSentences[activeTimelineIndex]?.stars || 0) < 3}
                  className="px-5 py-2.5 rounded-full text-sm font-black text-slate-600 bg-slate-50 border-2 border-slate-250 hover:bg-slate-100 cursor-pointer disabled:opacity-45 transition-all font-vietnamese"
                  id="timeline-next-btn"
                >
                  Dòng tiếp theo
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* PART 3: CONGRATULATORY TROPHY WRAP UP */}
        {reviewPart === 'congrats' && (
          <motion.div
            key="congrats-container"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 md:p-10 border-8 border-white bento-shadow text-center flex flex-col items-center gap-6 relative overflow-hidden"
            id="review-congrats-panel"
          >
            {/* Soft decorative background rays */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-50/70 via-transparent to-transparent opacity-100 -z-10" />

            <div className="flex gap-2">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                className="p-4 bg-amber-100 border-4 border-amber-300 rounded-full mx-auto"
              >
                <Trophy className="h-20 w-20 text-amber-500 drop-shadow-md" />
              </motion.div>
            </div>

            <div id="congrats-cheer">
              <h2 className="text-3.5xl md:text-4xl font-vietnamese font-black text-amber-950 tracking-tight flex items-center justify-center gap-2">Tuyệt Vời Bé Ơi! <CuteIcon nameOrEmoji="balloon" className="h-10 w-10 text-pink-500 animate-bounce" /></h2>
              <p className="text-amber-900 font-vietnamese mt-2 font-bold max-w-sm mx-auto opacity-90 text-sm leading-relaxed">
                Ba mẹ ơi, bé đã xuất sắc nói tiếng Anh trôi chảy và hoàn thành bài ôn tập ngày hôm nay rồi đấy!
              </p>
            </div>

            {/* Total star summary indicators */}
            <div className="p-6 rounded-[2.5rem] bg-amber-50 border-4 border-amber-200 flex flex-col items-center gap-2 w-full max-w-sm bento-shadow" id="review-stars-summary">
              <span className="text-xs uppercase tracking-wider text-amber-700 font-vietnamese font-extrabold flex items-center gap-1.5 leading-none">
                <Sparkles className="h-4.5 w-4.5 text-amber-500" />
                Vòng nguyệt quế của bé
              </span>
              <div className="flex items-center gap-1.5 my-1.5" id="gold-stars-pack">
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.25, 1], rotate: [0, 15, -15, 0] }}
                    transition={{ delay: i * 0.15, duration: 0.8, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Star className="h-9 w-9 fill-amber-400 stroke-transparent drop-shadow-xs" />
                  </motion.div>
                ))}
              </div>
              <span className="text-xl font-vietnamese font-black text-amber-900 leading-none">Con nhận được +{totalStarsEarned()} Sao vàng!</span>
            </div>

            {/* Download printable worksheet */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                sounds.playClick();
                downloadWorksheetPNG(dayName, kidName || '', dayState, totalStarsEarned());
              }}
              className="px-8 py-3.5 bg-white hover:bg-indigo-50 text-indigo-700 font-black rounded-full text-base cursor-pointer shadow-md w-full max-w-xs border-4 border-indigo-100 transition-all font-vietnamese flex items-center justify-center gap-2"
              id="congrats-download-worksheet-btn"
            >
              <Download className="h-5 w-5" />
              <span>Tải Worksheet (PNG) để in</span>
            </motion.button>

            {/* Save and exit back to selects */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                sounds.playSuccess();
                onReviewComplete(totalStarsEarned());
              }}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-full text-lg cursor-pointer shadow-lg w-full max-w-xs border-4 border-white ring-8 ring-emerald-55 transition-all font-vietnamese"
              id="congrats-claim-btn"
            >
              <span>Tiếp Tục Tuần English 💚</span>
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
