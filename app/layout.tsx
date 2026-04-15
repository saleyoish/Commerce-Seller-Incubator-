import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Live Commerce Platform - Sell Live, Grow Fast",
  description: "The all-in-one platform for live commerce sellers. Upload products, go live, and sell directly to your audience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} font-sans h-full antialiased`}>
      <body className={`${inter.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
