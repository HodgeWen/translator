// Language codes (ISO 639-1 or BCP 47)
export type LangCode = string;

// Translation display styles
export type DisplayStyle = 'original' | 'bilingual' | 'underline' | 'clean';
export type TranslationTone = 'normal' | 'technical' | 'tech_forward' | 'humorous' | 'literary' | 'formal' | 'colloquial';
export type InputLoadingPulseEasing = 'linear' | 'ease-out' | 'spring';
export type TranslationLoadingTheme = 'indigo' | 'aurora' | 'monochrome' | 'cosmic';

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
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
  models: Array<{
    id: string;
    name: string;
  }>;
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
  services: TranslationService[];
  selectedServiceId: string;
  customPresetPrompts: PresetPrompt[];
  customTones: CustomTone[];
  overrideDisplayStyleEnabled: boolean;
  customDisplayStyle: DisplayStyle;
  overrideTranslationToneEnabled: boolean;
  customTranslationTone: string;
  nativeLanguage: LangCode;
  defaultSourceLanguage: LangCode;
  uiLanguage: LangCode;
  displayStyle: DisplayStyle;
  translationTone: TranslationTone;
  translationLoadingTheme: TranslationLoadingTheme;
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
  // 额外提示词片段，追加到 system prompt 末尾。用于 popup 等场景注入特定规则。
  extraPrompt?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Translation response
export interface TranslationResponse {
  text: string;
  providerId: string;
  modelId: string;
  detectedLang?: LangCode;
  usage?: TokenUsage;
}

// Background message types
interface BgTranslatePayload {
  text: string;
  sourceLang?: LangCode;
  targetLang: LangCode;
  isAggregate?: boolean;
  hasPlaceholders?: boolean;
  extraPrompt?: string;
}

interface BgDetectLangPayload {
  text: string;
}

export type BgMessage =
  | { type: 'TRANSLATE'; payload: BgTranslatePayload }
  | { type: 'DETECT_LANG'; payload: BgDetectLangPayload }
  | { type: 'PING' };

export interface PresetPrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  isSystem?: boolean;
}

export interface CustomTone {
  id: string;
  name: string;
  promptInstruction: string;
}

export interface BaseService {
  id: string;
  name: string;
  prompt?: string;
  promptMode?: 'append' | 'override';
  defaultDisplayStyle: DisplayStyle | 'personal_default';
  defaultTranslationTone: string | 'personal_default';
  enablePolysemy?: boolean;
}

export interface SingleService extends BaseService {
  type: 'single';
  providerId: string;
  modelId: string;
  fallbackEnabled: boolean;
}

export interface PoolService extends BaseService {
  type: 'pool';
  poolProviders: Array<{
    providerId: string;
    modelId?: string;
    weight: number;
  }>;
}

export type TranslationService = SingleService | PoolService;

// --- 统计数据 ---

/** 单次请求日志（用于滚动窗口统计，每 provider+model 保留最近 100 条） */
export interface RequestLogEntry {
  id?: number;
  providerId: string;
  modelId: string;
  timestamp: number;
  responseTime: number; // ms
  success: boolean;
}

/** 每日 token 用量累加记录（按天 upsert） */
export interface DailyTokenUsageEntry {
  id?: number;
  providerId: string;
  modelId: string;
  date: string; // "YYYY-MM-DD"
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
