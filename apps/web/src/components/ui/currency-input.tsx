"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { maskMoneyBrlFromDigits, parseMoneyBrlDisplay } from "@energivia/utils";

export type CurrencyInputProps = {
  value: number | null;
  onValueChange: (value: number | null) => void;
  label?: string;
  helperText?: React.ReactNode;
  id?: string;
  name?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  startAdornment?: React.ReactNode;
  "aria-label"?: string;
};

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    { value, onValueChange, placeholder = "0,00", startAdornment = "R$", ...rest },
    ref
  ): JSX.Element {
    const display =
      value === null || Number.isNaN(value)
        ? ""
        : maskMoneyBrlFromDigits(String(Math.round(value * 100)));

    return (
      <Input
        {...rest}
        ref={ref}
        inputMode="numeric"
        placeholder={placeholder}
        startAdornment={startAdornment ?? undefined}
        value={display}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) {
            onValueChange(null);
            return;
          }
          onValueChange(parseMoneyBrlDisplay(maskMoneyBrlFromDigits(raw)));
        }}
      />
    );
  }
);
