'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { useEffect, useCallback, useState } from 'react';
import { Button, Space, Tooltip, Divider, Input, Modal } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  CodeOutlined,
  LinkOutlined,
  PictureOutlined,
  TableOutlined,
  UndoOutlined,
  RedoOutlined,
  HighlightOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  MinusOutlined,
} from '@ant-design/icons';

// Convert HTML to Markdown (simplified)
function htmlToMarkdown(html: string): string {
  if (!html) return '';
  let md = html;
  // Headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  // Bold, italic, underline, strikethrough
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>');
  md = md.replace(/<s>(.*?)<\/s>/gi, '~~$1~~');
  md = md.replace(/<del>(.*?)<\/del>/gi, '~~$1~~');
  md = md.replace(/<mark>(.*?)<\/mark>/gi, '==$1==');
  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
  // Code blocks
  md = md.replace(/<pre><code[^>]*class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```$1\n$2\n```\n\n');
  md = md.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
  // Inline code
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  // Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n') + '\n';
  });
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    let i = 0;
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => `${++i}. ` + '$1\n') + '\n';
  });
  // Blockquote
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    return inner.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n';
  });
  // HR
  md = md.replace(/<hr\s*\/?>/gi, '---\n\n');
  // Paragraphs & line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, '');
  // Decode entities
  md = md.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // Clean up multiple newlines
  md = md.replace(/\n{3,}/g, '\n\n').trim();
  return md;
}

// Convert Markdown to HTML (for Tiptap to parse)
function markdownToHtml(md: string): string {
  if (!md) return '';
  let html = md;
  // Code blocks first (before other transformations)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // HR
  html = html.replace(/^---$/gm, '<hr>');
  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  html = html.replace(/==(.+?)==/g, '<mark>$1</mark>');
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // Paragraphs (lines that aren't already wrapped)
  html = html.replace(/^(?!<[houplib]|<hr|<pre|<blockquote)(.+)$/gm, '<p>$1</p>');
  return html;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolbarButton({ icon, title, active, disabled, onClick }: ToolbarButtonProps) {
  return (
    <Tooltip title={title}>
      <Button
        type={active ? 'primary' : 'text'}
        size="small"
        icon={icon}
        disabled={disabled}
        onClick={onClick}
        style={{ minWidth: 32 }}
      />
    </Tooltip>
  );
}

function ToolbarDivider() {
  return <Divider type="vertical" style={{ margin: '0 2px', height: 24 }} />;
}

interface MenuBarProps {
  editor: ReturnType<typeof useEditor> | null;
}

function MenuBar({ editor }: MenuBarProps) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  if (!editor) return null;

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setLinkUrl('');
    setLinkModalOpen(false);
  };

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setImageUrl('');
    setImageModalOpen(false);
  };

  return (
    <>
      <div className="editor-toolbar">
        <Space size={2} wrap>
          <ToolbarButton
            icon={<UndoOutlined />}
            title="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          />
          <ToolbarButton
            icon={<RedoOutlined />}
            title="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          />

          <ToolbarDivider />

          <select
            className="editor-heading-select"
            value={
              editor.isActive('heading', { level: 1 }) ? '1' :
              editor.isActive('heading', { level: 2 }) ? '2' :
              editor.isActive('heading', { level: 3 }) ? '3' :
              editor.isActive('heading', { level: 4 }) ? '4' : '0'
            }
            onChange={(e) => {
              const level = parseInt(e.target.value);
              if (level === 0) {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 }).run();
              }
            }}
          >
            <option value="0">Paragraph</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="4">Heading 4</option>
          </select>

          <ToolbarDivider />

          <ToolbarButton
            icon={<BoldOutlined />}
            title="Bold (Ctrl+B)"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            icon={<ItalicOutlined />}
            title="Italic (Ctrl+I)"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            icon={<UnderlineOutlined />}
            title="Underline (Ctrl+U)"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <ToolbarButton
            icon={<StrikethroughOutlined />}
            title="Strikethrough"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
          <ToolbarButton
            icon={<HighlightOutlined />}
            title="Highlight"
            active={editor.isActive('highlight')}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          />
          <ToolbarButton
            icon={<CodeOutlined />}
            title="Inline Code"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          />

          <ToolbarDivider />

          <ToolbarButton
            icon={<AlignLeftOutlined />}
            title="Align Left"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          />
          <ToolbarButton
            icon={<AlignCenterOutlined />}
            title="Align Center"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          />
          <ToolbarButton
            icon={<AlignRightOutlined />}
            title="Align Right"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          />

          <ToolbarDivider />

          <ToolbarButton
            icon={<UnorderedListOutlined />}
            title="Bullet List"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            icon={<OrderedListOutlined />}
            title="Ordered List"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />

          <ToolbarDivider />

          <ToolbarButton
            icon={<LinkOutlined />}
            title="Add Link"
            active={editor.isActive('link')}
            onClick={() => {
              const prev = editor.getAttributes('link').href || '';
              setLinkUrl(prev);
              setLinkModalOpen(true);
            }}
          />
          <ToolbarButton
            icon={<PictureOutlined />}
            title="Add Image"
            onClick={() => setImageModalOpen(true)}
          />
          <ToolbarButton
            icon={<TableOutlined />}
            title="Insert Table"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          />
          <ToolbarButton
            icon={<MinusOutlined />}
            title="Horizontal Rule"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          />
          <ToolbarButton
            icon={<>{`</>`}</>}
            title="Code Block"
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          />
        </Space>
      </div>

      <Modal
        title="Insert Link"
        open={linkModalOpen}
        onOk={addLink}
        onCancel={() => { setLinkModalOpen(false); setLinkUrl(''); }}
        width={400}
      >
        <Input
          placeholder="https://example.com"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          onPressEnter={addLink}
        />
      </Modal>

      <Modal
        title="Insert Image"
        open={imageModalOpen}
        onOk={addImage}
        onCancel={() => { setImageModalOpen(false); setImageUrl(''); }}
        width={400}
      >
        <Input
          placeholder="https://example.com/image.png"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          onPressEnter={addImage}
        />
      </Modal>
    </>
  );
}

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function MarkdownEditor({ value, onChange, placeholder, minHeight = 400 }: MarkdownEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || 'Start writing...' }),
      Link.configure({ openOnClick: false }),
      Image,
      Underline,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value ? markdownToHtml(value) : '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const md = htmlToMarkdown(html);
      onChange?.(md);
    },
    editorProps: {
      attributes: {
        style: `min-height: ${minHeight}px; outline: none; padding: 16px;`,
      },
    },
  });

  // Sync external value changes (e.g. form reset, initial load)
  const hasSetInitial = useCallback(() => {
    if (editor && value !== undefined) {
      const currentMd = htmlToMarkdown(editor.getHTML());
      if (currentMd !== value) {
        editor.commands.setContent(markdownToHtml(value));
      }
    }
  }, [editor, value]);

  useEffect(() => {
    hasSetInitial();
  }, [hasSetInitial]);

  return (
    <div className="markdown-editor-wrapper">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="editor-content" />

      <style jsx global>{`
        .markdown-editor-wrapper {
          border: 1px solid #d9d9d9;
          border-radius: 8px;
          overflow: hidden;
          transition: border-color 0.3s;
        }
        .markdown-editor-wrapper:focus-within {
          border-color: #1677ff;
          box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
        }
        .editor-toolbar {
          padding: 8px 12px;
          border-bottom: 1px solid #f0f0f0;
          background: #fafafa;
        }
        .editor-heading-select {
          height: 28px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          padding: 0 8px;
          font-size: 13px;
          background: white;
          cursor: pointer;
          outline: none;
        }
        .editor-heading-select:focus {
          border-color: #1677ff;
        }
        .editor-content .tiptap {
          min-height: ${minHeight}px;
          padding: 16px;
          outline: none;
          font-size: 15px;
          line-height: 1.7;
        }
        .editor-content .tiptap p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .editor-content .tiptap h1 { font-size: 2em; font-weight: 600; margin: 1em 0 0.5em; }
        .editor-content .tiptap h2 { font-size: 1.5em; font-weight: 600; margin: 1em 0 0.5em; }
        .editor-content .tiptap h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0 0.5em; }
        .editor-content .tiptap h4 { font-size: 1.1em; font-weight: 600; margin: 1em 0 0.5em; }
        .editor-content .tiptap ul,
        .editor-content .tiptap ol { padding-left: 1.5em; margin: 0.5em 0; }
        .editor-content .tiptap blockquote {
          border-left: 4px solid #dfe2e5;
          padding-left: 1em;
          margin: 0.5em 0;
          color: #6a737d;
        }
        .editor-content .tiptap code {
          background: #f6f8fa;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        }
        .editor-content .tiptap pre {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 16px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 0.5em 0;
        }
        .editor-content .tiptap pre code {
          background: none;
          padding: 0;
          color: inherit;
        }
        .editor-content .tiptap a {
          color: #1677ff;
          text-decoration: underline;
          cursor: pointer;
        }
        .editor-content .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 0.5em 0;
        }
        .editor-content .tiptap mark {
          background: #fff3bf;
          padding: 0 2px;
          border-radius: 2px;
        }
        .editor-content .tiptap hr {
          border: none;
          border-top: 2px solid #e8e8e8;
          margin: 1.5em 0;
        }
        .editor-content .tiptap table {
          border-collapse: collapse;
          margin: 1em 0;
          width: 100%;
        }
        .editor-content .tiptap table td,
        .editor-content .tiptap table th {
          border: 1px solid #dfe2e5;
          padding: 8px 12px;
          min-width: 80px;
        }
        .editor-content .tiptap table th {
          background: #f6f8fa;
          font-weight: 600;
        }
        .editor-content .tiptap .tableWrapper {
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
