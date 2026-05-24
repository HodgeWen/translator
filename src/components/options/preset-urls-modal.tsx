import { useState } from 'react';
import { X, Globe, Clipboard, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

interface PresetUrlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Category = 'all' | 'domestic' | 'foreign' | 'gateway' | 'local';

interface PresetProvider {
  id: string;
  name: string;
  category: Category;
  badge: string;
  baseURL: string;
  docLink: string;
}

const PRESET_PROVIDERS: PresetProvider[] = [
  // 国内主流
  {
    id: 'deepseek',
    name: 'DeepSeek 官方',
    category: 'domestic',
    badge: '🇨🇳',
    baseURL: 'https://api.deepseek.com',
    docLink: 'https://api-docs.deepseek.com',
  },
  {
    id: 'dashscope',
    name: '阿里通义千问 (DashScope)',
    category: 'domestic',
    badge: '🇨🇳',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    docLink: 'https://help.aliyun.com/zh/dashscope/developer-reference/compatibility-of-openai-with-dashscope',
  },
  {
    id: 'glm',
    name: '智谱 AI (GLM)',
    category: 'domestic',
    badge: '🇨🇳',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    docLink: 'https://open.bigmodel.cn/dev/api',
  },
  {
    id: 'moonshot',
    name: '月之暗面 (Moonshot)',
    category: 'domestic',
    badge: '🇨🇳',
    baseURL: 'https://api.moonshot.cn/v1',
    docLink: 'https://platform.moonshot.cn/docs/guide',
  },
  {
    id: 'yi',
    name: '零一万物 (01.AI)',
    category: 'domestic',
    badge: '🇨🇳',
    baseURL: 'https://api.lingyiwanwu.com/v1',
    docLink: 'https://platform.lingyiwanwu.com/docs',
  },
  {
    id: 'hunyuan',
    name: '腾讯混元 (Hunyuan)',
    category: 'domestic',
    badge: '🇨🇳',
    baseURL: 'https://api.hunyuan.cloud.tencent.com/v1',
    docLink: 'https://cloud.tencent.com/document/product/1729/111007',
  },
  {
    id: 'qianfan',
    name: '百度千帆 (Qianfan)',
    category: 'domestic',
    badge: '🇨🇳',
    baseURL: 'https://qianfan.baidubce.com/v2',
    docLink: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Flz02la4s',
  },
  {
    id: 'ark',
    name: '字节火山方舟 (Ark)',
    category: 'domestic',
    badge: '🇨🇳',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    docLink: 'https://www.volcengine.com/docs/82379/1298454',
  },
  // 国外主流
  {
    id: 'openai',
    name: 'OpenAI 官方',
    category: 'foreign',
    badge: '🇺🇸',
    baseURL: 'https://api.openai.com/v1',
    docLink: 'https://platform.openai.com/docs/api-reference',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    category: 'foreign',
    badge: '🇺🇸',
    baseURL: 'https://api.anthropic.com/v1',
    docLink: 'https://docs.anthropic.com/en/api/getting-started',
  },
  {
    id: 'gemini',
    name: 'Google Gemini (兼容)',
    category: 'foreign',
    badge: '🇺🇸',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    docLink: 'https://ai.google.dev/gemini-api/docs/openai',
  },
  {
    id: 'groq',
    name: 'Groq 官方',
    category: 'foreign',
    badge: '🇺🇸',
    baseURL: 'https://api.groq.com/openai/v1',
    docLink: 'https://console.groq.com/docs/quickstart',
  },
  // 聚合/网关
  {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    category: 'gateway',
    badge: '🌐',
    baseURL: 'https://api.siliconflow.cn/v1',
    docLink: 'https://docs.siliconflow.cn',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'gateway',
    badge: '🌐',
    baseURL: 'https://openrouter.ai/api/v1',
    docLink: 'https://openrouter.ai/docs',
  },
  {
    id: 'together',
    name: 'Together AI',
    category: 'gateway',
    badge: '🌐',
    baseURL: 'https://api.together.xyz/v1',
    docLink: 'https://docs.together.ai/docs/quickstart',
  },
  // 本地部署
  {
    id: 'ollama',
    name: 'Ollama',
    category: 'local',
    badge: '💻',
    baseURL: 'http://localhost:11434/v1',
    docLink: 'https://github.com/ollama/ollama/blob/main/docs/openai.md',
  },
];

export function PresetUrlsModal({ isOpen, onClose }: PresetUrlsModalProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // 忽略复制失败
    }
  };

  const categories: { id: Category; label: string }[] = [
    { id: 'all', label: t('preset_urls_category_all') },
    { id: 'domestic', label: t('preset_urls_category_domestic') },
    { id: 'foreign', label: t('preset_urls_category_foreign') },
    { id: 'gateway', label: t('preset_urls_category_gateway') },
    { id: 'local', label: t('preset_urls_category_local') },
  ];

  const filteredProviders = PRESET_PROVIDERS.filter(
    (p) => activeCategory === 'all' || p.category === activeCategory
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* 遮罩点击关闭监听器 */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="relative w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-500" />
            <h3 className="text-base font-semibold text-foreground">
              {t('preset_urls_modal_title')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容主体 */}
        <div className="flex-1 flex overflow-hidden min-h-[350px]">
          {/* 左侧侧边栏 */}
          <div className="w-48 border-r border-border bg-muted/10 p-3 space-y-1 overflow-y-auto">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5 mb-1">
              {t('tab_providers')}
            </div>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCategory(c.id);
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  activeCategory === c.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* 右侧详情列表 */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className="rounded-lg border border-border p-4 hover:bg-accent/20 transition-colors flex flex-col space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{provider.badge}</span>
                    <h4 className="text-sm font-semibold text-foreground">
                      {provider.name}
                    </h4>
                  </div>
                  <a
                    href={provider.docLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <span>{t('btn_doc')}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-xs text-foreground bg-muted p-2 rounded border border-border/80 overflow-x-auto select-all leading-normal whitespace-nowrap">
                    {provider.baseURL}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-8 px-3 shrink-0 transition-all font-medium text-xs',
                      copiedId === provider.id
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                        : ''
                    )}
                    onClick={() => handleCopy(provider.id, provider.baseURL)}
                  >
                    {copiedId === provider.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        <span>{t('btn_copied_url')}</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="h-3.5 w-3.5 mr-1" />
                        <span>{t('btn_copy_url')}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部 */}
        <div className="border-t border-border px-6 py-3.5 bg-muted/20 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm size-sm"
          >
            {t('preset_urls_modal_close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
