import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zee-AI — Self-Hosted AI Platform",
  description:
    "A powerful, self-hosted AI/LLM platform with streaming chat, model management, and a premium dark UI. Run AI models locally with Ollama.",
  keywords: ["AI", "LLM", "Ollama", "Self-Hosted", "Chat", "Zee-AI"],
  authors: [{ name: "Muhammad Ibnu Fauzi" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
