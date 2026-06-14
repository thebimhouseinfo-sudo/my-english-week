import React from 'react';

interface VectorProps {
  className?: string;
  selectedBreakfast?: string;
  choreType?: string;
  timeText?: string;
}

// Master sprite sheet renderer representing 1 column x 11 rows of 960x320 landscape scenes in Scenes.png
export const SpriteIllustration: React.FC<{ frameIndex: number; className?: string }> = ({ frameIndex, className = '' }) => {
  // Vertically stacked: total height has 11 frames, so standard height scales cleanly.
  // Using percentage-based positioning for responsive layout matching.
  const backgroundPosition = `0% ${frameIndex * 10}%`;

  // Preserve the width if specified in parent class (e.g. w-40, w-56)
  // But if it has square dimensions (e.g., h-56 w-56) that would warp the aspect ratio,
  // we clean up the height classes so that the aspect ratio maintains the correct proportion.
  const responsiveClassName = className.replace(/h-\d+(\.\d+)?/g, '').trim();

  return (
    <div 
      className={`w-full rounded-[1.5rem] border-4 border-white shadow-lg bg-sky-50 transition-all duration-300 relative overflow-hidden bento-shadow ${responsiveClassName}`}
      style={{
        backgroundImage: 'url(Scenes.png)',
        backgroundSize: '100% 1100%',
        backgroundPosition: backgroundPosition,
        backgroundRepeat: 'no-repeat',
        aspectRatio: '926 / 154',
        display: 'block',
      }}
    />
  );
};

// Frame 1 - Wake Up (Index 0)
export const BedroomVector: React.FC<VectorProps> = ({ className }) => (
  <SpriteIllustration frameIndex={0} className={className} />
);

// Frame 2 - Bathroom (Index 1)
export const BathroomVector: React.FC<VectorProps> = ({ className }) => (
  <SpriteIllustration frameIndex={1} className={className} />
);

// Frame 3 - Get Dressed (Index 2)
export const GetDressedVector: React.FC<VectorProps> = ({ className }) => (
  <SpriteIllustration frameIndex={2} className={className} />
);

// Frame 4 - Breakfast (Index 3), and Frame 9 - Dinner (Index 8)
export const BreakfastVector: React.FC<VectorProps> = ({ className, selectedBreakfast }) => {
  // Smart detection: in the daily sequence, dinner is triggered as BreakfastVector with eggs!
  const isDinner = selectedBreakfast?.toLowerCase() === 'eggs';
  return (
    <SpriteIllustration frameIndex={isDinner ? 8 : 3} className={className} />
  );
};

// Frame 5 - Check Time (Index 4)
export const ClockVector: React.FC<VectorProps> = ({ className }) => (
  <SpriteIllustration frameIndex={4} className={className} />
);

// Frame 6 - School (Index 5)
export const SchoolVector: React.FC<VectorProps> = ({ className }) => (
  <SpriteIllustration frameIndex={5} className={className} />
);

// Frame 7 - Classroom (Index 6)
export const ClassroomVector: React.FC<VectorProps> = ({ className }) => (
  <SpriteIllustration frameIndex={6} className={className} />
);

// Frame 8 - House Chores (Index 7)
export const ChoreVector: React.FC<VectorProps> = ({ className }) => (
  <SpriteIllustration frameIndex={7} className={className} />
);

// Frame 10 - Weekend Fun (Index 9)
export const ZooVector: React.FC<VectorProps> = ({ className }) => (
  <SpriteIllustration frameIndex={9} className={className} />
);

// Frame 10 - Weekend Fun (Index 9)
export const ParkVector: React.FC<VectorProps> = ({ className }) => (
  <SpriteIllustration frameIndex={9} className={className} />
);

// Frame 10 - Weekend Fun (Index 9)
export const GrandmaVector: React.FC<VectorProps> = ({ className }) => (
  <SpriteIllustration frameIndex={9} className={className} />
);

// Frame 11 - Bedtime (Index 10)
export const BedtimeVector: React.FC<VectorProps> = ({ className }) => (
  <SpriteIllustration frameIndex={10} className={className} />
);
