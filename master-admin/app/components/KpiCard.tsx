import { Avatar, Card, Space, Statistic } from "antd";

interface Props {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

export default function KpiCard({ title, value, icon }: Props) {
  return (
    <Card size="small">
      <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
        <Statistic title={title} value={value} />
        <Avatar size="small">{icon}</Avatar>
      </Space>
    </Card>
  );
}
