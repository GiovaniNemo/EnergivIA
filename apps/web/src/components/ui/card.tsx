"use client";

import * as React from "react";
import MuiCard from "@mui/material/Card";
import MuiCardContent from "@mui/material/CardContent";
import MuiCardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import { cn } from "@energivia/utils";

const Card = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof MuiCard>>(
  ({ className, sx, ...props }, ref) => (
    <MuiCard
      ref={ref}
      elevation={0}
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-sm",
        className
      )}
      sx={{
        bgcolor: "var(--color-card)",
        color: "var(--color-card-foreground)",
        borderColor: "var(--color-border)",
        ...sx,
      }}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <Typography
      ref={ref as React.Ref<HTMLHeadingElement>}
      component="h3"
      variant="h6"
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
      sx={{ color: "var(--color-foreground)" }}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <Typography
    ref={ref as React.Ref<HTMLParagraphElement>}
    component="p"
    variant="body2"
    className={cn("text-sm text-[var(--color-muted-foreground)]", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof MuiCardContent>>(
  ({ className, sx, ...props }, ref) => (
    <MuiCardContent
      ref={ref}
      className={cn("p-6 pt-0", className)}
      sx={{ "&:last-child": { pb: 3 }, ...sx }}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof MuiCardActions>>(
  ({ className, sx, ...props }, ref) => (
    <MuiCardActions
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      sx={{ paddingTop: 0, ...sx }}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
