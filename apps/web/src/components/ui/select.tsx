"use client";

import * as React from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

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

import MuiSelect, { SelectProps as MuiSelectProps } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SelectProps = Omit<MuiSelectProps<any>, "input" | "variant" | "inputProps"> & {
  label?: string;
  id?: string;
  className?: string;
  fullWidth?: boolean;
  inputProps?: React.ComponentProps<"select">;
};

const Select = React.forwardRef<unknown, SelectProps>(
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

    const childrenMapped = React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type === "option") {
        return (
          <MenuItem key={child.key} value={child.props.value} disabled={child.props.disabled}>
            {child.props.children}
          </MenuItem>
        );
      }
      return child;
    });

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
        <MuiSelect
          {...rest}
          disabled={disabled}
          id={fieldId}
          variant="outlined"
          input={outlinedInput}
          inputRef={ref}
          sx={{
            ...selectOutlinedSx,
            "& .MuiSelect-select": {
              py: 1,
              pl: 1.5,
              pr: 3.25,
              fontSize: "0.875rem",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
            },
          }}
          MenuProps={{
            disablePortal: true,
            PaperProps: {
              sx: {
                bgcolor: "var(--color-background)",
                color: "var(--color-foreground)",
                border: "1px solid var(--color-border)",
                backgroundImage: "none",
                "& .MuiMenuItem-root": {
                  fontSize: "0.875rem",
                },
                "& .MuiMenuItem-root.Mui-selected": {
                  bgcolor: "var(--color-muted)",
                },
                "& .MuiMenuItem-root.Mui-selected:hover": {
                  bgcolor: "var(--color-muted)",
                },
                "& .MuiMenuItem-root:hover": {
                  bgcolor: "var(--color-muted)",
                },
              },
            },
          }}
          inputProps={{
            id: fieldId,
            ...(hasLabel && labelId ? { "aria-labelledby": labelId } : {}),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(inputProps as any),
          }}
          displayEmpty
          renderValue={(selected) => {
            let selectedNode: React.ReactNode = selected as string;
            React.Children.forEach(childrenMapped, (child) => {
              if (
                React.isValidElement<{ value?: unknown; children?: React.ReactNode }>(child) &&
                child.props.value === selected
              ) {
                selectedNode = child.props.children;
              }
            });
            return selectedNode || "";
          }}
        >
          {childrenMapped}
        </MuiSelect>
      </FormControl>
    );
  }
);
Select.displayName = "Select";

export { Select };
