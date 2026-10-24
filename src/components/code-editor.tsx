import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { materialLight, materialDark } from '@uiw/codemirror-theme-material';
import { useDarkMode } from '@/hooks/use-dark-mode';
import type { ColorScheme } from '@/types';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  placeholder?: string;
  /** 界面配色偏好；缺省 system（跟随系统）。由设置页从 settings.colorScheme 传入 */
  colorScheme?: ColorScheme;
}

export function CodeEditor({ value, onChange, height = '200px', placeholder, colorScheme = 'system' }: CodeEditorProps) {
  const isDark = useDarkMode(colorScheme);

  return (
    <div className="rounded-md border border-input overflow-hidden">
      <CodeMirror
        value={value}
        height={height}
        extensions={[json()]}
        theme={isDark ? materialDark : materialLight}
        onChange={onChange}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
        }}
      />
    </div>
  );
}
