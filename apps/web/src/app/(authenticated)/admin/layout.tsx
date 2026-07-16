"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminThemeProvider } from "@/components/admin/theme-provider";
import { Box, Tabs, Tab, Paper, Typography } from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ViewQuiltOutlinedIcon from "@mui/icons-material/ViewQuiltOutlined";

const tabs = [
  { label: "Produtos", href: "/admin/produtos", icon: <Inventory2OutlinedIcon fontSize="small" /> },
  { label: "Marcas", href: "/admin/marcas", icon: <CategoryOutlinedIcon fontSize="small" /> },
  {
    label: "Distribuidores",
    href: "/admin/distribuidores",
    icon: <LocalShippingOutlinedIcon fontSize="small" />,
  },
  {
    label: "Modelos de template",
    href: "/admin/modelos-template",
    icon: <ViewQuiltOutlinedIcon fontSize="small" />,
  },
];

function isTemplateBlueprintEditorPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/$/, "") || "/";
  return normalized.startsWith("/admin/modelos-template/");
}

export default function AdminLayout({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const blueprintEditorFullscreen = isTemplateBlueprintEditorPath(pathname);

  if (blueprintEditorFullscreen) {
    return <AdminThemeProvider>{children}</AdminThemeProvider>;
  }

  const tabValue = pathname?.startsWith("/admin/marcas")
    ? "/admin/marcas"
    : pathname?.startsWith("/admin/distribuidores")
      ? "/admin/distribuidores"
      : pathname?.startsWith("/admin/modelos-template")
        ? "/admin/modelos-template"
        : "/admin/produtos";

  return (
    <AdminThemeProvider>
      <Box sx={{ minHeight: "100vh", bgcolor: "var(--color-card)", pb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 0,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            px: 3,
            py: 2,
          }}
        >
          <Box sx={{ maxWidth: 1200, mx: "auto" }}>
            <Typography
              variant="h1"
              sx={{ fontSize: "1.5rem", fontWeight: 700, color: "text.primary" }}
            >
              Admin · Catálogo
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Gerencie produtos, marcas, distribuidores e modelos de template de proposta.
            </Typography>
            <Tabs
              value={tabValue}
              sx={{
                mt: 2,
                minHeight: 44,
                "& .MuiTab-root": { minHeight: 44, gap: 1 },
                "& .Mui-selected": { color: "primary.main" },
              }}
            >
              {tabs.map(({ label, href, icon }) => (
                <Tab
                  key={href}
                  label={label}
                  value={href}
                  icon={icon}
                  iconPosition="start"
                  component={Link}
                  href={href}
                  sx={{ textTransform: "none" }}
                />
              ))}
            </Tabs>
          </Box>
        </Paper>

        <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, pt: 3 }}>{children}</Box>
      </Box>
    </AdminThemeProvider>
  );
}
