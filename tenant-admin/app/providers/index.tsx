'use client';

import { type ReactNode } from 'react';
import { App as AntdApp } from 'antd';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <AntdApp>{children}</AntdApp>
      </AuthProvider>
    </QueryProvider>
  );
}
