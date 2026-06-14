import React from 'react';
import { motion } from 'motion/react';
import { DayName } from '../types';
import { sounds } from '../utils/soundEngine';
import CuteIcon from './CuteIcon';

interface ProgressBarProps {
  dayName: DayName;
  currentScene: number;
  totalScenes: number;
  onJumpToScene: (index: number) => void;
  reviewStep: boolean;
  isEmbedded?: boolean;
}

// Custom component to render sprite sheet icons from a 3-row x 4-column Icons.png
const ProgressSpriteIcon: React.FC<{ frameIndex: number; fallbackEmoji: string; className?: string }> = ({
  frameIndex,
  fallbackEmoji,
  className = '',
}) => {
  const [hasError, setHasError] = React.useState(false);

  const col = frameIndex % 4;
  const row = Math.floor(frameIndex / 4);

  // Since there are 4 columns, x ratio steps are: Col 0 (0%), Col 1 (33.33%), Col 2 (66.67%), Col 3 (100%)
  const posX = `${(col / 3) * 100}%`;
  // Since there are 3 rows, y ratio steps are: Row 0 (0%), Row 1 (50%), Row 2 (100%)
  const posY = `${(row / 2) * 100}%`;

  if (hasError) {
    return <span className="text-base sm:text-lg md:text-xl select-none leading-none">{fallbackEmoji}</span>;
  }

  return (
    <div className={`relative ${className} flex items-center justify-center`}>
      {/* Hidden image probe to test if Icons.png exists on server / public folder */}
      <img
        src="Icons.png"
        alt=""
        style={{ display: 'none' }}
        onError={() => setHasError(true)}
      />
      <div
        className="w-full h-full bg-no-repeat transition-all duration-300"
        style={{
          backgroundImage: "url('Icons.png')",
          backgroundSize: '400% 300%',
          backgroundPosition: `${posX} ${posY}`,
        }}
      />
    </div>
  );
};

export default function ProgressBar({
  dayName,
  currentScene,
  totalScenes,
  onJumpToScene,
  reviewStep,
  isEmbedded = false,
}: ProgressBarProps) {
  const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';

  // Cute fallbacks for the progress map
  const weekdayIcons = ['🛏️', '🪥', '👕', '🥛', '⏱️', '🏫', '🎨', '🧹', '🍽️', '🌙'];
  const weekendIcons = ['🛏️', '🥞', '🦁', '🎡', '🍦', '🌙'];

  const iconsToUse = isWeekend ? weekendIcons : weekdayIcons;

  // Map progress scene index to sprite sheet Frame index (0 to 10)
  const getIconFrameIndex = (idx: number) => {
    if (isWeekend) {
      switch (idx) {
        case 0: return 0; // Bedroom / Wake Up -> Frame index 0
        case 1: return 3; // Breakfast -> Frame index 3
        case 2: return 9; // Weekend Place (Zoo / Park) -> Frame index 9
        case 3: return 9; // Weekend Adventure (Grandma / Zoo) -> Frame index 9
        case 4: return 3; // Breakfast / Treats (Juice) -> Frame index 3
        case 5: return 10; // Bedtime -> Frame index 10
        default: return 0;
      }
    } else {
      switch (idx) {
        case 0: return 0; // Bedroom / Wake up -> Frame index 0
        case 1: return 1; // Bathroom -> Frame index 1
        case 2: return 2; // Get Dressed -> Frame index 2
        case 3: return 3; // Breakfast -> Frame index 3
        case 4: return 4; // Check Time (Clock) -> Frame index 4
        case 5: return 5; // School -> Frame index 5
        case 6: return 6; // Classroom -> Frame index 6
        case 7: return 7; // Chores -> Frame index 7
        case 8: return 8; // Dinner -> Frame index 8
        case 9: return 10; // Bedtime -> Frame index 10
        default: return 0;
      }
    }
  };

  return (
    <div className={`w-full flex flex-col gap-3 ${isEmbedded ? '' : 'bg-white rounded-[2rem] p-5 border-4 border-amber-100 bento-shadow'}`} id="progbar-container">
      <div className="flex items-center justify-between" id="progbar-header">
        <div className="flex items-center gap-2" id="progbar-label">
          <CuteIcon nameOrEmoji="🧸" className="h-8 w-8" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 block leading-tight">Daily Adventure Map</span>
            <span className="text-lg font-black text-slate-800 leading-tight">{dayName}'s Adventure Routine</span>
          </div>
        </div>

        {reviewStep ? (
          <span className="text-xs font-black bg-pink-100 text-pink-700 border-2 border-pink-200 px-3.5 py-1.5 rounded-full" id="review-active-label">
            🎓 Oral Practice Active
          </span>
        ) : (
          <span className="text-xs font-black bg-amber-100 text-amber-800 border-2 border-amber-200 px-3.5 py-1.5 rounded-full" id="progbar-percent">
            Scene {currentScene + 1}/{totalScenes}
          </span>
        )}
      </div>

      {/* Circle connectors mapping */}
      <div className="flex items-center justify-between relative mt-3 px-0.5 sm:px-1.5 overflow-x-visible" id="progbar-line-map">
        {/* Connector back-line */}
        <div className="absolute top-1/2 left-4 right-4 h-2 bg-amber-50 -translate-y-1/2 rounded-full -z-0" id="progbar-line" />
        {/* Animated fluid filled line */}
        <div 
          className="absolute top-1/2 left-4 h-2 bg-orange-400 -translate-y-1/2 rounded-full -z-0 transition-all duration-500" 
          style={{ width: reviewStep ? '100%' : `${(currentScene / (totalScenes - 1)) * 95}%` }}
          id="progbar-filled-line"
        />

        {/* Step clickable circles */}
        {iconsToUse.map((ico, idx) => {
          const isActive = idx === currentScene && !reviewStep;
          const isCompleted = idx < currentScene || reviewStep;
          const frameIndex = getIconFrameIndex(idx);

          return (
            <div key={idx} className="relative z-10 shrink-0" id={`circle-node-${idx}`}>
              <motion.button
                whileHover={{ scale: 1.25 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  sounds.playClick();
                  onJumpToScene(idx);
                }}
                className={`shrink-0 h-8 w-8 sm:h-10 sm:w-10 md:h-14 md:w-14 rounded-full flex items-center justify-center border-2 md:border-4 transition-all duration-300 relative cursor-pointer ${
                  isActive 
                    ? 'bg-[#FF9800] border-white text-white shadow-lg scale-110 ring-2 md:ring-4 ring-orange-100' 
                    : isCompleted 
                      ? 'bg-emerald-500 border-white text-white shadow-sm ring-2 md:ring-4 ring-emerald-100' 
                      : 'bg-white border-dashed border-orange-200 text-orange-300 opacity-60 hover:opacity-100'
                }`}
                id={`scene-progress-point-${idx}`}
                title={`Jump to Scene ${idx + 1}`}
              >
                <ProgressSpriteIcon 
                  frameIndex={frameIndex} 
                  fallbackEmoji={ico} 
                  className="h-5 w-5 sm:h-6 sm:w-6 md:h-9 md:w-9" 
                />
                {/* Active glow pointer */}
                {isActive && (
                  <motion.div
                    className="absolute -inset-1.5 rounded-full border border-[#FF9800]"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </motion.button>
              
              {/* Highlight bar label underneath */}
              <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-black ${
                isActive ? 'text-[#FF9800] scale-105' : isCompleted ? 'text-emerald-500' : 'text-slate-400'
              }`} id={`circle-label-${idx}`}>
                {idx + 1}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Spacer to give room for bottom label row */}
      <div className="h-2.5" />
    </div>
  );
}
