'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold } from '@tiptap/extension-bold'
import { Italic } from '@tiptap/extension-italic'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { BulletList } from '@tiptap/extension-bullet-list'
import { OrderedList } from '@tiptap/extension-ordered-list'
import { ListItem } from '@tiptap/extension-list-item'
import { useState } from 'react'
import { Bold as BoldIcon, Italic as ItalicIcon, List, ListOrdered, Highlighter, Undo, Redo } from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

const presetColors = [
  { name: 'Orange', value: '#FF5C1A' },
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
  'orange': '#FF5C1A',
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
  'gold': '#F59E0B',
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
      StarterKit,
      Bold,
      Italic,
      Color,
      Highlight,
      BulletList,
      OrderedList,
      ListItem,
    ],
    content: content || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[300px] p-4 focus:outline-none text-[#e8eaf0] leading-7',
      },
    },
  })

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

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-white/[0.02] p-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded-md p-2 transition-colors hover:bg-white/10 ${editor.isActive('bold') ? 'bg-[#FF5C1A]/20 text-[#FF5C1A]' : 'text-[#7a82a0]'}`}
          title="Bold"
        >
          <BoldIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded-md p-2 transition-colors hover:bg-white/10 ${editor.isActive('italic') ? 'bg-[#FF5C1A]/20 text-[#FF5C1A]' : 'text-[#7a82a0]'}`}
          title="Italic"
        >
          <ItalicIcon className="h-4 w-4" />
        </button>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded-md p-2 transition-colors hover:bg-white/10 ${editor.isActive('bulletList') ? 'bg-[#FF5C1A]/20 text-[#FF5C1A]' : 'text-[#7a82a0]'}`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded-md p-2 transition-colors hover:bg-white/10 ${editor.isActive('orderedList') ? 'bg-[#FF5C1A]/20 text-[#FF5C1A]' : 'text-[#7a82a0]'}`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`rounded-md p-2 transition-colors hover:bg-white/10 ${editor.isActive('highlight') ? 'bg-yellow-400/30 text-yellow-400' : 'text-[#7a82a0]'}`}
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
              className="h-6 w-6 rounded border border-white/20 transition-transform hover:scale-110"
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
            className="w-32 rounded border border-white/10 bg-transparent px-2 py-1 text-xs text-white placeholder:text-[#7a82a0] focus:outline-none"
            title="Enter color names or hex codes (comma-separated)"
          />
        </div>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          className="rounded-md p-2 text-[#7a82a0] transition-colors hover:bg-white/10"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          className="rounded-md p-2 text-[#7a82a0] transition-colors hover:bg-white/10"
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
