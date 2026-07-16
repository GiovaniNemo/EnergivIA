"use client";

import {
  renderColorField,
  renderImageField,
  renderListField,
  renderRangeField,
  renderSelectField,
  renderTableField,
  renderProposalEquipmentLinesField,
  renderTextField,
  renderToggleField,
} from "./field-renderers/renderers";
import type { DynamicFieldRenderContext } from "./field-renderers/types";

export type { DynamicFieldRenderContext } from "./field-renderers/types";

export function renderDynamicField(context: DynamicFieldRenderContext): JSX.Element {
  const { field } = context;
  switch (field.type) {
    case "toggle":
      return renderToggleField(context);
    case "text":
    case "url":
      return renderTextField(context);
    case "number":
      return renderTextField(context);
    case "image":
      return renderImageField(context);
    case "color":
      return renderColorField(context);
    case "list":
      return renderListField(context);
    case "table":
      return renderTableField(context);
    case "proposal_equipment_lines":
      return renderProposalEquipmentLinesField(context);
    case "select":
      return renderSelectField(context);
    case "range":
      return renderRangeField(context);
    default:
      return renderTextField(context);
  }
}
