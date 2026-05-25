import { z } from 'zod';
import { DEFAULT_GLOBAL_PROMPT } from './prompts';

const providerConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseURL: z.string().url(),
  apiKey: z.string().default(''),
  headers: z.record(z.string(), z.string()).default({}),
  query: z.record(z.string(), z.string()).default({}),
  body: z.record(z.string(), z.unknown()).default({}),
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

const presetPromptSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  content: z.string().min(1),
  isSystem: z.boolean().optional(),
});

const customToneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  promptInstruction: z.string().min(1),
});

const baseServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  prompt: z.string().optional(),
  promptMode: z.enum(['append', 'override']).default('append'),
  defaultDisplayStyle: z.enum(['original', 'bilingual', 'underline', 'clean', 'personal_default']).default('personal_default'),
  defaultTranslationTone: z.string().default('personal_default'),
  enablePolysemy: z.boolean().default(false),
});

const singleServiceSchema = baseServiceSchema.extend({
  type: z.literal('single'),
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  fallbackEnabled: z.boolean().default(true),
});

const poolServiceSchema = baseServiceSchema.extend({
  type: z.literal('pool'),
  poolProviders: z.array(
    z.object({
      providerId: z.string().min(1),
      modelId: z.string().optional(),
      weight: z.number().int().min(1).max(100).default(1),
    })
  ).min(1, 'At least one pool provider is required'),
});

const translationServiceSchema = z.discriminatedUnion('type', [
  singleServiceSchema,
  poolServiceSchema,
]);

const langDetectProviderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['franc', 'api', 'google_free']),
  endpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  timeout: z.number().int().min(1000).max(60000).optional(),
});

const hexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
const inputLoadingPulseKeyframesDefault: [string, string, string] = ['#4b5563', '#2563eb', '#0f172a'];
const hoverShortcutKeySchema = z.enum(['Control', 'Alt', 'Shift', 'Meta']).catch('Control').default('Control');

export const globalSettingsSchema = z.object({
  providers: z.array(providerConfigSchema),
  selectedProviderId: z.string().default(''),
  selectedModelId: z.string().default(''),
  services: z.array(translationServiceSchema).default([]),
  selectedServiceId: z.string().default(''),
  customPresetPrompts: z.array(presetPromptSchema).default([]),
  customTones: z.array(customToneSchema).default([]),
  overrideDisplayStyleEnabled: z.boolean().default(false),
  customDisplayStyle: z.enum(['original', 'bilingual', 'underline', 'clean']).default('original'),
  overrideTranslationToneEnabled: z.boolean().default(false),
  customTranslationTone: z.string().default('normal'),
  nativeLanguage: z.string().min(2).max(10).default('zh-CN'),
  defaultSourceLanguage: z.string().min(2).max(10).default('en'),
  uiLanguage: z.string().min(2).max(10).default('zh-CN'),
  displayStyle: z.enum(['original', 'bilingual', 'underline', 'clean']).default('original'),
  translationTone: z.enum(['normal', 'technical', 'tech_forward', 'humorous', 'literary', 'formal', 'colloquial']).default('normal'),
  translationLoadingTheme: z.enum(['indigo', 'aurora', 'monochrome', 'cosmic']).default('indigo'),
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
