import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "RO Resume Agent",
  description: "AI-powered resume optimization",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Inter:wght@400;600;700",
    "family=Lato:wght@400;700",
    "family=Open+Sans:wght@400;600;700",
    "family=Roboto:wght@400;700",
    "family=Source+Sans+3:wght@400;600;700",
    "family=Noto+Sans:wght@400;700",
    "family=IBM+Plex+Sans:wght@400;600;700",
    "family=Nunito+Sans:wght@400;700",
    "family=PT+Sans:wght@400;700",
    "family=Work+Sans:wght@400;600;700",
    "family=DM+Sans:wght@400;600;700",
    "family=Fira+Sans:wght@400;600;700",
    "family=Manrope:wght@400;700",
    "family=Space+Grotesk:wght@400;700",
    "family=EB+Garamond:wght@400;700",
    "family=Merriweather:wght@400;700",
    "family=Playfair+Display:wght@400;700",
    "family=Lora:wght@400;700",
    "family=Crimson+Text:wght@400;700",
    "family=Libre+Baskerville:wght@400;700",
    "family=Cormorant+Garamond:wght@400;700",
    "family=Poppins:wght@400;600;700",
    "family=Montserrat:wght@400;600;700",
    "family=Raleway:wght@400;700",
    "family=Quicksand:wght@400;700",
    "family=Barlow:wght@400;700",
    "family=Karla:wght@400;700",
    "family=JetBrains+Mono:wght@400;700",
    "family=IBM+Plex+Mono:wght@400;700",
  ].join("&") + "&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={FONTS_HREF} rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
