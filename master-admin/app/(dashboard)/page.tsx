"use client";

import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Spin, message } from "antd";
import { CloudServerOutlined, CheckCircleOutlined, BookOutlined, FileTextOutlined } from "@ant-design/icons";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import { getDashboardOverview } from "@/lib/master-api";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    getDashboardOverview()
      .then((res: any) => setOverview(res.data))
      .catch((err: Error) => message.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;

  const kpis = [
    { title: "Tổng Tenant", value: overview?.tenants?.total ?? 0, icon: <CloudServerOutlined /> },
    { title: "Tenant hoạt động", value: overview?.tenants?.active ?? 0, icon: <CheckCircleOutlined /> },
    { title: "Wiki đã xuất bản", value: overview?.masterDocuments?.published ?? 0, icon: <BookOutlined /> },
    { title: "Wiki nháp", value: overview?.masterDocuments?.draft ?? 0, icon: <FileTextOutlined /> },
  ];

  return (
    <>
      <PageHeader title="Tổng quan hệ thống" subtitle="Master Admin Dashboard" />
      <section className="kpi-grid">
        {kpis.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}
      </section>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Tenants">
            <Statistic title="Tổng" value={overview?.tenants?.total ?? 0} />
            <Statistic title="Hoạt động" value={overview?.tenants?.active ?? 0} style={{ marginTop: 16 }} />
            <Statistic title="Tạm ngưng" value={overview?.tenants?.suspended ?? 0} style={{ marginTop: 16 }} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Wiki chuyên ngành">
            <Statistic title="Tổng tài liệu" value={overview?.masterDocuments?.total ?? 0} />
            <Statistic title="Đã xuất bản" value={overview?.masterDocuments?.published ?? 0} style={{ marginTop: 16 }} />
            <Statistic title="Bản nháp" value={overview?.masterDocuments?.draft ?? 0} style={{ marginTop: 16 }} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
