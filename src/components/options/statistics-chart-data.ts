import type { ChartData, ChartOptions } from 'chart.js'
import type { GlobalSettings } from '@/types'
import { t } from '@/lib/i18n'
import type { RequestStatItem, TokenUsageItem } from '@/lib/stats'

/** 图表配色：柱状图按模型循环取色 */
export const BAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
]

export interface ThemeColors {
  text: string
  grid: string
  tooltipBg: string
  tooltipText: string
}

export function getThemeColors(isDark: boolean): ThemeColors {
  if (isDark) {
    return {
      text: '#a1a1aa',
      grid: 'rgba(255, 255, 255, 0.06)',
      tooltipBg: 'rgba(24, 24, 27, 0.95)',
      tooltipText: '#f4f4f5'
    }
  }
  return {
    text: '#71717a',
    grid: 'rgba(0, 0, 0, 0.06)',
    tooltipBg: 'rgba(255, 255, 255, 0.95)',
    tooltipText: '#18181b'
  }
}

/** 构建 provider/model ID → 显示名 映射 */
export function buildNameMap(settings: GlobalSettings): Map<string, string> {
  const map = new Map<string, string>()
  for (const p of settings.providers) {
    map.set(p.id, p.name)
    for (const m of p.models) {
      map.set(`${p.id}::${m.id}`, `${p.name} / ${m.name}`)
    }
  }
  return map
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatK(n: number): string {
  if (n === 0) return '0'
  if (n < 1000) return n.toString()
  const k = n / 1000
  return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`
}

/**
 * Chart A 数据：响应时间（单条折线）+ 失败次数（模型堆叠柱）。
 *
 * 从 statistics-settings.tsx 抽出：这段是纯计算（无 hooks / 无 ref），
 * 与图表实例生命周期无关，留在组件里只会让「数据怎么算」和
 * 「实例何时 destroy」两件事混在同一个 useEffect 中。
 *
 * 性能：原实现用 filter/find 在 providerIds × allKeys 上嵌套查找（O(n²)），
 * 统计记录上千条时每次切 tab 都要重复这轮扫描，这里改为单次遍历建索引（O(n)）。
 */
export function buildResponseChartData(
  requestStats: RequestStatItem[],
  nameMap: Map<string, string>,
  isDark: boolean
): { data: ChartData; options: ChartOptions } {
  const theme = getThemeColors(isDark)

  // X 轴：去重后的服务商名称
  const providerIds = [...new Set(requestStats.map((s) => s.providerId))]
  const labels = providerIds.map((id) => nameMap.get(id) || id)

  // 单次遍历建立「服务商 → 响应时间合计/条数」与「服务商::模型 → 失败次数」两张索引表
  const providerTimeSum = new Map<string, { total: number; count: number }>()
  const failureByKey = new Map<string, number>()
  const allKeys: string[] = []
  for (const stat of requestStats) {
    const timeAgg = providerTimeSum.get(stat.providerId)
    if (timeAgg) {
      timeAgg.total += stat.avgResponseTime
      timeAgg.count += 1
    } else {
      providerTimeSum.set(stat.providerId, { total: stat.avgResponseTime, count: 1 })
    }
    const compositeKey = `${stat.providerId}::${stat.modelId}`
    if (!failureByKey.has(compositeKey)) {
      failureByKey.set(compositeKey, stat.failureCount)
      allKeys.push(compositeKey)
    } else {
      failureByKey.set(compositeKey, (failureByKey.get(compositeKey) ?? 0) + stat.failureCount)
    }
  }

  // 单条折线：每个服务商的整体平均响应时间（该服务商下所有模型取均值）
  const providerAvgTime = providerIds.map((providerId) => {
    const agg = providerTimeSum.get(providerId)
    if (!agg || agg.count === 0) return null
    return Math.round(agg.total / agg.count)
  })

  // 所有唯一的 (providerId, modelId) 组合 → 堆叠柱
  const barDatasets = allKeys.map((key, idx) => {
    const [, mid] = key.split('::')
    const color = BAR_COLORS[idx % BAR_COLORS.length]
    const displayName = nameMap.get(key) || mid

    // 每个服务商在该模型上的失败次数：按 (providerId, modelId) 直接查表，避免嵌套 find
    const barData = providerIds.map((providerId) => failureByKey.get(`${providerId}::${mid}`) ?? 0)

    return {
      type: 'bar' as const,
      label: displayName,
      data: barData,
      backgroundColor: `${color}55`,
      borderColor: color,
      borderWidth: 1,
      borderRadius: 3,
      stack: 'failures',
      yAxisID: 'y1',
      order: 1
    }
  })

  const datasets = [
    {
      type: 'line' as const,
      label: t('statistics_avg_response_time'),
      data: providerAvgTime,
      borderColor: '#6366f1',
      backgroundColor: '#6366f1',
      borderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.3,
      fill: false,
      yAxisID: 'y',
      order: 0
    },
    ...barDatasets
  ]

  const options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      title: {
        display: true,
        text: t('statistics_response_time'),
        color: theme.text,
        font: { size: 14, weight: 'bold' },
        padding: { bottom: 16 }
      },
      legend: {
        labels: {
          color: theme.text,
          usePointStyle: true,
          padding: 16,
          filter: (item, chartData) => {
            if (item.datasetIndex === undefined) return true
            const ds = chartData.datasets[item.datasetIndex] as { stack?: string }
            return !ds.stack // 图例只显示折线
          }
        }
      },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        titleColor: theme.tooltipText,
        bodyColor: theme.tooltipText,
        callbacks: {
          label: (ctx) => {
            const ds = ctx.chart.data.datasets[ctx.datasetIndex] as { stack?: string }
            if (!ds.stack) {
              const val = ctx.parsed.y
              return val != null ? `⏱ ${formatTime(val)}` : ''
            }
            const v = ctx.parsed.y ?? 0
            return v > 0 ? `${ctx.dataset.label}: ${v}` : ''
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: theme.text, maxRotation: 45 },
        grid: { color: theme.grid }
      },
      y: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: t('statistics_avg_response_time'), color: theme.text },
        ticks: { color: theme.text, callback: (v) => formatTime(v as number) },
        grid: { color: theme.grid },
        beginAtZero: true
      },
      y1: {
        type: 'linear',
        position: 'right',
        stacked: true,
        title: { display: true, text: t('statistics_failure_count'), color: theme.text },
        ticks: { color: theme.text, stepSize: 1 },
        grid: { display: false },
        beginAtZero: true
      }
    }
  }

  return { data: { labels, datasets }, options }
}

/**
 * Chart B 数据：当月每天 Token 消耗堆叠柱状图。
 * 同样从组件抽出，纯计算。
 * 原实现用 labels × allKeys 的嵌套 find 取值，改为先建索引表。
 */
export function buildTokenChartData(
  tokenUsage: TokenUsageItem[],
  nameMap: Map<string, string>,
  isDark: boolean
): { data: ChartData; options: ChartOptions } {
  const theme = getThemeColors(isDark)

  // 计算当月天数
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()

  // X 轴标签：1日 ~ N日
  const labels: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    labels.push(`${month}/${d}`)
  }

  // 所有唯一的 (providerId, modelId) 组合 → 每个组合是一个堆叠段
  const allKeys = [...new Set(tokenUsage.map((u) => `${u.providerId}::${u.modelId}`))]

  // 先建「providerId::modelId::date → tokens」索引，避免 labels × allKeys 的嵌套 find
  const tokensByKeyDate = new Map<string, number>()
  for (const usage of tokenUsage) {
    tokensByKeyDate.set(`${usage.providerId}::${usage.modelId}::${usage.date}`, usage.totalTokens)
  }

  const datasets = allKeys.map((key, idx) => {
    const [pid, mid] = key.split('::')
    const data = labels.map((_, dayIdx) => {
      const day = dayIdx + 1
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return tokensByKeyDate.get(`${pid}::${mid}::${dateStr}`) ?? 0
    })
    return {
      label: nameMap.get(key) || mid,
      data,
      backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
      borderRadius: 2
    }
  })

  const options: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      title: {
        display: true,
        text: t('statistics_token_usage'),
        color: theme.text,
        font: { size: 14, weight: 'bold' },
        padding: { bottom: 16 }
      },
      legend: {
        labels: { color: theme.text, usePointStyle: true, padding: 16 }
      },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        titleColor: theme.tooltipText,
        bodyColor: theme.tooltipText,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatK(ctx.parsed.y ?? 0)}`
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: `${year}-${String(month).padStart(2, '0')}`,
          color: theme.text
        },
        ticks: { color: theme.text, maxRotation: 45 },
        grid: { color: theme.grid }
      },
      y: {
        stacked: true,
        title: { display: true, text: 'Tokens (k)', color: theme.text },
        ticks: { color: theme.text, callback: (v) => formatK(v as number) },
        grid: { color: theme.grid },
        beginAtZero: true
      }
    }
  }

  return { data: { labels, datasets }, options }
}
