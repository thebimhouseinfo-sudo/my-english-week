import { useState, useEffect, useRef } from 'react';

export interface SpeechEngine {
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  startListening: (expectedText: string, onResult: (transcript: string, score: number) => void) => void;
  stopListening: () => void;
  isListening: boolean;
  speechSupported: boolean;
  speaking: boolean;
}

export function useSpeech(): SpeechEngine {
  const [isListening, setIsListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Track consecutive microphone attempts for each distinct expected text to trigger AUTO PASS
  const attemptsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // Warm up speech synthesis voices list
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.getVoices();
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const getBestEnglishVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    // Try to find a high quality English voice, prefer Google US English, Samantha, or any English voice
    const preferred = ['Google US English', 'Microsoft Zira', 'Samantha', 'en-US', 'en-GB'];
    for (const name of preferred) {
      const v = voices.find(voice => voice.name.includes(name) || voice.lang.startsWith(name));
      if (v) return v;
    }
    return voices.find(voice => voice.lang.startsWith('en')) || null;
  };

  const stopSpeaking = () => {
    // Stop MP3 audio if playing
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Stop Web Speech API TTS
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  };

  /**
   * Helper to generate possible MP3 filenames for a given text.
   * Handles trailing punctuation and special characters safely.
   * Uses relative paths to work correctly on GitHub Pages subdirectory deployment.
   */
  const getAudioCandidates = (text: string): string[] => {
    const clean = text.trim();
    if (!clean) return [];

    const candidates: string[] = [];

    // Check if this is a single word (contains no spaces)
    const isSingleWord = !clean.includes(' ');

    // Candidate 1: Keep original, replace invalid Windows/Mac filename characters (\ / : * ? " < > |) with empty string
    const cand1 = clean.replace(/[\\/:*?"<>|]/g, '');
    candidates.push(cand1);

    // Candidate 2: Strip any trailing punctuation (., ?, !, etc.)
    const cand2 = clean.replace(/[.?!=]+$/, '');
    candidates.push(cand2);

    // Candidate 3: Strip invalid filename chars first, then strip trailing punctuation
    const cand3 = clean.replace(/[\\/:*?"<>|]/g, '').replace(/[.?!]+$/, '');
    candidates.push(cand3);

    // Filter unique candidates to avoid redundant network requests
    const uniqueCandidates = Array.from(new Set(candidates)).filter(Boolean);
    const paths: string[] = [];

    uniqueCandidates.forEach(c => {
      // Use relative paths (no leading slash) to work with GitHub Pages base URL
      // 1. Standard candidate in the lesson audio directory
      paths.push(`audio/lesson/${encodeURIComponent(c)}.mp3`);
      
      // 2. Extra smart candidates for single words
      if (isSingleWord) {
        // Try dedicated words folder
        paths.push(`audio/words/${encodeURIComponent(c)}.mp3`);
        
        // Try capitalized words (e.g. "brush" -> "Brush.mp3") in both folders
        const capitalized = c.charAt(0).toUpperCase() + c.slice(1);
        paths.push(`audio/words/${encodeURIComponent(capitalized)}.mp3`);
        paths.push(`audio/lesson/${encodeURIComponent(capitalized)}.mp3`);
      }
    });

    // Filter unique final paths
    return Array.from(new Set(paths));
  };

  /**
   * Plays a list of candidate URLs sequentially. 
   * If one fails, try the next. If all fail, execute the fallback (TTS).
   */
  const playAudioSequence = (
    urls: string[],
    index: number,
    onEnd: (() => void) | undefined,
    fallback: () => void
  ) => {
    if (index >= urls.length) {
      fallback();
      return;
    }

    const url = urls[index];
    // Create audio element with preload and proper error handling for iOS
    const audio = new Audio();
    audio.preload = 'auto';
    
    // Set source after setting preload for better iOS compatibility
    audio.src = url;
    
    audioRef.current = audio;

    let isDone = false;

    const cleanupAndFinish = () => {
      if (isDone) return;
      isDone = true;
      setSpeaking(false);
      audioRef.current = null;
      if (onEnd) onEnd();
    };

    audio.onended = cleanupAndFinish;

    audio.onerror = (e) => {
      if (isDone) return;
      console.log(`Audio load/decode error: ${url}`, e);
      isDone = true;
      audioRef.current = null;
      // Try the next MP3 file candidate
      playAudioSequence(urls, index + 1, onEnd, fallback);
    };

    // Handle iOS Safari autoplay restrictions
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setSpeaking(true);
        })
        .catch((err) => {
          if (isDone) return;
          console.log(`Audio play prevented: ${url}. Error:`, err.name, err.message);
          isDone = true;
          audioRef.current = null;
          // Try the next MP3 file candidate
          playAudioSequence(urls, index + 1, onEnd, fallback);
        });
    }
  };

  const speak = (text: string, onEnd?: () => void) => {
    // 1. Always clear any running speech/audio first
    stopSpeaking();

    // 2. Define the TTS fallback
    const playTTSFallback = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        if (onEnd) onEnd();
        return;
      }

      setSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = getBestEnglishVoice();
      utterance.rate = 0.9; // Slightly slower for kids
      utterance.pitch = 1.15; // Slightly higher pitch for kids friendliness

      utterance.onend = () => {
        setSpeaking(false);
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setSpeaking(false);
        if (onEnd) onEnd();
      };

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    // 3. Generate candidate paths & play
    const candidates = getAudioCandidates(text);
    if (candidates.length === 0) {
      playTTSFallback();
    } else {
      // For iOS Safari, we need to handle user interaction requirement
      // Try to play audio, and if it fails due to autoplay policy, fall back to TTS immediately
      // The playAudioSequence already handles this with promise rejection
      playAudioSequence(candidates, 0, onEnd, playTTSFallback);
    }
  };

  const calculateScore = (expected: string, actual: string): number => {
    const cleanStr = (s: string) => s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").replace(/\s+/g," ").trim();
    const expWords = cleanStr(expected).split(' ');
    const actWords = cleanStr(actual).split(' ');
    
    let matches = 0;
    expWords.forEach(w => {
      if (actWords.includes(w)) {
        matches++;
      }
    });
    
    const ratio = matches / expWords.length;
    if (ratio >= 0.85) return 3; // 3 stars
    if (ratio >= 0.5) return 2;  // 2 stars
    if (ratio >= 0.15) return 1; // 1 star
    return 0;
  };

  const startListening = (expectedText: string, onResult: (transcript: string, score: number) => void) => {
    const key = expectedText.trim().toLowerCase();
    attemptsRef.current[key] = (attemptsRef.current[key] || 0) + 1;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser.');
      return;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    
    rec.onstart = () => {
      setIsListening(true);
    };
    
    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const score = calculateScore(expectedText, transcript);
      
      // If score is high or attempts >= 3, reset attempts
      if (score >= 2 || attemptsRef.current[key] >= 3) {
        attemptsRef.current[key] = 0;
      }
      
      onResult(transcript, score);
    };
    
    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      // If error is 'no-speech' or 'audio-capture' and attempts are high, we still trigger onResult with fallback score
      if (attemptsRef.current[key] >= 3) {
        attemptsRef.current[key] = 0;
        // Auto pass: return empty transcript but 3 stars to let kids move on
        onResult('', 3);
      }
    };
    
    rec.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  return {
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    isListening,
    speechSupported,
    speaking
  };
}