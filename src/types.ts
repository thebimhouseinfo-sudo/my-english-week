export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface WordMeaning {
  word: string;
  meaning: string;
}

export interface Phrase {
  en: string;
  vi: string;
  words?: WordMeaning[];
}

export interface SceneAction {
  id: string;
  type: 'listen' | 'speak' | 'choice' | 'narrative';
  actor: 'narrator' | 'mom' | 'friend' | 'child';
  text: string;
  translation: string;
  audioText: string; // The text to read using TTS
  choices?: {
    id: string;
    text: string;
    labelVi: string;
    icon: string;
    nextActionId: string; // Tường minh ID của hành động tiếp theo khi chọn nhánh này
  }[];
  nextActionId?: string; // ID của hành động tiếp theo mặc định (nếu không có lựa chọn rẽ nhánh)
}

export interface DayProgression {
  dayName: DayName;
  currentSceneIndex: number;
  currentSceneId?: string; // Thay đổi từ currentSceneIndex: number để tránh lỗi đứt gãy kịch bản
  selectedBreakfast: string | null;
  bathroomActions: string[];
  weekendActivity: string | null;
  questionsAnswers: {
    question: string;
    answer: string;
    audioText: string;
    recordingState: 'idle' | 'recording' | 'completed';
    transcript?: string;
    stars?: number;
  }[];
  timelineSentences: {
    icon: string;
    text: string;
    recordingState: 'idle' | 'recording' | 'completed';
    transcript?: string;
    stars?: number;
  }[];
}

export interface BestPhrase {
  phraseId: string;
  text: string;
  stars: number;
  day: DayName;
}

export interface UserStats {
  completedDays: DayName[];
  currentStreak: number;
  totalStars: number;
  weeklyProgress: { [key in DayName]: 'not_started' | 'passed' };
  kidName?: string;
  avatar?: string;
  totalSentencesSpoken: number;
  spokenPhraseIds: string[];
  daysPlayed: number;
  bestPhrases: BestPhrase[];
  streakDays?: number;
  // Lưu vị trí scene đang học gần nhất để bé vào lại học tiếp, không phải học lại từ đầu
  lastPlayedDay?: DayName | null;
  lastSceneIndex?: number;
}