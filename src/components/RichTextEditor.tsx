'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import LinkExtension from '@tiptap/extension-link'
import { useEffect, useState } from 'react'
import { Bold as BoldIcon, Italic as ItalicIcon, List, ListOrdered, Highlighter, Undo, Redo, Link as LinkIcon, Unlink } from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

const presetColors = [
  { name: 'Orange', value: '#6d28d9' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
]

const colorNameToHex: Record<string, string> = {
  'red': '#EF4444',
  'green': '#22C55E',
  'blue': '#3B82F6',
  'yellow': '#EAB308',
  'orange': '#F97316',
  'purple': '#A855F7',
  'pink': '#EC4899',
  'white': '#FFFFFF',
  'black': '#000000',
  'gray': '#6B7280',
  'grey': '#6B7280',
  'cyan': '#06B6D4',
  'teal': '#14B8A6',
  'lime': '#84CC16',
  'indigo': '#6366F1',
  'violet': '#8B5CF6',
  'fuchsia': '#D946EF',
  'rose': '#F43F5E',
  'sky': '#0EA5E9',
  'magenta': '#D946EF',
  'brown': '#92400E',
  'navy': '#1E3A5F',
  'maroon': '#7F1D1D',
  'olive': '#3F6212',
  'coral': '#F97316',
  'salmon': '#FB923C',
  'gold': '#D4A017',
  'silver': '#9CA3AF',
}

function parseColorInput(input: string): string | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null
  // If it's already a hex code
  if (trimmed.startsWith('#') && /^#[0-9a-f]{3,8}$/i.test(trimmed)) {
    return trimmed
  }
  // If it's a color name
  if (colorNameToHex[trimmed]) {
    return colorNameToHex[trimmed]
  }
  return null
}

export default function RichTextEditor({ content, onChange, placeholder = 'Write your blog content...' }: RichTextEditorProps) {
  const [colorInput, setColorInput] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Color,
      Highlight,
      LinkExtension.configure({
        autolink: true,
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: content || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[300px] p-4 focus:outline-none text-[#0F1B3D] leading-7',
        'aria-label': placeholder,
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || '')
    }
  }, [content, editor])

  if (!editor) return null

  const applyColor = (color: string) => {
    editor.chain().focus().setColor(color).run()
  }

  const applyColorFromInput = () => {
    if (colorInput) {
      const colors = colorInput.split(',').map(c => c.trim()).filter(Boolean)
      if (colors.length > 0) {
        const hex = parseColorInput(colors[0])
        if (hex) {
          applyColor(hex)
          setColorInput('')
        }
      }
    }
  }

  const setLink = () => {
    const current = editor.getAttributes('link').href as string | undefined
    const href = window.prompt('Enter URL', current || '')

    if (href === null) return
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run()
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#6d28d9]/10 bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#6d28d9]/10 bg-white/[0.02] p-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded-md p-2 transition-colors hover:bg-white/10 ${editor.isActive('bold') ? 'bg-[#6d28d9]/20 text-[#6d28d9]' : 'text-[#6F7192]'}`}
          title="Bold"
        >
          <BoldIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded-md p-2 transition-colors hover:bg-white/10 ${editor.isActive('italic') ? 'bg-[#6d28d9]/20 text-[#6d28d9]' : 'text-[#6F7192]'}`}
          title="Italic"
        >
          <ItalicIcon className="h-4 w-4" />
        </button>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10 ${editor.isActive('heading', { level: 2 }) ? 'bg-[#6d28d9]/20 text-[#6d28d9]' : 'text-[#6F7192]'}`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10 ${editor.isActive('heading', { level: 3 }) ? 'bg-[#6d28d9]/20 text-[#6d28d9]' : 'text-[#6F7192]'}`}
          title="Heading 3"
        >
          H3
        </button>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded-md p-2 transition-colors hover:bg-white/10 ${editor.isActive('bulletList') ? 'bg-[#6d28d9]/20 text-[#6d28d9]' : 'text-[#6F7192]'}`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded-md p-2 transition-colors hover:bg-white/10 ${editor.isActive('orderedList') ? 'bg-[#6d28d9]/20 text-[#6d28d9]' : 'text-[#6F7192]'}`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <button
          type="button"
          onClick={setLink}
          className={`rounded-md p-2 transition-colors hover:bg-white/10 ${editor.isActive('link') ? 'bg-[#6d28d9]/20 text-[#6d28d9]' : 'text-[#6F7192]'}`}
          title="Add or edit link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="rounded-md p-2 text-[#6F7192] transition-colors hover:bg-white/10"
          title="Remove link"
        >
          <Unlink className="h-4 w-4" />
        </button>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`rounded-md p-2 transition-colors hover:bg-white/10 ${editor.isActive('highlight') ? 'bg-yellow-400/30 text-yellow-400' : 'text-[#6F7192]'}`}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </button>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <div className="flex items-center gap-1" title="Text Color">
          {presetColors.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => applyColor(color.value)}
              className="h-6 w-6 rounded border border-[#6d28d9]/10 transition-transform hover:scale-110"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
          <input
            type="text"
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyColorFromInput()
              }
            }}
            placeholder="red, blue, green"
            className="w-32 rounded border border-[#6d28d9]/10 bg-transparent px-2 py-1 text-xs text-[#0F1B3D] placeholder:text-[#6F7192] focus:outline-none"
            title="Enter color names or hex codes (comma-separated)"
          />
        </div>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          className="rounded-md p-2 text-[#6F7192] transition-colors hover:bg-white/10"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          className="rounded-md p-2 text-[#6F7192] transition-colors hover:bg-white/10"
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
