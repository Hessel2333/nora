import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nora · 中央厨房订单到生产协同",
  description: "面向中央厨房与净配菜工厂的订单审核、配方快照和生产需求协同产品。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
