import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nora · 中央厨房智能制造操作系统",
  description: "面向中央厨房、净配菜工厂和团餐供应链的 AI ERP + MES + WMS 平台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
