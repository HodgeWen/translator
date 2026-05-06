import { z } from 'zod';
import { DEFAULT_GLOBAL_PROMPT } from './prompts';

const providerConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseURL: z.string().url(),
  apiKey: z.string().default(''),
  headers: z.record(z.string()).default({}),
  query: z.record(z.string()).default({}),
  body: z.record(z.unknown()).default({}),
  prompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().gt(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
  models: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
    })
  ).min(1, 'At least one model is required'),
});

const loadBalanceProviderSchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().optional(),
  weight: z.number().min(1).max(100).default(1),
});

const loadBalanceConfigSchema = z.object({
  enabled: z.boolean().default(false),
  providers: z.array(loadBalanceProviderSchema).default([]),
});

const langDetectProviderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['franc', 'api', 'google_free']),
  endpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().int().min(1000).max(60000).optional(),
});

const hexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
const inputLoadingPulseKeyframesDefault: [string, string, string] = ['#4b5563', '#2563eb', '#0f172a'];
const hoverShortcutKeySchema = z.enum(['Control', 'Alt', 'Shift', 'Meta']).catch('Control').default('Control');

export const globalSettingsSchema = z.object({
  providers: z.array(providerConfigSchema).min(1, 'At least one provider is required'),
  selectedProviderId: z.string().default(''),
  selectedModelId: z.string().default(''),
  loadBalance: loadBalanceConfigSchema.default({ enabled: false, providers: [] }),
  nativeLanguage: z.string().min(2).max(10).default('zh-CN'),
  defaultSourceLanguage: z.string().min(2).max(10).default('en'),
  uiLanguage: z.string().min(2).max(10).default('zh-CN'),
  defaultStyle: z.enum(['original', 'bilingual', 'underline', 'clean']).default('original'),
  globalPrompt: z.string().min(1).default(DEFAULT_GLOBAL_PROMPT),
  detectLangProviders: z.array(langDetectProviderSchema).default([{ id: 'franc', name: 'franc-min', type: 'franc' }]),
  shortcutKey: z.string().default('Alt+W'),
  hoverShortcutKey: hoverShortcutKeySchema,
  inputShortcutKey: z.enum(['Control', 'Alt', 'Shift', 'Meta', 'Escape']).catch('Control').default('Control'),
  inputDefaultSourceLanguage: z.string().default(''),
  inputLoadingPulseKeyframes: z.tuple([hexColorSchema, hexColorSchema, hexColorSchema])
    .catch(inputLoadingPulseKeyframesDefault)
    .default(inputLoadingPulseKeyframesDefault),
  inputLoadingPulseDurationMs: z.number().int().min(400).max(5000).default(1200),
  inputLoadingPulseEasing: z.enum(['linear', 'ease-out', 'spring']).default('ease-out'),
  aggregateEnabled: z.boolean().default(true),
  maxParagraphsPerRequest: z.number().int().min(1).max(20).default(5),
  maxTextLengthPerRequest: z.number().int().min(100).max(10000).default(2000),
  maxConcurrentRequests: z.number().int().min(1).max(10).default(3),
  requestTimeout: z.number().int().min(5000).max(120000).default(30000),
});

export type ValidatedSettings = z.infer<typeof globalSettingsSchema>;
