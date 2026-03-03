import 'antd/dist/reset.css';
import './globals.css';
import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Providers } from '@/providers';

export const metadata: Metadata = {
  title: 'Tino Wiki AI - Dashboard',
  description: 'SaaS AI Knowledge System Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
