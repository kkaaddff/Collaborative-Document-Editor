import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "协同文档编辑器",
  description: "实时协同编辑，支持多用户同时编写文档，使用 AES 加密保护数据传输",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="light" style={{ colorScheme: "light" }}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
