import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: {
    default: "Letterboxd Stats - Analyze Your Film Journey",
    template: "%s | Letterboxd Stats",
  },
  description: "Upload your Letterboxd data to discover insights about your movie watching habits. Compare film collections, explore statistics, and visualize your cinematic journey.",
  keywords: ["Letterboxd", "movie stats", "film statistics", "movie tracker", "film analysis", "watch history", "cinema stats"],
  authors: [{ name: "Sherlemious" }],
  creator: "Sherlemious",
  metadataBase: new URL("https://letterboxd-stats.sherlemious.com/"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://letterboxd-stats.sherlemious.com/",
    siteName: "Letterboxd Stats",
    title: "Letterboxd Stats - Analyze Your Film Journey",
    description: "Upload your Letterboxd data to discover insights about your movie watching habits. Compare film collections, explore statistics, and visualize your cinematic journey.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Letterboxd Stats - Visualize Your Movie Journey",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Letterboxd Stats - Analyze Your Film Journey",
    description: "Upload your Letterboxd data to discover insights about your movie watching habits.",
    creator: "@sherlemious",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-SDK89RVC6F"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SDK89RVC6F');
          `}
        </Script>
      </head>
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster />
          <Sonner />
        </Providers>
      </body>
    </html>
  );
}
