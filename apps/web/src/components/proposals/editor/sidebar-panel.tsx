"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProposalSection, ProposalStyles, SectionType } from "./types";
import { StructureSectionItem } from "./structure-section-item";
import { AddSectionModal } from "./AddSectionModal";

interface SidebarPanelProps {
  sections: ProposalSection[];
  selectedSectionId: string;
  onDragEnd: (event: DragEndEvent) => void;
  sensors: SensorDescriptor<SensorOptions>[];
  onAddSection: (
    type: SectionType,
    variant?: string,
    fieldsPatch?: Record<string, unknown>
  ) => void;
  onSelectSection: (id: string) => void;
  onDuplicateSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onToggleSectionHidden: (id: string) => void;
  onOpenSettings: () => void;
  settingsSelected: boolean;
  branding: ProposalStyles["branding"];
}

export function SidebarPanel({
  sections,
  selectedSectionId,
  onDragEnd,
  sensors,
  onAddSection,
  onSelectSection,
  onDuplicateSection,
  onDeleteSection,
  onToggleSectionHidden,
  onOpenSettings,
  settingsSelected,
  branding,
}: SidebarPanelProps): JSX.Element {
  const [addSectionOpen, setAddSectionOpen] = useState(false);

  return (
    <>
      <aside className="flex h-[calc(100vh-190px)] min-h-[520px] w-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[0_10px_30px_rgba(2,6,23,0.08)] lg:h-[calc(100vh-160px)] lg:min-h-[640px] lg:w-[260px]">
        <button
          type="button"
          onClick={onOpenSettings}
          className={`mb-3 inline-flex h-[52px] w-full shrink-0 items-center justify-start gap-2 rounded-xl border px-3 text-[13px] font-medium transition ${
            settingsSelected
              ? "border-emerald-400/80 bg-emerald-500/10 text-[var(--color-foreground)] shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_0_22px_rgba(16,185,129,0.15)]"
              : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-emerald-500/40"
          }`}
        >
          <Settings2 className="h-4 w-4" />
          Configurações
        </button>
        <div className="mb-3 shrink-0">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Estrutura da Proposta
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={sections.map((section) => section.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sections.map((section) => (
                  <StructureSectionItem
                    key={section.id}
                    section={section}
                    isSelected={selectedSectionId === section.id}
                    onSelect={() => onSelectSection(section.id)}
                    onDuplicate={() => onDuplicateSection(section.id)}
                    onDelete={() => onDeleteSection(section.id)}
                    onToggleHidden={() => onToggleSectionHidden(section.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <Button
          className="mt-3 h-10 w-full shrink-0 rounded-xl border border-emerald-300/25 bg-gradient-to-r from-emerald-400 to-emerald-500 text-zinc-950 hover:from-emerald-300 hover:to-emerald-400"
          onClick={() => setAddSectionOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Adicionar Seção
        </Button>
      </aside>

      <AddSectionModal
        open={addSectionOpen}
        onClose={() => setAddSectionOpen(false)}
        onAdd={onAddSection}
        existingSections={sections}
        branding={branding}
      />
    </>
  );
}
