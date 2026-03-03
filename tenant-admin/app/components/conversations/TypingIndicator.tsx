'use client';

interface Props {
  users: Map<string, string>;
}

export default function TypingIndicator({ users }: Props) {
  if (users.size === 0) return null;

  const names = Array.from(users.values()).filter(Boolean);
  const text = names.length > 0
    ? `${names.join(', ')} đang nhập...`
    : 'Đang nhập...';

  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span /><span /><span />
      </div>
      <span className="typing-text">{text}</span>
    </div>
  );
}
