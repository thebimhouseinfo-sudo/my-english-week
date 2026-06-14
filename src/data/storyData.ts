import { DayName } from '../types';
import { phrases, getPhrasesByIntent, generateFromTemplate } from './phrases/phraseEngine';

export interface ClockTime {
  timeStr: string;
  enText: string;
  hour: number;
  minute: number;
}

// Generate wake up times dynamically
export const wakeUpTimes: ClockTime[] = [
  { timeStr: '6:05', enText: 'six oh-five', hour: 6, minute: 5 },
  { timeStr: '6:15', enText: 'six fifteen', hour: 6, minute: 15 },
  { timeStr: '6:25', enText: 'six twenty-five', hour: 6, minute: 25 },
  { timeStr: '6:35', enText: 'six thirty-five', hour: 6, minute: 35 },
  { timeStr: '6:45', enText: 'six forty-five', hour: 6, minute: 45 },
  { timeStr: '6:55', enText: 'six fifty-five', hour: 6, minute: 55 },
];

export interface BathroomAction {
  id: string;
  phrase: string;
  translation: string;
  audioText: string;
  icon: string;
}

// Generate bathroom pool from phrases.json matching the corresponding intents
export const bathroomPool: BathroomAction[] = [
  {
    id: 'teeth',
    phrase: 'I brush my teeth.',
    translation: 'Con đánh răng.',
    audioText: 'I brush my teeth.',
    icon: '🪥',
  },
  {
    id: 'face',
    phrase: 'I wash my face.',
    translation: 'Con rửa mặt.',
    audioText: 'I wash my face.',
    icon: '🧼',
  },
  {
    id: 'hair',
    phrase: 'I comb my hair.',
    translation: 'Con chải đầu.',
    audioText: 'I comb my hair.',
    icon: '🪮',
  },
  {
    id: 'bath',
    phrase: 'I take a bath.',
    translation: 'Con tắm bồn.',
    audioText: 'I take a bath.',
    icon: '🛁',
  },
];

export interface BreakfastOption {
  id: string;
  text: string;
  labelVi: string;
  icon: string;
}

export const breakfastOptions: BreakfastOption[] = [
  { id: 'milk', text: 'Milk', labelVi: 'Sữa', icon: '🥛' },
  { id: 'juice', text: 'Juice', labelVi: 'Nước trái cây', icon: '🧃' },
  { id: 'bread', text: 'Bread', labelVi: 'Bánh mì', icon: '🍞' },
  { id: 'eggs', text: 'Eggs', labelVi: 'Trứng', icon: '🍳' },
  { id: 'cereal', text: 'Cereal', labelVi: 'Ngũ cốc', icon: '🥣' },
];

export interface ClassroomActivity {
  day: DayName;
  instruction: string;
  translation: string;
  icon: string;
}

// Load classroom instructions from phrases db
export const classroomActivities: Record<DayName, ClassroomActivity> = {
  Monday: {
    day: 'Monday',
    instruction: 'Open your book.',
    translation: 'Mở sách của con ra.',
    icon: '📖',
  },
  Tuesday: {
    day: 'Tuesday',
    instruction: 'Read with me.',
    translation: 'Hãy đọc cùng thầy cô.',
    icon: '🗣️',
  },
  Wednesday: {
    day: 'Wednesday',
    instruction: 'Draw a cat.',
    translation: 'Hãy vẽ một con mèo.',
    icon: '🎨',
  },
  Thursday: {
    day: 'Thursday',
    instruction: 'Count the apples.',
    translation: 'Hãy đếm số táo.',
    icon: '🍎',
  },
  Friday: {
    day: 'Friday',
    instruction: 'Listen carefully.',
    translation: 'Hãy lắng nghe thật kỹ.',
    icon: '👂',
  },
  Saturday: {
    day: 'Saturday',
    instruction: "Let's run together.",
    translation: 'Hãy cùng chạy nhảy nào.',
    icon: '🏃',
  },
  Sunday: {
    day: 'Sunday',
    instruction: 'We draw a solar star.',
    translation: 'Chúng ta cùng vẽ một ông mặt trời.',
    icon: '☀️',
  },
};

export interface HouseChore {
  day: DayName;
  momRequest: string;
  momRequestTranslation: string;
  narratorChore: string;
  narratorTranslation: string;
  icon: string;
}

// Sourced from dynamic phrases that correspond to standard intents
export const houseChores: Record<DayName, HouseChore> = {
  Monday: {
    day: 'Monday',
    momRequest: 'Sweep the floor, please.',
    momRequestTranslation: 'Làm ơn quét nhà đi con.',
    narratorChore: 'I sweep the floor.',
    narratorTranslation: 'Con quét sàn nhà.',
    icon: '🧹',
  },
  Tuesday: {
    day: 'Tuesday',
    momRequest: 'Fold the clothes.',
    momRequestTranslation: 'Gấp quần áo lại đi con.',
    narratorChore: 'I fold the clothes.',
    narratorTranslation: 'Con gấp quần áo.',
    icon: '👕',
  },
  Wednesday: {
    day: 'Wednesday',
    momRequest: 'Water the plants, please.',
    momRequestTranslation: 'Làm ơn tưới cây đi con.',
    narratorChore: 'I water the plants.',
    narratorTranslation: 'Con tưới nước cho cây.',
    icon: '🪴',
  },
  Thursday: {
    day: 'Thursday',
    momRequest: 'Wash the dishes.',
    momRequestTranslation: 'Rửa bát đĩa đi con.',
    narratorChore: 'I wash the dishes.',
    narratorTranslation: 'Con rửa bát đĩa.',
    icon: '🍽️',
  },
  Friday: {
    day: 'Friday',
    momRequest: 'Put away your toys.',
    momRequestTranslation: 'Cất đồ chơi đi con.',
    narratorChore: 'I put away my toys.',
    narratorTranslation: 'Con cất đồ chơi gọn gàng.',
    icon: '🧸',
  },
  Saturday: {
    day: 'Saturday',
    momRequest: 'Feed the pet.',
    momRequestTranslation: 'Cho thú cưng ăn nhé con.',
    narratorChore: 'I feed the dog.',
    narratorTranslation: 'Con cho cún ăn.',
    icon: '🐶',
  },
  Sunday: {
    day: 'Sunday',
    momRequest: 'Clean up this mess.',
    momRequestTranslation: 'Hãy dọn sạch chỗ lộn xộn này con nhé.',
    narratorChore: 'I clean up my room.',
    narratorTranslation: 'Con tự dọn phòng gọn gàng.',
    icon: '📦',
  },
};

// Bilingual dictionary lookup combines phrases breakdown + standard backup
export const bilingualDictionary: Record<string, string> = {
  'wake up': 'thức dậy',
  'wake': 'thức',
  'up': 'dậy',
  'go': 'đi',
  'brush': 'đánh/chải',
  'wash': 'rửa',
  'comb': 'chải',
  'take': 'tắm/lấy',
  'get': 'mặc/nhận',
  'dressed': 'quần áo',
  'put': 'đặt/mặc',
  'on': 'lên/vào',
  'want': 'muốn',
  'eat': 'ăn',
  'drink': 'uống',
  'starts': 'bắt đầu',
  'school': 'trường học',
  'home': 'nhà',
  'help': 'giúp đỡ',
  'sweep': 'quét',
  'fold': 'gấp',
  'water': 'tưới nước/nước',
  'dishes': 'bát đĩa',
  'toys': 'đồ chơi',
  'play': 'chơi',
  'sleep': 'ngủ',
  'teeth': 'răng',
  'face': 'mặt',
  'hair': 'tóc',
  'bath': 'bồn tắm',
  'shirt': 'áo sơ mi',
  'shoes': 'giày',
  'milk': 'sữa',
  'juice': 'nước ép',
  'bread': 'bánh mì',
  'eggs': 'trứng',
  'cereal': 'ngũ cốc',
  'book': 'sách',
  'cat': 'con mèo',
  'apples': 'quả táo',
  'floor': 'sàn nhà',
  'clothes': 'quần áo',
  'plants': 'cây cối',
  'dog': 'con chó',
  'room': 'phòng',
  'time': 'thời gian',
  'dinner': 'bữa tối',
  'breakfast': 'bữa sáng',
  'i': 'con / tôi',
  'my': 'của con',
  'your': 'của bạn',
  'me': 'tôi / con',
  'you': 'con / bạn / ba mẹ',
  "it's": 'bây giờ là',
  'good': 'tốt / chúc',
  'morning': 'buổi sáng',
  'night': 'buổi tối / chúc ngủ ngon',
  'thank': 'cảm ơn',
  'thank you': 'cảm ơn ba mẹ / bạn',
  'here': 'đây',
  'are': 'nhé / là',
  'for': 'cho',
  'what': 'cái gì',
  'hi': 'xin chào',
  'fine': 'tốt / khỏe',
  'can': 'có thể',
};

export function getWordMeaning(word: string): string {
  const cleanWord = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');
  
  // 1. Check in our basic definitions dictionary first
  if (bilingualDictionary[cleanWord]) {
    return bilingualDictionary[cleanWord];
  }

  // 2. Scan through all dynamic phrases from our 4-layer phrases database for exact matching
  for (const phrase of phrases) {
    if (phrase.words) {
      const match = phrase.words.find(
        (w) => w.word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '') === cleanWord
      );
      if (match) {
        return match.meaning;
      }
    }
  }

  return 'Một từ tiếng Anh đơn giản';
}
