import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "highlight.js/styles/github-dark.css";
import { Providers } from "@/providers/Providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "DexBlog - Decentralized Blogging",
  description:
    "Deploy your own decentralized blog on any blockchain. Posts stored on-chain forever.",
  keywords: ["blog", "decentralized", "blockchain", "web3", "ethereum"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen bg-background`}
        style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

