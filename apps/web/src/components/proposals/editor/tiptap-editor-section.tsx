"use client";

import type { Editor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Italic,
  List,
  ListOrdered,
  Quote,
  Sparkles,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VARIABLE_LABELS, type VariableToken } from "./types";

interface TipTapEditorSectionProps {
  editor: Editor | null;
  onAction: (action: "improve" | "newVersion") => void;
  onInsertVariable: (token: VariableToken) => void;
}

export function TipTapEditorSection({
  editor,
  onAction,
  onInsertVariable,
}: TipTapEditorSectionProps): JSX.Element {
  const toolbarButtonClass = (active: boolean) =>
    `inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${
      active
        ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
        : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
    }`;

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--color-border)] p-2">
        <button
          type="button"
          className={toolbarButtonClass(Boolean(editor?.isActive("bold")))}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass(Boolean(editor?.isActive("italic")))}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass(Boolean(editor?.isActive("underline")))}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
        >
          <Underline className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass(Boolean(editor?.isActive("heading", { level: 1 })))}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          aria-label="Heading"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass(Boolean(editor?.isActive("bulletList")))}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass(Boolean(editor?.isActive("orderedList")))}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          aria-label="Ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass(Boolean(editor?.isActive("blockquote")))}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          aria-label="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>
        <div className="mx-1 h-8 w-px bg-[var(--color-border)]" />
        <button
          type="button"
          className={toolbarButtonClass(Boolean(editor?.isActive({ textAlign: "left" })))}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          aria-label="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass(Boolean(editor?.isActive({ textAlign: "center" })))}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          aria-label="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass(Boolean(editor?.isActive({ textAlign: "right" })))}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          aria-label="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButtonClass(Boolean(editor?.isActive({ textAlign: "justify" })))}
          onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
          aria-label="Align justify"
        >
          <AlignJustify className="h-4 w-4" />
        </button>
        <div className="ml-auto flex items-center gap-2 pl-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full border-emerald-400/35 bg-emerald-500/12 px-3 text-xs text-emerald-300 hover:bg-emerald-500/20"
            onClick={() => onAction("improve")}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Melhorar texto
          </Button>
        </div>
      </div>
      <div className="min-h-[360px] max-h-[520px] overflow-auto">
        <EditorContent editor={editor} />
      </div>
      <div className="shrink-0 border-t border-[var(--color-border)] p-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
          Variáveis
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(VARIABLE_LABELS) as VariableToken[]).map((token) => (
            <button
              key={token}
              type="button"
              className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 shadow-[0_0_12px_rgba(34,197,94,0.18)] transition hover:border-emerald-400 hover:bg-emerald-500/20"
              onClick={() => onInsertVariable(token)}
            >
              {`{{${token}}}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
