import 'antd/dist/reset.css';
import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '@/providers';

export const metadata: Metadata = {
  title: 'Tino Wiki AI - Dashboard',
  description: 'SaaS AI Knowledge System Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
