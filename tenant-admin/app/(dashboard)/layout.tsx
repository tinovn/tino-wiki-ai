import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-bg">
      <div className="dashboard-shell">
        <Sidebar />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
