"use client";

import * as React from "react";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import type { OutlinedInputProps } from "@mui/material/OutlinedInput";
import { cn } from "@energivia/utils";

type InputProps = Omit<
  OutlinedInputProps,
  "size" | "variant" | "startAdornment" | "endAdornment" | "label"
> &
  Pick<
    React.InputHTMLAttributes<HTMLInputElement>,
    | "step"
    | "min"
    | "max"
    | "minLength"
    | "maxLength"
    | "pattern"
    | "inputMode"
    | "list"
    | "autoComplete"
    | "name"
  > & {
    label?: string;
    helperText?: React.ReactNode;
    fullWidth?: boolean;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
  };

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      helperText,
      fullWidth = true,
      id,
      disabled,
      startAdornment,
      endAdornment,
      step,
      min,
      max,
      minLength,
      maxLength,
      pattern,
      inputMode,
      list,
      autoComplete,
      name,
      ...props
    },
    ref
  ) => {
    const autoId = React.useId();
    const fieldId = id ?? `input-${autoId.replace(/:/g, "")}`;
    const hasLabel = Boolean(label?.trim());
    const labelId = hasLabel ? `${fieldId}-label` : undefined;

    return (
      <FormControl fullWidth={fullWidth} size="small" variant="outlined" disabled={disabled}>
        {hasLabel ? (
          <InputLabel id={labelId} htmlFor={fieldId}>
            {label}
          </InputLabel>
        ) : null}
        <OutlinedInput
          {...(props as Omit<OutlinedInputProps, "size" | "variant">)}
          id={fieldId}
          inputRef={ref}
          type={type}
          label={hasLabel ? label : undefined}
          startAdornment={
            startAdornment ? (
              <InputAdornment position="start">{startAdornment}</InputAdornment>
            ) : undefined
          }
          endAdornment={
            endAdornment ? (
              <InputAdornment position="end">{endAdornment}</InputAdornment>
            ) : undefined
          }
          className={cn("rounded-lg", className)}
          sx={{
            minHeight: 40,
            borderRadius: 2,
            bgcolor: "var(--color-background)",
            color: "var(--color-foreground)",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--color-input)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--color-border)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--color-ring)",
              borderWidth: 2,
            },
            "&.Mui-focused": { boxShadow: "none" },
            "&.Mui-disabled": { opacity: 0.5 },
            "& input": {
              py: 1,
              px: 1.5,
              fontSize: "0.875rem",
              "&::placeholder": {
                color: "var(--color-muted-foreground)",
                opacity: 1,
              },
            },
            "& textarea": {
              py: 1,
              px: 1.5,
              fontSize: "0.875rem",
              "&::placeholder": {
                color: "var(--color-muted-foreground)",
                opacity: 1,
              },
            },
          }}
          inputProps={{
            ...(labelId ? { "aria-labelledby": labelId } : {}),
            ...(step !== undefined ? { step } : {}),
            ...(min !== undefined ? { min } : {}),
            ...(max !== undefined ? { max } : {}),
            ...(minLength !== undefined ? { minLength } : {}),
            ...(maxLength !== undefined ? { maxLength } : {}),
            ...(pattern !== undefined ? { pattern } : {}),
            ...(inputMode !== undefined ? { inputMode } : {}),
            ...(list !== undefined ? { list } : {}),
            ...(autoComplete !== undefined ? { autoComplete } : {}),
            ...(name !== undefined ? { name } : {}),
          }}
        />
        {helperText ? (
          <FormHelperText sx={{ marginLeft: 0, color: "var(--color-muted-foreground)" }}>
            {helperText}
          </FormHelperText>
        ) : null}
      </FormControl>
    );
  }
);
Input.displayName = "Input";

export { Input };
