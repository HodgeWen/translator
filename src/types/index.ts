// Language codes (ISO 639-1 or BCP 47)
export type LangCode = string;

// Translation display styles
export type TranslationStyle = 'original' | 'bilingual' | 'underline' | 'clean';

// OpenAI-compatible provider configuration
export interface ProviderConfig {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  // Extra body overrides. Same-named keys are overridden by the dedicated
  // sampling fields below (temperature/topP/maxTokens/stream) when provided.
  body: Record<string, unknown>;
  prompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
  models: Array<{
    id: string;
    name: string;
  }>;
}

// Individual model in the global priority queue
export interface ModelQueueItem {
  providerId: string;
  modelId: string;
  enabled: boolean;
}

// Language detection provider configuration
export interface LangDetectProvider {
  id: string;
  name: string;
  type: 'franc' | 'api' | 'google_free';
  // For API-based detection
  endpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

// Global application settings
export interface GlobalSettings {
  providers: ProviderConfig[];
  modelQueue: ModelQueueItem[];
  nativeLanguage: LangCode;
  defaultSourceLanguage: LangCode;
  uiLanguage: LangCode;
  defaultStyle: TranslationStyle;
  globalPrompt: string;
  detectLangProviders: LangDetectProvider[];
  shortcutKey: string;
  aggregateEnabled: boolean;
  maxParagraphsPerRequest: number;
  maxTextLengthPerRequest: number;
  maxConcurrentRequests: number;
  requestTimeout: number;
}

// Cache entry stored in IndexedDB
export interface CacheEntry {
  hash: string;
  sourceLang: LangCode;
  targetLang: LangCode;
  text: string;
  createdAt: number; // timestamp
}

// Translation request payload
export interface TranslationRequest {
  text: string;
  sourceLang?: LangCode;
  targetLang: LangCode;
  isAggregate?: boolean;
}

// Translation response
export interface TranslationResponse {
  text: string;
  providerId: string;
  modelId: string;
  detectedLang?: LangCode;
}

// Background message types
export interface BgTranslatePayload {
  text: string;
  sourceLang?: LangCode;
  targetLang: LangCode;
  isAggregate?: boolean;
}

export interface BgDetectLangPayload {
  text: string;
}

export type BgMessage =
  | { type: 'TRANSLATE'; payload: BgTranslatePayload }
  | { type: 'DETECT_LANG'; payload: BgDetectLangPayload }
  | { type: 'CLEAR_CACHE' }
  | { type: 'PING' };
