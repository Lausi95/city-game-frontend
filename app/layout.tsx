import type { Metadata } from "next";
import { Special_Elite, Lora, JetBrains_Mono } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

// Dossier type system — see docs/adr/0031-scotland-yard-visual-identity.md.
const specialElite = Special_Elite({
  variable: "--font-special-elite",
  weight: "400",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "City Game Admin",
  description: "Admin-Dashboard für City Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${specialElite.variable} ${lora.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
