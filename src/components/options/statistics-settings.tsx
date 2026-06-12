import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { GlobalSettings } from '@/types';
import { getRequestStats, getDailyTokenUsage, cleanupOrphanedStats, type RequestStatItem, type TokenUsageItem } from '@/lib/stats';
import { getSettings } from '@/lib/storage';
import { t } from '@/lib/i18n';
import { BarChart3, Clock, Coins } from 'lucide-react';

// ---- Tree-shaking：仅注册所需组件（bar + line 混合图表）----
Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
);

// ---- 图表配色 ----
const BAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

// ---- 暗色模式 ----
function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

interface ThemeColors {
  text: string;
  grid: string;
  tooltipBg: string;
  tooltipText: string;
}

function getThemeColors(): ThemeColors {
  if (isDarkMode()) {
    return {
      text: '#a1a1aa',
      grid: 'rgba(255, 255, 255, 0.06)',
      tooltipBg: 'rgba(24, 24, 27, 0.95)',
      tooltipText: '#f4f4f5',
    };
  }
  return {
    text: '#71717a',
    grid: 'rgba(0, 0, 0, 0.06)',
    tooltipBg: 'rgba(255, 255, 255, 0.95)',
    tooltipText: '#18181b',
  };
}

// ---- 辅助：构建 provider/model ID → 显示名 映射 ----
function buildNameMap(settings: GlobalSettings): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of settings.providers) {
    map.set(p.id, p.name);
    for (const m of p.models) {
      map.set(`${p.id}::${m.id}`, `${p.name} / ${m.name}`);
    }
  }
  return map;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatK(n: number): string {
  if (n === 0) return '0';
  if (n < 1000) return n.toString();
  const k = n / 1000;
  return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`;
}

// ---- 图表组件 ----

export function OptionsStatisticsSettings() {
  // Canvas refs
  const responseChartRef = useRef<HTMLCanvasElement>(null);
  const tokenChartRef = useRef<HTMLCanvasElement>(null);
  // Chart.js 实例 refs（用于 destroy）
  const responseChartInstance = useRef<Chart | null>(null);
  const tokenChartInstance = useRef<Chart | null>(null);
  // 数据状态
  const [requestStats, setRequestStats] = useState<RequestStatItem[]>([]);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageItem[]>([]);
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      const [stats, tokens, settings] = await Promise.all([
        getRequestStats(),
        getDailyTokenUsage(),
        getSettings(),
      ]);

      // 兜底清理孤数据
      const validKeys = new Set<string>();
      for (const p of settings.providers) {
        for (const m of p.models) {
          validKeys.add(`${p.id}::${m.id}`);
        }
      }
      cleanupOrphanedStats(validKeys).catch(() => {});

      setRequestStats(stats.filter((s) => validKeys.has(`${s.providerId}::${s.modelId}`)));
      setTokenUsage(tokens.filter((t) => validKeys.has(`${t.providerId}::${t.modelId}`)));
      setNameMap(buildNameMap(settings));
    } catch {
      // 数据加载失败静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  // 初次加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---- 渲染 Chart A：响应时间（单条折线）+ 失败次数（模型堆叠柱） ----
  useEffect(() => {
    if (!responseChartRef.current || requestStats.length === 0) return;

    const theme = getThemeColors();

    // X 轴：去重后的服务商名称
    const providerIds = [...new Set(requestStats.map((s) => s.providerId))];
    const labels = providerIds.map((id) => nameMap.get(id) || id);

    // 单条折线：每个服务商的整体平均响应时间（该服务商下所有模型取均值）
    const providerAvgTime = providerIds.map((providerId) => {
      const statsForProvider = requestStats.filter((s) => s.providerId === providerId);
      if (statsForProvider.length === 0) return null;
      const total = statsForProvider.reduce((sum, s) => sum + s.avgResponseTime, 0);
      return Math.round(total / statsForProvider.length);
    });

    // 所有唯一的 (providerId, modelId) 组合 → 堆叠柱
    const allKeys = [...new Set(requestStats.map((s) => `${s.providerId}::${s.modelId}`))];

    const barDatasets = allKeys.map((key, idx) => {
      const [, mid] = key.split('::');
      const color = BAR_COLORS[idx % BAR_COLORS.length];
      const displayName = nameMap.get(key) || mid;

      const barData = providerIds.map((providerId) => {
        const stat = requestStats.find(
          (s) => s.providerId === providerId && s.modelId === mid && `${s.providerId}::${s.modelId}` === key,
        );
        return stat ? stat.failureCount : 0;
      });

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
        order: 1,
      };
    });

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
        order: 0,
      },
      ...barDatasets,
    ];

    if (responseChartInstance.current) {
      responseChartInstance.current.destroy();
    }

    responseChartInstance.current = new Chart(responseChartRef.current, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: {
            display: true,
            text: t('statistics_response_time'),
            color: theme.text,
            font: { size: 14, weight: 'bold' },
            padding: { bottom: 16 },
          },
          legend: {
            labels: {
              color: theme.text,
              usePointStyle: true,
              padding: 16,
              filter: (item, chartData) => {
                if (item.datasetIndex === undefined) return true;
                const ds = (chartData.datasets[item.datasetIndex] as any);
                return !ds.stack; // 图例只显示折线
              },
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            callbacks: {
              label: (ctx) => {
                const ds = ctx.chart.data.datasets[ctx.datasetIndex] as any;
                if (!ds.stack) {
                  const val = ctx.parsed.y;
                  return val != null ? `⏱ ${formatTime(val)}` : '';
                }
                const v = ctx.parsed.y ?? 0;
                return v > 0 ? `${ctx.dataset.label}: ${v} 次` : '';
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: theme.text, maxRotation: 45 },
            grid: { color: theme.grid },
          },
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: t('statistics_avg_response_time'), color: theme.text },
            ticks: { color: theme.text, callback: (v) => formatTime(v as number) },
            grid: { color: theme.grid },
            beginAtZero: true,
          },
          y1: {
            type: 'linear',
            position: 'right',
            stacked: true,
            title: { display: true, text: t('statistics_failure_count'), color: theme.text },
            ticks: { color: theme.text, stepSize: 1 },
            grid: { display: false },
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      responseChartInstance.current?.destroy();
      responseChartInstance.current = null;
    };
  }, [requestStats, nameMap]);

  // ---- 渲染 Chart B：当月每天 Token 消耗堆叠柱状图 ----
  useEffect(() => {
    if (!tokenChartRef.current || tokenUsage.length === 0) return;

    const theme = getThemeColors();

    // 计算当月天数
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    // X 轴标签：1日 ~ N日
    const labels: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      labels.push(`${month}/${d}`);
    }

    // 所有唯一的 (providerId, modelId) 组合 → 每个组合是一个堆叠段
    const allKeys = [...new Set(tokenUsage.map((t) => `${t.providerId}::${t.modelId}`))];

    // 为每个组合构建数据集
    const datasets = allKeys.map((key, idx) => {
      const [pid, mid] = key.split('::');
      const data = labels.map((_, dayIdx) => {
        const day = dayIdx + 1;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const entry = tokenUsage.find(
          (t) => t.providerId === pid && t.modelId === mid && t.date === dateStr,
        );
        return entry ? entry.totalTokens : 0;
      });
      return {
        label: nameMap.get(key) || mid,
        data,
        backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
        borderRadius: 2,
      };
    });

    if (tokenChartInstance.current) {
      tokenChartInstance.current.destroy();
    }

    tokenChartInstance.current = new Chart(tokenChartRef.current, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: {
            display: true,
            text: t('statistics_token_usage'),
            color: theme.text,
            font: { size: 14, weight: 'bold' },
            padding: { bottom: 16 },
          },
          legend: {
            labels: { color: theme.text, usePointStyle: true, padding: 16 },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatK(ctx.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: `${year}年${month}月`, color: theme.text },
            ticks: { color: theme.text, maxRotation: 45 },
            grid: { color: theme.grid },
          },
          y: {
            stacked: true,
            title: { display: true, text: 'Tokens (k)', color: theme.text },
            ticks: { color: theme.text, callback: (v) => formatK(v as number) },
            grid: { color: theme.grid },
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      tokenChartInstance.current?.destroy();
      tokenChartInstance.current = null;
    };
  }, [tokenUsage, nameMap]);

  // ---- 暗色模式切换时重建图表 ----
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // 销毁并重建两个图表以更新主题色
      if (responseChartInstance.current) {
        responseChartInstance.current.destroy();
        responseChartInstance.current = null;
      }
      if (tokenChartInstance.current) {
        tokenChartInstance.current.destroy();
        tokenChartInstance.current = null;
      }
      // 通过更新 state 触发 useEffect 重建
      setRequestStats((prev) => [...prev]);
      setTokenUsage((prev) => [...prev]);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // ---- 空数据占位 ----
  const hasResponseData = requestStats.length > 0;
  const hasTokenData = tokenUsage.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">{t('statistics_title')}</h2>
        <p className="text-sm text-muted-foreground">{t('statistics_subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <BarChart3 className="h-5 w-5 animate-pulse mr-2" />
          {t('loading')}
        </div>
      ) : (
        <>
          {/* Chart A: 响应时间 + 失败次数 */}
          <div className="rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">{t('statistics_response_time')}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t('statistics_response_time_desc')}</p>
            {hasResponseData ? (
              <div className="relative h-72">
                <canvas ref={responseChartRef} />
              </div>
            ) : (
              <EmptyPlaceholder />
            )}
          </div>

          {/* Chart B: 当月 Token 消耗 */}
          <div className="rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">{t('statistics_token_usage')}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t('statistics_token_usage_desc')}</p>
            {hasTokenData ? (
              <div className="relative h-72">
                <canvas ref={tokenChartRef} />
              </div>
            ) : (
              <EmptyPlaceholder />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** 空数据占位组件 */
function EmptyPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
      <p className="text-sm font-medium">{t('statistics_no_data')}</p>
      <p className="text-xs mt-1">{t('statistics_no_data_hint')}</p>
    </div>
  );
}
