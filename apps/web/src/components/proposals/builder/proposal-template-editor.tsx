"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Plus, GripVertical, Eye, EyeOff, Copy, Trash2 } from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createProposalTemplate,
  listProposalTemplates,
  updateProposalTemplate,
  type ProposalTemplateEntity,
} from "@/lib/proposal-templates-api";
import type {
  SectionFieldConfig,
  SectionType,
  ProposalBuilderSection,
  ProposalBuilderDocument,
} from "./types";
import { SECTION_DEFINITIONS, SECTION_TYPES } from "./section-definitions";
import {
  createId,
  createSection,
  createTemplate,
  fromTemplateConfig,
  readAsDataUrl,
  toTemplateConfig,
} from "./utils";
import { renderSection } from "./preview-renderers";

function SortableItem({
  section,
  selectedId,
  onSelect,
  onDuplicate,
  onDelete,
  onToggleVisible,
}: {
  section: ProposalBuilderSection;
  selectedId: string;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleVisible: (id: string) => void;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: section.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const selected = section.id === selectedId;
  const def = SECTION_DEFINITIONS[section.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-xl border ${selected ? "border-emerald-400/70 bg-emerald-500/10" : "border-zinc-700/70 bg-zinc-900/40"}`}
    >
      <div className="flex items-center">
        <button type="button" className="px-2 text-zinc-400" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex-1 px-1 py-2 text-left"
          onClick={() => onSelect(section.id)}
        >
          <p className="text-xs font-medium text-zinc-100">
            {def.icon} {section.title}
          </p>
          <p className="text-[11px] text-zinc-400">{section.type}</p>
        </button>
        <div className="flex items-center gap-1 px-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800"
            onClick={() => onDuplicate(section.id)}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800"
            onClick={() => onToggleVisible(section.id)}
          >
            {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            className="rounded p-1 text-zinc-400 hover:bg-red-500/20 hover:text-red-300"
            onClick={() => onDelete(section.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RichTextField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): JSX.Element {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: "Write content..." })],
    content: value || "<p></p>",
    onUpdate({ editor: instance }) {
      onChange(instance.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[180px] rounded-md border border-zinc-700/70 bg-zinc-950/70 p-2 text-sm text-zinc-100 outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) editor.commands.setContent(value || "<p></p>", false);
  }, [editor, value]);

  return <EditorContent editor={editor} />;
}

export function ProposalTemplateEditor(): JSX.Element {
  const { currentOrganizationId } = useOrganization();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [title, setTitle] = useState("Modular Solar Proposal");
  const [selectedId, setSelectedId] = useState("");
  const [doc, setDoc] = useState<ProposalBuilderDocument>(() => createTemplate("residential"));
  const [addOpen, setAddOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [remoteTemplates, setRemoteTemplates] = useState<ProposalTemplateEntity[]>([]);

  useEffect(() => {
    if (!selectedId && doc.sections.length) setSelectedId(doc.sections[0]!.id);
  }, [selectedId, doc.sections]);

  useEffect(() => {
    if (!currentOrganizationId) return;
    void (async () => {
      try {
        const templates = await listProposalTemplates(currentOrganizationId);
        setRemoteTemplates(templates);
        const first = templates[0];
        if (!first) return;
        const parsed = fromTemplateConfig(first.config);
        if (!parsed) return;
        setDoc(parsed);
        setTemplateId(first.id);
        setTitle(first.name);
        setSelectedId(parsed.sections[0]?.id ?? "");
      } catch {
        setStatus("Could not load backend templates.");
      }
    })();
  }, [currentOrganizationId]);

  const selectedSection = useMemo(
    () => doc.sections.find((section) => section.id === selectedId),
    [doc.sections, selectedId]
  );

  function updateSection(id: string, content: Partial<ProposalBuilderSection>) {
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        section.id === id ? { ...section, ...content, order: index } : section
      ),
    }));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDoc((prev) => {
      const oldIndex = prev.sections.findIndex((item) => item.id === active.id);
      const newIndex = prev.sections.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const moved = arrayMove(prev.sections, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        order: idx,
      }));
      return { ...prev, sections: moved };
    });
  }

  function addSection(type: SectionType) {
    setDoc((prev) => {
      const next = [...prev.sections, createSection(type, prev.sections.length)];
      return { ...prev, sections: next };
    });
    setAddOpen(false);
  }

  function duplicateSection(id: string) {
    setDoc((prev) => {
      const index = prev.sections.findIndex((item) => item.id === id);
      if (index < 0) return prev;
      const source = prev.sections[index]!;
      const duplicate = { ...source, id: createId(), title: `${source.title} Copy` };
      const next = [...prev.sections];
      next.splice(index + 1, 0, duplicate);
      return { ...prev, sections: next.map((item, idx) => ({ ...item, order: idx })) };
    });
  }

  function deleteSection(id: string) {
    setDoc((prev) => {
      if (prev.sections.length <= 1) return prev;
      const next = prev.sections
        .filter((item) => item.id !== id)
        .map((item, idx) => ({ ...item, order: idx }));
      return { ...prev, sections: next };
    });
  }

  async function updateField(field: SectionFieldConfig, value: unknown) {
    if (!selectedSection) return;
    if (field.type === "image" && value instanceof File) {
      const url = await readAsDataUrl(value);
      value = url;
    }
    if (field.type === "multi_image" && value instanceof FileList) {
      const urls = await Promise.all(Array.from(value).map(readAsDataUrl));
      value = urls;
    }
    const nextContent = { ...selectedSection.content, [field.name]: value };
    updateSection(selectedSection.id, { content: nextContent });
  }

  async function saveTemplate() {
    if (!currentOrganizationId) return;
    try {
      const config = toTemplateConfig(doc);
      if (templateId) {
        const updated = await updateProposalTemplate(
          templateId,
          { name: title, config },
          currentOrganizationId
        );
        setRemoteTemplates((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createProposalTemplate(
          { name: title, description: "Config-driven proposal builder", config },
          currentOrganizationId
        );
        setTemplateId(created.id);
        setRemoteTemplates((prev) => [created, ...prev]);
      }
      setStatus("Template saved.");
    } catch {
      setStatus("Failed to save template.");
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-[#0b1220] p-4">
      <div className="flex items-center justify-between">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="max-w-[380px]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-200"
            onClick={() => setDoc(createTemplate("residential"))}
          >
            Residential
          </button>
          <button
            type="button"
            className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-200"
            onClick={() => setDoc(createTemplate("commercial"))}
          >
            Commercial
          </button>
          <button
            type="button"
            className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-200"
            onClick={() => setDoc(createTemplate("financing"))}
          >
            Financing
          </button>
          <button
            type="button"
            className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950"
            onClick={() => void saveTemplate()}
          >
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr_380px] gap-4">
        <aside className="h-[680px] rounded-xl border border-zinc-700/60 bg-zinc-950/40 p-3">
          <p className="mb-3 text-sm font-semibold text-zinc-100">Sections</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={doc.sections.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 overflow-auto">
                {doc.sections.map((section) => (
                  <SortableItem
                    key={section.id}
                    section={section}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onDuplicate={duplicateSection}
                    onDelete={deleteSection}
                    onToggleVisible={(id) => {
                      const target = doc.sections.find((item) => item.id === id);
                      if (!target) return;
                      updateSection(id, { visible: !target.visible });
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" /> Add Section
          </button>
        </aside>

        <main className="h-[680px] overflow-auto rounded-xl border border-zinc-700/60 bg-zinc-950/40 p-4">
          {selectedSection ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-zinc-400">
                  Section title
                  <Input
                    value={selectedSection.title}
                    onChange={(event) =>
                      updateSection(selectedSection.id, { title: event.target.value })
                    }
                    className="mt-1"
                  />
                </label>
                <label className="text-xs text-zinc-400">
                  Variant
                  <Select
                    value={selectedSection.variant}
                    onChange={(event) =>
                      updateSection(selectedSection.id, { variant: event.target.value })
                    }
                    className="mt-1"
                  >
                    {SECTION_DEFINITIONS[selectedSection.type].variants.map((variant) => (
                      <option key={variant} value={variant}>
                        {variant}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
              <p className="text-xs text-zinc-500">
                Variables supported in rich text: {`{{nome_cliente}}`}
              </p>
              {SECTION_DEFINITIONS[selectedSection.type].fields.map((field) => {
                const fieldValue = selectedSection.content[field.name];
                if (field.type === "richtext") {
                  return (
                    <div key={field.name}>
                      <p className="mb-1 text-xs text-zinc-400">{field.label}</p>
                      <RichTextField
                        value={String(fieldValue ?? "<p></p>")}
                        onChange={(value) => void updateField(field, value)}
                      />
                    </div>
                  );
                }
                if (field.type === "table") {
                  const rows = Array.isArray(fieldValue)
                    ? (fieldValue as Record<string, string>[])
                    : [];
                  return (
                    <div key={field.name} className="rounded-md border border-zinc-700/70 p-2">
                      <p className="mb-2 text-xs text-zinc-400">{field.label}</p>
                      <div className="space-y-2">
                        {rows.map((row, rowIdx) => (
                          <div
                            key={rowIdx}
                            className="grid gap-2"
                            style={{
                              gridTemplateColumns: `repeat(${field.columns?.length ?? 1}, minmax(0, 1fr))`,
                            }}
                          >
                            {(field.columns ?? []).map((column) => (
                              <Input
                                key={column}
                                value={row[column] ?? ""}
                                onChange={(event) => {
                                  const next = [...rows];
                                  next[rowIdx] = { ...next[rowIdx], [column]: event.target.value };
                                  void updateField(field, next);
                                }}
                                placeholder={column}
                                className="text-xs"
                              />
                            ))}
                          </div>
                        ))}
                        <button
                          type="button"
                          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                          onClick={() => {
                            const blank = Object.fromEntries(
                              (field.columns ?? []).map((column) => [column, ""])
                            );
                            void updateField(field, [...rows, blank]);
                          }}
                        >
                          Add row
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <label key={field.name} className="block text-xs text-zinc-400">
                    {field.label}
                    {field.type === "toggle" ? (
                      <input
                        type="checkbox"
                        checked={Boolean(fieldValue)}
                        onChange={(event) => void updateField(field, event.target.checked)}
                        className="ml-2"
                      />
                    ) : field.type === "color" ? (
                      <input
                        type="color"
                        value={String(fieldValue ?? "#22c55e")}
                        onChange={(event) => void updateField(field, event.target.value)}
                        className="mt-1 block h-9 w-14 rounded border border-zinc-700 bg-zinc-900/70"
                      />
                    ) : field.type === "image" ? (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => void updateField(field, event.target.files?.[0] ?? "")}
                        className="mt-1 block w-full text-xs text-zinc-300"
                      />
                    ) : field.type === "multi_image" ? (
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => void updateField(field, event.target.files ?? "")}
                        className="mt-1 block w-full text-xs text-zinc-300"
                      />
                    ) : field.type === "list" || field.type === "multi_input" ? (
                      <textarea
                        value={Array.isArray(fieldValue) ? fieldValue.join("\n") : ""}
                        onChange={(event) =>
                          void updateField(field, event.target.value.split("\n").filter(Boolean))
                        }
                        className="mt-1 min-h-20 w-full rounded-md border border-zinc-700 bg-zinc-900/70 px-2 py-1.5 text-sm text-zinc-100"
                        placeholder="One item per line"
                      />
                    ) : field.type === "select" ? (
                      <Select
                        value={String(fieldValue ?? field.options?.[0]?.value ?? "")}
                        onChange={(event) => void updateField(field, event.target.value)}
                        className="mt-1"
                      >
                        {(field.options ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        type={
                          field.type === "number" || field.type === "opacity" ? "number" : "text"
                        }
                        step={field.type === "opacity" ? "0.05" : "1"}
                        value={String(fieldValue ?? "")}
                        onChange={(event) =>
                          void updateField(
                            field,
                            field.type === "number" || field.type === "opacity"
                              ? Number(event.target.value || 0)
                              : event.target.value
                          )
                        }
                        className="mt-1"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Select a section to configure.</p>
          )}
        </main>

        <aside className="h-[680px] overflow-auto rounded-xl border border-zinc-700/60 bg-zinc-950/40 p-3">
          <p className="mb-3 text-sm font-semibold text-zinc-100">Live Preview</p>
          <div className="space-y-3 rounded-xl border border-zinc-700/60 bg-zinc-950/60 p-2">
            {doc.sections
              .filter((item) => item.visible)
              .map((section) => (
                <div key={section.id}>{renderSection(section)}</div>
              ))}
          </div>
        </aside>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <p>{status || "Notion-like editing + Canva-like controls + Webflow-like structure."}</p>
        <p>{remoteTemplates.length} backend templates loaded</p>
      </div>

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-[780px] rounded-xl border border-zinc-700 bg-[#0b1220] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100">Add Section</p>
              <button
                type="button"
                className="text-xs text-zinc-400"
                onClick={() => setAddOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {["Essentials", "Financial", "Visual", "Trust", "Advanced"].map((category) => (
                <div key={category} className="rounded-md border border-zinc-700/70 p-2">
                  <p className="mb-2 text-xs font-semibold text-zinc-300">{category}</p>
                  <div className="space-y-1">
                    {SECTION_TYPES.filter(
                      (type) => SECTION_DEFINITIONS[type].category === category
                    ).map((type) => (
                      <button
                        key={type}
                        type="button"
                        className="block w-full rounded border border-zinc-700 px-2 py-1 text-left text-xs text-zinc-200 hover:bg-zinc-800"
                        onClick={() => addSection(type)}
                      >
                        {SECTION_DEFINITIONS[type].icon} {SECTION_DEFINITIONS[type].label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
