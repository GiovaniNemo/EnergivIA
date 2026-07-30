import type { Metadata } from "next";
import * as Sentry from "@sentry/nextjs";
import { Inter, Montserrat, Open_Sans, Roboto } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { RouteProgress } from "@/components/layout/route-progress";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-open-sans",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-montserrat",
});

export function generateMetadata(): Metadata {
  return {
    title: "EnergivIA",
    other: {
      ...Sentry.getTraceData(),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  const themeInitScript = `
    (function () {
      try {
        var storageKey = "energivia-theme";
        var root = document.documentElement;
        var stored = localStorage.getItem(storageKey);
        var isValid = stored === "light" || stored === "dark" || stored === "system";
        var theme = isValid ? stored : "system";
        var resolved = theme === "system"
          ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
          : theme;
        root.classList.remove("light", "dark");
        root.classList.add(resolved);
        root.style.colorScheme = resolved;
      } catch (e) {
        document.documentElement.classList.add("light");
        document.documentElement.style.colorScheme = "light";
      }
    })();
  `;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${inter.variable} ${roboto.variable} ${openSans.variable} ${montserrat.variable} font-sans antialiased min-h-screen flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)]`}
      >
        <div className="flex min-h-screen flex-1 flex-col">
          <ThemeProvider defaultTheme="system" storageKey="energivia-theme">
            <Auth0Provider>
              <QueryProvider>
                <RouteProgress />
                <div className="flex min-h-0 flex-1 flex-col">{children}</div>
              </QueryProvider>
            </Auth0Provider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
