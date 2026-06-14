import React, { useState, useEffect } from 'react';

interface CuteIconProps {
  nameOrEmoji: string;
  className?: string;
  size?: number;
}

// Map of names to cute emojis for robust native fallback
const nameToEmojiMap: Record<string, string> = {
  'bed': '🛌',
  'toothbrush': '🪥',
  'soap': '🧼',
  'comb': '🪮',
  'bath': '🛁',
  't-shirt': '👕',
  'sneakers': '👞',
  'milk': '🥛',
  'alarm-clock': '⏰',
  'school': '🏫',
  'paint-palette': '🎨',
  'broom': '🧹',
  'cutlery': '🍽️',
  'moon': '🌙',
  'pancakes': '🥞',
  'lion': '🦁',
  'ferris-wheel': '🎡',
  'tree': '🌳',
  'ice-cream-cone': '🍦',
  'balloon': '🎈',
  'orange-juice': '🧃',
  'bread': '🍞',
  'fried-egg': '🍳',
  'cereal': '🥣',
  'book': '📖',
  'hearing': '👂',
  'chat': '🗣️',
  'running': '🏃',
  'sun': '☀️',
  'potted-plant': '🪴',
  'teddy-bear': '🧸',
  'dog': '🐶',
  'box': '📦',
  'slide': '🛝',
  'old-woman': '👵',
  'trophy': '🏆',
  'star': '⭐',
  'sparkles': '✨',
  'fire': '🔥',
  'calendar': '📅',
  'handshake': '🤝',
  'kite': '🪁',
  'soccer-ball': '⚽',
  'apple': '🍎',
  'dinosaur': '🦕',
  'playground': '⛲',
};

// Map of emojis back to standard Icons8 Cute Color filenames
const emojiToCuteColorNameMap: Record<string, string> = {
  '🛌': 'bed',
  '🛏️': 'bed',
  '🛏': 'bed',
  '🦷': 'toothbrush',
  '🪥': 'toothbrush',
  '🧼': 'soap',
  '🪮': 'comb',
  '🛁': 'bath',
  '👕': 't-shirt',
  '👚': 't-shirt',
  '👖': 't-shirt',
  '👞': 'sneakers',
  '🥛': 'milk',
  '⏱️': 'alarm-clock',
  '⏰': 'alarm-clock',
  '🏫': 'school',
  '🎨': 'paint-palette',
  '🧹': 'broom',
  '🍽️': 'cutlery',
  '🌙': 'moon',
  '🥞': 'pancakes',
  '🦁': 'lion',
  '🎡': 'ferris-wheel',
  '🌳': 'tree',
  '🍦': 'ice-cream-cone',
  '🎈': 'balloon',
  '🧃': 'orange-juice',
  '🍞': 'bread',
  '🍳': 'fried-egg',
  '🥣': 'cereal',
  '📖': 'book',
  '🍎': 'apple',
  '👂': 'hearing',
  '🗣️': 'chat',
  '🗣': 'chat',
  '🏃': 'running',
  '☀️': 'sun',
  '🪴': 'potted-plant',
  '🧸': 'teddy-bear',
  '🐶': 'dog',
  '📦': 'box',
  '🛝': 'slide',
  '👵': 'old-woman',
  '🏆': 'trophy',
  '⭐': 'star',
  '✨': 'sparkles',
  '🔥': 'fire',
  '📅': 'calendar',
  '🤝': 'handshake',
  '🪁': 'kite',
  '⚽': 'soccer-ball',
  '🌞': 'sun',
  '🚿': 'shower',
  '🫧': 'soap',
  '🧽': 'soap',
  '🐾': 'dog',
  '🦕': 'dinosaur',
  '🦖': 'dinosaur',
  '⛲': 'playground',
};

// Normalize inputs and mappings by stripping variation selectors (\uFE0F etc)
const normalizeString = (str: string): string => {
  if (!str) return '';
  return str.replace(/[\uFE00-\uFE0F]/g, '').trim().toLowerCase();
};

export default function CuteIcon({ nameOrEmoji, className = 'h-8 w-8', size = 128 }: CuteIconProps) {
  const [hasError, setHasError] = useState(false);

  // Since we might change nameOrEmoji on the fly, reset error state if the icon changes
  useEffect(() => {
    setHasError(false);
  }, [nameOrEmoji]);

  const normalizedInput = normalizeString(nameOrEmoji);

  // 1. Try to find the design translation of the emoji/word
  let rawIconName = emojiToCuteColorNameMap[nameOrEmoji] || emojiToCuteColorNameMap[normalizedInput];
  
  if (!rawIconName) {
    // Check if the input itself is a known word key in nameToEmojiMap
    if (nameToEmojiMap[normalizedInput]) {
      rawIconName = normalizedInput;
    } else {
      // Find case-insensitive match in our emojiToCuteColorNameMap
      const foundKey = Object.keys(emojiToCuteColorNameMap).find(
        k => normalizeString(k) === normalizedInput
      );
      if (foundKey) {
        rawIconName = emojiToCuteColorNameMap[foundKey];
      }
    }
  }

  // Fallback name if nothing matched
  const finalIconName = rawIconName || normalizedInput;

  // Strip any characters that doesn't fit in standard URLs
  const safeIconName = finalIconName.replace(/[^a-z0-9-]/g, '');

  // 2. Build the primary direct URL
  const originalUrl = `https://img.icons8.com/cute-color/${size}/${safeIconName || 'star'}.png`;

  // 3. Wrap with weserv.nl public image proxy to bypass browser-referrer blocks and hotlinking boundaries
  const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}`;

  // Find the native emoji representation for complete backup
  const fallbackEmoji = nameToEmojiMap[normalizedInput] || nameToEmojiMap[finalIconName] || nameOrEmoji;

  if (hasError || !safeIconName) {
    // Progressive enhancement: render the raw beautiful native emoji in perfect typography if CDN fails!
    return (
      <span className={`${className} flex items-center justify-center select-none`} title={nameOrEmoji}>
        <span style={{ fontSize: '120%', lineHeight: 1 }}>{fallbackEmoji}</span>
      </span>
    );
  }

  return (
    <img 
      src={proxiedUrl} 
      alt={nameOrEmoji} 
      className={`${className} object-contain select-none`} 
      referrerPolicy="no-referrer"
      onError={() => {
        // If the proxied Icons8 load fails, fallback to direct in case weserv was down, or trigger the native emoji block
        setHasError(true);
      }}
    />
  );
}
