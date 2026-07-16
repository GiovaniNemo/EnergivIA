"use client";

import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { VariableMark } from "./extensions";
import { VARIABLE_LABELS, type VariableToken } from "./types";

interface CompactTipTapVariableFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  fieldPath?: string;
  minHeightClass?: string;
  onChange: (value: string) => void;
  assistAction?: { onClick: () => void; label?: string };
}

function toParagraph(value: string): string {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  return `<p>${escaped}</p>`;
}

export function CompactTipTapVariableField({
  label,
  placeholder,
  value,
  fieldPath,
  minHeightClass = "min-h-[40px]",
  onChange,
  assistAction,
}: CompactTipTapVariableFieldProps): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder: placeholder ?? label }),
      VariableMark,
    ],
    content: toParagraph(value),
    editorProps: {
      attributes: {
        ...(fieldPath ? { "data-editor-field-path": fieldPath } : {}),
        class: `${minHeightClass} max-h-[96px] overflow-y-auto px-3 py-2 text-sm leading-5 text-[var(--color-foreground)] outline-none [&_p]:m-0`,
      },
    },
    onUpdate({ editor: instance }) {
      onChange(instance.getText());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getText() !== value) {
      editor.commands.setContent(toParagraph(value), false);
    }
  }, [editor, value]);

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
        className="mt-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)]"
      >
        <EditorContent editor={editor} />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
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
  );
}
