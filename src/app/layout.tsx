import type { Metadata, Viewport } from "next";
import { Martian_Mono, Outfit, Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const pixelify = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixelify", weight: ["400", "500", "600", "700"], display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const martian = Martian_Mono({ subsets: ["latin"], variable: "--font-martian", weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Called It", template: "%s · Called It" },
  description:
    "A public tape for crypto, TradFi and memecoin calls. Post a level and a date. If it plays out, the record shows it, and points follow.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: { title: "Called It", description: "Put it on the tape.", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#b8dcff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixelify.variable} ${outfit.variable} ${martian.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <Providers>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
