import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";

const mounth = localFont({
  src: "../public/Mounth.ttf",
  variable: "--font-mounth",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Campus Printing System",
  description: "Efficient campus printing management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={mounth.variable}>
      <body className={mounth.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
