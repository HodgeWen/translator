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
      supportsVision: z.boolean().default(false),
    })
  ).min(1, 'At least one model is required'),
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

const hexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
const inputLoadingPulseKeyframesDefault: [string, string, string] = ['#4b5563', '#2563eb', '#0f172a'];
const hoverShortcutKeySchema = z.enum(['Control', 'Alt', 'Shift', 'Meta']).catch('Control').default('Control');

export const globalSettingsSchema = z.object({
  providers: z.array(providerConfigSchema),
  selectedProviderId: z.string().default(''),
  selectedModelId: z.string().default(''),
  services: z.array(translationServiceSchema).default([]),
  selectedServiceId: z.string().default(''),
  customTones: z.array(customToneSchema).default([]),
  overrideDisplayStyleEnabled: z.boolean().default(false),
  customDisplayStyle: z.enum(['original', 'bilingual', 'underline', 'clean']).default('original'),
  overrideTranslationToneEnabled: z.boolean().default(false),
  customTranslationTone: z.string().default('normal'),
  nativeLanguage: z.string().min(2).max(10).default('zh-CN'),
  secondLanguage: z.string().min(2).max(10).default('en'),
  uiLanguage: z.string().min(2).max(10).default('zh-CN'),
  displayStyle: z.enum(['original', 'bilingual', 'underline', 'clean']).default('original'),
  translationTone: z.enum(['normal', 'technical', 'tech_forward', 'humorous', 'literary', 'formal', 'colloquial']).default('normal'),
  translationLoadingTheme: z.enum(['indigo', 'aurora', 'monochrome', 'cosmic']).default('indigo'),
  colorScheme: z.enum(['system', 'light', 'dark']).catch('system').default('system'),
  globalPrompt: z.string().min(1).default(DEFAULT_GLOBAL_PROMPT),
  shortcutKey: z.string().default('Alt+W'),
  hoverShortcutKey: hoverShortcutKeySchema,
  inputShortcutKey: z.enum(['Control', 'Alt', 'Shift', 'Meta', 'Escape']).catch('Control').default('Control'),
  inputTranslationTargetLanguage: z.string().min(2).max(10).default('en'),
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

// ============================ 字段级降级解析 ============================
// 背景：原先 storage 在 `globalSettingsSchema.safeParse` 失败时整体回落 DEFAULT_SETTINGS，
// 一个 provider 的 baseURL 少写 https:// 就会静默清空用户全部配置（含 API Key）。
// 这里提供「条目级 + 字段级」降级：逐 provider / service / tone 单独校验，丢弃非法条目、
// 保留合法条目；标量字段逐字段校验，非法值只回落该字段默认值。
// 降级过程中产生的警告通过 SettingsWarning 暴露给上层（storage 再经诊断通道给 UI）。

export interface SettingsWarning {
  /** 稳定的机器可读错误码，便于 UI 分支处理 */
  code: string;
  /** 出问题的位置，如 providers[1] / baseURL */
  path: string;
  /** 面向用户的简短说明（中文） */
  message: string;
}

export interface LenientSettingsParse {
  settings: ValidatedSettings;
  warnings: SettingsWarning[];
}

// 默认值来源：providers 是 schema 里唯一没有 default 的字段，显式给空数组即可得到全量默认配置
const DEFAULT_PARSED_SETTINGS: ValidatedSettings = globalSettingsSchema.parse({ providers: [] });

const SETTINGS_SHAPE: Record<string, z.ZodType> = globalSettingsSchema.shape;

// 需要逐条降级的数组字段及其元素 schema
const ITEM_SCHEMAS = {
  providers: providerConfigSchema,
  services: translationServiceSchema,
  customTones: customToneSchema,
} as const;

type ItemKey = keyof typeof ITEM_SCHEMAS;

const ITEM_KEYS = Object.keys(ITEM_SCHEMAS) as ItemKey[];

const DROP_WARNING_CODES: Record<ItemKey, string> = {
  providers: 'SETTINGS_DROPPED_INVALID_PROVIDER',
  services: 'SETTINGS_DROPPED_INVALID_SERVICE',
  customTones: 'SETTINGS_DROPPED_INVALID_TONE',
};

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 取第一条 issue 生成可读描述，例如 "providers[1].baseURL: Invalid URL"
function describeIssue(error: z.ZodError, prefix: string): string {
  const issue = error.issues[0];
  if (!issue) return prefix;
  const path = issue.path.length > 0 ? `${prefix}.${issue.path.join('.')}` : prefix;
  return `${path}: ${issue.message}`;
}

/**
 * 宽容解析：尽量保留用户数据，绝不因为单条非法配置整体回落默认值。
 * - 整体严格校验通过时零开销直接返回；
 * - 否则逐条目 / 逐字段降级，并把被丢弃或被回落的位置写进 warnings。
 */
export function parseSettingsLenient(input: unknown): LenientSettingsParse {
  const strict = globalSettingsSchema.safeParse(input);
  if (strict.success) {
    return { settings: strict.data, warnings: [] };
  }

  const warnings: SettingsWarning[] = [];
  const source = isPlainObject(input) ? input : {};
  if (!isPlainObject(input)) {
    warnings.push({
      code: 'SETTINGS_INVALID_SHAPE',
      path: '',
      message: '配置数据不是对象，已整体回落默认值',
    });
  }

  // 以默认配置为底，逐项覆盖，保证最终一定产出完整 ValidatedSettings
  const merged: Record<string, unknown> = {
    ...(DEFAULT_PARSED_SETTINGS as unknown as Record<string, unknown>),
  };

  for (const key of ITEM_KEYS) {
    const raw = source[key];
    if (raw === undefined) continue; // 缺省时保留默认（空数组）
    if (!Array.isArray(raw)) {
      warnings.push({
        code: DROP_WARNING_CODES[key],
        path: key,
        message: `${key} 不是数组，已回落为空数组`,
      });
      merged[key] = [];
      continue;
    }

    const itemSchema = ITEM_SCHEMAS[key];
    const kept: unknown[] = [];
    raw.forEach((item, index) => {
      const parsedItem = itemSchema.safeParse(item);
      if (parsedItem.success) {
        kept.push(parsedItem.data);
        return;
      }
      warnings.push({
        code: DROP_WARNING_CODES[key],
        path: `${key}[${index}]`,
        message: `已丢弃非法条目 ${describeIssue(parsedItem.error, `${key}[${index}]`)}`,
      });
    });
    merged[key] = kept;
  }

  for (const [key, fieldSchema] of Object.entries(SETTINGS_SHAPE)) {
    if ((ITEM_KEYS as string[]).includes(key)) continue;
    const raw = source[key];
    if (raw === undefined) continue; // 缺省时保留默认值
    const parsedField = fieldSchema.safeParse(raw);
    if (parsedField.success) {
      merged[key] = parsedField.data;
      continue;
    }
    warnings.push({
      code: 'SETTINGS_FIELD_FALLBACK',
      path: key,
      message: `字段已回落默认值（${describeIssue(parsedField.error, key)}）`,
    });
    merged[key] = (DEFAULT_PARSED_SETTINGS as unknown as Record<string, unknown>)[key];
  }

  const finalParse = globalSettingsSchema.safeParse(merged);
  if (finalParse.success) {
    return { settings: finalParse.data, warnings };
  }

  // 兜底：正常不会走到这里（merged 已按默认值补全）
  warnings.push({
    code: 'SETTINGS_FALLBACK_DEFAULT',
    path: '',
    message: '配置无法修复，已整体回落默认值',
  });
  return { settings: DEFAULT_PARSED_SETTINGS, warnings };
}
