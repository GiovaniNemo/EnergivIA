"use client";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useMemo, type ReactNode } from "react";
import { useTheme as useAppTheme } from "@/components/providers/theme-provider";

function createAdminTheme(mode: "light" | "dark") {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#0d9488",
        light: "#5eead4",
        dark: "#0f766e",
        contrastText: "#fff",
      },
      secondary: {
        main: "#f59e0b",
        light: "#fcd34d",
        dark: "#d97706",
        contrastText: "#fff",
      },
      background: {
        default: isDark ? "#0f172a" : "#f8fafc",
        paper: isDark ? "#1a1a1a" : "#ffffff",
      },
      success: { main: "#10b981" },
      error: { main: "#ef4444" },
      warning: { main: "#f59e0b" },
      text: {
        primary: isDark ? "#e2e8f0" : "#0f172a",
        secondary: isDark ? "#94a3b8" : "#475569",
        disabled: isDark ? "#64748b" : "#94a3b8",
      },
      divider: isDark ? "#2a2a2a" : "#e2e8f0",
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'var(--font-geist-sans), "Inter", system-ui, sans-serif',
      h1: { fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em" },
      h2: { fontSize: "1.375rem", fontWeight: 600, letterSpacing: "-0.01em" },
      h3: { fontSize: "1.125rem", fontWeight: 600 },
      h4: { fontSize: "1rem", fontWeight: 600 },
      h5: { fontSize: "0.9375rem", fontWeight: 600 },
      h6: { fontSize: "0.875rem", fontWeight: 600 },
      body1: { fontSize: "0.9375rem", lineHeight: 1.5 },
      body2: { fontSize: "0.875rem", lineHeight: 1.5 },
      button: { textTransform: "none", fontWeight: 600 },
      caption: { fontSize: "0.8125rem", color: isDark ? "#94a3b8" : "#64748b" },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: isDark ? "#0f172a" : "#f8fafc" },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none", fontWeight: 600, borderRadius: 10 },
          contained: { boxShadow: isDark ? "none" : "0 1px 3px 0 rgb(0 0 0 / 0.08)" },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: isDark
              ? "0 1px 2px 0 rgb(0 0 0 / 0.45)"
              : "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
            border: `1px solid ${isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(0,0,0,0.06)"}`,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:last-child td": { borderBottom: 0 },
            "&:hover": {
              backgroundColor: isDark ? "rgba(13, 148, 136, 0.14)" : "rgba(13, 148, 136, 0.04)",
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { fontSize: "0.875rem", padding: "12px 16px" },
          head: {
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
            color: isDark ? "#94a3b8" : "#64748b",
            backgroundColor: isDark ? "#171717" : "#f8fafc",
            borderBottom: `1px solid ${isDark ? "#2a2a2a" : "#e2e8f0"}`,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: "none", fontWeight: 600, fontSize: "0.9375rem" },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 3, borderRadius: "3px 3px 0 0" },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 10,
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#0d9488" },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 2 },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 500 },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 16 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: isDark ? "rgba(13, 148, 136, 0.2)" : "rgba(13, 148, 136, 0.08)",
            },
          },
        },
      },
    },
  });
}

export function AdminThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const { resolvedTheme } = useAppTheme();
  const theme = useMemo(() => createAdminTheme(resolvedTheme), [resolvedTheme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
