// Language codes (ISO 639-1 or BCP 47)
export type LangCode = string;

// Translation display styles
export type DisplayStyle = 'original' | 'bilingual' | 'underline' | 'clean';
export type TranslationTone = 'normal' | 'technical' | 'tech_forward' | 'humorous' | 'literary' | 'formal' | 'colloquial';
export type InputLoadingPulseEasing = 'linear' | 'ease-out' | 'spring';
export type TranslationLoadingTheme = 'indigo' | 'aurora' | 'monochrome' | 'cosmic';
// 界面配色：system 跟随系统；light / dark 为用户显式覆盖
export type ColorScheme = 'system' | 'light' | 'dark';

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
    // 支持图片输入（用于图片文字识别）；默认关闭
    supportsVision?: boolean;
  }>;
}

// Global application settings
export interface GlobalSettings {
  providers: ProviderConfig[];
  selectedProviderId: string;
  selectedModelId: string;
  services: TranslationService[];
  selectedServiceId: string;
  customTones: CustomTone[];
  overrideDisplayStyleEnabled: boolean;
  customDisplayStyle: DisplayStyle;
  overrideTranslationToneEnabled: boolean;
  customTranslationTone: string;
  nativeLanguage: LangCode;
  secondLanguage: LangCode;
  uiLanguage: LangCode;
  displayStyle: DisplayStyle;
  translationTone: TranslationTone;
  translationLoadingTheme: TranslationLoadingTheme;
  colorScheme: ColorScheme;
  globalPrompt: string;
  shortcutKey: string;
  hoverShortcutKey: string;
  inputShortcutKey: string;
  inputTranslationTargetLanguage: LangCode;
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
  targetLang: LangCode;
  text: string;
  createdAt: number; // timestamp
}

// Translation request payload
export interface TranslationRequest {
  text: string;
  targetLang: LangCode;
  isAggregate?: boolean;
  // 调用方告知文本内是否含 #N# 行内占位符。仅在 true 时才向 prompt 附加占位符规则，
  // 避免短句翻译（popup / input 场景）每次都浪费 ~250 字符 token。
  hasPlaceholders?: boolean;
  // 额外提示词片段，追加到 system prompt 末尾。用于 popup 等场景注入特定规则。
  extraPrompt?: string;
  // 调用方声明本次翻译适合多义词词典式翻译（如 popup 短文本）。
  // 网页翻译永不设置，避免多义项 bullet 输出污染 DOM。
  enablePolysemy?: boolean;
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

// Image translation result: 视觉模型整图直译的译文文本
export interface ImageTranslationResult {
  text: string;
  providerId: string;
  modelId: string;
  cached: boolean;
}

// Background message types
interface BgTranslatePayload {
  text: string;
  targetLang: LangCode;
  isAggregate?: boolean;
  hasPlaceholders?: boolean;
  extraPrompt?: string;
  enablePolysemy?: boolean;
}

// popup 上传/粘贴的本地图片直译请求
export type BgImageTranslatePayload = { dataUrl: string; targetLang: LangCode };

export type BgMessage =
  | { type: 'TRANSLATE'; payload: BgTranslatePayload }
  | { type: 'IMAGE_TRANSLATE'; payload: BgImageTranslatePayload }
  | { type: 'PING' };

// 发往 content script 的消息类型（background 快捷键 / popup 经 chrome.tabs.sendMessage 下发）
export type ContentMessage =
  | { type: 'TOGGLE_TRANSLATION' }
  | { type: 'START_TRANSLATION' }
  | { type: 'STOP_TRANSLATION' };

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
