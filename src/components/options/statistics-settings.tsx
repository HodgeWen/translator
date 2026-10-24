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
import { getRequestStats, getDailyTokenUsage, cleanupOrphanedStats, type RequestStatItem, type TokenUsageItem } from '@/lib/stats';
import { getSettings } from '@/lib/storage';
import { t } from '@/lib/i18n';
import { BarChart3, Clock, Coins } from 'lucide-react';
import { buildNameMap, buildResponseChartData, buildTokenChartData } from './statistics-chart-data';

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

// ---- 暗色模式 ----
/**
 * 暗色状态由外部显式传入（settings.colorScheme 经 useDarkMode 解析后的结果）。
 * 之前这里用 MutationObserver 监听 <html class> 并在回调里强制 setState 重建图表，
 * 脆弱且性能差；现在改由 isDark 作为 useEffect 依赖驱动重建，destroy 清理逻辑保持不变。
 * readDarkFromDom 仅作为未传 isDark 时的兜底（如独立挂载该组件的场景）。
 */
function readDarkFromDom(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

// ---- 图表组件 ----

interface OptionsStatisticsSettingsProps {
  /** 当前是否为暗色主题；由 options/main.tsx 传入，用于图表配色 */
  isDark?: boolean;
}

export function OptionsStatisticsSettings({ isDark: isDarkProp }: OptionsStatisticsSettingsProps = {}) {
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
  // 主题变化（system 跟随系统 / 用户切换 colorScheme）会触发图表按新配色重建
  const isDark = isDarkProp ?? readDarkFromDom();

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
    if (!responseChartRef.current || requestStats.length === 0) return

    // 数据与配置的构建是纯计算，抽到 statistics-chart-data.ts
    const { data, options } = buildResponseChartData(requestStats, nameMap, isDark)

    if (responseChartInstance.current) {
      responseChartInstance.current.destroy()
    }

    responseChartInstance.current = new Chart(responseChartRef.current, {
      type: 'bar',
      data,
      options
    })

    return () => {
      responseChartInstance.current?.destroy()
      responseChartInstance.current = null
    }
  }, [requestStats, nameMap, isDark])

  // ---- 渲染 Chart B：当月每天 Token 消耗堆叠柱状图 ----
  useEffect(() => {
    if (!tokenChartRef.current || tokenUsage.length === 0) return

    const { data, options } = buildTokenChartData(tokenUsage, nameMap, isDark)

    if (tokenChartInstance.current) {
      tokenChartInstance.current.destroy()
    }

    tokenChartInstance.current = new Chart(tokenChartRef.current, {
      type: 'bar',
      data,
      options
    })

    return () => {
      tokenChartInstance.current?.destroy()
      tokenChartInstance.current = null
    }
  }, [tokenUsage, nameMap, isDark])

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
