'use client';

export default function DateSeparator({ label }: { label: string }) {
  return (
    <div className="date-separator">
      <span>{label}</span>
    </div>
  );
}
