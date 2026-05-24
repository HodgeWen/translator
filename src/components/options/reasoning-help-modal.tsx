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
    subTitle: '控制推理开销 (Reasoning Effort)',
    intro: 'OpenAI 支持通过 `reasoning_effort` 参数控制新一代推理模型（如 GPT-5.5、o3-mini、o5）在生成最终答案前的内部思维链深度，以此平衡速度、成本和生成质量。',
    jsonSample: `{
  "reasoning_effort": "low"
}`,
    tips: [
      '可选值包括："none"（完全关闭推理过程，仅支持部分模型）、"low"（低推理预算，响应速度快）、"medium"（平衡的默认值）、"high"（高推理预算，适合极其复杂的逻辑或代码任务）。',
      '在翻译任务中，为了低延迟和低成本，推荐将其设为 "none" 或 "low"；如果需要极高精确度的长篇学术翻译，可考虑 "medium" 或 "high"。'
    ]
  },
  anthropic: {
    name: 'Anthropic (Claude 4.7 Opus)',
    subTitle: '自适应与预算思考 (Extended Thinking)',
    intro: 'Anthropic 在新一代模型（如 Claude Opus 4.7 / Claude Sonnet 4.6）中引入了 `thinking` 额外请求体参数，支持开启自适应思考或强制控制思考的 Token 预算上限。',
    jsonSample: `{
  "thinking": {
    "type": "adaptive"
  }
}`,
    tips: [
      '动态自适应：推荐设置 `"type": "adaptive"`，Claude 4.7 等模型将根据输入任务复杂度自动判断是否思考以及思考深度。',
      '完全关闭：若希望关闭深度思考，可设为 `"type": "disabled"` 或不传递 `thinking` 字段。',
      '指定上限 (旧版兼容)：可设置为 `"type": "enabled", "budget_tokens": 1024`，强制给思考过程分配指定的 Token 预算。'
    ]
  },
  deepseek: {
    name: 'DeepSeek 官方 API (DeepSeek-V4)',
    subTitle: '原生深度思考 (Reasoning Content)',
    intro: '针对 DeepSeek 官方 API（包括最新的 DeepSeek-V4 及新版推理模型），其核心推理模型（如 DeepSeek-R1-V4）的深度思考是原生强制开启的，当前官方 HTTP 协议中并没有提供独立的控制开关参数。',
    jsonSample: `{}`,
    tips: [
      '官方提示：DeepSeek 官方当前的 API 机制下，`deepseek-chat` (V4) 模型不具备推理过程，而 `deepseek-reasoning` (R1-V4) 强制输出推理。如需关闭深度思考以追求极致翻译速度，请在模型设置中将所选模型改为常规非推理模型（如 `deepseek-chat`）。',
      '注意：官方 R1/V4 推理模型的温度建议保持在 0.5 ~ 0.7 之间，推荐 0.6，不可设置为 0 或 1.0。'
    ]
  },
  siliconflow: {
    name: '硅基流动 (SiliconFlow)',
    subTitle: '思维链开关 (enable_thinking)',
    intro: '硅基流动针对支持推理输出的新一代模型（例如 DeepSeek-R1-V4 系列模型）进行了高度定制，提供了直观的开启/关闭以及 Token 预算参数。',
    jsonSample: `{
  "enable_thinking": false
}`,
    tips: [
      '一键禁用：如果需要极致翻译响应速度并规避思维链造成的无用 Token 成本，可以设置 `"enable_thinking": false` 强制关闭推理过程。',
      '配额限制：若需要保留推理但限制 Token 消耗，可设置 `"enable_thinking": true, "thinking_budget": 1024`（最小限制为 1024）。'
    ]
  },
  openrouter: {
    name: 'OpenRouter',
    subTitle: '统一思维链控制 (include_reasoning)',
    intro: 'OpenRouter 作为多模型网关聚合商，针对所有推理类模型（如 DeepSeek R1）提供了统一的格式与推理结果过滤控制字段。',
    jsonSample: `{
  "include_reasoning": false
}`,
    tips: [
      '隐藏思维链：将 `"include_reasoning": false` 填入额外请求体中，OpenRouter 接口将不再返回推理思维链内容，显著提高数据传输响应效率。',
      '兼容控制：OpenRouter 对 OpenAI-compatible 模型同样支持 `"reasoning_effort": "low"` 或 `"thinking": { "type": "disabled" }` 作为底层传递桥接。'
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
