import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { testProvider } from '@/lib/api'
import { getRandomGreeting } from '@/lib/greetings'
import type { ProviderConfig } from '@/types'
import { Play, Loader2, CheckCircle2, XCircle } from 'lucide-react'

type TestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success'
      result: string
      modelName: string
      sourceLang: string
      usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
    }
  | { status: 'error'; message: string }

interface ProviderTestPanelProps {
  provider: ProviderConfig
  nativeLanguage: string
}

/**
 * 服务商连通性测试面板（从 provider-edit-form.tsx 拆出）。
 *
 * 拆分理由：原文件 528 行同时承担「表单字段渲染」与「异步测试请求 + 竞态作废」，
 * 后者自带一套 ref/state（runId、activeProviderId、testState），与表单字段无关，
 * 属于发散式变化——测试逻辑改动时不该被迫读整个表单。
 *
 * 行为与原实现一致：用 runId + providerId 双条件丢弃过期响应。
 */
export function ProviderTestPanel({ provider, nativeLanguage }: ProviderTestPanelProps) {
  const testRunIdRef = useRef(0)
  const activeTestProviderIdRef = useRef<string | null>(null)
  const [testState, setTestState] = useState<TestState>({ status: 'idle' })

  const handleTest = async () => {
    const providerId = provider.id
    const runId = testRunIdRef.current + 1
    testRunIdRef.current = runId
    activeTestProviderIdRef.current = providerId
    setTestState({ status: 'loading' })
    try {
      const greeting = getRandomGreeting()
      const result = await testProvider(provider, greeting.text, nativeLanguage)
      if (testRunIdRef.current !== runId || activeTestProviderIdRef.current !== providerId) return
      setTestState({
        status: 'success',
        result: result.text,
        modelName: result.modelName,
        sourceLang: greeting.lang,
        usage: result.usage
      })
    } catch (err) {
      if (testRunIdRef.current !== runId || activeTestProviderIdRef.current !== providerId) return
      setTestState({ status: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{t('label_test_provider')}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{t('hint_test_provider')}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={testState.status === 'loading'}
        >
          {testState.status === 'loading' ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="mr-1.5 h-3.5 w-3.5" />
          )}
          {t('btn_test')}
        </Button>
      </div>

      {testState.status === 'success' && (
        <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">{t('test_success')}</span>
          </div>
          <div className="text-sm text-foreground">{testState.result}</div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <span className="truncate max-w-[120px]">{testState.modelName}</span>
            {testState.usage && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>Prompt {testState.usage.promptTokens}</span>
                <span className="text-muted-foreground/40">·</span>
                <span>Output {testState.usage.completionTokens}</span>
                <span className="text-muted-foreground/40">·</span>
                <span>Total {testState.usage.totalTokens}</span>
              </>
            )}
          </div>
        </div>
      )}

      {testState.status === 'error' && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
            <XCircle className="h-4 w-4" />
            <span className="text-xs font-medium">{t('test_failed')}</span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-300 break-all">{testState.message}</p>
        </div>
      )}
    </div>
  )
}
