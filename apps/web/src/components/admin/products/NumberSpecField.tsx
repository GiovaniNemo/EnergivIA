"use client";

import { useEffect, useState } from "react";
import {
  useFormContext,
  Controller,
  type ControllerRenderProps,
  type FieldError,
} from "react-hook-form";
import { TextField } from "@mui/material";

function cleanNumericString(raw: string, integer: boolean): string {
  if (!raw) return "";
  if (integer) {
    return raw.replace(/\D/g, "");
  }
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(",", ".");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    return parts[0] + "." + parts.slice(1).join("");
  }
  return cleaned;
}

function toNumber(raw: string, integer: boolean): number | undefined {
  const cleaned = cleanNumericString(raw, integer);
  if (cleaned === "" || cleaned === "." || cleaned === ",") return undefined;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return undefined;
  return integer ? Math.trunc(n) : n;
}

function toDisplay(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") {
    return Number.isNaN(value) ? "" : String(value);
  }
  if (typeof value === "string") {
    const cleaned = value.trim();
    const match = cleaned.match(/^-?\d+([.,]\d+)?/);
    return match ? match[0] : "";
  }
  return "";
}

interface NumberSpecFieldProps {
  name: string;
  label: string;
  helperText?: string;
  integer?: boolean;
}

export function NumberSpecField({
  name,
  label,
  helperText,
  integer = false,
}: NumberSpecFieldProps): JSX.Element {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <NumberSpecInput
          field={field}
          error={fieldState.error}
          label={label}
          helperText={helperText}
          integer={integer}
        />
      )}
    />
  );
}

function NumberSpecInput({
  field,
  error,
  label,
  helperText,
  integer,
}: {
  field: ControllerRenderProps;
  error?: FieldError;
  label: string;
  helperText?: string;
  integer: boolean;
}): JSX.Element {
  const [text, setText] = useState<string>(() => toDisplay(field.value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(toDisplay(field.value));
    }
  }, [field.value, focused]);

  const sanitizedId = `spec-field-${field.name.replace(/[.[\]]/g, "-")}`;

  return (
    <TextField
      id={sanitizedId}
      name={field.name}
      label={label}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        const cleaned = cleanNumericString(raw, integer);
        setText(cleaned);
        const num = toNumber(cleaned, integer);
        field.onChange(num);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        field.onBlur();
        const num = toNumber(text, integer);
        setText(toDisplay(num));
        field.onChange(num);
      }}
      error={Boolean(error)}
      helperText={error?.message ?? helperText}
      autoComplete="new-password"
      inputProps={{
        inputMode: integer ? "numeric" : "decimal",
        autoComplete: "off",
        "data-lpignore": "true",
        "data-1p-ignore": "true",
        "data-form-type": "other",
      }}
      fullWidth
      size="small"
    />
  );
}
