"use client";

import { Mark, mergeAttributes } from "@tiptap/core";

export const VariableMark = Mark.create({
  name: "variableToken",
  inclusive: false,
  addAttributes() {
    return {
      name: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-variable-token]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-variable-token": HTMLAttributes["name"],
        class:
          "inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[12px] font-medium text-emerald-300",
      }),
      0,
    ];
  },
});
