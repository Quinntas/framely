import type {Metadata} from "next";
import {Geist, Geist_Mono, Press_Start_2P} from "next/font/google";
import "./globals.css";
import {ThemeProvider} from "@/components/theme-provider";
import {TooltipProvider} from "@/components/ui/tooltip";
import {Toaster} from "@/components/ui/sonner";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const pixelFont = Press_Start_2P({
    variable: "--font-pixel",
    subsets: ["latin"],
    weight: "400",
});

export const metadata: Metadata = {
    title: "Framely - Create Stunning Pixel Art Animations with AI",
    description: "Create beautiful pixel art animations using AI. Generate multi-frame pixel art animations from text descriptions with our powerful AI-powered tool.",
    keywords: ["pixel art", "AI", "animation", "generator", "8-bit", "retro", "gaming", "framely"],
    authors: [{ name: "Framely" }],
    creator: "Framely",
    openGraph: {
        title: "Framely - AI Pixel Art Generator",
        description: "Create stunning pixel art animations with AI",
        type: "website",
        siteName: "Framely",
    },
    twitter: {
        card: "summary_large_image",
        title: "Framely - AI Pixel Art Generator",
        description: "Create stunning pixel art animations with AI",
    },
    robots: "index, follow",
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body
            suppressHydrationWarning
            className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} antialiased`}
        >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <TooltipProvider delayDuration={0}>
                {children}
            </TooltipProvider>
            <Toaster/>
        </ThemeProvider>
        </body>
        </html>
    );
}
