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

const modelQueueItemSchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  enabled: z.boolean().default(true),
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

export const globalSettingsSchema = z.object({
  providers: z.array(providerConfigSchema).min(1, 'At least one provider is required'),
  modelQueue: z.array(modelQueueItemSchema).min(1, 'At least one model queue item is required'),
  nativeLanguage: z.string().min(2).max(10).default('zh-CN'),
  defaultSourceLanguage: z.string().min(2).max(10).default('en'),
  uiLanguage: z.string().min(2).max(10).default('zh-CN'),
  defaultStyle: z.enum(['original', 'bilingual', 'underline', 'clean']).default('original'),
  globalPrompt: z.string().min(1).default(DEFAULT_GLOBAL_PROMPT),
  detectLangProviders: z.array(langDetectProviderSchema).default([{ id: 'franc', name: 'franc-min', type: 'franc' }]),
  shortcutKey: z.string().default('Alt+W'),
  aggregateEnabled: z.boolean().default(true),
  maxParagraphsPerRequest: z.number().int().min(1).max(20).default(5),
  maxTextLengthPerRequest: z.number().int().min(100).max(10000).default(2000),
  maxConcurrentRequests: z.number().int().min(1).max(10).default(3),
  requestTimeout: z.number().int().min(5000).max(120000).default(30000),
});

export type ValidatedSettings = z.infer<typeof globalSettingsSchema>;
