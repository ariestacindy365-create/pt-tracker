import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PT Tracker",
  description: "Tracker beban, body composition, program & nutrisi untuk personal trainer",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
