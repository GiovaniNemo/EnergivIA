"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Italic,
  List,
  ListOrdered,
  Quote,
  Sparkles,
  Underline as UnderlineIcon,
} from "lucide-react";
import { VariableMark } from "./extensions";
import { VARIABLE_LABELS, type VariableToken } from "./types";

interface RichTipTapVariableFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  fieldPath?: string;
  onChange: (value: string) => void;
  assistAction?: { onClick: () => void; label?: string };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeToHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "<p></p>";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return value;
  return `<p>${escapeHtml(value)}</p>`;
}

export function RichTipTapVariableField({
  label,
  placeholder,
  value,
  fieldPath,
  onChange,
  assistAction,
}: RichTipTapVariableFieldProps): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? label }),
      VariableMark,
    ],
    content: normalizeToHtml(value),
    editorProps: {
      attributes: {
        ...(fieldPath ? { "data-editor-field-path": fieldPath } : {}),
        class:
          "min-h-[220px] max-h-[420px] overflow-y-auto px-3 py-3 text-sm leading-6 text-[var(--color-foreground)] outline-none [&_h1]:text-2xl [&_h1]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1",
      },
    },
    onUpdate({ editor: instance }) {
      const nextHtml = instance.getHTML();
      onChange(nextHtml);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const normalized = normalizeToHtml(value);
    if (editor.getHTML() !== normalized) {
      editor.commands.setContent(normalized, false);
    }
  }, [editor, value]);

  const toolbarButtonClass = (active: boolean) =>
    `inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${
      active
        ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
        : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
    }`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--color-foreground)]">{label}</p>
        {assistAction ? (
          <button
            type="button"
            title={assistAction.label ?? "Assistente de texto"}
            onClick={assistAction.onClick}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200/95 transition hover:border-emerald-400/50 hover:bg-emerald-500/18"
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            IA
          </button>
        ) : null}
      </div>
      <div
        data-editor-focus-surface="true"
        className="mt-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]"
      >
        <div className="flex flex-wrap gap-1.5 border-b border-[var(--color-border)] p-2">
          <button
            type="button"
            className={toolbarButtonClass(Boolean(editor?.isActive("bold")))}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Negrito"
            aria-label="Negrito"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass(Boolean(editor?.isActive("italic")))}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Itálico"
            aria-label="Itálico"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass(Boolean(editor?.isActive("underline")))}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            title="Sublinhado"
            aria-label="Sublinhado"
          >
            <UnderlineIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass(Boolean(editor?.isActive("heading", { level: 1 })))}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Título"
            aria-label="Título"
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass(Boolean(editor?.isActive("bulletList")))}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Lista com marcadores"
            aria-label="Lista com marcadores"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass(Boolean(editor?.isActive("orderedList")))}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="Lista numerada"
            aria-label="Lista numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass(Boolean(editor?.isActive("blockquote")))}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            title="Citação"
            aria-label="Citação"
          >
            <Quote className="h-4 w-4" />
          </button>
          <div className="mx-1 h-8 w-px bg-[var(--color-border)]" />
          <button
            type="button"
            className={toolbarButtonClass(Boolean(editor?.isActive({ textAlign: "left" })))}
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
            title="Alinhar à esquerda"
            aria-label="Alinhar à esquerda"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass(Boolean(editor?.isActive({ textAlign: "center" })))}
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
            title="Centralizar"
            aria-label="Centralizar"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass(Boolean(editor?.isActive({ textAlign: "right" })))}
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
            title="Alinhar à direita"
            aria-label="Alinhar à direita"
          >
            <AlignRight className="h-4 w-4" />
          </button>
        </div>
        <EditorContent editor={editor} />
        <div className="border-t border-[var(--color-border)] p-2">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
            Variáveis
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(VARIABLE_LABELS) as VariableToken[]).map((token) => (
              <button
                key={`${label}-${token}`}
                type="button"
                className="rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2 py-0.5 text-[10px] font-medium text-emerald-300/90 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
                onClick={() => {
                  editor
                    ?.chain()
                    .focus()
                    .insertContent([
                      {
                        type: "text",
                        text: `{{${token}}}`,
                        marks: [{ type: "variableToken", attrs: { name: token } }],
                      },
                    ])
                    .run();
                }}
              >
                {`{{${token}}}`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
