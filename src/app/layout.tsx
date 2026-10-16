import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { STANDALONE_BLOCKING_SCRIPT } from "@/lib/pwa/standalone-blocking-script";
import { THEME_BLOCKING_SCRIPT } from "@/lib/theme/blocking-script";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "@/components/arc/foundation.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Haus POS",
    template: "%s · Haus POS",
  },
  description:
    "Sistema POS moderno para restaurantes en Colombia — mesas, inventario, caja e integración Siigo.",
  applicationName: "Haus POS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Haus",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      data-accent="neutral"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script
          id="haus-theme-init"
          dangerouslySetInnerHTML={{ __html: THEME_BLOCKING_SCRIPT }}
        />
        <script
          id="haus-standalone-init"
          dangerouslySetInnerHTML={{ __html: STANDALONE_BLOCKING_SCRIPT }}
        />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
