import { useState } from 'react';
import { X, Code, Clipboard, Check, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ReasoningHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Vendor =
  | 'openai' | 'anthropic' | 'deepseek' | 'dashscope' | 'glm' | 'yi' | 'ollama'
  | 'gemini' | 'moonshot' | 'hunyuan' | 'qianfan' | 'ark'
  | 'siliconflow' | 'openrouter' | 'together' | 'groq'
  | 'opencode';

interface VendorDoc {
  name: string;
  subTitle: string;
  intro: string;
  jsonSample: string;
  tips: string[];
}

const VENDORS: { id: Vendor; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'dashscope', label: '阿里通义千问' },
  { id: 'glm', label: '智谱 AI' },
  { id: 'yi', label: '零一万物' },
  { id: 'ollama', label: 'Ollama' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'moonshot', label: '月之暗面' },
  { id: 'hunyuan', label: '腾讯混元' },
  { id: 'qianfan', label: '百度千帆' },
  { id: 'ark', label: '火山方舟' },
  { id: 'siliconflow', label: '硅基流动' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'together', label: 'Together AI' },
  { id: 'groq', label: 'Groq' },
  { id: 'opencode', label: 'OpenCode' },
];

const VENDOR_DOCS: Record<Vendor, VendorDoc> = {
  // 开源服务商
  deepseek: {
    name: 'DeepSeek 官方',
    subTitle: 'thinking 参数',
    intro: '控制思维链开关。翻译场景建议关闭以获得极速响应，也可直接用非推理模型 `deepseek-chat`。',
    jsonSample: `{
  "thinking": {
    "type": "disabled"
  }
}`,
    tips: [
      '`"type": "disabled"` 关闭思维链（推荐）；启用时可用 `"reasoning_effort": "high"` 控制深度',
      '接口：`https://api.deepseek.com`'
    ]
  },
  dashscope: {
    name: '阿里通义千问 (DashScope)',
    subTitle: 'enable_thinking 参数',
    intro: '在 DashScope 上使用 DeepSeek 等推理模型时，通过 `enable_thinking` 控制思维链。',
    jsonSample: `{
  "enable_thinking": false
}`,
    tips: [
      '设为 `false` 关闭推理模型的思维链',
      '接口：`https://dashscope.aliyuncs.com/compatible-mode/v1`'
    ]
  },
  glm: {
    name: '智谱 AI (GLM)',
    subTitle: 'thinking 参数',
    intro: 'GLM 推理模型支持通过 `thinking` 参数控制思维链深度。',
    jsonSample: `{
  "thinking": {
    "type": "disabled"
  }
}`,
    tips: [
      '`"type": "disabled"` 关闭思维链',
      '接口：`https://open.bigmodel.cn/api/paas/v4`'
    ]
  },
  yi: {
    name: '零一万物 (01.AI)',
    subTitle: 'reasoning_effort 参数',
    intro: '提供 OpenAI 兼容接口，推理模型支持 `reasoning_effort` 参数。',
    jsonSample: `{
  "reasoning_effort": "none"
}`,
    tips: [
      '`"none"` 关闭推理',
      '接口：`https://api.lingyiwanwu.com/v1`'
    ]
  },
  ollama: {
    name: 'Ollama (本地部署)',
    subTitle: 'reasoning_effort 参数',
    intro: '本地部署的 Ollama 支持 OpenAI 兼容参数，具体行为取决于加载的模型。',
    jsonSample: `{
  "reasoning_effort": "none"
}`,
    tips: [
      '`"none"` 关闭推理（需加载的模型支持该参数）',
      '接口：`http://localhost:11434/v1`'
    ]
  },

  // 闭源服务商
  openai: {
    name: 'OpenAI 官方',
    subTitle: 'reasoning_effort 参数',
    intro: '控制推理模型思维链深度。翻译场景建议设为 `"none"` 彻底关闭推理。',
    jsonSample: `{
  "reasoning_effort": "none"
}`,
    tips: [
      '可选值：`"none"`（关闭推理，推荐）/ `"low"` / `"medium"` / `"high"`',
      '接口：`https://api.openai.com/v1`'
    ]
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    subTitle: 'thinking 参数',
    intro: '控制扩展思考预算。翻译场景建议设为 `"disabled"` 完全禁用。',
    jsonSample: `{
  "thinking": {
    "type": "disabled"
  }
}`,
    tips: [
      '`"type": "disabled"` 彻底关闭（推荐）；`"type": "adaptive"` 自动思考，延迟明显增加',
      '接口：`https://api.anthropic.com/v1`'
    ]
  },
  gemini: {
    name: 'Google Gemini',
    subTitle: 'reasoning_effort 参数',
    intro: '通过 OpenAI 兼容接口提供服务，推理模型可使用标准参数控制思考深度。',
    jsonSample: `{
  "reasoning_effort": "none"
}`,
    tips: [
      '`"none"` 关闭推理；部分 Gemini 模型内置思考能力，可能无法完全关闭',
      '接口：`https://generativelanguage.googleapis.com/v1beta/openai`'
    ]
  },
  moonshot: {
    name: '月之暗面 (Moonshot)',
    subTitle: 'thinking 参数',
    intro: 'Kimi 推理模型支持 `thinking` 参数控制思维链。',
    jsonSample: `{
  "thinking": {
    "type": "disabled"
  }
}`,
    tips: [
      '`"type": "disabled"` 关闭思维链',
      '接口：`https://api.moonshot.cn/v1`'
    ]
  },
  hunyuan: {
    name: '腾讯混元 (Hunyuan)',
    subTitle: 'enable_thinking 参数',
    intro: '混元推理模型支持通过 `enable_thinking` 控制深度思考。',
    jsonSample: `{
  "enable_thinking": false
}`,
    tips: [
      '设为 `false` 关闭深度思考',
      '接口：`https://api.hunyuan.cloud.tencent.com/v1`'
    ]
  },
  qianfan: {
    name: '百度千帆 (Qianfan)',
    subTitle: 'thinking 参数',
    intro: '千帆平台推理模型支持通过参数控制思维链。',
    jsonSample: `{
  "thinking": {
    "type": "disabled"
  }
}`,
    tips: [
      '`"type": "disabled"` 关闭思维链',
      '接口：`https://qianfan.baidubce.com/v2`'
    ]
  },
  ark: {
    name: '字节火山方舟 (Ark)',
    subTitle: 'enable_thinking 参数',
    intro: '在火山方舟上使用 DeepSeek 等推理模型时，通过 `enable_thinking` 控制思维链。',
    jsonSample: `{
  "enable_thinking": false
}`,
    tips: [
      '设为 `false` 关闭思维链',
      '接口：`https://ark.cn-beijing.volces.com/api/v3`'
    ]
  },

  // 聚合 / 网关
  siliconflow: {
    name: '硅基流动 (SiliconFlow)',
    subTitle: 'enable_thinking 参数',
    intro: '控制 DeepSeek-V4 系列思维链。设为 `false` 即可关闭，响应速度显著提升。',
    jsonSample: `{
  "enable_thinking": false
}`,
    tips: [
      '设为 `false` 关闭思维链，可大幅降低 Token 消耗',
      '接口：`https://api.siliconflow.cn/v1`'
    ]
  },
  openrouter: {
    name: 'OpenRouter',
    subTitle: 'include_reasoning 参数',
    intro: '控制是否返回推理内容。设为 `false` 过滤思维链，直接输出翻译结果。',
    jsonSample: `{
  "include_reasoning": false
}`,
    tips: [
      '设为 `false` 过滤思维链，翻译结果即时输出',
      '接口：`https://openrouter.ai/api/v1`'
    ]
  },
  together: {
    name: 'Together AI',
    subTitle: 'include_reasoning 参数',
    intro: '通过 `include_reasoning` 控制是否返回推理内容。',
    jsonSample: `{
  "include_reasoning": false
}`,
    tips: [
      '设为 `false` 过滤思维链内容',
      '接口：`https://api.together.xyz/v1`'
    ]
  },
  groq: {
    name: 'Groq',
    subTitle: 'reasoning_effort 参数',
    intro: '提供 OpenAI 兼容接口，推理模型支持 `reasoning_effort` 参数。',
    jsonSample: `{
  "reasoning_effort": "none"
}`,
    tips: [
      '`"none"` 关闭推理',
      '接口：`https://api.groq.com/openai/v1`'
    ]
  },

  // 其他
  opencode: {
    name: 'OpenCode',
    subTitle: 'thinking 参数',
    intro: '控制 DeepSeek-V4 系列思维链。设为 `"disabled"` 完全关闭。',
    jsonSample: `{
  "thinking": {
    "type": "disabled"
  }
}`,
    tips: [
      '`"type": "disabled"` 关闭思维链，避免翻译高延迟',
      '接口：`https://api.opencode.cn/v1`'
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
          <div className="w-44 border-r border-border bg-muted/10 p-2 space-y-0.5 overflow-y-auto">
            {VENDORS.map(v => (
              <button
                key={v.id}
                onClick={() => {
                  setActiveVendor(v.id);
                  setCopied(false);
                }}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer truncate',
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
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                大模型深度思考会额外耗费数秒至数分钟，翻译场景建议关闭思考功能以获得毫秒级响应。
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-foreground">{currentDoc.name}</h4>
                <span className="text-xs font-normal text-muted-foreground">| {currentDoc.subTitle}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {currentDoc.intro}
              </p>
            </div>

            {/* JSON Code Example */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Code className="h-3.5 w-3.5" />
                  JSON 配置：
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

            {/* Dynamic Tips List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">参数说明：</span>
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
