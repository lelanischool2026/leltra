import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PWAProvider } from "@/components/pwa-provider";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#E31E24",
};

export const metadata: Metadata = {
  title: "LSDRAS - Lelani School Daily Reporting System",
  description: "Daily reporting and analytics system for Lelani School",
  manifest: "/manifest.json",
  icons: {
    icon: "/lslogo.webp",
    apple: [
      { url: "/icons/icon-152x152.webp", sizes: "152x152" },
      { url: "/icons/icon-192x192.webp", sizes: "192x192" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LSDRAS",
    startupImage: "/lslogo.webp",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.webp" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>
        <PWAProvider>{children}</PWAProvider>
      </body>
    </html>
  );
}
