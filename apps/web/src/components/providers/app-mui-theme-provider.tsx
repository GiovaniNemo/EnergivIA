"use client";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useMemo, type ReactNode } from "react";

function createAppShellMuiTheme() {
  return createTheme({
    typography: {
      fontFamily: "var(--font-sans)",
      fontSize: 14,
    },
    shape: { borderRadius: 8 },
    components: {
      MuiDialogContent: {
        styleOverrides: {
          root: {
            color: "var(--color-foreground)",
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          body2: {
            color: "var(--color-muted-foreground)",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 40,
            borderRadius: 8,
            backgroundColor: "var(--color-background)",
            color: "var(--color-foreground)",
            transition: "border-color 0.15s ease",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--color-input)",
              borderWidth: 1,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--color-border)",
            },
            "&.Mui-focused": {
              boxShadow: "none",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--color-ring)",
              borderWidth: 2,
            },
            "&.Mui-error .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--color-destructive)",
            },
            "&.Mui-disabled": {
              opacity: 0.5,
            },
          },
          input: {
            padding: "8px 12px",
            fontSize: "0.875rem",
          },
          inputSizeSmall: {
            padding: "8px 12px",
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            "&.Mui-focused": {
              boxShadow: "none",
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: "var(--color-muted-foreground)",
            fontSize: "0.875rem",
            "&.Mui-focused": {
              color: "var(--color-ring)",
            },
            "&.Mui-error": {
              color: "var(--color-destructive)",
            },
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            fontSize: "0.75rem",
            color: "var(--color-muted-foreground)",
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              paddingTop: 4,
              paddingBottom: 4,
            },
          },
          paper: {
            marginTop: 4,
            backgroundColor: "var(--color-popover)",
            color: "var(--color-popover-foreground)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgb(0 0 0 / 0.18)",
          },
          listbox: {
            padding: 4,
            backgroundColor: "var(--color-popover)",
            fontSize: "0.875rem",
          },
          option: {
            borderRadius: 6,
            minHeight: 36,
            "&[aria-selected='true']": {
              backgroundColor: "var(--color-accent)",
              color: "var(--color-accent-foreground)",
            },
            "&.Mui-focused": {
              backgroundColor: "var(--color-muted)",
            },
            "&.Mui-focused.Mui-focusVisible": {
              backgroundColor: "var(--color-muted)",
            },
          },
          popupIndicator: {
            color: "var(--color-muted-foreground)",
          },
          clearIndicator: {
            color: "var(--color-muted-foreground)",
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            color: "var(--color-muted-foreground)",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 8,
          },
          containedPrimary: {
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
            boxShadow: "0 1px 4px rgba(76, 175, 80, 0.22)",
            "&:hover": {
              backgroundColor: "var(--color-primary-600)",
              boxShadow: "0 3px 10px rgba(76, 175, 80, 0.32)",
            },
            "&:active": {
              transform: "translateY(1px)",
            },
            "&.Mui-disabled": {
              backgroundColor: "var(--color-muted)",
              color: "var(--color-muted-foreground)",
              opacity: 0.85,
            },
          },
          outlinedPrimary: {
            borderColor: "var(--color-border)",
            color: "var(--color-foreground)",
            "&:hover": {
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-muted)",
            },
            "&.Mui-disabled": {
              borderColor: "var(--color-border)",
              color: "var(--color-muted-foreground)",
            },
          },
          textPrimary: {
            color: "var(--color-ring)",
            "&:hover": {
              backgroundColor: "var(--color-muted)",
            },
          },
          textInherit: {
            color: "var(--color-muted-foreground)",
            "&:hover": {
              backgroundColor: "var(--color-muted)",
            },
          },
          containedError: {
            backgroundColor: "var(--color-destructive)",
            color: "var(--color-destructive-foreground)",
            "&:hover": {
              filter: "brightness(0.95)",
            },
          },
          outlinedError: {
            borderColor: "var(--color-destructive)",
            color: "var(--color-destructive)",
            "&:hover": {
              borderColor: "var(--color-destructive)",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
            },
          },
        },
      },
    },
  });
}

export function AppMuiThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const theme = useMemo(() => createAppShellMuiTheme(), []);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
