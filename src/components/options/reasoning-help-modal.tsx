import { useState } from 'react';
import { X, Code, Clipboard, Check, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ReasoningHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Vendor = 'openai' | 'anthropic' | 'deepseek' | 'siliconflow' | 'openrouter';

interface VendorDoc {
  name: string;
  subTitle: string;
  intro: string;
  jsonSample: string;
  tips: string[];
}

const VENDOR_DOCS: Record<Vendor, VendorDoc> = {
  openai: {
    name: 'OpenAI (GPT-5.5 / o3-mini / o5)',
    subTitle: '关闭或降低推理开销',
    intro: 'OpenAI 支持通过 `reasoning_effort` 参数控制新一代推理模型在翻译前的内部思维深度。在翻译任务中，极力推荐完全关闭推理。',
    jsonSample: `{
  "reasoning_effort": "none"
}`,
    tips: [
      '完全关闭思考 (强烈推荐)：设置 `"reasoning_effort": "none"` 可以彻底关闭模型内部思维链，直接输出最终译文，大幅减少翻译耗时与 Token 消耗。',
      '快捷值选项："none"（极致瞬时响应）、"low"（极小推理，快）、"medium"（平衡）、"high"（长篇复杂学术任务）。'
    ]
  },
  anthropic: {
    name: 'Anthropic (Claude 4.7 Opus)',
    subTitle: '关闭 Extended Thinking 思考',
    intro: 'Anthropic 允许通过 `thinking` 参数配置新一代旗舰模型的思考预算上限。在翻译场景中，建议完全禁用该功能以实现瞬时翻译。',
    jsonSample: `{
  "thinking": {
    "type": "disabled"
  }
}`,
    tips: [
      '彻底禁用思考 (强烈推荐)：在额外请求体中填入 `"type": "disabled"`，可完美规避 Extended Thinking 造成的数十秒翻译高延迟。',
      '自适应开启：设置为 `"type": "adaptive"` 让模型自主决定，但速度可能会受复杂网页内容影响而出现明显变慢。'
    ]
  },
  deepseek: {
    name: 'DeepSeek 官方 API (DeepSeek-V4)',
    subTitle: '合理选择非推理模型以提速',
    intro: '在 DeepSeek 官方 API 中，其深度思考 R1 推理模型（如 `deepseek-reasoning`）的思维链是强制开启且在 API 协议上无法通过 JSON 关闭的。',
    jsonSample: `{}`,
    tips: [
      '官方提速方案：为获得毫秒级的翻译响应速度，请勿使用 `deepseek-reasoning` (R1) 推理模型。强烈建议在模型配置列表中直接选用常规无推理模型（如 `deepseek-chat` (V4)），即可瞬间恢复疾速翻译体验。'
    ]
  },
  siliconflow: {
    name: '硅基流动 (SiliconFlow)',
    subTitle: '一键禁用 DeepSeek-R1 思考',
    intro: '硅基流动针对支持推理输出的新一代模型（如 DeepSeek-R1 系列）提供了直观的 API 开关，能完美帮助翻译扩展跳过长耗时的思考过程。',
    jsonSample: `{
  "enable_thinking": false
}`,
    tips: [
      '一键禁用提速 (强烈推荐)：对于 DeepSeek-R1 模型，在额外请求体中设置 `"enable_thinking": false` 可以一键彻底关闭思维链输出，翻译速度立即提升 10 倍以上！',
      'Token 省流：禁用思维链可为您节省高达 80% 的输入/输出 Token 成本。'
    ]
  },
  openrouter: {
    name: 'OpenRouter',
    subTitle: '统一过滤思维链内容',
    intro: 'OpenRouter 针对所有推理类模型（如 DeepSeek R1/V4 系列）提供了统一的格式与推理结果过滤控制字段，能让划词翻译瞬间输出。',
    jsonSample: `{
  "include_reasoning": false
}`,
    tips: [
      '隐藏思维链提速 (强烈推荐)：设置 `"include_reasoning": false` 强制 OpenRouter 网关在传输时过滤并剔除思维链内容，规避数据流积压，让翻译结果瞬间输出。',
      '兼容模式：OpenRouter 对 OpenAI-compatible 模型同样支持 `"reasoning_effort": "none"` 作为底层控制桥接。'
    ]
  }
};

export function ReasoningHelpModal({ isOpen, onClose }: ReasoningHelpModalProps) {
  const [activeVendor, setActiveVendor] = useState<Vendor>('openai');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentDoc = VENDOR_DOCS[activeVendor];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentDoc.jsonSample);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy failure
    }
  };

  const vendors: { id: Vendor; label: string }[] = [
    { id: 'openai', label: 'OpenAI (o1/o3)' },
    { id: 'anthropic', label: 'Anthropic Claude' },
    { id: 'deepseek', label: 'DeepSeek 官方' },
    { id: 'siliconflow', label: '硅基流动' },
    { id: 'openrouter', label: 'OpenRouter' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click listener */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="relative w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-indigo-500" />
            <h3 className="text-base font-semibold text-foreground">主流服务商推理与深度思考（Thinking）参数指南</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden min-h-[350px]">
          {/* Sidebar */}
          <div className="w-52 border-r border-border bg-muted/10 p-3 space-y-1 overflow-y-auto">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5 mb-1">
              服务商列表
            </div>
            {vendors.map(v => (
              <button
                key={v.id}
                onClick={() => {
                  setActiveVendor(v.id);
                  setCopied(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  activeVendor === v.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Details Pane */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col space-y-4">
            {/* Speed warning banner */}
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3.5 flex items-start gap-2.5">
              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  ⚡ 极致翻译速度优化建议 (核心推荐)
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400/90 leading-normal">
                  本项目作为浏览器翻译扩展，追求极致的瞬时响应（Latency）。大模型的深度思考或思维链过程通常会额外耗费大量时间（十秒至数分钟不等）。<strong>如果您在使用中觉得页面翻译响应过慢，强烈建议在下方额外请求体中填入对应的 JSON 参数完全关闭思考功能</strong>，从而恢复毫秒级的疾速翻译体验。
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-foreground">{currentDoc.name}</h4>
                <span className="text-xs font-normal text-muted-foreground">| {currentDoc.subTitle}</span>
              </div>
              <p className="text-xs text-muted-foreground/90 leading-relaxed mt-2 bg-muted/30 p-3 rounded-md border border-border/50">
                {currentDoc.intro}
              </p>
            </div>

            {/* JSON Code Example */}
            {currentDoc.jsonSample !== '{}' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Code className="h-3.5 w-3.5" />
                    建议填入的 JSON 字段：
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">已复制!</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="h-3.5 w-3.5" />
                        <span>复制配置</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="font-mono text-xs text-foreground bg-muted p-4 rounded border border-border overflow-x-auto select-all leading-relaxed shadow-inner">
                  {currentDoc.jsonSample}
                </pre>
              </div>
            )}

            {/* Dynamic Tips List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">参数详解及翻译场景建议：</span>
              <ul className="space-y-2">
                {currentDoc.tips.map((tip, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3.5 bg-muted/20 flex justify-end">
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm size-sm">
            关闭指南
          </Button>
        </div>
      </div>
    </div>
  );
}
