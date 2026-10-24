import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface PasswordInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  /** 输入框附加类；显隐按钮的尺寸在各处一致（h-9 w-9） */
  className?: string
}

/**
 * 带「显示/隐藏」切换的密码输入框。
 *
 * 抽成共享组件的依据：服务商 API Key、导出密码、导入密码三处各自手写了一遍
 * 「type 三元 + Eye/EyeOff 图标按钮 + title 双语」，结构逐字相同。
 *
 * 无障碍与交互保持原样：按钮用原生 button + title 提示，图标随状态切换；
 * 显隐只是把 type 在 password / text 之间切换，不改变取值与校验。
 */
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  autoFocus,
  onKeyDown,
  className
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex gap-2">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        className={cn(
          'flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm',
          className
        )}
      />
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => setVisible((v) => !v)}
        title={visible ? t('btn_hide') : t('btn_show')}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  )
}
