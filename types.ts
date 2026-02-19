// types.ts
export enum AppStatus {
  IDLE = 'idle',
  ANALYZING = 'analyzing',
  READY = 'ready',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface SubtitleSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  isRedundant: boolean;
  confidence: number;
  language?: string;
  originalText?: string;
  speakers?: string[];
  emotions?: string[];
  keywords?: string[];
}

export interface VideoMetadata {
  name: string;
  size: number;
  duration: number;
  url: string;
  file: File;
  resolution?: { width: number; height: number };
  fps?: number;
  audioChannels?: number;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];