"use client";

import type { DynamicField } from "../section-fields";
import type { ProposalSection } from "../types";

export interface DynamicFieldRenderContext {
  field: DynamicField;
  section: ProposalSection;
  onSectionFieldChange: (fieldName: string, value: unknown) => void;
  onSectionImageUpload: (fieldName: string, file: File | undefined) => void;
  toFieldPath?: (...parts: Array<string | number>) => string;
  focusFieldName?: string;
}
