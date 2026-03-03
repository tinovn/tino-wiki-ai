export default function ConversationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: 'calc(100vh - 64px)', margin: '-24px', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}
