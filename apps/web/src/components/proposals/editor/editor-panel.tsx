"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import Collapse from "@mui/material/Collapse";
import { Input } from "@/components/ui/input";
import {
  type DynamicField,
  getSectionVariantOptions,
  resolveSectionVariant,
  SECTION_FIELD_CONFIG,
  SECTION_USES_RICH_TEXT_EDITOR,
} from "./section-fields";
import { type ProposalSection, type VariableToken } from "./types";
import { TipTapEditorSection } from "./tiptap-editor-section";
import { renderDynamicField } from "./field-renderer-registry";
import { SectionVariantSegmentedControl } from "./section-variant-segmented-control";

const GENERAL_GROUP_TITLE = "Geral";

interface EditorPanelProps {
  selectedSection?: ProposalSection;
  onSectionTitleChange: (value: string) => void;
  onSectionVariantChange: (value: string) => void;
  onSectionFieldChange: (fieldName: string, value: unknown) => void;
  onSectionImageUpload: (fieldName: string, file: File | undefined) => void;
  editor: Editor | null;
  onAction: (action: "improve" | "newVersion") => void;
  onInsertVariable: (token: VariableToken) => void;
  focusFieldName?: string;
  focusRequestToken?: number;
}

export function EditorPanel({
  selectedSection,
  onSectionTitleChange,
  onSectionVariantChange,
  onSectionFieldChange,
  onSectionImageUpload,
  editor,
  onAction,
  onInsertVariable,
  focusFieldName,
  focusRequestToken,
}: EditorPanelProps): JSX.Element {
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const blockTitleInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabStripRef = useRef<HTMLDivElement>(null);
  const tabClickScrollLockRef = useRef<string | null>(null);
  const tabClickScrollLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncActiveTabFromScrollRef = useRef<() => void>(() => {});
  const [activeQuickGroup, setActiveQuickGroup] = useState(GENERAL_GROUP_TITLE);
  const showRichTextEditor = selectedSection
    ? SECTION_USES_RICH_TEXT_EDITOR[selectedSection.type]
    : true;

  function isFieldVisible(field: DynamicField, section: ProposalSection): boolean {
    if (!field.visibleWhen) return true;
    const currentValue =
      field.visibleWhen.field === "variant"
        ? resolveSectionVariant(section.type, String(section.variant ?? ""))
        : section.fields[field.visibleWhen.field];
    if (field.visibleWhen.equalsAny !== undefined)
      return field.visibleWhen.equalsAny.includes(currentValue);
    if (field.visibleWhen.equals !== undefined) return currentValue === field.visibleWhen.equals;
    if (field.visibleWhen.notEquals !== undefined)
      return currentValue !== field.visibleWhen.notEquals;
    return Boolean(currentValue);
  }

  const groupedFields =
    selectedSection != null
      ? SECTION_FIELD_CONFIG[selectedSection.type].reduce<
          Array<{ title: string; fields: DynamicField[] }>
        >((acc, field) => {
          const groupTitle = field.group ?? GENERAL_GROUP_TITLE;
          const existing = acc.find((entry) => entry.title === groupTitle);
          if (existing) {
            existing.fields.push(field);
          } else {
            acc.push({ title: groupTitle, fields: [field] });
          }
          return acc;
        }, [])
      : [];

  const generalFieldGroup = groupedFields.find((group) => group.title === GENERAL_GROUP_TITLE);
  const groupedFieldsWithoutGeneral = groupedFields.filter(
    (group) => group.title !== GENERAL_GROUP_TITLE
  );
  const quickNavGroups = selectedSection
    ? [GENERAL_GROUP_TITLE, ...groupedFieldsWithoutGeneral.map((group) => group.title)]
    : [];
  const showGroupQuickNav = quickNavGroups.length > 1;
  const quickNavKey = quickNavGroups.join("\0");

  useEffect(() => {
    setActiveQuickGroup(GENERAL_GROUP_TITLE);
    return () => {
      if (tabClickScrollLockTimerRef.current) {
        clearTimeout(tabClickScrollLockTimerRef.current);
        tabClickScrollLockTimerRef.current = null;
      }
      tabClickScrollLockRef.current = null;
    };
  }, [selectedSection?.id]);

  useEffect(() => {
    if (!showGroupQuickNav || quickNavGroups.length < 2) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    function updateActiveFromScroll(): void {
      if (tabClickScrollLockRef.current) return;

      const scrollEl = scrollContainerRef.current;
      if (!scrollEl) return;

      const strip = tabStripRef.current;
      const lineY = strip
        ? strip.getBoundingClientRect().bottom + 4
        : scrollEl.getBoundingClientRect().top + 96;

      let next: string = quickNavGroups[0] ?? GENERAL_GROUP_TITLE;
      let bestTop = Number.NEGATIVE_INFINITY;
      for (const title of quickNavGroups) {
        const el = groupRefs.current[title];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= lineY && top > bestTop) {
          bestTop = top;
          next = title;
        }
      }

      if (bestTop === Number.NEGATIVE_INFINITY) {
        const first = quickNavGroups[0];
        if (first) {
          const el = groupRefs.current[first];
          if (el && el.getBoundingClientRect().top > lineY) {
            next = first;
          }
        }
      }

      setActiveQuickGroup((prev) => (prev === next ? prev : next));
    }

    syncActiveTabFromScrollRef.current = updateActiveFromScroll;

    container.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    window.addEventListener("resize", updateActiveFromScroll);
    const ro = new ResizeObserver(() => updateActiveFromScroll());
    ro.observe(container);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(updateActiveFromScroll);
    });

    return () => {
      syncActiveTabFromScrollRef.current = () => {};
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      container.removeEventListener("scroll", updateActiveFromScroll);
      window.removeEventListener("resize", updateActiveFromScroll);
      ro.disconnect();
    };
  }, [showGroupQuickNav, quickNavKey, selectedSection?.id]);

  function scrollToGroup(groupTitle: string) {
    if (tabClickScrollLockTimerRef.current) {
      clearTimeout(tabClickScrollLockTimerRef.current);
      tabClickScrollLockTimerRef.current = null;
    }
    tabClickScrollLockRef.current = groupTitle;
    setActiveQuickGroup(groupTitle);
    groupRefs.current[groupTitle]?.scrollIntoView({ behavior: "smooth", block: "start" });
    tabClickScrollLockTimerRef.current = setTimeout(() => {
      tabClickScrollLockRef.current = null;
      tabClickScrollLockTimerRef.current = null;
      requestAnimationFrame(() => syncActiveTabFromScrollRef.current());
    }, 700);
  }

  function renderField(field: DynamicField): JSX.Element | null {
    if (!selectedSection) return null;
    return renderDynamicField({
      field,
      section: selectedSection,
      onSectionFieldChange,
      onSectionImageUpload,
    });
  }

  useEffect(() => {
    if (!selectedSection || !focusRequestToken) return;
    if (focusFieldName === "__block_title") {
      blockTitleInputRef.current?.focus();
      blockTitleInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!focusFieldName) return;
    const pathTarget = Array.from(
      scrollContainerRef.current?.querySelectorAll<HTMLElement>("[data-editor-field-path]") ?? []
    ).find((node) => node.dataset["editorFieldPath"] === focusFieldName);
    const baseField = focusFieldName.split("[")[0]?.split(".")[0] ?? focusFieldName;
    if (focusFieldName.includes("[") && !pathTarget) return;
    const target = pathTarget ?? fieldRefs.current[baseField];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const richTextRoot = target.querySelector<HTMLElement>(
      ".ProseMirror, [contenteditable='true'][role='textbox']"
    );
    const targetIsRichRoot =
      target.matches(".ProseMirror") ||
      target.matches("[contenteditable='true'][role='textbox']") ||
      target.matches("[contenteditable='true']");
    const isRichField = focusFieldName === "text" || focusFieldName === "title";
    let focusable: HTMLElement | null = null;
    if (isRichField && (targetIsRichRoot || richTextRoot)) {
      focusable = targetIsRichRoot ? target : richTextRoot;
    } else if (
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLButtonElement
    ) {
      focusable = target;
    } else {
      focusable =
        target.querySelector<HTMLElement>("textarea, input") ??
        target.querySelector<HTMLElement>(
          ".ProseMirror, [contenteditable='true'], [role='textbox']"
        ) ??
        target.querySelector<HTMLElement>("button");
    }
    focusable?.focus();
    if (focusable instanceof HTMLTextAreaElement) {
      const end = focusable.value.length;
      focusable.setSelectionRange(end, end);
      return;
    }
    if (focusable instanceof HTMLInputElement) {
      const selectableInputTypes = new Set(["text", "search", "url", "tel", "password"]);
      if (selectableInputTypes.has(focusable.type)) {
        const end = focusable.value.length;
        focusable.setSelectionRange(end, end);
      }
    }
  }, [selectedSection?.id, focusFieldName, focusRequestToken, editor]);

  return (
    <main className="proposal-editor flex h-[calc(100vh-190px)] min-h-[520px] w-full min-w-0 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[0_10px_30px_rgba(2,6,23,0.08)] lg:h-[calc(100vh-160px)] lg:min-h-[640px] lg:w-[clamp(500px,44vw,800px)] lg:shrink-0 lg:p-4">
      <div className="mb-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">Editor de Bloco</p>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pr-4 [scrollbar-gutter:stable]"
      >
        {showRichTextEditor ? (
          <TipTapEditorSection
            editor={editor}
            onAction={onAction}
            onInsertVariable={onInsertVariable}
          />
        ) : null}

        <div className={`${showRichTextEditor ? "mt-3" : "mt-0"} space-y-2`}>
          {selectedSection ? (
            <>
              {showGroupQuickNav ? (
                <div ref={tabStripRef} className="sticky top-0 z-10 bg-[var(--color-card)] pt-0.5">
                  <div
                    role="tablist"
                    aria-label="Grupos de campos"
                    className="flex overflow-hidden rounded-t-[10px] rounded-b-none border border-[var(--color-border)] bg-[var(--color-muted)]"
                  >
                    {quickNavGroups.map((group) => {
                      const active = activeQuickGroup === group;
                      return (
                        <button
                          key={group}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => {
                            scrollToGroup(group);
                          }}
                          className={`relative min-w-0 flex-1 px-2 py-2.5 text-center transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-card)] ${
                            active
                              ? "bg-[var(--color-accent)] text-[var(--color-foreground)]"
                              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                          }`}
                        >
                          <span className="relative z-[1] line-clamp-2 text-[13px] font-medium leading-tight tracking-wide">
                            {group}
                          </span>
                          {active ? (
                            <span
                              className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[3px] bg-[var(--color-primary-400)]"
                              aria-hidden
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <div
                  className={
                    showGroupQuickNav
                      ? "rounded-xl border border-[var(--color-border)] bg-[var(--color-accent)]"
                      : "contents"
                  }
                >
                  <section
                    ref={(node) => {
                      groupRefs.current[GENERAL_GROUP_TITLE] = node;
                    }}
                    className={
                      showGroupQuickNav
                        ? "rounded-xl border-0 bg-transparent p-3"
                        : "rounded-xl border border-[var(--color-border)] bg-[var(--color-accent)] p-3"
                    }
                    style={{ scrollMarginTop: "104px" }}
                  >
                    <h3 className="mb-2 text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
                      {GENERAL_GROUP_TITLE}
                    </h3>

                    <div className="space-y-2.5">
                      <label className="block w-full text-xs text-[var(--color-foreground)]">
                        Nome do bloco
                        <Input
                          ref={blockTitleInputRef}
                          value={selectedSection.title}
                          onChange={(event) => onSectionTitleChange(event.target.value)}
                          className="mt-1 h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-0 text-xs text-[var(--color-foreground)]"
                          placeholder="Título da seção"
                        />
                      </label>

                      <div className="block text-xs text-[var(--color-foreground)]">
                        <p className="text-sm font-semibold text-[var(--color-foreground)]">
                          Tipo de exibição
                        </p>
                        <div className="mt-2">
                          <SectionVariantSegmentedControl
                            aria-label="Tipo de exibição da seção"
                            options={getSectionVariantOptions(selectedSection.type)}
                            value={resolveSectionVariant(
                              selectedSection.type,
                              selectedSection.variant
                            )}
                            onSelect={(nextValue, variantOption) => {
                              onSectionVariantChange(nextValue);
                              Object.entries(variantOption.onSelectSetFields ?? {}).forEach(
                                ([fieldName, nextValue]) =>
                                  onSectionFieldChange(fieldName, nextValue)
                              );
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {generalFieldGroup?.fields.length ? (
                      <div className="mt-2.5 space-y-2.5 border-t border-[var(--color-border)] pt-2.5">
                        {generalFieldGroup.fields.map((field) => (
                          <Collapse
                            key={field.name}
                            in={isFieldVisible(field, selectedSection)}
                            timeout={220}
                          >
                            <div className="pt-0.5" style={{ scrollMarginTop: "120px" }}>
                              <div
                                ref={(node) => {
                                  fieldRefs.current[field.name] = node;
                                }}
                              >
                                {renderField(field)}
                              </div>
                            </div>
                          </Collapse>
                        ))}
                      </div>
                    ) : null}
                  </section>
                </div>

                {groupedFields.length === 0 ? (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Esta seção usa o editor de texto rico acima.
                  </p>
                ) : (
                  groupedFieldsWithoutGeneral.map((group) => (
                    <section
                      key={group.title}
                      ref={(node) => {
                        groupRefs.current[group.title] = node;
                      }}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-accent)] p-3"
                      style={{ scrollMarginTop: "104px" }}
                    >
                      <h3 className="mb-2 text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
                        {group.title}
                      </h3>
                      <div className="space-y-2.5">
                        {group.fields.map((field) => (
                          <Collapse
                            key={field.name}
                            in={isFieldVisible(field, selectedSection)}
                            timeout={220}
                          >
                            <div className="pt-0.5" style={{ scrollMarginTop: "120px" }}>
                              <div
                                ref={(node) => {
                                  fieldRefs.current[field.name] = node;
                                }}
                              >
                                {renderField(field)}
                              </div>
                            </div>
                          </Collapse>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
