import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Queens Scholars Tutorial | SHSAT Preparation",
  description: "SHSAT tutoring, teacher-guided practice, and clear study plans. Call or text 718-913-7706.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
