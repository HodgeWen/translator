import { ensureDb } from './cache';
import type { RequestLogEntry, TokenUsage } from '@/types';

const MAX_REQUEST_LOGS_PER_KEY = 100;

// ---- 写入 ----

/** 记录一次请求统计（异步 fire-and-forget，失败静默忽略） */
export async function recordRequestStat(
  providerId: string,
  modelId: string,
  responseTime: number,
  success: boolean,
): Promise<void> {
  try {
    const db = await ensureDb();
    const entry: RequestLogEntry = {
      providerId,
      modelId,
      timestamp: Date.now(),
      responseTime,
      success,
    };
    await db.request_logs.add(entry);

    // 维护每 (providerId, modelId) 最多 MAX_REQUEST_LOGS_PER_KEY 条
    const all = await db.request_logs
      .where({ providerId, modelId })
      .sortBy('timestamp');

    if (all.length > MAX_REQUEST_LOGS_PER_KEY) {
      const toDelete = all.slice(0, all.length - MAX_REQUEST_LOGS_PER_KEY);
      await db.request_logs.bulkDelete(toDelete.map((e) => e.id!));
    }
  } catch {
    // 统计写入失败不影响翻译功能
  }
}

/** 按天累加 token 用量（upsert） */
export async function accumulateTokenUsage(
  providerId: string,
  modelId: string,
  usage?: TokenUsage,
): Promise<void> {
  if (!usage) return;
  try {
    const db = await ensureDb();
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const existing = await db.daily_token_usage
      .where({ providerId, modelId, date })
      .first();

    if (existing) {
      await db.daily_token_usage.update(existing.id!, {
        promptTokens: existing.promptTokens + usage.promptTokens,
        completionTokens: existing.completionTokens + usage.completionTokens,
        totalTokens: existing.totalTokens + usage.totalTokens,
      });
    } else {
      await db.daily_token_usage.add({
        providerId,
        modelId,
        date,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      });
    }
  } catch {
    // 统计写入失败不影响翻译功能
  }
}

// ---- 查询 ----

export interface RequestStatItem {
  providerId: string;
  modelId: string;
  avgResponseTime: number;
  failureCount: number;
  totalCount: number;
}

/** 获取所有 provider/model 的最近请求统计 */
export async function getRequestStats(): Promise<RequestStatItem[]> {
  const db = await ensureDb();
  const all = await db.request_logs.orderBy('timestamp').toArray();

  const groups = new Map<string, RequestLogEntry[]>();
  for (const entry of all) {
    const key = `${entry.providerId}::${entry.modelId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  const result: RequestStatItem[] = [];
  for (const [key, entries] of groups) {
    // 只取最近 100 条
    const recent = entries.slice(-MAX_REQUEST_LOGS_PER_KEY);
    const totalTime = recent.reduce((sum, e) => sum + e.responseTime, 0);
    const failures = recent.filter((e) => !e.success).length;
    const [providerId, modelId] = key.split('::');
    result.push({
      providerId,
      modelId,
      avgResponseTime: recent.length > 0 ? Math.round(totalTime / recent.length) : 0,
      failureCount: failures,
      totalCount: recent.length,
    });
  }
  return result;
}

export interface TokenUsageItem {
  providerId: string;
  modelId: string;
  date: string; // "YYYY-MM-DD"
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** 获取当月逐日的 token 用量（返回当月每天所有 provider/model 的累加记录） */
export async function getDailyTokenUsage(): Promise<TokenUsageItem[]> {
  const db = await ensureDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const all = await db.daily_token_usage
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();

  return all.map((e) => ({
    providerId: e.providerId,
    modelId: e.modelId,
    date: e.date,
    promptTokens: e.promptTokens,
    completionTokens: e.completionTokens,
    totalTokens: e.totalTokens,
  }));
}

// ---- 清理 ----

/** 删除指定 provider 的所有统计数据 */
export async function clearStatsForProvider(providerId: string): Promise<void> {
  const db = await ensureDb();
  await db.request_logs.where({ providerId }).delete();
  await db.daily_token_usage.where({ providerId }).delete();
}

/** 删除指定 provider+model 的统计数据 */
export async function clearStatsForProviderModel(providerId: string, modelId: string): Promise<void> {
  const db = await ensureDb();
  await db.request_logs.where({ providerId, modelId }).delete();
  await db.daily_token_usage.where({ providerId, modelId }).delete();
}

/**
 * 兜底清理：删除当前配置中已不存在的 provider/model 的统计记录。
 * @param validKeys 有效的 providerId+modelId 组合集合（格式 "providerId::modelId"）
 */
export async function cleanupOrphanedStats(validKeys: Set<string>): Promise<void> {
  const db = await ensureDb();

  const allRequestLogs = await db.request_logs.toArray();
  const orphanLogIds: number[] = [];
  for (const entry of allRequestLogs) {
    if (!validKeys.has(`${entry.providerId}::${entry.modelId}`)) {
      orphanLogIds.push(entry.id!);
    }
  }
  if (orphanLogIds.length > 0) {
    await db.request_logs.bulkDelete(orphanLogIds);
  }

  const allTokenUsages = await db.daily_token_usage.toArray();
  const orphanTokenIds: number[] = [];
  for (const entry of allTokenUsages) {
    if (!validKeys.has(`${entry.providerId}::${entry.modelId}`)) {
      orphanTokenIds.push(entry.id!);
    }
  }
  if (orphanTokenIds.length > 0) {
    await db.daily_token_usage.bulkDelete(orphanTokenIds);
  }
}
