"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import Sidebar from "@/components/Sidebar";
import { isAuthenticated } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return <Spin size="large" style={{ display: "block", margin: "200px auto" }} />;
  }

  return (
    <div className="dashboard-bg">
      <div className="dashboard-shell">
        <Sidebar />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
