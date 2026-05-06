// Language codes (ISO 639-1 or BCP 47)
export type LangCode = string;

// Translation display styles
export type TranslationStyle = 'original' | 'bilingual' | 'underline' | 'clean';
export type InputLoadingPulseEasing = 'linear' | 'ease-out' | 'spring';

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

// Load balance configuration
export interface LoadBalanceProvider {
  providerId: string;
  modelId?: string; // 优先使用的模型 ID，空则使用模型列表第一个
  weight: number; // 权重，默认 1
}

export interface LoadBalanceConfig {
  enabled: boolean;
  providers: LoadBalanceProvider[];
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
  selectedProviderId: string;
  selectedModelId: string;
  loadBalance: LoadBalanceConfig;
  nativeLanguage: LangCode;
  defaultSourceLanguage: LangCode;
  uiLanguage: LangCode;
  defaultStyle: TranslationStyle;
  globalPrompt: string;
  detectLangProviders: LangDetectProvider[];
  shortcutKey: string;
  hoverShortcutKey: string;
  inputShortcutKey: string;
  inputDefaultSourceLanguage: LangCode;
  inputLoadingPulseKeyframes: [string, string, string];
  inputLoadingPulseDurationMs: number;
  inputLoadingPulseEasing: InputLoadingPulseEasing;
  aggregateEnabled: boolean;
  maxParagraphsPerRequest: number;
  maxTextLengthPerRequest: number;
  maxConcurrentRequests: number;
  requestTimeout: number;
}

// Cache entry stored in IndexedDB
export interface CacheEntry {
  hash: string;
  sourceText: string; // 原文，用于 hash 碰撞校验
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
  // 调用方告知文本内是否含 #N# 行内占位符。仅在 true 时才向 prompt 附加占位符规则，
  // 避免短句翻译（popup / input 场景）每次都浪费 ~250 字符 token。
  hasPlaceholders?: boolean;
}

// Translation response
export interface TranslationResponse {
  text: string;
  providerId: string;
  modelId: string;
  detectedLang?: LangCode;
}

// Background message types
interface BgTranslatePayload {
  text: string;
  sourceLang?: LangCode;
  targetLang: LangCode;
  isAggregate?: boolean;
  hasPlaceholders?: boolean;
}

interface BgDetectLangPayload {
  text: string;
}

export type BgMessage =
  | { type: 'TRANSLATE'; payload: BgTranslatePayload }
  | { type: 'DETECT_LANG'; payload: BgDetectLangPayload }
  | { type: 'PING' };
