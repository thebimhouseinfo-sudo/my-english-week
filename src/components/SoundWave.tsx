import { motion } from 'motion/react';

export default function SoundWave() {
  const bars = Array.from({ length: 8 });

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 w-full" id="sound-wave-container">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          id={`sound-wave-bar-${i}`}
          className="w-2.5 rounded-full bg-linear-to-t from-pink-400 via-rose-400 to-amber-300"
          animate={{
            height: [16, Math.floor(Math.random() * 40) + 24, 16],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.08,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
