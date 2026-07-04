import type { Metadata } from "next";

import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "MirrorTry",
  description: "Premium fashion try-on shopping experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
