import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Soko POS | Staff",
  description: "Simple, offline-ready point of sale for Kenyan shops",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#146b45",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
