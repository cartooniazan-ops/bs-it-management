import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BS IT | Class Management",
  description: "BS IT Class Management System",
  applicationName: "BS IT",
};

export const viewport: Viewport = {
  themeColor: "#142B4A",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
