"use client";

import * as React from "react";
import MuiButton from "@mui/material/Button";
import type { ButtonProps as MuiButtonProps } from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { cn } from "@energivia/utils";

const buttonVariants = {
  default: "contained",
  outline: "outlined",
  ghost: "text",
} as const;

const buttonSizes = {
  default: "medium",
  sm: "small",
  lg: "large",
  icon: "medium",
} as const;

export type ButtonProps = Omit<MuiButtonProps, "variant" | "size" | "color"> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", sx, ...props }, ref) => {
    const muiVariant = buttonVariants[variant];
    const muiSize = buttonSizes[size];

    if (size === "icon") {
      return (
        <IconButton
          ref={ref}
          color={variant === "default" ? "primary" : "inherit"}
          size="medium"
          className={cn("rounded-lg", className)}
          sx={{
            width: 40,
            height: 40,
            border:
              variant === "outline"
                ? "1px solid var(--color-border)"
                : variant === "ghost"
                  ? "none"
                  : undefined,
            bgcolor:
              variant === "default"
                ? "var(--color-primary)"
                : variant === "outline"
                  ? "color-mix(in srgb, var(--color-muted) 35%, transparent)"
                  : "transparent",
            color:
              variant === "default" ? "var(--color-primary-foreground)" : "var(--color-foreground)",
            "&:hover": {
              bgcolor:
                variant === "default"
                  ? "color-mix(in srgb, var(--color-primary) 88%, black)"
                  : "var(--color-accent)",
              color: variant === "default" ? undefined : "var(--color-accent-foreground)",
              borderColor: variant === "outline" ? "var(--color-border)" : undefined,
            },
            ...sx,
          }}
          {...props}
        />
      );
    }

    return (
      <MuiButton
        ref={ref}
        variant={muiVariant as "contained" | "outlined" | "text"}
        size={muiSize as "small" | "medium" | "large"}
        disableElevation
        className={cn("rounded-lg font-medium normal-case", className)}
        sx={{
          textTransform: "none",
          gap: 1,
          ...(variant === "default" && {
            bgcolor: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
            "&:hover": { bgcolor: "color-mix(in srgb, var(--color-primary) 90%, black)" },
          }),
          ...(variant === "outline" && {
            borderColor: "var(--color-border)",
            bgcolor: "color-mix(in srgb, var(--color-muted) 35%, transparent)",
            color: "var(--color-foreground)",
            "&:hover": {
              borderColor: "var(--color-border)",
              bgcolor: "var(--color-accent)",
              color: "var(--color-accent-foreground)",
            },
          }),
          ...(variant === "ghost" && {
            color: "var(--color-foreground)",
            "&:hover": {
              bgcolor: "var(--color-accent)",
              color: "var(--color-accent-foreground)",
            },
          }),
          ...(size === "lg" && { minHeight: 44, px: 3, py: 1.25, fontSize: "0.9375rem" }),
          ...sx,
        }}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
