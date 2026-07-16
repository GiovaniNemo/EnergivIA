"use client";

import * as React from "react";
import FormLabel from "@mui/material/FormLabel";
import { cn } from "@energivia/utils";

export type LabelProps = Omit<React.LabelHTMLAttributes<HTMLLabelElement>, "color">;

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <FormLabel
    ref={ref}
    className={cn("text-sm font-medium leading-none text-[var(--color-foreground)]", className)}
    sx={{
      "&.Mui-disabled": { opacity: 0.7 },
      color: "var(--color-foreground)",
    }}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
