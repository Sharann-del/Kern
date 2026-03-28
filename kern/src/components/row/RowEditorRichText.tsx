import Link from '@tiptap/extension-link';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link as LinkIcon, List } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { LinkUrlDialog } from '@/components/ui/LinkUrlDialog';
import { cn } from '@/lib/utils';

export type RowEditorRichTextProps = {
  value: string;
  onDebouncedChange: (html: string) => void;
  /** Called on blur after cancelling pending debounce (immediate persist). */
  onFlush?: (html: string) => void;
};

export function RowEditorRichText({ value, onDebouncedChange, onFlush }: RowEditorRichTextProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogDefault, setLinkDialogDefault] = useState('https://');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedule = useCallback(
    (html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onDebouncedChange(html), 500);
    },
    [onDebouncedChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        horizontalRule: false,
        codeBlock: false,
        strike: false,
        code: false,
        orderedList: false,
      }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'min-h-[80px] px-3 py-2 text-sm text-kern-text outline-none prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_a]:text-kern-accent [&_a]:underline',
      },
    },
    onUpdate: ({ editor: ed }) => {
      schedule(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const cur = editor.getHTML();
    const next = value || '<p></p>';
    if (next !== cur && (value !== undefined || cur === '<p></p>')) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  if (!editor) {
    return <div className="min-h-[88px] rounded-kern-md border border-kern-border bg-kern-bg" />;
  }

  const openLinkDialog = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    setLinkDialogDefault(prev ?? 'https://');
    setLinkDialogOpen(true);
  };

  return (
    <div className="rounded-kern-md border border-kern-border bg-kern-bg">
      <div className="flex gap-0.5 border-b border-kern-border px-2 py-1">
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 w-7 p-0"
          aria-label="Bold"
          onClick={() => {
            editor.chain().focus().toggleBold().run();
            schedule(editor.getHTML());
          }}
        >
          <Bold size={14} />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 w-7 p-0"
          aria-label="Italic"
          onClick={() => {
            editor.chain().focus().toggleItalic().run();
            schedule(editor.getHTML());
          }}
        >
          <Italic size={14} />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 w-7 p-0"
          aria-label="Bullet list"
          onClick={() => {
            editor.chain().focus().toggleBulletList().run();
            schedule(editor.getHTML());
          }}
        >
          <List size={14} />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('link') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 w-7 p-0"
          aria-label="Link"
          onClick={openLinkDialog}
        >
          <LinkIcon size={14} />
        </Button>
      </div>
      <div
        className="rounded-b-kern-md"
        onBlur={() => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          const html = editor.getHTML();
          onFlush?.(html);
        }}
      >
        <EditorContent editor={editor} className={cn('overflow-hidden')} />
      </div>

      <LinkUrlDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        defaultValue={linkDialogDefault}
        showRemove={editor.isActive('link')}
        onRemove={() => {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
          schedule(editor.getHTML());
        }}
        onConfirm={(url) => {
          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }
          schedule(editor.getHTML());
        }}
      />
    </div>
  );
}
