"use client";

import { useEffect, useState } from "react";
import {
  useFormContext,
  Controller,
  type ControllerRenderProps,
  type FieldError,
} from "react-hook-form";
import { TextField } from "@mui/material";

function toNumber(raw: string, integer: boolean): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n)) return NaN;
  return integer ? Math.trunc(n) : n;
}

function toDisplay(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return Number.isNaN(value) ? "" : String(value).replace(".", ",");
  return String(value);
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
    if (!focused) setText(toDisplay(field.value));
  }, [field.value, focused]);

  const pattern = integer ? /^[0-9]*$/ : /^[0-9]*[.,]?[0-9]*$/;

  return (
    <TextField
      label={label}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        if (!pattern.test(raw)) return;
        setText(raw);
        field.onChange(toNumber(raw, integer));
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        field.onBlur();
        setText(toDisplay(field.value));
      }}
      error={Boolean(error)}
      helperText={error?.message ?? helperText}
      inputProps={{ inputMode: integer ? "numeric" : "decimal" }}
      fullWidth
      size="small"
    />
  );
}
