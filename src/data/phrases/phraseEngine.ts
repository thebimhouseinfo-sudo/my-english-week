import phrasesData from '../../phrases/phrases.json';
import intentsData from '../../phrases/intents.json';
import scenariosData from '../../phrases/scenarios.json';
import templatesData from '../../phrases/templates.json';
import storiesData from '../../phrases/stories.json';
import metadataData from '../../phrases/metadata.json';
import skeletonsData from '../../phrases/story_skeletons.json';
import reviewData from '../../phrases/review_templates.json';

export interface PhraseItem {
  id: string;
  en: string;
  vi: string;
  intent: string;
  tags: string[];
  words: { word: string; meaning: string }[];
}

export interface PhraseTemplate {
  id: string;
  template_en: string;
  template_vi: string;
  intent: string;
  variables: Record<string, string[]>;
  tags: string[];
}

export interface ScenarioItem {
  name: string;
  order: number;
  background: string;
  reviewWeight: number;
  intents: string[];
}

export interface StoryItem {
  id: string;
  name: string;
  description: string;
  scenarios: string[];
}

export interface MetadataItem {
  intent: string;
  scenario: string[];
  tags: string[];
  difficulty: number;
}

export interface ReviewQuestion {
  id: string;
  question: string;
  expectedIntent: string;
}

// Low-level dictionaries
export const phrases: PhraseItem[] = phrasesData as PhraseItem[];
export const intents: Record<string, string> = intentsData as Record<string, string>;
export const scenarios: Record<string, ScenarioItem> = scenariosData as Record<string, ScenarioItem>;
export const templates: PhraseTemplate[] = templatesData as PhraseTemplate[];
export const stories: StoryItem[] = storiesData as StoryItem[];
export const metadata: Record<string, MetadataItem> = metadataData as Record<string, MetadataItem>;
export const storySkeletons: Record<string, string[]> = skeletonsData as Record<string, string[]>;
export const reviewTemplates: Record<string, ReviewQuestion[]> = reviewData as Record<string, ReviewQuestion[]>;

/**
 * Replace placeholders like {food} or {time} with variables
 */
export function generateFromTemplate(
  templateId: string,
  variables: Record<string, string>
): PhraseItem | null {
  const tmpl = templates.find((t) => t.id === templateId);
  if (!tmpl) return null;

  let en = tmpl.template_en;
  let vi = tmpl.template_vi;

  // Swap English placeholders first
  for (const [key, value] of Object.entries(variables)) {
    en = en.replace(`{${key}}`, value);
  }

  // Swap Vietnamese equivalent
  for (const [key, value] of Object.entries(variables)) {
    // Translate some common placeholder values to Vietnamese for seamless bilingual presentation
    let translatedVal = value;
    if (value === 'milk') translatedVal = 'sữa';
    else if (value === 'cake') translatedVal = 'bánh ngọt';
    else if (value === 'water') translatedVal = 'nước';
    else if (value === 'juice') translatedVal = 'nước trái cây';
    else if (value === 'rice') translatedVal = 'cơm';
    else if (value === 'soup') translatedVal = 'súp';
    else if (value === 'six o\'clock') translatedVal = '6 giờ';
    else if (value === 'six thirty') translatedVal = '6 giờ 30 phút';
    else if (value === 'seven o\'clock') translatedVal = '7 giờ';
    else if (value === 'sky') translatedVal = 'bầu trời';
    else if (value === 'clouds') translatedVal = 'những đám mây';
    else if (value === 'sun') translatedVal = 'mặt trời';
    else if (value === 'moon') translatedVal = 'mặt trăng';
    else if (value === 'piano') translatedVal = 'đàn dương cầm';
    else if (value === 'drums') translatedVal = 'trống';
    else if (value === 'guitar') translatedVal = 'đàn ghi-ta';
    else if (value === 'pancakes') translatedVal = 'bánh kếp';
    else if (value === 'waffles') translatedVal = 'bánh kẹp và dâu';
    else if (value === 'Mom\'s') translatedVal = 'mẹ';
    else if (value === 'Dad\'s') translatedVal = 'bố';
    else if (value === 'my') translatedVal = 'mình';

    vi = vi.replace(`{${key}}`, translatedVal);
  }

  // Construct word-by-word list dynamically for interactive clicking!
  const words = en.split(/\s+/).map((w) => {
    const rawWord = w.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');
    let meaning = 'Một từ tiếng Anh';
    
    // Quick dictionary lookups
    if (rawWord === 'i') meaning = 'Con/Tôi';
    else if (rawWord === 'wake') meaning = 'thức';
    else if (rawWord === 'up') meaning = 'dậy';
    else if (rawWord === 'at') meaning = 'vào lúc';
    else if (rawWord === 'it\'s') meaning = 'bây giờ là';
    else if (rawWord === 'can') meaning = 'có thể';
    else if (rawWord === 'have') meaning = 'có/dùng';
    else if (rawWord === 'some') meaning = 'một ít';
    else if (rawWord === 'please') meaning = 'làm ơn';
    else if (rawWord === 'look') meaning = 'hãy nhìn';
    else if (rawWord === 'the') meaning = 'vào';
    else if (rawWord === 'play') meaning = 'hãy chơi';
    else if (rawWord === 'stay') meaning = 'ở lại';
    else if (rawWord === 'with') meaning = 'với';
    else if (rawWord === 'hold') meaning = 'hãy nắm lấy';
    else if (rawWord === 'hand') meaning = 'bàn tay';
    else if (rawWord === 'want') meaning = 'muốn';
    else {
      // Find translated value if it's one of variables
      const cleanVal = rawWord.toLowerCase();
      if (cleanVal === 'milk') meaning = 'sữa';
      else if (cleanVal === 'cake') meaning = 'bánh';
      else if (cleanVal === 'water') meaning = 'nước';
      else if (cleanVal === 'juice') meaning = 'nước ép';
      else if (cleanVal === 'rice') meaning = 'cơm';
      else if (cleanVal === 'soup') meaning = 'súp';
      else if (cleanVal === 'sky') meaning = 'bầu trời';
      else if (cleanVal === 'clouds') meaning = 'những đám mây';
      else if (cleanVal === 'sun') meaning = 'mặt trời';
      else if (cleanVal === 'moon') meaning = 'mặt trăng';
      else if (cleanVal === 'piano') meaning = 'đàn piano';
      else if (cleanVal === 'drums') meaning = 'trồng';
      else if (cleanVal === 'guitar') meaning = 'ghita';
      else if (cleanVal === 'mom') meaning = 'mẹ';
      else if (cleanVal === 'dad') meaning = 'bố';
    }

    return { word: w, meaning };
  });

  return {
    id: `${templateId}_dynamic`,
    en,
    vi,
    intent: tmpl.intent,
    tags: tmpl.tags,
    words,
  };
}

/**
 * Filter phrases based on high-level tags
 */
export function getPhrasesByTag(tag: string): PhraseItem[] {
  return phrases.filter((p) => p.tags.includes(tag));
}

/**
 * Get phrase by precise unique ID
 */
export function getPhraseById(id: string): PhraseItem | undefined {
  return phrases.find((p) => p.id === id);
}

/**
 * Find phrases matching a given intent
 */
export function getPhrasesByIntent(intentId: string): PhraseItem[] {
  return phrases.filter((p) => p.intent === intentId);
}

/**
 * Load all phrases required for an entire scenario
 */
export function getPhrasesForScenario(scenarioId: string): PhraseItem[] {
  const scen = scenarios[scenarioId];
  if (!scen) return [];

  let matched: PhraseItem[] = [];
  scen.intents.forEach((intent) => {
    const pList = getPhrasesByIntent(intent);
    if (pList.length > 0) {
      // Add all matched phrases
      matched.push(...pList);
    }
  });

  // Filter out mismatched phrases based on meal/time context
  const isBreakfastScenario = scenarioId.includes('breakfast');
  const isDinnerScenario = scenarioId.includes('dinner');

  if (isBreakfastScenario) {
    matched = matched.filter((p) => {
      const idUpper = p.id.toUpperCase();
      const enUpper = p.en.toUpperCase();
      return !idUpper.includes('DINNER') && !enUpper.includes('DINNER') &&
             !idUpper.includes('NIGHT') && !enUpper.includes('NIGHT');
    });
  } else if (isDinnerScenario) {
    matched = matched.filter((p) => {
      const idUpper = p.id.toUpperCase();
      const enUpper = p.en.toUpperCase();
      return !idUpper.includes('BREAKFAST') && !enUpper.includes('BREAKFAST') &&
             !idUpper.includes('MORNING') && !enUpper.includes('MORNING');
    });
  }

  return matched;
}

/**
 * NEW: Get phrases filtered by difficulty level using metadata.json
 */
export function getPhrasesByDifficulty(level: 1 | 2 | 3): PhraseItem[] {
  const matchingIntents = new Set<string>();
  
  for (const [_, meta] of Object.entries(metadata)) {
    if (meta.difficulty === level) {
      matchingIntents.add(meta.intent);
    }
  }

  return phrases.filter((p) => matchingIntents.has(p.intent));
}

/**
 * NEW: Get the sequence of scenarios for a specific day type
 */
export function getStorySkeletonForDay(dayType: 'weekday' | 'saturday' | 'sunday'): string[] {
  return storySkeletons[dayType] || storySkeletons['weekday'];
}

/**
 * NEW: Get review questions for a given scenario
 */
export function getReviewQuestion(scenarioId: string): ReviewQuestion[] {
  return reviewTemplates[scenarioId] || [];
}

