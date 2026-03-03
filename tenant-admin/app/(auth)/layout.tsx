import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Tino Wiki AI',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {children}
    </div>
  );
}
