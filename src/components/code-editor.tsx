import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { materialLight, materialDark } from '@uiw/codemirror-theme-material';
import { useDarkMode } from '@/hooks/use-dark-mode';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  placeholder?: string;
}

export function CodeEditor({ value, onChange, height = '200px', placeholder }: CodeEditorProps) {
  const isDark = useDarkMode();

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
