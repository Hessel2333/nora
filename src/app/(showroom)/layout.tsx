import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nora 数字展厅 · 一张订单驱动一座工厂",
  description: "Nora ERP、MRP、MES 与数字孪生的一镜到底产品演示。",
};

export default function ShowroomLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
