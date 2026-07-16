"use client";

import type { ProposalTemplateSectionKey } from "@energivia/shared-types";

export type SectionType = ProposalTemplateSectionKey | "diagnostic_energy";

export type FieldType =
  | "text"
  | "number"
  | "toggle"
  | "color"
  | "opacity"
  | "image"
  | "multi_image"
  | "select"
  | "list"
  | "multi_input"
  | "table"
  | "richtext"
  | "url";

export interface SectionFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: { label: string; value: string }[];
  columns?: string[];
}

export interface SectionDefinition {
  type: SectionType;
  label: string;
  icon: string;
  category: "Essentials" | "Financial" | "Visual" | "Trust" | "Advanced";
  variants: string[];
  defaultVariant: string;
  fields: SectionFieldConfig[];
  defaults: Record<string, unknown>;
}

export interface ProposalBuilderSection {
  id: string;
  type: SectionType;
  variant: string;
  order: number;
  visible: boolean;
  title: string;
  content: Record<string, unknown>;
  style: Record<string, unknown>;
}

export interface ProposalBuilderDocument {
  sections: ProposalBuilderSection[];
  variables: Record<string, string>;
}
