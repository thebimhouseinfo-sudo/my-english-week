import { useState, useEffect, useRef } from 'react';

export interface SpeechEngine {
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  startListening: (expectedText: string, sentenceId: string, onResult: (transcript: string, score: number) => void) => void;
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
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    audioRef.current = audio;

    let isDone = false;

    audio.onended = () => {
      if (isDone) return;
      isDone = true;
      setSpeaking(false);
      audioRef.current = null;
      if (onEnd) onEnd();
    };

    audio.onerror = (err) => {
      if (isDone) return;
      isDone = true;
      console.error(`Audio load error for ${url}:`, err);
      audioRef.current = null;
      // Try the next MP3 file candidate
      playAudioSequence(urls, index + 1, onEnd, fallback);
    };

    audio.play()
      .then(() => {
        setSpeaking(true);
      })
      .catch((err) => {
        if (isDone) return;
        isDone = true;
        console.error(`Audio play prevented or file not found: ${url}. Error details:`, err);
        console.log(`Trying next candidate...`);
        audioRef.current = null;
        // Try the next MP3 file candidate
        playAudioSequence(urls, index + 1, onEnd, fallback);
      });
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
      playAudioSequence(candidates, 0, onEnd, playTTSFallback);
    }
  };

  const calculateScore = (expected: string, actual: string): number => {
    // Basic number translation mapping for common times
    const timeMap: Record<string, string> = {
      "7 30": "seven thirty",
      "7 20": "seven twenty",
      "7 00": "seven o'clock",
      "6 00": "six o'clock",
      "6 05": "six oh five",
      "6 15": "six fifteen",
      "6 25": "six twenty five",
      "6 35": "six thirty five",
      "6 45": "six forty five",
      "6 55": "six fifty five"
    };

    const stopWords = ["a", "an", "the", "is", "are", "am", "it", "its", "it's", "to", "at", "in", "on", "of", "for", "with", "my", "your", "his", "her"];

    const normalize = (s: string) => {
      if (!s) return "";
      let res = s.toLowerCase();
      
      // Replace slashes, colons, dots between digits with spaces so "7:20", "7/20", "7.20" become "7 20"
      res = res.replace(/(\d)[/:\.](\d)/g, "$1 $2");
      
      // Translate common time strings to words
      Object.keys(timeMap).forEach(k => {
        res = res.replace(new RegExp(k, 'g'), timeMap[k]);
      });
      
      // Expand common contractions that might be misrecognized
      res = res.replace(/it's/g, "it is");
      res = res.replace(/i'm/g, "i am");
      res = res.replace(/don't/g, "do not");
      res = res.replace(/doesn't/g, "does not");
      
      // Remove all punctuation
      res = res.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g," ");
      
      return res.replace(/\s+/g," ").trim();
    };

    const cleanAndFilter = (str: string) => {
      const words = normalize(str).split(' ');
      // Filter out stop words to focus on keywords (fuzzy matching)
      const keywords = words.filter(w => !stopWords.includes(w) && w.length > 0);
      // If filtering leaves it empty, fallback to original words
      return keywords.length > 0 ? keywords : words.filter(w => w.length > 0);
    };

    const expWords = cleanAndFilter(expected);
    const actWords = cleanAndFilter(actual);
    
    // Longest Common Subsequence to enforce order while allowing dropped/extra words
    const m = expWords.length;
    const n = actWords.length;
    if (m === 0 || n === 0) return 0;

    const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (expWords[i - 1] === actWords[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    const matches = dp[m][n];
    const ratio = matches / m;
    
    if (ratio === 1.0) return 5; // 5 stars (perfect keyword match)
    if (ratio >= 0.75) return 4; // 4 stars (great)
    if (ratio >= 0.5) return 3;  // 3 stars (good)
    if (ratio >= 0.25) return 2;  // 2 stars (okay)
    if (ratio > 0) return 1;     // 1 star (needs practice)
    return 0;
  };

  const startListening = (expectedText: string, sentenceId: string, onResult: (transcript: string, score: number) => void) => {
    attemptsRef.current[sentenceId] = (attemptsRef.current[sentenceId] || 0) + 1;
    
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
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      
      // If score is high or attempts >= 4, reset attempts
      if (score >= 3 || attemptsRef.current[sentenceId] >= 4) {
        attemptsRef.current[sentenceId] = 0;
      }
      
      onResult(transcript, score);
    };
    
    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      setIsListening(false);
      
      // If error and attempts are high, trigger auto pass
      if (attemptsRef.current[sentenceId] >= 4) {
        attemptsRef.current[sentenceId] = 0;
        // Auto pass: return empty transcript but 4 stars to let kids move on instantly
        onResult('', 4);
      } else {
        // Fallback: trigger scorecard display with 0 stars for retry
        onResult('', 0);
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