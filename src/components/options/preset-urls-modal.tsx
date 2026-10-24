import { useState } from 'react';
import { Globe, Clipboard, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SettingsModal } from '@/components/ui/settings-modal';
import { t } from '@/lib/i18n';
import { useCopyFeedback } from '@/hooks/use-copy-feedback';

interface PresetUrlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Category = 'all' | 'open' | 'closed' | 'gateway';

type QualifierKey =
  | 'official'
  | 'local'
  | 'compatible'
  | 'aliyun'
  | 'zhipu'
  | 'lingyi'
  | 'moonshot'
  | 'tencent'
  | 'baidu'
  | 'bytedance'
  | 'siliconflow';

interface PresetProvider {
  id: string;
  /** 品牌名保持字面量：中英文界面使用同一品牌名更合理 */
  name: string;
  /** 品牌名之外的修饰词，走双语映射 */
  qualifier?: QualifierKey;
  category: Category;
  badge: string;
  baseURL: string;
  docLink: string;
}

/**
 * 修饰词 → locale 键。品牌名保持字面量（中英文都用同一品牌名），
 * 仅「官方 / 本地部署 / 兼容」这类修饰词随界面语言切换。
 */
const QUALIFIER_LABEL_KEYS: Record<QualifierKey, string> = {
  official: 'preset_qualifier_official',
  local: 'preset_qualifier_local',
  compatible: 'preset_qualifier_compatible',
  aliyun: 'preset_qualifier_aliyun',
  zhipu: 'preset_qualifier_zhipu',
  lingyi: 'preset_qualifier_lingyi',
  moonshot: 'preset_qualifier_moonshot',
  tencent: 'preset_qualifier_tencent',
  baidu: 'preset_qualifier_baidu',
  bytedance: 'preset_qualifier_bytedance',
  siliconflow: 'preset_qualifier_siliconflow',
};

const PRESET_PROVIDERS: PresetProvider[] = [
  // 开源服务商
  {
    id: 'deepseek',
    name: 'DeepSeek',
    qualifier: 'official',
    category: 'open',
    badge: '🇨🇳',
    baseURL: 'https://api.deepseek.com',
    docLink: 'https://api-docs.deepseek.com',
  },
  {
    id: 'dashscope',
    name: 'DashScope',
    qualifier: 'aliyun',
    category: 'open',
    badge: '🇨🇳',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    docLink: 'https://help.aliyun.com/zh/dashscope/developer-reference/compatibility-of-openai-with-dashscope',
  },
  {
    id: 'glm',
    name: 'GLM',
    qualifier: 'zhipu',
    category: 'open',
    badge: '🇨🇳',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    docLink: 'https://open.bigmodel.cn/dev/api',
  },
  {
    id: 'yi',
    name: '01.AI',
    qualifier: 'lingyi',
    category: 'open',
    badge: '🇨🇳',
    baseURL: 'https://api.lingyiwanwu.com/v1',
    docLink: 'https://platform.lingyiwanwu.com/docs',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    qualifier: 'local',
    category: 'open',
    badge: '💻',
    baseURL: 'http://localhost:11434/v1',
    docLink: 'https://github.com/ollama/ollama/blob/main/docs/openai.md',
  },
  // 闭源服务商
  {
    id: 'openai',
    name: 'OpenAI',
    qualifier: 'official',
    category: 'closed',
    badge: '🇺🇸',
    baseURL: 'https://api.openai.com/v1',
    docLink: 'https://platform.openai.com/docs/api-reference',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    category: 'closed',
    badge: '🇺🇸',
    baseURL: 'https://api.anthropic.com/v1',
    docLink: 'https://docs.anthropic.com/en/api/getting-started',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    qualifier: 'compatible',
    category: 'closed',
    badge: '🇺🇸',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    docLink: 'https://ai.google.dev/gemini-api/docs/openai',
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    qualifier: 'moonshot',
    category: 'closed',
    badge: '🇨🇳',
    baseURL: 'https://api.moonshot.cn/v1',
    docLink: 'https://platform.moonshot.cn/docs/guide',
  },
  {
    id: 'hunyuan',
    name: 'Hunyuan',
    qualifier: 'tencent',
    category: 'closed',
    badge: '🇨🇳',
    baseURL: 'https://api.hunyuan.cloud.tencent.com/v1',
    docLink: 'https://cloud.tencent.com/document/product/1729/111007',
  },
  {
    id: 'qianfan',
    name: 'Qianfan',
    qualifier: 'baidu',
    category: 'closed',
    badge: '🇨🇳',
    baseURL: 'https://qianfan.baidubce.com/v2',
    docLink: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Flz02la4s',
  },
  {
    id: 'ark',
    name: 'Volcengine Ark',
    qualifier: 'bytedance',
    category: 'closed',
    badge: '🇨🇳',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    docLink: 'https://www.volcengine.com/docs/82379/1298454',
  },
  // 聚合/网关
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    qualifier: 'siliconflow',
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
  {
    id: 'groq',
    name: 'Groq',
    qualifier: 'official',
    category: 'gateway',
    badge: '🇺🇸',
    baseURL: 'https://api.groq.com/openai/v1',
    docLink: 'https://console.groq.com/docs/quickstart',
  },
];

export function PresetUrlsModal({ isOpen, onClose }: PresetUrlsModalProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const { copied: copiedId, copy } = useCopyFeedback<string | false>();
  const titleId = 'preset-urls-modal-title';

  const handleCopy = (id: string, url: string) => {
    void copy(url, id);
  };

  const categories: { id: Category; label: string }[] = [
    { id: 'all', label: t('preset_urls_category_all') },
    { id: 'open', label: t('preset_urls_category_open') },
    { id: 'closed', label: t('preset_urls_category_closed') },
    { id: 'gateway', label: t('preset_urls_category_gateway') },
  ];

  const filteredProviders = PRESET_PROVIDERS.filter(
    (p) => activeCategory === 'all' || p.category === activeCategory
  );

  // 品牌名保持字面量，仅修饰词按界面语言切换
  const renderName = (provider: PresetProvider) => {
    if (!provider.qualifier) return provider.name;
    const label = t(QUALIFIER_LABEL_KEYS[provider.qualifier]);
    return `${provider.name} (${label})`;
  };

  return (
    <SettingsModal
      isOpen={isOpen}
      onClose={onClose}
      icon={<Globe className="h-5 w-5 text-indigo-500" />}
      title={t('preset_urls_modal_title')}
      titleId={titleId}
      maxHeightClass="max-h-[80vh]"
    >
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
            aria-pressed={activeCategory === c.id}
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
                  {renderName(provider)}
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
    </SettingsModal>
  );
}
