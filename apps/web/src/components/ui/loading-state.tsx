"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { cn } from "@energivia/utils";

interface LoadingStateProps {
  label?: string;
  description?: string;
  fullScreen?: boolean;
  className?: string;
  compact?: boolean;
}

export function LoadingState({
  label = "Carregando",
  description = "Só mais um instante...",
  fullScreen = false,
  className,
  compact = false,
}: LoadingStateProps): JSX.Element {
  return (
    <Box
      className={cn(
        "flex items-center justify-center bg-[var(--color-background)] px-4",
        fullScreen ? "min-h-screen" : "min-h-[40vh]",
        className
      )}
    >
      <Card
        elevation={0}
        className={cn(
          "w-full max-w-sm border border-[var(--color-border)] bg-[var(--color-card)] text-center shadow-[0_10px_30px_rgba(2,6,23,0.08)]",
          compact ? "p-4" : "p-6"
        )}
        sx={{
          bgcolor: "var(--color-card)",
          color: "var(--color-foreground)",
          borderRadius: "1rem",
        }}
      >
        <Box
          className={cn(
            "mx-auto flex items-center justify-center rounded-full bg-[var(--color-accent)]",
            compact ? "mb-2 h-9 w-9" : "mb-3 h-11 w-11"
          )}
        >
          <CircularProgress
            size={compact ? 18 : 22}
            thickness={5}
            sx={{ color: "var(--color-primary)" }}
          />
        </Box>
        <Typography
          component="p"
          className={cn(
            "font-medium text-[var(--color-foreground)]",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {label}
        </Typography>
        {description ? (
          <Typography
            component="p"
            className={cn(
              "mt-1 text-[var(--color-muted-foreground)]",
              compact ? "text-[11px]" : "text-xs"
            )}
          >
            {description}
          </Typography>
        ) : null}
      </Card>
    </Box>
  );
}
