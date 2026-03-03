import { Typography } from "antd";

const { Title, Text } = Typography;

interface Props {
  title: string;
  subtitle?: React.ReactNode;
}

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <header className="topbar">
      <div>
        <Title level={2} className="page-title">{title}</Title>
        {subtitle && <Text type="secondary" className="subtitle">{subtitle}</Text>}
      </div>
    </header>
  );
}
