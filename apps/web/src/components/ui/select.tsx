"use client";

import * as React from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import NativeSelect from "@mui/material/NativeSelect";
import OutlinedInput from "@mui/material/OutlinedInput";
import { cn } from "@energivia/utils";

const selectOutlinedSx = {
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
  "& select": {
    py: 1,
    pl: 1.5,
    pr: 3.25,
    fontSize: "0.875rem",
    fontFamily: "inherit",
  },
} as const;

export type SelectProps = Omit<
  React.ComponentProps<typeof NativeSelect>,
  "input" | "variant" | "inputProps"
> & {
  label?: string;
  id?: string;
  className?: string;
  fullWidth?: boolean;
  inputProps?: React.ComponentProps<"select">;
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, id: idProp, fullWidth = true, children, inputProps, disabled, ...rest },
    ref
  ) => {
    const autoId = React.useId();
    const fieldId = idProp ?? `select-${autoId.replace(/:/g, "")}`;
    const hasLabel = Boolean(label?.trim());
    const labelId = hasLabel ? `${fieldId}-label` : undefined;

    const outlinedInput = (
      <OutlinedInput notched={hasLabel} label={hasLabel ? label : undefined} id={fieldId} />
    );

    return (
      <FormControl
        fullWidth={fullWidth}
        size="small"
        variant="outlined"
        className={cn("rounded-lg", className)}
        disabled={disabled}
      >
        {hasLabel ? (
          <InputLabel id={labelId} htmlFor={fieldId} shrink>
            {label}
          </InputLabel>
        ) : null}
        <NativeSelect
          {...rest}
          disabled={disabled}
          id={fieldId}
          variant="outlined"
          input={outlinedInput}
          inputRef={ref}
          sx={selectOutlinedSx}
          inputProps={{
            id: fieldId,
            ...(hasLabel && labelId ? { "aria-labelledby": labelId } : {}),
            ...inputProps,
          }}
        >
          {children}
        </NativeSelect>
      </FormControl>
    );
  }
);
Select.displayName = "Select";

export { Select };
