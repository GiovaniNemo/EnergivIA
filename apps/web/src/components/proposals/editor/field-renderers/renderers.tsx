"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { Input } from "@/components/ui/input";
import { CompactTipTapVariableField } from "../compact-tiptap-variable-field";
import { RichTipTapVariableField } from "../rich-tiptap-variable-field";
import type { DynamicFieldRenderContext } from "./types";
import { IconSelector } from "./icon-selector";
import { renderSelectOptionIcon } from "./select-icons";
import type { ProposalEquipmentLine } from "@energivia/shared-types";
import { fetchProducts, type Product } from "@/lib/admin-api";
import {
  parseProposalEquipmentItems,
  parseProposalEquipmentLines,
} from "../proposal-equipment-model";

function isValidHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(normalized);
}

function segmentedButtonClass(active: boolean): string {
  return `h-8 rounded-md border px-2 text-xs transition ${
    active
      ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
      : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-[var(--color-muted-foreground)]/45 hover:bg-white/5 hover:text-[var(--color-foreground)]"
  }`;
}

interface ImageFieldControlProps {
  label: string;
  value: string;
  onUpload: (file: File | undefined) => void;
  onClear: () => void;
  editorHighlight?: boolean;
}

function ImageFieldControl({
  label,
  value,
  onUpload,
  onClear,
  editorHighlight,
}: ImageFieldControlProps): JSX.Element {
  const inputId = useId();

  function handleFile(file: File | undefined): void {
    if (!file) return;
    onUpload(file);
  }

  return (
    <div key={inputId} className="space-y-1.5 text-xs text-[var(--color-foreground)]">
      <ImageDropzone
        label={label}
        value={value}
        onSelectFile={(file) => handleFile(file)}
        onClear={onClear}
        accept="image/*"
        editorHighlight={editorHighlight}
      />
    </div>
  );
}

export function renderTextField({
  field,
  section,
  onSectionFieldChange,
}: DynamicFieldRenderContext): JSX.Element {
  const fieldValue = section.fields[field.name];

  if (field.editorMode === "compactRichText") {
    return (
      <div key={field.name} className="space-y-1">
        <CompactTipTapVariableField
          label={field.label}
          fieldPath={field.name}
          value={String(fieldValue ?? "")}
          minHeightClass="min-h-[40px]"
          onChange={(nextValue) => onSectionFieldChange(field.name, nextValue)}
        />
        {field.helperText ? (
          <p className="text-[11px] text-[var(--color-muted-foreground)]">{field.helperText}</p>
        ) : null}
      </div>
    );
  }

  if (field.editorMode === "richText") {
    return (
      <div key={field.name} className="space-y-1">
        <RichTipTapVariableField
          label={field.label}
          fieldPath={field.name}
          value={String(fieldValue ?? "")}
          onChange={(nextValue) => onSectionFieldChange(field.name, nextValue)}
        />
        {field.helperText ? (
          <p className="text-[11px] text-[var(--color-muted-foreground)]">{field.helperText}</p>
        ) : null}
      </div>
    );
  }

  if (field.multiline) {
    return (
      <div key={field.name} className="text-xs text-[var(--color-foreground)]">
        <div className="flex items-center justify-between gap-2">
          <span>{field.label}</span>
        </div>
        <textarea
          data-editor-field-path={field.name}
          value={String(fieldValue ?? "")}
          onChange={(event) => onSectionFieldChange(field.name, event.target.value)}
          rows={4}
          className="mt-1 min-h-20 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1.5 text-xs text-[var(--color-foreground)]"
        />
        {field.helperText ? (
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            {field.helperText}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div key={field.name} className="text-xs text-[var(--color-foreground)]">
      <div className="flex items-center justify-between gap-2">
        <span>{field.label}</span>
      </div>
      <Input
        data-editor-field-path={field.name}
        type={field.type === "number" ? "number" : "text"}
        value={String(fieldValue ?? "")}
        onChange={(event) =>
          onSectionFieldChange(
            field.name,
            field.type === "number" ? Number(event.target.value || 0) : event.target.value
          )
        }
        className="mt-1 text-xs"
      />
      {field.helperText ? (
        <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">{field.helperText}</p>
      ) : null}
    </div>
  );
}

export function renderToggleField({
  field,
  section,
  onSectionFieldChange,
}: DynamicFieldRenderContext): JSX.Element {
  const checked = Boolean(section.fields[field.name]);
  return (
    <div
      key={field.name}
      className="flex items-center gap-2 text-xs text-[var(--color-foreground)]"
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onSectionFieldChange(field.name, !checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full border transition ${
          checked
            ? "border-emerald-400/60 bg-emerald-500/25"
            : "border-[var(--color-border)] bg-[var(--color-card)]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <button
        type="button"
        className="text-left"
        onClick={() => onSectionFieldChange(field.name, !checked)}
      >
        {field.label}
      </button>
    </div>
  );
}

export function renderImageField({
  field,
  section,
  onSectionFieldChange,
  onSectionImageUpload,
  focusFieldName,
}: DynamicFieldRenderContext): JSX.Element {
  const fieldValue = section.fields[field.name];
  const imageValue = typeof fieldValue === "string" ? fieldValue : "";
  return (
    <ImageFieldControl
      label={field.label}
      value={imageValue}
      onUpload={(file) => onSectionImageUpload(field.name, file)}
      onClear={() => onSectionFieldChange(field.name, "")}
      editorHighlight={focusFieldName === field.name}
    />
  );
}

export function renderColorField({
  field,
  section,
  onSectionFieldChange,
}: DynamicFieldRenderContext): JSX.Element {
  const rawValue = section.fields[field.name];
  const colorValue = typeof rawValue === "string" ? rawValue : "";
  const isDefined = isValidHexColor(colorValue);
  const pickerValue = isDefined ? colorValue : "#d4d4d8";

  return (
    <div key={field.name} className="text-xs text-[var(--color-foreground)]">
      <label className="mb-1 block">{field.label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => onSectionFieldChange(field.name, event.target.value)}
          className="h-7 w-7 cursor-pointer appearance-none overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-card)] p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
          aria-label={field.label}
          title={field.label}
        />
        <button
          type="button"
          onClick={() => onSectionFieldChange(field.name, undefined)}
          className="text-[11px] text-[var(--color-muted-foreground)] underline decoration-dotted underline-offset-2 transition hover:text-[var(--color-foreground)]"
        >
          Limpar
        </button>
        {!isDefined ? (
          <span className="text-[11px] text-[var(--color-muted-foreground)]">Nao selecionada</span>
        ) : null}
      </div>
    </div>
  );
}

export function renderListField({
  field,
  section,
  onSectionFieldChange,
}: DynamicFieldRenderContext): JSX.Element {
  const fieldValue = section.fields[field.name];
  return (
    <label key={field.name} className="block text-xs text-[var(--color-foreground)]">
      {field.label}
      <textarea
        data-editor-field-path={field.name}
        value={Array.isArray(fieldValue) ? fieldValue.join("\n") : ""}
        onChange={(event) =>
          onSectionFieldChange(field.name, event.target.value.split("\n").filter(Boolean))
        }
        className="mt-1 min-h-20 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-xs text-[var(--color-foreground)]"
      />
    </label>
  );
}

export function renderTableField({
  field,
  section,
  onSectionFieldChange,
  toFieldPath,
  focusFieldName,
}: DynamicFieldRenderContext): JSX.Element {
  const rows = Array.isArray(section.fields[field.name])
    ? (section.fields[field.name] as Record<string, string>[])
    : [];
  const includeId = Boolean(field.tableIncludeRowId);

  const maxRows = field.maxRows ?? 99;
  const minRows = field.minRows ?? 0;
  const defaultIcon = field.defaultNewRowIcon ?? "alert-circle";
  const cols = field.columns ?? [];
  const hasPhotoColumn = cols.includes("photo");
  const multilineCols = field.tableMultilineColumns ?? [];
  const isTableMultilineColumn = (column: string): boolean =>
    column === "description" || column === "answer" || multilineCols.includes(column);
  const nonEmptyCount = rows.filter((row) =>
    cols.some((col) => String(row[col] ?? "").trim().length > 0)
  ).length;
  const belowMinRows = minRows > 0 && nonEmptyCount < minRows;

  const columnPlaceholder = (column: string): string => {
    if (column === "name") return "Nome";
    if (column === "subtitle") return "Subtítulo (ex.: empresa ou cidade)";
    if (column === "text" && cols.includes("photo")) return "Texto do depoimento";
    const map: Record<string, string> = {
      title: "Título",
      description: "Descrição",
      estimatedTime: "Tempo estimado (ex.: 2 dias)",
      question: "Pergunta",
      answer: "Resposta",
      item: "Item",
      text: "Texto",
    };
    return map[column] ?? column;
  };

  function renderDataCell(
    row: Record<string, string>,
    rowIndex: number,
    column: string,
    opts?: { growTextToFill?: boolean }
  ): JSX.Element {
    if (column === "icon") {
      return (
        <div className="h-full">
          <IconSelector
            value={String(row[column] ?? defaultIcon)}
            fieldPath={
              toFieldPath?.(field.name, rowIndex, column) ?? `${field.name}[${rowIndex}].${column}`
            }
            className="h-full"
            triggerClassName="h-full"
            onChange={(nextIcon) => {
              const next = [...rows];
              const patch: Record<string, string> = {
                ...next[rowIndex],
                [column]: nextIcon,
              };
              if (includeId && !patch["id"]) patch["id"] = crypto.randomUUID();
              next[rowIndex] = patch;
              onSectionFieldChange(field.name, next);
            }}
          />
        </div>
      );
    }
    if (isTableMultilineColumn(column)) {
      const textareaRows = multilineCols.includes(column) ? 3 : 2;
      const growText = Boolean(opts?.growTextToFill && column === "text");
      const textareaMinH = growText
        ? "h-full min-h-16"
        : multilineCols.includes(column)
          ? "min-h-16"
          : "min-h-14";
      return (
        <textarea
          data-editor-field-path={
            toFieldPath?.(field.name, rowIndex, column) ?? `${field.name}[${rowIndex}].${column}`
          }
          value={row[column] ?? ""}
          onChange={(event) => {
            const next = [...rows];
            const patch: Record<string, string> = {
              ...next[rowIndex],
              [column]: event.target.value,
            };
            if (includeId && !patch["id"]) patch["id"] = crypto.randomUUID();
            next[rowIndex] = patch;
            onSectionFieldChange(field.name, next);
          }}
          rows={textareaRows}
          placeholder={columnPlaceholder(column)}
          className={`w-full resize-y rounded border border-[var(--color-border)] bg-[var(--color-card)] px-1.5 py-1 text-xs text-[var(--color-foreground)] transition-colors focus:border-emerald-400/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${textareaMinH}`}
        />
      );
    }
    return (
      <Input
        data-editor-field-path={
          toFieldPath?.(field.name, rowIndex, column) ?? `${field.name}[${rowIndex}].${column}`
        }
        value={row[column] ?? ""}
        onChange={(event) => {
          const next = [...rows];
          const patch: Record<string, string> = {
            ...next[rowIndex],
            [column]: event.target.value,
          };
          if (includeId && !patch["id"]) patch["id"] = crypto.randomUUID();
          next[rowIndex] = patch;
          onSectionFieldChange(field.name, next);
        }}
        placeholder={column === "text" ? "Benefício" : columnPlaceholder(column)}
        className="text-xs"
      />
    );
  }

  return (
    <div key={field.name} className="rounded-md border border-[var(--color-border)] p-2">
      <p className="mb-2 text-xs text-[var(--color-foreground)]">{field.label}</p>
      {hasPhotoColumn ? (
        <div className="space-y-2.5">
          {rows.map((row, rowIndex) => {
            const nonPhotoColumns = (field.columns ?? []).filter((column) => column !== "photo");
            const photoFieldPath =
              toFieldPath?.(field.name, rowIndex, "photo") ?? `${field.name}[${rowIndex}].photo`;
            const rowKey = String(row["id"] ?? `${field.name}-${rowIndex}`);
            const removeButton =
              rows.length > minRows ? (
                <button
                  type="button"
                  title="Remover linha"
                  onClick={() => {
                    const next = rows.filter((_, i) => i !== rowIndex);
                    onSectionFieldChange(field.name, next);
                  }}
                  className="h-7 rounded border border-[var(--color-border)] px-2 text-[11px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
                >
                  ✕
                </button>
              ) : (
                <span className="inline-block w-7" aria-hidden />
              );

            const testimonialGrid =
              nonPhotoColumns.length === 3 &&
              nonPhotoColumns[0] === "name" &&
              nonPhotoColumns[1] === "subtitle" &&
              nonPhotoColumns[2] === "text";
            const galleryGrid =
              nonPhotoColumns.length === 2 &&
              nonPhotoColumns[0] === "title" &&
              nonPhotoColumns[1] === "description";
            const genericPhotoRowTemplate = `repeat(${nonPhotoColumns.length}, minmax(0, 1fr)) auto`;

            const photoDropzone = (
              <ImageDropzone
                hideLabel
                variant="embedded"
                fillHeight={testimonialGrid || galleryGrid}
                editorHighlight={focusFieldName === photoFieldPath}
                emptyPlaceholder="Arraste ou clique para adicionar uma foto…"
                value={row["photo"] ?? ""}
                onSelectFile={(file) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const next = [...rows];
                    const patch: Record<string, string> = {
                      ...next[rowIndex],
                      photo: String(reader.result ?? ""),
                    };
                    if (includeId && !patch["id"]) patch["id"] = crypto.randomUUID();
                    next[rowIndex] = patch;
                    onSectionFieldChange(field.name, next);
                  };
                  reader.readAsDataURL(file);
                }}
                onClear={() => {
                  const next = [...rows];
                  const patch: Record<string, string> = {
                    ...next[rowIndex],
                    photo: "",
                  };
                  if (includeId && !patch["id"]) patch["id"] = crypto.randomUUID();
                  next[rowIndex] = patch;
                  onSectionFieldChange(field.name, next);
                }}
              />
            );

            return (
              <div
                key={rowKey}
                className="border-b border-[var(--color-border)] pb-3 last:border-b-0 last:pb-0"
              >
                {testimonialGrid ? (
                  <div className="flex min-h-[10.5rem] gap-2">
                    <div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-2">
                      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-1.5">
                        <div className="min-w-0 shrink-0">
                          {renderDataCell(row, rowIndex, "name")}
                        </div>
                        <div className="min-w-0 shrink-0">
                          {renderDataCell(row, rowIndex, "subtitle")}
                        </div>
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                          {renderDataCell(row, rowIndex, "text", { growTextToFill: true })}
                        </div>
                      </div>
                      <div
                        data-editor-field-path={photoFieldPath}
                        className="flex h-full min-h-0 w-[min(100%,9rem)] shrink-0 flex-col sm:w-[min(100%,10.5rem)]"
                      >
                        {photoDropzone}
                      </div>
                    </div>
                    <div className="flex w-9 shrink-0 items-center justify-center self-stretch">
                      {removeButton}
                    </div>
                  </div>
                ) : galleryGrid ? (
                  <div className="flex min-h-[8.5rem] gap-2">
                    <div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-2">
                      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-1.5">
                        <div className="min-w-0 shrink-0">
                          {renderDataCell(row, rowIndex, "title")}
                        </div>
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                          {renderDataCell(row, rowIndex, "description", {
                            growTextToFill: true,
                          })}
                        </div>
                      </div>
                      <div
                        data-editor-field-path={photoFieldPath}
                        className="flex h-full min-h-0 w-[min(100%,9rem)] shrink-0 flex-col sm:w-[min(100%,10.5rem)]"
                      >
                        {photoDropzone}
                      </div>
                    </div>
                    <div className="flex w-9 shrink-0 items-center justify-center self-stretch">
                      {removeButton}
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="grid items-stretch gap-2"
                      style={{ gridTemplateColumns: genericPhotoRowTemplate }}
                    >
                      {nonPhotoColumns.map((column) => (
                        <div key={column} className="flex min-h-0 min-w-0 flex-col justify-end">
                          {renderDataCell(row, rowIndex, column)}
                        </div>
                      ))}
                      <div className="flex w-9 shrink-0 items-center justify-center">
                        {removeButton}
                      </div>
                    </div>
                    <div data-editor-field-path={photoFieldPath} className="mt-1.5 w-full min-w-0">
                      {photoDropzone}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, rowIndex) => {
            const removeButton =
              rows.length > minRows ? (
                <button
                  type="button"
                  title="Remover linha"
                  onClick={() => {
                    const next = rows.filter((_, i) => i !== rowIndex);
                    onSectionFieldChange(field.name, next);
                  }}
                  className="h-7 rounded border border-[var(--color-border)] px-2 text-[11px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
                >
                  ✕
                </button>
              ) : (
                <span className="inline-block w-7" aria-hidden />
              );

            return (
              <div
                key={String(row["id"] ?? `${field.name}-${rowIndex}`)}
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${field.columns?.length ?? 1}, minmax(0, 1fr)) auto`,
                }}
              >
                {(field.columns ?? []).map((column) => (
                  <div key={column} className="min-w-0">
                    {renderDataCell(row, rowIndex, column)}
                  </div>
                ))}
                <div className="flex items-center justify-center">{removeButton}</div>
              </div>
            );
          })}
        </div>
      )}
      {field.helperText ? (
        <p className="text-[11px] text-[var(--color-muted-foreground)]">{field.helperText}</p>
      ) : null}
      {belowMinRows ? (
        <p className="text-[11px] text-amber-200/90">
          Preencha pelo menos {minRows} linha{minRows === 1 ? "" : "s"} com conteúdo.
        </p>
      ) : null}
      <button
        type="button"
        disabled={rows.length >= maxRows}
        onClick={() => {
          if (rows.length >= maxRows) return;
          const empty: Record<string, string> = {
            ...(includeId ? { id: crypto.randomUUID() } : {}),
            ...Object.fromEntries(
              (field.columns ?? []).map((column) => [column, column === "icon" ? defaultIcon : ""])
            ),
          };
          onSectionFieldChange(field.name, [...rows, empty]);
        }}
        className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {field.tableAddRowLabel ?? "Adicionar linha"}
      </button>
    </div>
  );
}

export function renderSelectField({
  field,
  section,
  onSectionFieldChange,
}: DynamicFieldRenderContext): JSX.Element {
  if (field.name === "highlightIcon") {
    return (
      <div key={field.name} className="block text-xs text-[var(--color-foreground)]">
        <p>{field.label}</p>
        <div className="mt-1">
          <IconSelector
            value={String(section.fields[field.name] ?? "zap")}
            fieldPath={field.name}
            onChange={(nextIcon) => onSectionFieldChange(field.name, nextIcon)}
          />
        </div>
        {field.helperText ? (
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            {field.helperText}
          </p>
        ) : null}
      </div>
    );
  }

  const fieldValue = section.fields[field.name];
  const rawSelectedValue = String(fieldValue ?? field.options?.[0]?.value ?? "");
  const selectedValue =
    rawSelectedValue === "left"
      ? "middle-left"
      : rawSelectedValue === "center"
        ? "middle-center"
        : rawSelectedValue === "right"
          ? "middle-right"
          : rawSelectedValue;
  const useDropdown = field.selectDisplay === "dropdown";
  const useGrid = field.selectDisplay === "grid";

  if (useDropdown) {
    const options = field.options ?? [];
    const selected = options.find((option) => option.value === selectedValue);
    return (
      <div key={field.name} className="block text-xs text-[var(--color-foreground)]">
        <p>{field.label}</p>
        <details className="group relative mt-1">
          <summary className="flex h-8 list-none items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-xs text-[var(--color-foreground)] transition hover:border-emerald-500/35 hover:bg-emerald-500/10 marker:content-['']">
            <span className="inline-flex items-center gap-1.5">
              {renderSelectOptionIcon(selected?.icon)}
              <span>{selected?.label ?? "Selecione"}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70 transition group-open:rotate-180" />
          </summary>
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={(event) => {
                  onSectionFieldChange(field.name, option.value);
                  const detailsEl = event.currentTarget.closest("details");
                  detailsEl?.removeAttribute("open");
                }}
                className={`flex h-8 w-full items-center gap-1.5 px-2 text-left text-xs transition ${
                  option.value === selectedValue
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "text-[var(--color-foreground)] hover:bg-emerald-500/10 hover:text-emerald-200"
                }`}
              >
                {renderSelectOptionIcon(option.icon)}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </details>
        {field.helperText ? (
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            {field.helperText}
          </p>
        ) : null}
      </div>
    );
  }

  if (useGrid) {
    const options = field.options ?? [];
    return (
      <div key={field.name} className="block text-xs text-[var(--color-foreground)]">
        <p>{field.label}</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {options.map((option) => {
            const active = selectedValue === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSectionFieldChange(field.name, option.value)}
                className={`flex h-10 w-full items-center justify-center rounded-md border transition ${
                  active
                    ? "border-emerald-400/70 bg-emerald-500/18 text-emerald-200"
                    : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:border-emerald-500/35 hover:bg-emerald-500/10 hover:text-[var(--color-foreground)]"
                }`}
                title={option.label}
                aria-label={option.label}
              >
                {renderSelectOptionIcon(option.icon)}
              </button>
            );
          })}
        </div>
        {field.helperText ? (
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
            {field.helperText}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div key={field.name} className="block text-xs text-[var(--color-foreground)]">
      <p>{field.label}</p>
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        {(field.options ?? []).map((option) => {
          const active = String(fieldValue ?? field.options?.[0]?.value ?? "") === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSectionFieldChange(field.name, option.value)}
              className={segmentedButtonClass(active)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {field.helperText ? (
        <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">{field.helperText}</p>
      ) : null}
    </div>
  );
}

export function renderRangeField({
  field,
  section,
  onSectionFieldChange,
}: DynamicFieldRenderContext): JSX.Element {
  const fieldValue = section.fields[field.name];
  const min = Number.isFinite(field.min) ? Number(field.min) : 0;
  const max = Number.isFinite(field.max) ? Number(field.max) : 100;
  const step = Number.isFinite(field.step)
    ? Number(field.step)
    : field.numberMode === "decimal"
      ? 0.1
      : 1;
  const rawValue = Number(fieldValue ?? min);
  const baseValue = Number.isFinite(rawValue) ? rawValue : min;
  const clamped = Math.min(max, Math.max(min, baseValue));
  const sliderValue = field.numberMode === "int" ? Math.round(clamped) : clamped;
  const stepPrecision = String(step).includes(".") ? (String(step).split(".")[1]?.length ?? 0) : 0;
  const valueLabel =
    field.numberMode === "decimal" && stepPrecision > 0
      ? sliderValue.toFixed(stepPrecision)
      : String(Math.round(sliderValue));

  return (
    <div key={field.name} className="space-y-1.5">
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
        <span>{field.label}</span>
        <span className="min-w-10 text-right tabular-nums">
          {valueLabel}
          {field.unit ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          onSectionFieldChange(
            field.name,
            field.numberMode === "decimal" ? nextValue : Math.round(nextValue)
          );
        }}
        className="h-1.5 w-full cursor-pointer accent-emerald-500"
      />
      {field.helperText ? (
        <p className="text-[11px] text-[var(--color-muted-foreground)]">{field.helperText}</p>
      ) : null}
    </div>
  );
}

function ProposalEquipmentLinesField({
  field,
  section,
  onSectionFieldChange,
}: DynamicFieldRenderContext): JSX.Element {
  const lines = parseProposalEquipmentLines(section.fields[field.name]);
  const legacyManual = parseProposalEquipmentItems(section.fields["equipmentItems"]);
  const hasLegacyPreview =
    lines.length === 0 &&
    legacyManual.some(
      (it) =>
        it.title.trim() ||
        it.subtitle.trim() ||
        it.imageUrl.trim() ||
        it.specs.some((s) => s.label || s.value)
    );

  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchProducts({ pageSize: 500, active: true });
        if (!cancelled) {
          setProducts(res.data);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  function commit(next: ProposalEquipmentLine[]) {
    onSectionFieldChange(field.name, next);
  }

  function setQuantity(index: number, quantity: number) {
    const q = Math.max(1, Math.floor(Number(quantity)) || 1);
    commit(lines.map((line, i) => (i === index ? { ...line, quantity: q } : line)));
  }

  function removeAt(index: number) {
    commit(lines.filter((_, i) => i !== index));
  }

  return (
    <div key={field.name} className="rounded-md border border-[var(--color-border)] p-2">
      <p className="mb-2 text-xs font-medium text-[var(--color-foreground)]">{field.label}</p>
      {field.helperText ? (
        <p className="mb-2 text-[11px] text-[var(--color-muted-foreground)]">{field.helperText}</p>
      ) : null}
      {hasLegacyPreview ? (
        <p className="mb-2 text-[11px] text-[var(--color-muted-foreground)]">
          Este template ainda tem equipamentos configurados manualmente (formato antigo). A prévia
          usa esses dados até você adicionar produtos do catálogo abaixo.
        </p>
      ) : null}

      <div className="space-y-3">
        {lines.map((line, index) => {
          const p = byId.get(line.productId);
          return (
            <div
              key={`${line.productId}-${index}`}
              className="flex flex-col gap-2 rounded border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--color-foreground)]">
                  {p ? p.name : `ID não resolvido (${line.productId})`}
                </p>
                {p ? (
                  <p className="text-[11px] text-[var(--color-muted-foreground)]">
                    {p.category.name} · {p.brand.name}
                  </p>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-[11px] text-[var(--color-muted-foreground)]">
                Qtd.
                <Input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => setQuantity(index, Number(e.target.value))}
                  className="w-20 text-xs [&_.MuiOutlinedInput-root]:min-h-8"
                />
              </label>
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="text-[11px] text-red-300/90 underline-offset-2 hover:underline sm:self-center"
              >
                Remover
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function renderProposalEquipmentLinesField(context: DynamicFieldRenderContext): JSX.Element {
  return <ProposalEquipmentLinesField {...context} />;
}
