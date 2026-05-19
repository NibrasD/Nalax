import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bold, Italic, Heading1, Link as LinkIcon, Code, List, Quote, Eye, Edit3 } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const TOOLBAR_ACTIONS = [
  { icon: Heading1, label: 'Heading', prefix: '## ', suffix: '' },
  { icon: Bold, label: 'Bold', prefix: '**', suffix: '**' },
  { icon: Italic, label: 'Italic', prefix: '_', suffix: '_' },
  { icon: Code, label: 'Code', prefix: '`', suffix: '`' },
  { icon: LinkIcon, label: 'Link', prefix: '[', suffix: '](url)' },
  { icon: List, label: 'List', prefix: '- ', suffix: '' },
  { icon: Quote, label: 'Quote', prefix: '> ', suffix: '' },
];

export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit');

  const insertFormat = (prefix: string, suffix: string) => {
    const textarea = document.getElementById('md-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const before = value.substring(0, start);
    const after = value.substring(end);

    const newValue = `${before}${prefix}${selected || 'text'}${suffix}${after}`;
    onChange(newValue);

    // Restore cursor position
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos + (selected.length || 4));
    });
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  return (
    <div className="glass-panel overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <div className="flex items-center gap-0.5">
          {TOOLBAR_ACTIONS.map(({ icon: Icon, label, prefix, suffix }) => (
            <button
              key={label}
              onClick={() => insertFormat(prefix, suffix)}
              title={label}
              className="p-2 text-[var(--color-text-dim)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer rounded-sm"
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-[var(--color-bg-base)] rounded-sm p-0.5">
          <button
            onClick={() => setMode('edit')}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider cursor-pointer rounded-sm transition-colors flex items-center gap-1.5 ${
              mode === 'edit' ? 'bg-[var(--color-surface)] text-white' : 'text-[var(--color-text-dim)] hover:text-white'
            }`}
          >
            <Edit3 className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => setMode('split')}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider cursor-pointer rounded-sm transition-colors ${
              mode === 'split' ? 'bg-[var(--color-surface)] text-white' : 'text-[var(--color-text-dim)] hover:text-white'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider cursor-pointer rounded-sm transition-colors flex items-center gap-1.5 ${
              mode === 'preview' ? 'bg-[var(--color-surface)] text-white' : 'text-[var(--color-text-dim)] hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3" /> Preview
          </button>
        </div>
      </div>

      {/* Editor/Preview area */}
      <div className={`flex-1 ${mode === 'split' ? 'grid grid-cols-2' : ''}`}>
        {/* Editor */}
        {(mode === 'edit' || mode === 'split') && (
          <div className={`relative ${mode === 'split' ? 'border-r border-[var(--color-border)]' : ''}`}>
            <textarea
              id="md-editor"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || "Write your story using Markdown..."}
              className="w-full h-[450px] bg-transparent text-[var(--color-text-main)] outline-none resize-none font-mono text-[13px] leading-[1.8] p-5 placeholder-[var(--color-text-muted)]"
            />
          </div>
        )}

        {/* Preview */}
        {(mode === 'preview' || mode === 'split') && (
          <div className="h-[450px] overflow-y-auto p-5">
            {value ? (
              <div className="prose prose-invert max-w-none prose-p:text-[15px] prose-p:leading-[1.7] prose-p:text-[var(--color-text-secondary)] prose-headings:font-serif prose-headings:font-normal prose-headings:tracking-tight prose-a:text-primary prose-code:text-primary prose-code:text-[13px] prose-pre:bg-[var(--color-bg-base)] prose-pre:border prose-pre:border-[var(--color-border)] prose-blockquote:border-l-primary prose-blockquote:text-[var(--color-text-dim)]">
                <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-[13px] font-mono">
                Preview will appear here...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--color-text-dim)] uppercase tracking-wider">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
          <span>~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
        </div>
        <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider">Markdown</span>
      </div>
    </div>
  );
}
